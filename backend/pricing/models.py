from django.db import models


class Store(models.Model):
    """Store model for butterup_api"""
    name = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.name


class Product(models.Model):
    """Product model for butterup_api"""
    brand = models.CharField(max_length=100)
    size = models.CharField(max_length=100)
    
    class Meta:
        unique_together = ('brand', 'size')
    
    def __str__(self):
        return f"{self.brand} {self.size}"


class Price(models.Model):
    """Price model for butterup_api"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='prices')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='prices')
    price = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.DecimalField(max_digits=5, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.product} at {self.store}: ${self.price}"