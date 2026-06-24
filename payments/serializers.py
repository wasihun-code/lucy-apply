from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'currency', 'status', 'processor_reference',
                   'refundable', 'initiated_at', 'completed_at']
        read_only_fields = fields
