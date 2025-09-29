from django.urls import path
from . import views

urlpatterns = [
    path('pricing-stores/', views.StoreListView.as_view(), name='pricing-store-list'),
    path('grouped-prices/', views.grouped_prices, name='grouped-prices'),
]
