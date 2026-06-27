import logging

from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone

from django.conf import settings

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import User, Applicant, EmailVerificationToken, PasswordResetToken, StaffInviteToken
from .permissions import IsUniversityStaff, IsPlatformAdmin, IsApplicant
from .serializers import RegisterSerializer, ApplicantSerializer
from .throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle, MFARateThrottle

logger = logging.getLogger(__name__)


class CustomTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email', '').lower().strip()
        if email:
            user = User.objects.filter(email=email).first()
            if user and user.account_status != 'active':
                return Response(
                    {'error': {'code': '403', 'message': 'Invalid credentials'}},
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().post(request, *args, **kwargs)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        applicant = serializer.save()
        if settings.DEBUG:
            applicant.email_verified = True
            applicant.save(update_fields=['email_verified'])
        else:
            EmailVerificationToken.objects.create(applicant=applicant)
            logger.info('Verification email created for applicant %s', applicant.id)
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
        email = Applicant.objects.normalize_email(request.data.get('email', '')).lower()
        token_value = request.data.get('token', '')
        applicant = Applicant.objects.filter(email=email).first()
        if not applicant:
            return Response(
                {'error': {'code': '400', 'message': 'Invalid verification token'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = EmailVerificationToken.objects.filter(
            applicant=applicant,
            token=token_value,
            used=False,
        ).first()
        if not token or token.expires_at < timezone.now():
            return Response(
                {'error': {'code': '400', 'message': 'Invalid verification token'}},
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
        email = Applicant.objects.normalize_email(request.data.get('email', '')).lower()
        applicant = Applicant.objects.filter(email=email).first()
        if applicant and not applicant.email_verified:
            EmailVerificationToken.objects.filter(
                applicant=applicant, used=False
            ).update(used=True)
            token = EmailVerificationToken.objects.create(applicant=applicant)
            logger.info('Resent verification email for applicant %s', applicant.id)
        return Response({'detail': 'Verification email sent'})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        email = Applicant.objects.normalize_email(request.data.get('email', '')).lower()
        applicant = Applicant.objects.filter(email=email).first()
        if applicant and applicant.account_status == 'active':
            PasswordResetToken.objects.filter(
                applicant=applicant, used=False
            ).update(used=True)
            PasswordResetToken.objects.create(applicant=applicant)
            logger.info('Password reset requested for applicant %s', applicant.id)
        return Response({'detail': 'Password reset email sent'})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = Applicant.objects.normalize_email(request.data.get('email', '')).lower()
        token_value = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        if not new_password:
            return Response(
                {'error': {'code': '400', 'message': 'new_password is required'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        applicant = Applicant.objects.filter(email=email).first()
        if not applicant:
            return Response(
                {'error': {'code': '400', 'message': 'Invalid reset token'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = PasswordResetToken.objects.filter(
            applicant=applicant,
            token=token_value,
            used=False,
        ).first()
        if not token or not token.is_valid():
            return Response(
                {'error': {'code': '400', 'message': 'Invalid reset token'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token.used = True
        token.save(update_fields=['used'])
        applicant.set_password(new_password)
        applicant.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully'})


class SetStaffPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token_value = request.data.get('token', '')
        new_password = request.data.get('new_password', '')
        if not new_password or len(new_password) < 8:
            return Response(
                {'error': {'code': '400', 'message': 'Password must be at least 8 characters'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = get_object_or_404(
            StaffInviteToken,
            token=token_value,
            used=False,
        )
        if not token.is_valid():
            return Response(
                {'error': {'code': '400', 'message': 'Invite token has expired'}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        token.used = True
        token.save(update_fields=['used'])
        staff = token.university_staff
        staff.set_password(new_password)
        staff.save(update_fields=['password'])
        return Response({'detail': 'Password set successfully. You can now log in.'})


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
    throttle_classes = [MFARateThrottle]

    def post(self, request):
        user = request.user
        device = user.totpdevice_set.first()
        if device:
            return Response(
                {
                    'provisioning_uri': device.config_url,
                }
            )
        device = user.totpdevice_set.create(name='default')
        return Response(
            {
                'provisioning_uri': device.config_url,
            }
        )


class MFAVerifyView(APIView):
    permission_classes = [IsAuthenticated, IsUniversityStaff | IsPlatformAdmin]
    throttle_classes = [MFARateThrottle]
    MAX_ATTEMPTS = 5
    LOCKOUT_MINUTES = 5

    def post(self, request):
        code = request.data.get('code', '')
        user = request.user
        lockout_until = request.session.get('mfa_lockout_until')
        if lockout_until:
            from django.utils.dateparse import parse_datetime
            if timezone.now() < parse_datetime(lockout_until):
                return Response(
                    {'error': {'code': '429', 'message': 'Too many attempts. Try again later.'}},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            else:
                del request.session['mfa_lockout_until']
                request.session['mfa_remaining_attempts'] = self.MAX_ATTEMPTS
        device = user.totpdevice_set.first()
        if device and device.verify_token(code):
            request.session['mfa_verified'] = True
            request.session['mfa_remaining_attempts'] = self.MAX_ATTEMPTS
            return Response({'detail': 'MFA verified successfully'})
        remaining = request.session.get('mfa_remaining_attempts', self.MAX_ATTEMPTS) - 1
        request.session['mfa_remaining_attempts'] = remaining
        if remaining <= 0:
            request.session['mfa_lockout_until'] = (
                timezone.now() + timedelta(minutes=self.LOCKOUT_MINUTES)
            ).isoformat()
            request.session['mfa_remaining_attempts'] = self.MAX_ATTEMPTS
            return Response(
                {'error': {'code': '429', 'message': 'Too many attempts. Try again later.'}},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(
            {
                'error': {'code': '400', 'message': 'Invalid MFA code'},
                'remaining_attempts': remaining,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ApplicantViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsApplicant]
    serializer_class = ApplicantSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user.applicant)
        return Response(serializer.data)


class AuthMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if hasattr(user, 'applicant'):
            return Response({
                'role': 'applicant',
                'email': user.email,
                'full_name': user.full_name,
            })
        if hasattr(user, 'universitystaff'):
            staff = user.universitystaff
            return Response({
                'role': 'universitystaff',
                'email': user.email,
                'full_name': user.full_name,
                'university': str(staff.university_id),
                'university_name': staff.university.name,
                'permission_level': staff.permission_level,
                'mfa_enabled': user.totpdevice_set.exists(),
                'mfa_verified': request.session.get('mfa_verified', False),
            })
        if hasattr(user, 'platformadmin'):
            return Response({
                'role': 'platformadmin',
                'email': user.email,
                'full_name': user.full_name,
                'mfa_enabled': user.totpdevice_set.exists(),
                'mfa_verified': request.session.get('mfa_verified', False),
            })
        return Response({
            'role': 'unknown',
            'email': user.email,
            'full_name': user.full_name,
        })
