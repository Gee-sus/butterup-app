"""
URL configuration for butter_tracker project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from photo_compare.views import IdentifyByPhoto, ComparePrices, SuggestProducts

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='api-docs'),
    path('api/', include('api.urls')),
    path('api/', include('pricing.urls')),
    path('api/photo/identify', IdentifyByPhoto.as_view(), name='photo-identify'),
    path('api/compare', ComparePrices.as_view(), name='photo-compare'),
    path('api/products/suggest', SuggestProducts.as_view(), name='photo-suggest'),
]

# Serve static files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT) 
