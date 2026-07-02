import uuid

from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Application, ApplicationStatusHistory
from .state_machine import transition_application
from .serializers import (
    ApplicationCreateSerializer,
    ApplicationListSerializer,
    ApplicationDetailSerializer,
    ApplicationUpdateSerializer,
)
from documents.models import ApplicationDocument
from documents.serializers import ApplicationDocumentSerializer
from payments.models import Payment
from payments.serializers import PaymentSerializer
from payments.processor import create_payment_intent, is_mock_mode
from identity.models import UniversityStaff
from identity.permissions import (
    IsApplicant, IsEmailVerified, IsUniversityStaff,
    IsScopedToUniversity, IsApplicantOwner,
    IsApplicantOwnerOrStaffScoped, MFAVerified,
)
from notifications.tasks import send_decision_reversed_email


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        elif self.action in ('partial_update', 'update'):
            return ApplicationUpdateSerializer
        elif self.action == 'list':
            return ApplicationListSerializer
        return ApplicationDetailSerializer

    def get_permissions(self):
        if self.action in ('create', 'partial_update', 'update', 'destroy'):
            permission_classes = [
                permissions.IsAuthenticated, IsApplicant, IsEmailVerified,
            ]
            if self.action in ('partial_update', 'update', 'destroy'):
                permission_classes.append(IsApplicantOwner)
        elif self.action == 'retrieve':
            permission_classes = [
                permissions.IsAuthenticated, IsApplicantOwnerOrStaffScoped,
            ]
        elif self.action == 'list':
            permission_classes = [permissions.IsAuthenticated, IsApplicant]
        elif self.action == 'status_change':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityStaff,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'documents':
            if self.request.method == 'POST':
                permission_classes = [
                    permissions.IsAuthenticated, IsApplicant, IsEmailVerified,
                    IsApplicantOwner,
                ]
            else:
                permission_classes = [
                    permissions.IsAuthenticated, IsApplicantOwnerOrStaffScoped,
                ]
        elif self.action in ('history', 'payment'):
            permission_classes = [
                permissions.IsAuthenticated, IsApplicantOwnerOrStaffScoped,
            ]
        else:
            permission_classes = [
                permissions.IsAuthenticated, IsApplicant, IsEmailVerified,
                IsApplicantOwner,
            ]
        return [p() for p in permission_classes]

    def get_queryset(self):
        qs = Application.objects.all()
        user = self.request.user
        if hasattr(user, 'applicant'):
            return qs.filter(applicant=user.applicant)
        if hasattr(user, 'universitystaff'):
            return qs.filter(university=user.universitystaff.university)
        if hasattr(user, 'platformadmin'):
            return qs
        return qs.none()

    def create(self, request, *args, **kwargs):
        program_id = request.data.get('program')
        cycle_id = request.data.get('admission_cycle')
        existing = Application.objects.filter(
            applicant=request.user.applicant,
            program_id=program_id,
            admission_cycle_id=cycle_id,
            status='draft',
        ).first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != 'draft':
            return Response(
                {'error': {'code': 'NOT_DRAFT', 'message': 'Cannot edit a submitted application'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data.copy()
        if 'form_data' in data and isinstance(data['form_data'], dict):
            merged = dict(instance.form_data)
            merged.update(data['form_data'])
            data['form_data'] = merged
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        detail = ApplicationDetailSerializer(instance)
        return Response(detail.data)

    def perform_destroy(self, instance):
        if instance.status != 'draft':
            raise ValidationError('Only draft applications can be deleted')
        instance.delete()

    @action(detail=True, methods=['get', 'post'])
    def documents(self, request, pk=None):
        application = self.get_object()

        if request.method == 'GET':
            docs = application.documents.all().order_by('-version')
            serializer = ApplicationDocumentSerializer(docs, many=True)
            return Response(serializer.data)

        document_type = request.data.get('document_type')
        if not document_type:
            return Response(
                {'error': {'code': '400', 'message': 'document_type is required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_types = [
            d.get('type') for d in application.program.required_documents
        ]
        if document_type not in required_types:
            return Response(
                {'error': {'code': '400', 'message': f'Invalid document_type. Must be one of: {", ".join(required_types)}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = application.documents.filter(
            document_type=document_type
        ).order_by('-version').first()
        next_version = (existing.version + 1) if existing else 1

        doc = ApplicationDocument(
            application=application,
            document_type=document_type,
            university=application.university,
            version=next_version,
        )

        uploaded_file = request.FILES.get('file')
        object_key = request.data.get('object_key', '')

        if uploaded_file:
            if uploaded_file.size > settings.FILE_UPLOAD_MAX_MEMORY_SIZE:
                return Response(
                    {'error': {'code': 'FILE_TOO_LARGE', 'message': f'File exceeds the maximum size of {settings.FILE_UPLOAD_MAX_MEMORY_SIZE // (1024*1024)}MB'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            doc.file = uploaded_file
        elif object_key:
            doc.object_key = object_key
        else:
            return Response(
                {'error': {'code': '400', 'message': 'Either file or object_key is required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doc.save()
        serializer = ApplicationDocumentSerializer(doc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='documents/upload-url')
    def documents_upload_url(self, request, pk=None):
        application = self.get_object()
        document_type = request.data.get('document_type')

        if not document_type:
            return Response(
                {'error': {'code': '400', 'message': 'document_type is required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_types = [
            d.get('type') for d in application.program.required_documents
        ]
        if document_type not in required_types:
            return Response(
                {'error': {'code': '400', 'message': f'Invalid document_type. Must be one of: {", ".join(required_types)}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        object_key = f"documents/{application.id}/{document_type}/{uuid.uuid4()}"

        return Response({
            'upload_url': None,
            'object_key': object_key,
        })

    @action(detail=True, methods=['get'], url_path='history')
    def history(self, request, pk=None):
        application = self.get_object()
        history_qs = ApplicationStatusHistory.objects.filter(
            application=application
        ).order_by('created_at')
        data = [
            {
                'from_status': h.from_status,
                'to_status': h.to_status,
                'changed_by_type': h.changed_by_type,
                'reason': h.reason,
                'created_at': h.created_at,
            }
            for h in history_qs
        ]
        return Response(data)

    @action(detail=True, methods=['post'], url_path='payment-intent')
    def payment_intent(self, request, pk=None):
        application = self.get_object()

        if application.status != 'draft':
            return Response(
                {'error': {'code': 'NOT_DRAFT', 'message': 'Payment can only be initiated on draft applications'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cycle = application.admission_cycle
        if cycle.status != 'open':
            return Response(
                {'error': {'code': 'CYCLE_CLOSED', 'message': f'Admission cycle is {cycle.status}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_types = [
            d.get('type') for d in application.program.required_documents
        ]
        if required_types:
            uploaded_types = set(
                ApplicationDocument.objects.filter(
                    application=application,
                    document_type__in=required_types,
                ).values_list('document_type', flat=True).distinct()
            )
            missing = [t for t in required_types if t not in uploaded_types]
            if missing:
                return Response(
                    {'error': {'code': 'MISSING_DOCS', 'message': f'Upload required documents before payment: {", ".join(missing)}'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        existing = getattr(application, 'payment', None)
        if existing:
            if existing.status == 'succeeded':
                return Response(
                    {'error': {'code': 'ALREADY_PAID', 'message': 'Payment already completed for this application'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({
                'client_secret': existing.processor_reference,
                'payment_id': str(existing.id),
            })

        amount = application.program.fee_amount
        currency = application.program.fee_currency

        intent = create_payment_intent(amount, currency)

        payment = Payment.objects.create(
            university=application.university,
            application=application,
            amount=amount,
            currency=currency,
            processor_reference=intent.get('client_secret', ''),
            status='pending',
            initiated_at=timezone.now(),
        )

        return Response({
            'client_secret': intent['client_secret'],
            'payment_id': str(payment.id),
        })

    @action(detail=True, methods=['get'], url_path='payment')
    def payment(self, request, pk=None):
        application = self.get_object()
        payment = getattr(application, 'payment', None)
        if not payment:
            return Response(
                {'error': {'code': 'NO_PAYMENT', 'message': 'No payment found for this application'}},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        application = self.get_object()

        if application.status != 'draft':
            return Response(
                {'error': {'code': 'NOT_DRAFT', 'message': 'Only draft applications can be submitted'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.program.status == 'archived':
            return Response(
                {'error': {'code': 'PROGRAM_ARCHIVED', 'message': 'Cannot submit applications for an archived program'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cycle = application.admission_cycle
        if cycle.status != 'open':
            return Response(
                {'error': {'code': 'CYCLE_CLOSED', 'message': f'Cannot submit — admission cycle is {cycle.status}'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        required_types = [
            d.get('type') for d in application.program.required_documents
        ]
        if required_types:
            uploaded_types = set(
                ApplicationDocument.objects.filter(
                    application=application,
                    document_type__in=required_types,
                ).values_list('document_type', flat=True).distinct()
            )
            missing = [t for t in required_types if t not in uploaded_types]
            if missing:
                return Response(
                    {'error': {'code': 'MISSING_DOCS', 'message': f'Upload required documents before submitting: {", ".join(missing)}'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payment = getattr(application, 'payment', None)
        if not payment:
            return Response(
                {'error': {'code': 'PAYMENT_REQUIRED', 'message': 'Payment must be completed before submitting'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment.status == 'pending' and is_mock_mode():
            payment.status = 'succeeded'
            payment.completed_at = timezone.now()
            payment.save(update_fields=['status', 'completed_at', 'updated_at'])

        if payment.status != 'succeeded':
            return Response(
                {'error': {'code': 'PAYMENT_REQUIRED', 'message': 'Payment must be completed before submitting'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        transition_application(
            application, 'submitted',
            actor_type='applicant',
            actor_id=request.user.applicant.id,
            reason='Application submitted by applicant',
        )

        serializer = ApplicationDetailSerializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='status')
    def status_change(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        reason = request.data.get('reason', '')

        if not new_status:
            return Response(
                {'error': {'code': '400', 'message': 'status is required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in ('admitted', 'rejected', 'waitlisted', 'under_review'):
            return Response(
                {'error': {'code': '400', 'message': 'Invalid status for this action'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.program.status == 'archived':
            return Response(
                {'error': {'code': 'PROGRAM_ARCHIVED', 'message': 'Cannot review applications for an archived program'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        is_reversal = (
            new_status == 'under_review'
            and application.status in ('admitted', 'rejected', 'waitlisted')
        )

        if new_status == 'under_review' and not is_reversal and application.status != 'submitted':
            return Response(
                {'error': {'code': 'INVALID_TRANSITION', 'message': 'under_review can only be set from submitted or as a reversal'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_reversal:
            if application.offer_response_at is not None:
                return Response(
                    {'error': {'code': 'CANNOT_REVERSE', 'message': 'Cannot reverse — applicant has already responded'}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        staff = UniversityStaff.objects.get(pk=request.user.pk)

        try:
            transition_application(
                application, new_status,
                actor_type='university_staff',
                actor_id=str(staff.id),
                reason=reason,
                decision_by=staff,
            )
        except ValidationError as e:
            return Response(
                {'error': {'code': 'INVALID_TRANSITION', 'message': str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_reversal:
            send_decision_reversed_email.delay(str(application.id))

        serializer = ApplicationDetailSerializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='offer-response')
    def offer_response(self, request, pk=None):
        application = self.get_object()
        response = request.data.get('response', '')

        if response not in ('accepted', 'declined'):
            return Response(
                {'error': {'code': '400', 'message': 'response must be "accepted" or "declined"'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.status != 'admitted':
            return Response(
                {'error': {'code': 'NOT_ADMITTED', 'message': 'Can only respond to an admit offer'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.offer_response_at is not None:
            return Response(
                {'error': {'code': 'ALREADY_RESPONDED', 'message': 'Offer has already been responded to'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.offer_response_at = timezone.now()
        application.save(update_fields=['offer_response_at', 'updated_at'])

        try:
            transition_application(
                application, response,
                actor_type='applicant',
                actor_id=request.user.applicant.id,
                reason=f'Applicant {response} the offer',
            )
        except ValidationError as e:
            application.offer_response_at = None
            application.save(update_fields=['offer_response_at', 'updated_at'])
            return Response(
                {'error': {'code': 'TRANSITION_FAILED', 'message': str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO Sprint 8: also notify UniversityAdmin
        serializer = ApplicationDetailSerializer(application)
        return Response(serializer.data)
