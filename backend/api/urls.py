from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

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
    path('upload-image/', views.ImageUploadView.as_view(), name='upload-image'),
    path('cheapest/', views.CheapestView.as_view(), name='cheapest'),
    path('quick-compare/', views.QuickCompareView.as_view(), name='quick-compare'),
    path('me/', views.UserProfileView.as_view(), name='user-profile'),
] 