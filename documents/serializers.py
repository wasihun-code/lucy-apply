from rest_framework import serializers
from .models import ApplicationDocument


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationDocument
        fields = [
            'id', 'document_type', 'file', 'object_key',
            'status', 'flagged_reason', 'version',
            'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'version', 'id', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']
