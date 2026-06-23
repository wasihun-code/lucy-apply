from rest_framework import serializers
from .models import University


class UniversityListSerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ['id', 'name', 'description', 'logo', 'status', 'created_at']


class UniversityDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = '__all__'
