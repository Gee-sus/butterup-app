import json
from django.test import TestCase, Client
from django.urls import reverse
from api.models import Store, Product, Price
from decimal import Decimal


class CheapestEndpointTest(TestCase):
    """Test the cheapest endpoint functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = Client()
        
        # Create test stores
        self.paknsave = Store.objects.create(
            name="Pak'nSave Auckland",
            chain="paknsave",
            city="Auckland",
            location="Auckland Central",
            is_active=True
        )
        
        self.countdown = Store.objects.create(
            name="Countdown Queen Street",
            chain="countdown", 
            city="Auckland",
            location="Queen Street",
            is_active=True
        )
        
        self.new_world = Store.objects.create(
            name="New World Ponsonby",
            chain="new_world",
            city="Auckland", 
            location="Ponsonby",
            is_active=True
        )
        
        # Create test products
        self.anchor_butter = Product.objects.create(
            name="Anchor Butter",
            brand="Anchor",
            weight_grams=500,
            package_type="Block",
            is_active=True
        )
        
        self.mainland_butter = Product.objects.create(
            name="Mainland Butter",
            brand="Mainland", 
            weight_grams=500,
            package_type="Block",
            is_active=True
        )
        
        # Create test prices - Anchor at Pak'nSave should be cheapest
        Price.objects.create(
            store=self.paknsave,
            product=self.anchor_butter,
            price=Decimal('6.49'),
            price_per_kg=Decimal('12.98'),
            is_on_special=False
        )
        
        Price.objects.create(
            store=self.countdown,
            product=self.anchor_butter,
            price=Decimal('7.50'),
            price_per_kg=Decimal('15.00'),
            is_on_special=False
        )
        
        Price.objects.create(
            store=self.new_world,
            product=self.anchor_butter,
            price=Decimal('8.00'),
            price_per_kg=Decimal('16.00'),
            is_on_special=False
        )
        
        # Mainland butter prices (higher than Anchor)
        Price.objects.create(
            store=self.paknsave,
            product=self.mainland_butter,
            price=Decimal('7.00'),
            price_per_kg=Decimal('14.00'),
            is_on_special=False
        )
        
        Price.objects.create(
            store=self.countdown,
            product=self.mainland_butter,
            price=Decimal('7.80'),
            price_per_kg=Decimal('15.60'),
            is_on_special=False
        )

    def test_cheapest_endpoint_success(self):
        """Test that the cheapest endpoint returns the correct cheapest item"""
        store_ids = f"{self.paknsave.id},{self.countdown.id},{self.new_world.id}"
        url = f"/api/cheapest/?stores={store_ids}"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should return Anchor butter at Pak'nSave for $6.49
        self.assertEqual(data['brand'], 'Anchor')
        self.assertEqual(data['size'], '500g')
        self.assertEqual(data['store'], "Pak'nSave Auckland")
        self.assertEqual(data['price'], 6.49)
        self.assertEqual(data['unit'], 12.98)
        self.assertEqual(data['product_id'], self.anchor_butter.id)
        self.assertEqual(data['store_id'], self.paknsave.id)
        self.assertEqual(data['store_chain'], 'paknsave')

    def test_cheapest_endpoint_missing_stores_param(self):
        """Test that missing stores parameter returns 400 error"""
        url = "/api/cheapest/"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('stores parameter is required', data['error'])

    def test_cheapest_endpoint_invalid_store_ids(self):
        """Test that invalid store IDs return 400 error"""
        url = "/api/cheapest/?stores=invalid,ids"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('Invalid store ID format', data['error'])

    def test_cheapest_endpoint_no_stores_found(self):
        """Test that non-existent store IDs return 404 error"""
        url = "/api/cheapest/?stores=999,998"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('No active stores found', data['error'])

    def test_cheapest_endpoint_no_butter_products(self):
        """Test that stores with no butter products return 404 error"""
        # Create a store with no butter products
        empty_store = Store.objects.create(
            name="Empty Store",
            chain="paknsave",
            city="Auckland",
            is_active=True
        )
        
        url = f"/api/cheapest/?stores={empty_store.id}"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('No butter products found', data['error'])

    def test_cheapest_endpoint_single_store(self):
        """Test that single store works correctly"""
        url = f"/api/cheapest/?stores={self.paknsave.id}"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should return the cheapest butter at Pak'nSave (Anchor for $6.49)
        self.assertEqual(data['brand'], 'Anchor')
        self.assertEqual(data['price'], 6.49)
        self.assertEqual(data['store_id'], self.paknsave.id)

    def test_cheapest_endpoint_special_prices(self):
        """Test that special prices are considered"""
        # Add a special price that's even cheaper
        # Use a different product to avoid unique constraint issues
        special_butter = Product.objects.create(
            name="Special Butter",
            brand="Special",
            weight_grams=500,
            package_type="Block",
            is_active=True
        )
        
        special_price = Price.objects.create(
            store=self.countdown,
            product=special_butter,
            price=Decimal('5.99'),  # Cheaper than Anchor
            price_per_kg=Decimal('11.98'),
            is_on_special=True,
            special_price=Decimal('5.99')
        )
        
        store_ids = f"{self.paknsave.id},{self.countdown.id}"
        url = f"/api/cheapest/?stores={store_ids}"
        
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should now return Special butter at Countdown for $5.99
        self.assertEqual(data['brand'], 'Special')
        self.assertEqual(data['price'], 5.99)
        self.assertEqual(data['store_id'], self.countdown.id)
