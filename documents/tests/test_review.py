from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework import status

from documents.models import ApplicationDocument


@pytest.fixture(autouse=True)
def patch_document_signals():
    with patch('notifications.tasks.send_document_flagged_email.delay'):
        yield


class TestDocumentVerify:
    def test_officer_can_verify_document(self, officer_client, application, existing_document):
        response = officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/verify/',
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'verified'
        assert response.data['reviewed_by'] is not None
        assert response.data['reviewed_at'] is not None

    def test_verify_sets_reviewed_by_and_at(self, officer_client, application, existing_document, staff_officer):
        officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/verify/',
            format='json',
        )
        doc = ApplicationDocument.objects.get(pk=existing_document.id)
        assert doc.status == 'verified'
        assert doc.reviewed_by == staff_officer
        assert doc.reviewed_at is not None

    def test_verify_already_verified_returns_400(self, officer_client, existing_document):
        existing_document.status = 'verified'
        existing_document.reviewed_at = timezone.now()
        existing_document.save(update_fields=['status', 'reviewed_at', 'updated_at'])

        response = officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/verify/',
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already verified' in response.data['error']['message'].lower()

    def test_cross_tenant_officer_cannot_verify(self, other_officer_client, existing_document):
        response = other_officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/verify/',
            format='json',
        )
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)


class TestDocumentFlag:
    def test_officer_can_flag_document_with_reason(self, officer_client, existing_document):
        response = officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/flag/',
            {'reason': 'Illegible scan'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'flagged'
        assert response.data['flagged_reason'] == 'Illegible scan'

    def test_flag_sets_reviewed_by_and_at(self, officer_client, existing_document, staff_officer):
        officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/flag/',
            {'reason': 'Missing signature'},
            format='json',
        )
        doc = ApplicationDocument.objects.get(pk=existing_document.id)
        assert doc.status == 'flagged'
        assert doc.flagged_reason == 'Missing signature'
        assert doc.reviewed_by == staff_officer
        assert doc.reviewed_at is not None

    def test_flag_without_reason_returns_400(self, officer_client, existing_document):
        response = officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/flag/',
            {'reason': ''},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'reason is required' in response.data['error']['message'].lower()

    def test_flag_missing_reason_key_returns_400(self, officer_client, existing_document):
        response = officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/flag/',
            {},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'reason is required' in response.data['error']['message'].lower()

    def test_cross_tenant_officer_cannot_flag(self, other_officer_client, existing_document):
        response = other_officer_client.patch(
            f'/api/v1/documents/{existing_document.id}/flag/',
            {'reason': 'Some issue'},
            format='json',
        )
        assert response.status_code in (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND)
