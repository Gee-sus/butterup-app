from __future__ import annotations

from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=120, blank=True)
    gtin = models.CharField(max_length=14, null=True, blank=True)
    size_g = models.IntegerField(null=True, blank=True)
    alt_names = models.TextField(blank=True)

    class Meta:
        ordering = ['brand', 'name']

    def __str__(self) -> str:
        display = self.name
        if self.brand:
            display = f'{self.brand} {display}'
        if self.size_g:
            display = f'{display} ({self.size_g}g)'
        return display

    def aliases(self) -> list[str]:
        aliases = [self.name]
        if self.brand:
            aliases.append(f'{self.brand} {self.name}')
        if self.alt_names:
            aliases.extend([alt.strip() for alt in self.alt_names.split(',') if alt.strip()])
        return aliases


class Store(models.Model):
    chain = models.CharField(max_length=120)
    name = models.CharField(max_length=255)
    lat = models.FloatField()
    lng = models.FloatField()
    address = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['chain', 'name']

    def __str__(self) -> str:
        return f'{self.chain} - {self.name}'


class Price(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='photo_prices')
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='photo_prices')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=3, default='NZD')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'store')
        ordering = ['price', '-updated_at']

    def __str__(self) -> str:
        return f'{self.product} @ {self.store}: {self.price} {self.currency}'
