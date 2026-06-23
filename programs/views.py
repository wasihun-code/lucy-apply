from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Program
from .serializers import ProgramListSerializer, ProgramDetailSerializer
from identity.permissions import IsUniversityAdmin, IsScopedToUniversity, MFAVerified


class ProgramViewSet(viewsets.ModelViewSet):
    queryset = Program.objects.all()
    filterset_fields = ['degree_level', 'university']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProgramListSerializer
        return ProgramDetailSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        elif self.action in ['create']:
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action in ['partial_update', 'update']:
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        elif self.action == 'status':
            permission_classes = [
                permissions.IsAuthenticated, IsUniversityAdmin,
                IsScopedToUniversity, MFAVerified,
            ]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [p() for p in permission_classes]

    def get_queryset(self):
        if self.action in ['list', 'retrieve'] and not self.request.user.is_authenticated:
            return Program.objects.filter(status='published')
        if self.action in ['list', 'retrieve']:
            return Program.objects.all()
        return Program.objects.all()

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        program = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(Program._meta.get_field('status').choices):
            return Response({'error': 'Invalid status'}, status=400)
        program.status = new_status
        program.save()
        return Response(ProgramDetailSerializer(program).data)
