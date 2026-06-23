import pytest
from rest_framework.test import APIClient
from rest_framework import status


@pytest.mark.django_db
class TestProgramPublicAPI:
    def test_list_published_programs(self, published_program, draft_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'BSc Computer Science'

    def test_draft_program_not_in_list(self, published_program, draft_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        ids = [p['id'] for p in response.data['results']]
        assert str(draft_program.id) not in ids

    def test_filter_by_degree_level(self, published_program, university):
        from programs.models import Program
        Program.objects.create(
            university=university,
            name='MSc Engineering',
            degree_level='postgraduate',
            fee_amount=70.00,
            status='published',
        )
        client = APIClient()
        response = client.get('/api/v1/programs/?degree_level=undergraduate')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert all(p['degree_level'] == 'undergraduate' for p in results)

    def test_filter_by_university(self, published_program, draft_program, university):
        client = APIClient()
        response = client.get(f'/api/v1/programs/?university={university.id}')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1

    def test_retrieve_program_detail(self, published_program, open_cycle):
        client = APIClient()
        response = client.get(f'/api/v1/programs/{published_program.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert 'required_documents' in response.data
        assert 'open_cycles' in response.data
        assert 'university_name' in response.data

    def test_program_list_returns_expected_fields(self, published_program):
        client = APIClient()
        response = client.get('/api/v1/programs/')
        result = response.data['results'][0]
        assert 'id' in result
        assert 'name' in result
        assert 'degree_level' in result
        assert 'university_name' in result
        assert 'fee_amount' in result
        assert 'fee_currency' in result
        assert 'status' in result

    def test_program_detail_includes_open_cycles(self, published_program, open_cycle):
        client = APIClient()
        response = client.get(f'/api/v1/programs/{published_program.id}/')
        assert len(response.data['open_cycles']) == 1
        assert response.data['open_cycles'][0]['name'] == 'Fall 2026'
