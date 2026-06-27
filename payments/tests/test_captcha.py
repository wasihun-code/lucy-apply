from unittest.mock import patch, Mock

from django.conf import settings

from payments.captcha import verify_recaptcha


class TestVerifyRecaptcha:
    def test_returns_true_when_debug_is_true(self):
        with patch.object(settings, 'DEBUG', True):
            with patch.object(settings, 'TESTING', False):
                result = verify_recaptcha('some-token')
                assert result is True

    def test_returns_true_when_testing_is_true(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', True):
                result = verify_recaptcha('some-token')
                assert result is True

    def test_returns_true_when_api_responds_success(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', False):
                with patch('requests.post') as mock_post:
                    mock_post.return_value.json.return_value = {'success': True, 'score': 0.9}
                    result = verify_recaptcha('valid-token')
                    assert result is True
                    mock_post.assert_called_once()
                    call_kwargs = mock_post.call_args[1]
                    assert call_kwargs['data']['response'] == 'valid-token'
                    assert call_kwargs['data']['secret'] == settings.RECAPTCHA_SECRET_KEY

    def test_returns_false_when_api_responds_failure(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', False):
                with patch('requests.post') as mock_post:
                    mock_post.return_value.json.return_value = {'success': False}
                    result = verify_recaptcha('invalid-token')
                    assert result is False

    def test_returns_false_on_network_error(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', False):
                with patch('requests.post') as mock_post:
                    mock_post.side_effect = Exception('Connection refused')
                    result = verify_recaptcha('token')
                    assert result is False

    def test_returns_false_when_score_below_threshold(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', False):
                with patch('requests.post') as mock_post:
                    mock_post.return_value.json.return_value = {'success': True, 'score': 0.3}
                    result = verify_recaptcha('token')
                    assert result is False

    def test_returns_false_when_api_response_missing_success_key(self):
        with patch.object(settings, 'DEBUG', False):
            with patch.object(settings, 'TESTING', False):
                with patch('requests.post') as mock_post:
                    mock_post.return_value.json.return_value = {}
                    result = verify_recaptcha('token')
                    assert result is False
