from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        message = response.data
        if isinstance(response.data, dict) and 'detail' in response.data:
            message = response.data['detail']
        response.data = {
            'error': {
                'code': str(response.status_code),
                'message': message,
            }
        }
    return response
