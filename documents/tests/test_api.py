import io
from rest_framework import status
from documents.models import ApplicationDocument


class TestDocumentSizeLimit:
    def test_file_exceeds_size_limit_rejected(self, auth_client, application):
        from io import BytesIO
        from django.conf import settings
        large = BytesIO(b'x' * (settings.FILE_UPLOAD_MAX_MEMORY_SIZE + 1))
        large.name = 'large.pdf'
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript', 'file': large},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error']['code'] == 'FILE_TOO_LARGE'
        assert ApplicationDocument.objects.filter(
            application=application, document_type='transcript'
        ).count() == 0


class TestDocumentReuploadAfterFlag:
    def test_reupload_after_flag_retains_old_version(self, auth_client, application):
        from io import BytesIO
        from documents.models import ApplicationDocument

        first = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript', 'file': io.BytesIO(b'first version')},
            format='multipart',
        )
        doc_id = first.data['id']

        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from identity.models import UniversityStaff
        univ = application.university
        officer = UniversityStaff.objects.create_user(
            email='flag-officer@test.edu', full_name='Flag Officer',
            password='pass123', university=univ, permission_level='officer',
        )
        officer_token = str(RefreshToken.for_user(officer).access_token)
        officer_client = APIClient()
        officer_client.credentials(HTTP_AUTHORIZATION=f'Bearer {officer_token}')

        officer_client.patch(
            f'/api/v1/documents/{doc_id}/flag/',
            {'reason': 'Illegible'}, format='json',
        )

        second = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript', 'file': io.BytesIO(b'second version')},
            format='multipart',
        )
        assert second.status_code == status.HTTP_201_CREATED
        assert second.data['version'] == 2
        assert second.data['status'] == 'pending'

        old = ApplicationDocument.objects.get(
            application=application, document_type='transcript', version=1
        )
        assert old.status == 'flagged'

    def test_reupload_resets_status_to_pending(self, auth_client, application):
        from io import BytesIO
        from documents.models import ApplicationDocument

        first = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript', 'file': io.BytesIO(b'first')},
            format='multipart',
        )
        doc_id = first.data['id']

        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken
        from identity.models import UniversityStaff
        univ = application.university
        officer = UniversityStaff.objects.create_user(
            email='flag-officer2@test.edu', full_name='Flag Officer 2',
            password='pass123', university=univ, permission_level='officer',
        )
        officer_token = str(RefreshToken.for_user(officer).access_token)
        officer_client = APIClient()
        officer_client.credentials(HTTP_AUTHORIZATION=f'Bearer {officer_token}')

        officer_client.patch(
            f'/api/v1/documents/{doc_id}/flag/',
            {'reason': 'Blurry'}, format='json',
        )

        second = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript', 'file': io.BytesIO(b'second')},
            format='multipart',
        )
        assert second.data['status'] == 'pending'


class TestDocumentUpload:
    def test_upload_document_creates_record(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {
                'document_type': 'transcript',
                'file': io.BytesIO(b'fake pdf content'),
            },
            format='multipart',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['document_type'] == 'transcript'
        assert response.data['status'] == 'pending'
        assert response.data['version'] == 1

    def test_upload_creates_db_record(self, auth_client, application):
        auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {
                'document_type': 'transcript',
                'file': io.BytesIO(b'fake pdf content'),
            },
            format='multipart',
        )
        doc = ApplicationDocument.objects.get(application=application, document_type='transcript')
        assert doc.status == 'pending'
        assert doc.version == 1

    def test_reupload_increments_version(self, auth_client, application, existing_document):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {
                'document_type': 'transcript',
                'file': io.BytesIO(b'updated pdf content'),
            },
            format='multipart',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['version'] == 2
        assert ApplicationDocument.objects.filter(
            application=application, document_type='transcript', version=1
        ).exists()

    def test_invalid_document_type_returns_400(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {
                'document_type': 'invalid_type',
                'file': io.BytesIO(b'content'),
            },
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_document_type_returns_400(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'file': io.BytesIO(b'content')},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_file_and_object_key_returns_400(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {'document_type': 'transcript'},
            format='multipart',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_non_owner_cannot_upload(self, other_auth_client, application):
        response = other_auth_client.post(
            f'/api/v1/applications/{application.id}/documents/',
            {
                'document_type': 'transcript',
                'file': io.BytesIO(b'content'),
            },
            format='multipart',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_documents(self, auth_client, application, existing_document):
        response = auth_client.get(
            f'/api/v1/applications/{application.id}/documents/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['document_type'] == 'transcript'

    def test_upload_url_returns_object_key(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/upload-url/',
            {'document_type': 'transcript'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['upload_url'] is None
        assert response.data['object_key'] is not None

    def test_upload_url_validates_document_type(self, auth_client, application):
        response = auth_client.post(
            f'/api/v1/applications/{application.id}/documents/upload-url/',
            {'document_type': 'invalid'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
