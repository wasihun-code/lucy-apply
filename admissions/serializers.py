from rest_framework import serializers
from .models import Application
from payments.models import Payment


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['id', 'program', 'admission_cycle', 'status', 'form_data', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        program = validated_data['program']
        validated_data['university'] = program.university
        validated_data['applicant'] = self.context['request'].user.applicant
        return super().create(validated_data)


class ApplicationListSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    applicant_name = serializers.CharField(source='applicant.full_name', read_only=True)
    document_verified_count = serializers.SerializerMethodField()
    document_total_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            'id', 'program', 'program_name', 'university_name',
            'admission_cycle', 'status', 'submitted_at',
            'applicant', 'applicant_name',
            'document_verified_count', 'document_total_count',
            'created_at', 'updated_at',
        ]

    def get_document_verified_count(self, obj):
        required_types = [d.get('type') for d in obj.program.required_documents]
        if not required_types:
            return 0
        return obj.documents.filter(
            document_type__in=required_types,
            status='verified',
        ).values('document_type').distinct().count()

    def get_document_total_count(self, obj):
        return len(obj.program.required_documents)


class ApplicationDetailSerializer(serializers.ModelSerializer):
    document_checklist = serializers.SerializerMethodField()
    program_name = serializers.CharField(source='program.name', read_only=True)
    university_name = serializers.CharField(source='university.name', read_only=True)
    payment = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = '__all__'

    def get_payment(self, obj):
        payment = getattr(obj, 'payment', None)
        if payment:
            return {
                'id': str(payment.id),
                'amount': str(payment.amount),
                'currency': payment.currency,
                'status': payment.status,
                'initiated_at': payment.initiated_at,
                'completed_at': payment.completed_at,
            }
        return None

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
