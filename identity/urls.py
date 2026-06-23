from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='auth-verify-email'),
    path(
        'resend-verification/',
        views.ResendVerificationView.as_view(),
        name='auth-resend-verification',
    ),
    path(
        'forgot-password/',
        views.ForgotPasswordView.as_view(),
        name='auth-forgot-password',
    ),
    path(
        'reset-password/',
        views.ResetPasswordView.as_view(),
        name='auth-reset-password',
    ),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('mfa/setup/', views.MFASetupView.as_view(), name='auth-mfa-setup'),
    path('mfa/verify/', views.MFAVerifyView.as_view(), name='auth-mfa-verify'),
]
