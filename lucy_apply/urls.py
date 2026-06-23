from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from lucy_apply.api_router import router

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('identity.urls')),
    path('api/v1/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
