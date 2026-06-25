from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import University
from .serializers import UniversityListSerializer, UniversityDetailSerializer
from programs.models import Program
from programs.serializers import ProgramListSerializer, ProgramCreateSerializer
from identity.permissions import (
    IsPlatformAdmin, IsUniversityStaff, IsUniversityAdmin,
    IsScopedToUniversity, MFAVerified,
)


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
            if not hasattr(self.request.user, 'universitystaff'):
                return University.objects.filter(status='active')
            return University.objects.all()
        if hasattr(self.request.user, 'universitystaff'):
            return University.objects.filter(id=self.request.user.universitystaff.university_id)
        return University.objects.all()

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        university = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(University._meta.get_field('status').choices):
            return Response({'error': 'Invalid status'}, status=400)
        university.status = new_status
        university.save()
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