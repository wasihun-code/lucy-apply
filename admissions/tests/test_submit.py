from datetime import timedelta
from django.utils import timezone
from rest_framework import status

from admissions.models import Application
from payments.models import Payment
from documents.models import ApplicationDocument


class TestSubmitApplication:
    def test_submit_without_payment_returns_400(self, auth_client, application_with_docs_no_payment):
        app = application_with_docs_no_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'PAYMENT_REQUIRED'

    def test_submit_without_docs_returns_400(self, auth_client, application_with_pending_payment):
        app = application_with_pending_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'MISSING_DOCS'

    def test_submit_with_docs_and_payment_succeeds(self, auth_client, application_with_docs_and_pending_payment):
        app = application_with_docs_and_pending_payment
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'submitted'

        app.refresh_from_db()
        assert app.status == 'submitted'
        assert app.submitted_at is not None


class TestSubmitClosedCycle:
    def test_closed_cycle_blocks_submit_with_machine_readable_code(
        self, auth_client, applicant_user, program, admission_cycle,
    ):
        admission_cycle.status = 'closed'
        admission_cycle.close_date = timezone.now()
        admission_cycle.save(update_fields=['status', 'close_date'])

        app = Application.objects.create(
            applicant=applicant_user,
            program=program,
            admission_cycle=admission_cycle,
            university=program.university,
            form_data={'full_name': 'Test'},
        )
        for req in program.required_documents:
            ApplicationDocument.objects.create(
                application=app, document_type=req['type'],
                university=app.university, status='pending', version=1,
            )
        Payment.objects.create(
            university=app.university, application=app,
            amount=program.fee_amount, currency='USD',
            processor_reference='secret_mock_closed',
            status='pending', initiated_at=timezone.now(),
        )

        response = auth_client.post(
            f'/api/v1/applications/{app.id}/submit/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'CYCLE_CLOSED'
        assert 'cycle' in response.data['error']['message'].lower()
