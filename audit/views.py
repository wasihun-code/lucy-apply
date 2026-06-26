from rest_framework import viewsets, permissions

from .models import AuditLogEntry
from .serializers import AuditLogEntrySerializer
from identity.permissions import IsPlatformAdmin, MFAVerified


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogEntrySerializer
    permission_classes = [
        permissions.IsAuthenticated, IsPlatformAdmin, MFAVerified,
    ]
    queryset = AuditLogEntry.objects.all()
    filterset_fields = ['action', 'entity_type', 'university']
    ordering = ['-created_at']
