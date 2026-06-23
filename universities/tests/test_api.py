import pytest
from rest_framework.test import APIClient
from rest_framework import status


@pytest.mark.django_db
class TestUniversityPublicAPI:
    def test_list_active_universities(self, active_university, inactive_university):
        client = APIClient()
        response = client.get('/api/v1/universities/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'Test University'

    def test_retrieve_university(self, active_university):
        client = APIClient()
        response = client.get(f'/api/v1/universities/{active_university.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test University'

    def test_inactive_university_not_in_list(self, active_university, inactive_university):
        client = APIClient()
        response = client.get('/api/v1/universities/')
        ids = [u['id'] for u in response.data['results']]
        assert str(inactive_university.id) not in ids

    def test_inactive_university_returns_404_for_public(self, inactive_university):
        client = APIClient()
        response = client.get(f'/api/v1/universities/{inactive_university.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_university_list_returns_expected_fields(self, active_university):
        client = APIClient()
        response = client.get('/api/v1/universities/')
        result = response.data['results'][0]
        assert 'id' in result
        assert 'name' in result
        assert 'description' in result
        assert 'logo' in result
        assert 'status' in result
        assert 'created_at' in result

    def test_university_detail_returns_all_fields(self, active_university):
        client = APIClient()
        response = client.get(f'/api/v1/universities/{active_university.id}/')
        assert 'accreditation_info' in response.data
