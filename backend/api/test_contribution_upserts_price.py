"""
Test for price contribution upsert functionality
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from api.models import Product, Store, Price, PriceContribution


class PriceContributionUpsertTest(APITestCase):
    """Test that price contributions properly upsert price records"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test product (Anchor butter)
        self.product = Product.objects.create(
            name='Butter Block',
            brand='Anchor',
            weight_grams=500,
            package_type='Block'
        )
        
        # Create test store (Pak'nSave)
        self.store = Store.objects.create(
            name='Pak\'nSave Auckland',
            chain='paknsave',
            city='Auckland',
            location='Auckland Central'
        )
        
        # Create initial price
        self.initial_price = Price.objects.create(
            product=self.product,
            store=self.store,
            price=5.99
        )
    
    def test_contribution_upserts_price(self):
        """Test that posting Anchor @ Pak'nSave 6.39 → grouped endpoint reflects 6.39"""
        
        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # Post new contribution
        contribution_data = {
            'product_id': self.product.id,
            'store_id': self.store.id,
            'price': 6.39,
            'unit': 'each'
        }
        
        url = reverse('contribution-list')
        response = self.client.post(url, contribution_data, format='json')
        
        # Check contribution was created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PriceContribution.objects.count(), 1)
        
        contribution = PriceContribution.objects.first()
        self.assertEqual(float(contribution.price), 6.39)
        self.assertEqual(contribution.product, self.product)
        self.assertEqual(contribution.store, self.store)
        
        # Check that price was upserted
        updated_price = Price.objects.get(
            product=self.product,
            store=self.store
        )
        self.assertEqual(float(updated_price.price), 6.39)
        
        # Verify the grouped endpoint reflects the new price
        # Get latest prices for this store
        latest_prices_url = reverse('price-by-store-latest', kwargs={'store_id': self.store.id})
        response = self.client.get(latest_prices_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        prices_data = response.data
        
        # Find our product in the response
        our_product_price = None
        for price_data in prices_data:
            if price_data['product']['id'] == self.product.id:
                our_product_price = price_data
                break
        
        self.assertIsNotNone(our_product_price, f"Our product should be in the latest prices. Available products: {[p['product']['id'] for p in prices_data]}")
        self.assertEqual(our_product_price['price'], '6.39')
    
    def test_multiple_contributions_update_price(self):
        """Test that multiple contributions update the price correctly"""
        
        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # First contribution
        contribution_data_1 = {
            'product_id': self.product.id,
            'store_id': self.store.id,
            'price': 6.39,
            'unit': 'each'
        }
        
        url = reverse('contribution-list')
        response = self.client.post(url, contribution_data_1, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Second contribution with different price
        contribution_data_2 = {
            'product_id': self.product.id,
            'store_id': self.store.id,
            'price': 7.50,
            'unit': 'each'
        }
        
        response = self.client.post(url, contribution_data_2, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that we have 2 contributions
        self.assertEqual(PriceContribution.objects.count(), 2)
        
        # Check that the price was updated to the latest contribution
        updated_price = Price.objects.get(
            product=self.product,
            store=self.store
        )
        self.assertEqual(float(updated_price.price), 7.50)
    
    def test_contribution_validation(self):
        """Test that contribution validation works correctly"""
        
        # Authenticate the client
        self.client.force_authenticate(user=self.user)
        
        # Test with invalid product_id
        invalid_data = {
            'product_id': 99999,  # Non-existent product
            'store_id': self.store.id,
            'price': 6.39,
            'unit': 'each'
        }
        
        url = reverse('contribution-list')
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with invalid store_id
        invalid_data = {
            'product_id': self.product.id,
            'store_id': 99999,  # Non-existent store
            'price': 6.39,
            'unit': 'each'
        }
        
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with invalid price
        invalid_data = {
            'product_id': self.product.id,
            'store_id': self.store.id,
            'price': -1.00,  # Negative price
            'unit': 'each'
        }
        
        response = self.client.post(url, invalid_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
