from rest_framework import serializers
from .models import Applicant, User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Applicant
        fields = [
            'email', 'full_name', 'password',
            'country_of_residence', 'date_of_birth',
            'nationality', 'passport_id_number',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        applicant = Applicant(**validated_data)
        applicant.set_password(password)
        applicant.save()
        return applicant
