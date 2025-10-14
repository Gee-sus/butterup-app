from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views
from rest_framework.routers import DefaultRouter
urlpatterns = [
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', views.RegisterView.as_view(), name='auth_register'),
    path('auth/google/', views.GoogleAuthView.as_view(), name='auth_google'),
    path('auth/apple/', views.AppleAuthView.as_view(), name='auth_apple'),
]

# Keep existing router/urls if any

router = DefaultRouter()
router.register(r'stores', views.StoreViewSet)
router.register(r'products-detailed', views.ProductViewSet)  # Changed to avoid conflict
router.register(r'prices', views.PriceViewSet)
router.register(r'price-alerts', views.PriceAlertViewSet, basename='price-alert')

router.register(r'nutrition', views.NutritionProfileViewSet, basename='nutrition')
router.register(r'list/items', views.ListItemViewSet, basename='list-item')
router.register(r'contributions', views.PriceContributionViewSet, basename='contribution')

urlpatterns = [
    path('', include(router.urls)),
    path('products/', views.ProductListView.as_view(), name='products-list'),
    path('products/<slug:slug>/detail/', views.ProductDetailAPIView.as_view(), name='product-detail'),
    path('products/<slug:slug>/ratings/', views.ProductRatingSubmitAPIView.as_view(), name='product-rating'),
    path('products/prices-by-gtin/', views.PricesByGTINView.as_view(), name='prices-by-gtin'),
    path('upload-image/', views.ImageUploadView.as_view(), name='upload-image'),
    path('scan/submit/', views.ScanSubmitAPIView.as_view(), name='scan-submit'),
    path('cheapest/', views.CheapestView.as_view(), name='cheapest'),
    path('quick-compare/', views.QuickCompareView.as_view(), name='quick-compare'),
    path('me/', views.UserProfileView.as_view(), name='user-profile'),
] 
