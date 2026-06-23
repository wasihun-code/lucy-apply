import io
from rest_framework import status
from documents.models import ApplicationDocument


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
