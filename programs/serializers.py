from rest_framework import serializers
from .models import Program, AdmissionCycle


class AdmissionCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdmissionCycle
        fields = ['id', 'name', 'open_date', 'close_date', 'status']


class ProgramListSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source='university.name', read_only=True)

    class Meta:
        model = Program
        fields = [
            'id', 'name', 'degree_level', 'university',
            'university_name', 'fee_amount', 'fee_currency',
            'status', 'created_at',
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
