from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Program, AdmissionCycle
from .serializers import (
    ProgramListSerializer, ProgramDetailSerializer,
    ProgramCreateSerializer, ProgramUpdateSerializer,
    AdmissionCycleSerializer, AdmissionCycleWriteSerializer,
    AdmissionCycleDetailSerializer,
)
from identity.permissions import (
    IsUniversityStaff, IsUniversityAdmin,
    IsScopedToUniversity, MFAVerified,
)


PROGRAM_STATUS_TRANSITIONS = {
    'draft': ['published'],
    'published': ['archived'],
    'archived': [],
}


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    filterset_fields = ['degree_level', 'university']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProgramListSerializer
        if self.action == 'create':
            return ProgramCreateSerializer
        if self.action in ('partial_update', 'update'):
            return ProgramUpdateSerializer
        return ProgramDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'create':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action in ('partial_update', 'update'):
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'status':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'cycles':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityStaff,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'destroy':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        else:
            permission_classes = [permissions.IsAuthenticated, IsUniversityAdmin, MFAVerified]
        return [p() for p in permission_classes]

    def get_queryset(self):
        if self.action in ('list', 'retrieve'):
            user = self.request.user
            if user.is_authenticated and (
                hasattr(user, 'universitystaff') or hasattr(user, 'platformadmin')
            ):
                return Program.objects.all()
            return Program.objects.filter(status='published')
        return Program.objects.all()

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        program = self.get_object()
        new_status = request.data.get('status')
        valid_transitions = PROGRAM_STATUS_TRANSITIONS.get(program.status, [])
        if new_status not in valid_transitions:
            return Response(
                {'error': {'code': 'INVALID_TRANSITION', 'message': f'Cannot transition from {program.status} to {new_status}'}},
                status=400,
            )
        program.status = new_status
        program.save()
        return Response(ProgramDetailSerializer(program).data)

    @action(detail=True, methods=['get', 'post'])
    def cycles(self, request, pk=None):
        program = self.get_object()

        if request.method == 'GET':
            qs = program.cycles.all().order_by('open_date')
            page = self.paginate_queryset(qs)
            serializer = AdmissionCycleSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        if not hasattr(request.user, 'universitystaff') or request.user.universitystaff.permission_level != 'admin':
            return Response(
                {'error': {'code': '403', 'message': 'Only University Admins can create cycles'}},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = AdmissionCycleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(program=program, university=program.university)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdmissionCycleViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionCycleDetailSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return AdmissionCycle.objects.all()

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityStaff,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action in ('partial_update', 'update'):
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'close':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'archive':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        else:
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        return [p() for p in permission_classes]

    def get_serializer_class(self):
        if self.action in ('partial_update', 'update'):
            return AdmissionCycleWriteSerializer
        return AdmissionCycleDetailSerializer

    @action(detail=True, methods=['patch'])
    def close(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status != 'open':
            return Response(
                {'error': {'code': 'INVALID_STATUS', 'message': 'Only open cycles can be closed'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cycle.status = 'closed'
        cycle.save(update_fields=['status', 'updated_at'])
        return Response(AdmissionCycleDetailSerializer(cycle).data)

    @action(detail=True, methods=['patch'])
    def archive(self, request, pk=None):
        cycle = self.get_object()
        if cycle.status != 'closed':
            return Response(
                {'error': {'code': 'INVALID_STATUS', 'message': 'Only closed cycles can be archived'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cycle.status = 'archived'
        cycle.save(update_fields=['status', 'updated_at'])
        return Response(AdmissionCycleDetailSerializer(cycle).data)