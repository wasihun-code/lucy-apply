from rest_framework import serializers
from .models import ApplicationDocument


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationDocument
        fields = [
            'id', 'document_type', 'file', 'object_key',
            'status', 'flagged_reason', 'version',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'version', 'id', 'created_at', 'updated_at']
