from unittest.mock import patch, Mock

from django.conf import settings

from documents.validation import ALLOWED_MIME_TYPES, validate_file_type


class TestValidateFileType:
    def test_returns_true_when_testing_is_true(self):
        with patch.object(settings, 'TESTING', True):
            file = Mock()
            result = validate_file_type(file)
            assert result is True
            file.read.assert_not_called()

    def test_returns_true_for_allowed_mime_type(self):
        with patch.object(settings, 'TESTING', False):
            with patch('magic.from_buffer', return_value='application/pdf'):
                file = Mock()
                file.read.return_value = b'%PDF-1.4...'
                result = validate_file_type(file)
                assert result is True
                file.read.assert_called_once_with(2048)
                file.seek.assert_called_once_with(0)

    def test_returns_false_for_disallowed_mime_type(self):
        with patch.object(settings, 'TESTING', False):
            with patch('magic.from_buffer', return_value='application/x-shockwave-flash'):
                file = Mock()
                file.read.return_value = b'CWS...'
                result = validate_file_type(file)
                assert result is False

    def test_allows_all_configured_mime_types(self):
        allowed = {
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
        assert ALLOWED_MIME_TYPES == allowed

    def test_handles_import_error_gracefully(self):
        with patch.object(settings, 'TESTING', False):
            with patch('magic.from_buffer', side_effect=ImportError):
                import builtins
                original_import = builtins.__import__
                def mock_import(name, *args, **kwargs):
                    if name == 'magic':
                        raise ImportError
                    return original_import(name, *args, **kwargs)
                with patch('builtins.__import__', side_effect=mock_import):
                    file = Mock()
                    result = validate_file_type(file)
                    assert result is False

    def test_handles_read_exception_returns_false(self):
        with patch.object(settings, 'TESTING', False):
            with patch('magic.from_buffer', side_effect=Exception('read error')):
                file = Mock()
                file.read.return_value = b'some content'
                result = validate_file_type(file)
                assert result is False
