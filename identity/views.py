import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Applicant, EmailVerificationToken, PasswordResetToken
from .permissions import IsUniversityStaff, IsPlatformAdmin
from .serializers import RegisterSerializer

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        applicant = serializer.save()
        token = EmailVerificationToken.objects.create(applicant=applicant)
        logger.info(f'Verification email for {applicant.email}: {token.token}')
        return Response(
            {
                'id': str(applicant.id),
                'email': applicant.email,
                'full_name': applicant.full_name,
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        token_value = request.data.get('token', '')
        applicant = get_object_or_404(Applicant, email=email)
        token = get_object_or_404(
            EmailVerificationToken,
            applicant=applicant,
            token=token_value,
            used=False,
        )
        if token.expires_at < timezone.now():
            return Response(
                {'error': {'code': '400', 'message': 'Verification token has expired'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token.used = True
        token.save(update_fields=['used'])
        applicant.email_verified = True
        applicant.save(update_fields=['email_verified'])
        return Response({'detail': 'Email verified successfully'})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        applicant = get_object_or_404(Applicant, email=email)
        if applicant.email_verified:
            return Response(
                {'detail': 'Email already verified'},
                status=status.HTTP_200_OK,
            )
        EmailVerificationToken.objects.filter(
            applicant=applicant, used=False
        ).update(used=True)
        token = EmailVerificationToken.objects.create(applicant=applicant)
        logger.info(f'Resent verification email for {applicant.email}: {token.token}')
        return Response({'detail': 'Verification email sent'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        applicant = get_object_or_404(Applicant, email=email)
        PasswordResetToken.objects.filter(
            applicant=applicant, used=False
        ).update(used=True)
        token = PasswordResetToken.objects.create(applicant=applicant)
        logger.info(f'Password reset for {applicant.email}: {token.token}')
        return Response({'detail': 'Password reset email sent'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        token_value = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        applicant = get_object_or_404(Applicant, email=email)
        token = get_object_or_404(
            PasswordResetToken,
            applicant=applicant,
            token=token_value,
            used=False,
        )
        if not token.is_valid():
            return Response(
                {'error': {'code': '400', 'message': 'Reset token has expired'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token.used = True
        token.save(update_fields=['used'])
        applicant.set_password(new_password)
        applicant.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully'})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            pass
        return Response(status=status.HTTP_400_BAD_REQUEST)


class MFASetupView(APIView):
    permission_classes = [IsAuthenticated, IsUniversityStaff | IsPlatformAdmin]

    def post(self, request):
        user = request.user
        device = user.totpdevice_set.create(name='default')
        return Response(
            {
                'provisioning_uri': device.config_url,
            }
        )


class MFAVerifyView(APIView):
    permission_classes = [IsAuthenticated, IsUniversityStaff | IsPlatformAdmin]

    def post(self, request):
        code = request.data.get('code', '')
        user = request.user
        device = user.totpdevice_set.first()
        if device and device.verify(code):
            request.session['mfa_verified'] = True
            return Response({'detail': 'MFA verified successfully'})
        return Response(
            {'error': {'code': '400', 'message': 'Invalid MFA code'}},
            status=status.HTTP_400_BAD_REQUEST,
        )
