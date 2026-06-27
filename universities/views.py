from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import University
from .serializers import UniversityListSerializer, UniversityDetailSerializer
from programs.models import Program
from programs.serializers import ProgramListSerializer, ProgramCreateSerializer
from admissions.models import Application
from admissions.serializers import ApplicationListSerializer
from identity.models import UniversityStaff, StaffInviteToken
from identity.serializers import StaffInviteSerializer
from identity.permissions import (
    IsPlatformAdmin, IsUniversityStaff, IsUniversityAdmin,
    IsScopedToUniversity, MFAVerified,
)
from audit.models import AuditLogEntry
from audit.serializers import AuditLogEntrySerializer


class UniversityViewSet(viewsets.ModelViewSet):
    queryset = University.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return UniversityListSerializer
        return UniversityDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]
        elif self.action in ['partial_update', 'update']:
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'status':
            permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified]
        elif self.action == 'programs':
            permission_classes = [permissions.IsAuthenticated, IsUniversityStaff, IsScopedToUniversity, MFAVerified]
        elif self.action == 'applications':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityStaff,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'audit_log':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action in ('staff', 'staff_remove'):
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        else:
            permission_classes = [permissions.IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]
        return [p() for p in permission_classes]

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            if not self.request.user.is_authenticated:
                return University.objects.filter(status='active')
            if hasattr(self.request.user, 'platformadmin'):
                return University.objects.all()
            if not hasattr(self.request.user, 'universitystaff'):
                return University.objects.filter(status='active')
            return University.objects.all()
        if hasattr(self.request.user, 'universitystaff'):
            return University.objects.filter(id=self.request.user.universitystaff.university_id)
        if hasattr(self.request.user, 'platformadmin'):
            return University.objects.all()
        return University.objects.all()

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        university = self.get_object()
        old_status = university.status
        new_status = request.data.get('status')
        if new_status not in dict(University._meta.get_field('status').choices):
            return Response({'error': 'Invalid status'}, status=400)
        if old_status == new_status:
            return Response(UniversityDetailSerializer(university).data)
        university.status = new_status
        university.save()
        AuditLogEntry.objects.create(
            actor_type='platform_admin',
            actor_id=request.user.id,
            university=university,
            action='university_status_change',
            entity_type='university',
            entity_id=university.id,
            before_state={'status': old_status},
            after_state={'status': new_status},
        )
        return Response(UniversityDetailSerializer(university).data)

    @action(detail=True, methods=['get', 'post'])
    def programs(self, request, pk=None):
        university = self.get_object()

        if request.method == 'GET':
            qs = Program.objects.filter(university=university)
            page = self.paginate_queryset(qs)
            serializer = ProgramListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        if not hasattr(request.user, 'universitystaff') or request.user.universitystaff.permission_level != 'admin':
            return Response(
                {'error': {'code': '403', 'message': 'Only University Admins can create programs'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProgramCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(university=university)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        university = self.get_object()
        qs = Application.objects.filter(university=university)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        program_filter = request.query_params.get('program')
        if program_filter:
            qs = qs.filter(program_id=program_filter)

        cycle_filter = request.query_params.get('admission_cycle')
        if cycle_filter:
            qs = qs.filter(admission_cycle_id=cycle_filter)

        qs = qs.order_by('-submitted_at', '-created_at')

        page = self.paginate_queryset(qs)
        serializer = ApplicationListSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def staff(self, request, pk=None):
        university = self.get_object()

        if request.method == 'GET':
            qs = UniversityStaff.objects.filter(university=university)
            data = [
                {
                    'id': str(s.id),
                    'email': s.email,
                    'full_name': s.full_name,
                    'permission_level': s.permission_level,
                    'account_status': s.account_status,
                }
                for s in qs
            ]
            return Response(data)

        serializer = StaffInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if UniversityStaff.objects.filter(
            email=serializer.validated_data['email'].lower().strip(),
            university=university,
        ).exists():
            return Response(
                {'error': {'code': 'DUPLICATE', 'message': 'Staff member with this email already exists at this university'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        staff = UniversityStaff.objects.create_user(
            email=serializer.validated_data['email'],
            full_name=serializer.validated_data['full_name'],
            password=None,
            university=university,
            permission_level=serializer.validated_data['permission_level'],
        )

        token = StaffInviteToken.objects.create(university_staff=staff)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(
            'Staff invite for %s (%s): set-password token=%s',
            staff.email, staff.full_name, token.token,
        )

        actor_type = 'university_staff' if hasattr(request.user, 'universitystaff') else 'platform_admin'
        AuditLogEntry.objects.create(
            actor_type=actor_type,
            actor_id=request.user.id,
            university=university,
            action='staff_invited',
            entity_type='university_staff',
            entity_id=staff.id,
            before_state=None,
            after_state={
                'email': staff.email,
                'full_name': staff.full_name,
                'permission_level': staff.permission_level,
                'account_status': 'active',
            },
        )

        return Response({
            'id': str(staff.id),
            'email': staff.email,
            'full_name': staff.full_name,
            'permission_level': staff.permission_level,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='staff/(?P<staff_id>[^/.]+)')
    def staff_remove(self, request, pk=None, staff_id=None):
        university = self.get_object()
        staff = get_object_or_404(UniversityStaff, id=staff_id, university=university)
        if staff.account_status == 'deactivated':
            return Response(
                {'error': {'code': 'ALREADY_DEACTIVATED', 'message': 'Staff member is already deactivated'}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = staff.account_status
        staff.account_status = 'deactivated'
        staff.save(update_fields=['account_status'])

        actor_type = 'university_staff' if hasattr(request.user, 'universitystaff') else 'platform_admin'
        AuditLogEntry.objects.create(
            actor_type=actor_type,
            actor_id=request.user.id,
            university=university,
            action='staff_deactivated',
            entity_type='university_staff',
            entity_id=staff.id,
            before_state={'account_status': old_status},
            after_state={'account_status': 'deactivated'},
        )

        return Response({'detail': 'Staff member deactivated'})

    @action(detail=True, methods=['get'], url_path='audit-log')
    def audit_log(self, request, pk=None):
        university = self.get_object()
        qs = AuditLogEntry.objects.filter(university=university).order_by('-created_at')

        action_filter = request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        page = self.paginate_queryset(qs)
        serializer = AuditLogEntrySerializer(page, many=True)
        return self.get_paginated_response(serializer.data)