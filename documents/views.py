from django.utils import timezone

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ApplicationDocument
from .serializers import ApplicationDocumentSerializer
from identity.models import UniversityStaff
from identity.permissions import IsUniversityStaff, IsScopedToUniversity, MFAVerified


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationDocumentSerializer
    permission_classes = [
        permissions.IsAuthenticated, IsUniversityStaff,
        IsScopedToUniversity, MFAVerified,
    ]

    def get_queryset(self):
        qs = ApplicationDocument.objects.all()
        user = self.request.user
        if hasattr(user, 'universitystaff'):
            return qs.filter(university=user.universitystaff.university)
        return qs.none()

    @action(detail=True, methods=['patch'])
    def verify(self, request, pk=None):
        doc = self.get_object()
        if doc.status == 'verified':
            return Response(
                {'error': {'code': 'ALREADY_VERIFIED', 'message': 'Document is already verified'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = UniversityStaff.objects.get(pk=request.user.pk)
        doc.status = 'verified'
        doc.reviewed_by = staff
        doc.reviewed_at = timezone.now()
        doc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

        serializer = self.get_serializer(doc)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def flag(self, request, pk=None):
        doc = self.get_object()
        reason = request.data.get('reason', '').strip()
        if not reason:
            return Response(
                {'error': {'code': 'REASON_REQUIRED', 'message': 'A reason is required when flagging a document'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = UniversityStaff.objects.get(pk=request.user.pk)
        doc.status = 'flagged'
        doc.flagged_reason = reason
        doc.reviewed_by = staff
        doc.reviewed_at = timezone.now()
        doc.save(update_fields=['status', 'flagged_reason', 'reviewed_by', 'reviewed_at', 'updated_at'])

        serializer = self.get_serializer(doc)
        return Response(serializer.data)
