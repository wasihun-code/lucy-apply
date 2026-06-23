from rest_framework import serializers
from .models import Application


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['id', 'program', 'admission_cycle', 'status', 'form_data', 'created_at']
        read_only_fields = ['id', 'status', 'form_data', 'created_at']

    def create(self, validated_data):
        program = validated_data['program']
        validated_data['university'] = program.university
        validated_data['applicant'] = self.context['request'].user.applicant
        return super().create(validated_data)


class ApplicationListSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = Application
        fields = [
            'id', 'program', 'program_name', 'university_name',
            'admission_cycle', 'status', 'created_at', 'updated_at',
        ]


class ApplicationDetailSerializer(serializers.ModelSerializer):
    document_checklist = serializers.SerializerMethodField()
    program_name = serializers.CharField(source='program.name', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = Application
        fields = '__all__'

    def get_document_checklist(self, obj):
        checklist = []
        for req in obj.program.required_documents:
            doc_type = req.get('type')
            existing = obj.documents.filter(
                document_type=doc_type
            ).order_by('-version').first()
            checklist.append({
                'type': doc_type,
                'label': req.get('label', doc_type),
                'status': existing.status if existing else None,
                'uploaded': existing is not None,
            })
        return checklist


class ApplicationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['form_data']
