from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter

from lucy_apply.api_router import router
from payments.views import payment_webhook
from identity.admin_views import AdminStatsView, AdminUsersView, AdminUserStatusView
from audit.views import AuditLogViewSet

admin_router = DefaultRouter()
admin_router.register('audit-log', AuditLogViewSet, basename='admin-audit-log')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('identity.urls')),
    path('api/v1/', include(router.urls)),
    path('api/v1/admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('api/v1/admin/users/', AdminUsersView.as_view(), name='admin-users'),
    path('api/v1/admin/users/<uuid:pk>/status/', AdminUserStatusView.as_view(), name='admin-user-status'),
    path('api/v1/admin/', include(admin_router.urls)),
    path('api/v1/payments/webhook/', payment_webhook, name='payment-webhook'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
