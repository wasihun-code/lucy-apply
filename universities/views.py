from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import University
from .serializers import UniversityListSerializer, UniversityDetailSerializer
from identity.permissions import IsPlatformAdmin, IsUniversityAdmin, IsScopedToUniversity, MFAVerified


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
        else:
            permission_classes = [permissions.IsAuthenticated, IsUniversityAdmin, IsScopedToUniversity, MFAVerified]
        return [p() for p in permission_classes]

    def get_queryset(self):
        if self.action in ['list', 'retrieve'] and not self.request.user.is_authenticated:
            return University.objects.filter(status='active')
        if self.action in ['list', 'retrieve']:
            qs = University.objects.all()
            if not hasattr(self.request.user, 'universitystaff'):
                return qs.filter(status='active')
            return qs
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
