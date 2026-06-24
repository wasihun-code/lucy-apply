from rest_framework import status


class TestOfferResponse:
    def test_accept_offer_succeeds(self, auth_client, admitted_application):
        app = admitted_application
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/offer-response/',
            {'response': 'accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'accepted'

        app.refresh_from_db()
        assert app.status == 'accepted'
        assert app.offer_response_at is not None

    def test_decline_offer_succeeds(self, auth_client, admitted_application):
        app = admitted_application
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/offer-response/',
            {'response': 'declined'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'declined'

        app.refresh_from_db()
        assert app.status == 'declined'
        assert app.offer_response_at is not None

    def test_accept_blocked_if_not_admitted(self, auth_client, application):
        app = application
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/offer-response/',
            {'response': 'accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'NOT_ADMITTED'

    def test_accept_immutable_once_responded(self, auth_client, responded_application):
        app = responded_application
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/offer-response/',
            {'response': 'accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'ALREADY_RESPONDED'

    def test_invalid_response_value_returns_400(self, auth_client, admitted_application):
        app = admitted_application
        response = auth_client.post(
            f'/api/v1/applications/{app.id}/offer-response/',
            {'response': 'invalid'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_blocked(self, admitted_application):
        from rest_framework.test import APIClient
        client = APIClient()
        response = client.post(
            f'/api/v1/applications/{admitted_application.id}/offer-response/',
            {'response': 'accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_other_applicant_blocked(self, other_auth_client, admitted_application):
        response = other_auth_client.post(
            f'/api/v1/applications/{admitted_application.id}/offer-response/',
            {'response': 'accepted'},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
