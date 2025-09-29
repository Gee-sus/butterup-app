from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from .models import Store, Product, Price


class GroupedPricesTestCase(APITestCase):
    """Test case for grouped prices endpoint"""
    
    def setUp(self):
        """Set up test data"""
        # Clear any existing data first
        Price.objects.all().delete()
        Product.objects.all().delete()
        Store.objects.all().delete()
        
        # Create stores
        self.stores = {
            "Pak'nSave": Store.objects.create(name="Pak'nSave"),
            "Woolworths": Store.objects.create(name="Woolworths"),
            "New World": Store.objects.create(name="New World"),
        }
        
        # Create products
        self.anchor_product = Product.objects.create(brand="Anchor", size="500g")
        self.mainland_product = Product.objects.create(brand="Mainland", size="500g")
        
        # Create prices
        # Anchor 500g prices
        Price.objects.create(
            product=self.anchor_product,
            store=self.stores["Pak'nSave"],
            price=Decimal('6.49'),
            unit=Decimal('1.30')
        )
        Price.objects.create(
            product=self.anchor_product,
            store=self.stores["Woolworths"],
            price=Decimal('6.99'),
            unit=Decimal('1.40')
        )
        Price.objects.create(
            product=self.anchor_product,
            store=self.stores["New World"],
            price=Decimal('7.29'),
            unit=Decimal('1.46')
        )
        
        # Mainland 500g prices
        Price.objects.create(
            product=self.mainland_product,
            store=self.stores["Pak'nSave"],
            price=Decimal('7.29'),
            unit=Decimal('1.46')
        )
        Price.objects.create(
            product=self.mainland_product,
            store=self.stores["Woolworths"],
            price=Decimal('7.49'),
            unit=Decimal('1.50')
        )
        Price.objects.create(
            product=self.mainland_product,
            store=self.stores["New World"],
            price=Decimal('7.89'),
            unit=Decimal('1.58')
        )
    
    def test_grouped_prices_returns_two_rows_anchor_first(self):
        """Test that grouped prices endpoint returns 2 rows with Anchor first"""
        url = reverse('grouped-prices')
        
        # Test with the 3 stores
        stores_param = "Pak'nSave,Woolworths,New World"
        response = self.client.get(url, {'stores': stores_param})
        
        # Assert 200 status
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Assert 2 rows
        self.assertEqual(len(response.data), 2)
        
        # Assert first row is Anchor 500g
        first_row = response.data[0]
        self.assertEqual(first_row['brand'], 'Anchor')
        self.assertEqual(first_row['size'], '500g')
        # Note: The unit should be 1.30 based on the Pak'nSave price (cheapest)
        self.assertEqual(first_row['unit'], 1.30)
        
        # Assert Anchor prices
        expected_anchor_prices = {
            "Pak'nSave": 6.49,
            "Woolworths": 6.99,
            "New World": 7.29
        }
        self.assertEqual(first_row['prices'], expected_anchor_prices)
        
        # Assert second row is Mainland 500g
        second_row = response.data[1]
        self.assertEqual(second_row['brand'], 'Mainland')
        self.assertEqual(second_row['size'], '500g')
        self.assertEqual(second_row['unit'], 1.46)
        
        # Assert Mainland prices
        expected_mainland_prices = {
            "Pak'nSave": 7.29,
            "Woolworths": 7.49,
            "New World": 7.89
        }
        self.assertEqual(second_row['prices'], expected_mainland_prices)
    
    def test_grouped_prices_missing_stores_parameter(self):
        """Test that grouped prices endpoint returns 400 when stores parameter is missing"""
        url = reverse('grouped-prices')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_grouped_prices_invalid_stores(self):
        """Test that grouped prices endpoint returns 400 when stores don't exist"""
        url = reverse('grouped-prices')
        response = self.client.get(url, {'stores': 'NonExistentStore'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class StoreListViewTestCase(APITestCase):
    """Test case for stores list endpoint"""
    
    def setUp(self):
        """Set up test data"""
        # Clear any existing stores first
        Store.objects.all().delete()
        
        self.stores = [
            Store.objects.create(name="Pak'nSave"),
            Store.objects.create(name="Woolworths"),
            Store.objects.create(name="New World"),
            Store.objects.create(name="Asian Mart"),
        ]
    
    def test_stores_list_returns_all_stores(self):
        """Test that stores endpoint returns all stores"""
        url = reverse('pricing-store-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Handle pagination - check if response.data has 'results' key
        if 'results' in response.data:
            stores_data = response.data['results']
        else:
            stores_data = response.data
            
        self.assertEqual(len(stores_data), 4)
        
        store_names = [store['name'] for store in stores_data]
        expected_names = ["Pak'nSave", "Woolworths", "New World", "Asian Mart"]
        self.assertEqual(set(store_names), set(expected_names))