from django.utils import timezone

from rest_framework import serializers

from .models import Program, AdmissionCycle


class AdmissionCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionCycle
        fields = ['id', 'name', 'open_date', 'close_date', 'status', 'program']
        read_only_fields = ['id', 'status']


class AdmissionCycleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionCycle
        fields = ['id', 'name', 'open_date', 'close_date', 'status']
        read_only_fields = ['id', 'status']

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        if instance and instance.status != 'scheduled':
            raise serializers.ValidationError(
                'Dates can only be changed before the cycle opens'
            )
        return data

    def create(self, validated_data):
        now = timezone.now()
        if validated_data.get('open_date', now) <= now:
            validated_data['status'] = 'open'
        return super().create(validated_data)


class AdmissionCycleDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionCycle
        fields = '__all__'


class ProgramListSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_level', 'university',
            'university_name', 'fee_amount', 'fee_currency',
            'status', 'created_at',
        ]


class ProgramCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_level', 'description', 'requirements',
            'required_documents', 'fee_amount', 'fee_currency',
        ]
        read_only_fields = ['id']


class ProgramUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = [
            'name', 'degree_level', 'description', 'requirements',
            'required_documents', 'fee_amount', 'fee_currency',
        ]


class ProgramDetailSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)
    open_cycles = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = '__all__'

    def get_open_cycles(self, obj):
        cycles = obj.cycles.filter(status='open')
        return AdmissionCycleSerializer(cycles, many=True).data