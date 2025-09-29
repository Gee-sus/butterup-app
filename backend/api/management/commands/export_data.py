from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Store, Product, Price, EconomicIndicator
import json
import csv
import os
from datetime import datetime, timedelta


class Command(BaseCommand):
    help = 'Export butter price data to CSV/JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            type=str,
            choices=['csv', 'json'],
            default='csv',
            help='Export format (csv or json)'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to export (default: 30)'
        )
        parser.add_argument(
            '--output-dir',
            type=str,
            default='exports',
            help='Output directory for exported files'
        )
        parser.add_argument(
            '--include-analytics',
            action='store_true',
            help='Include analytics data in export'
        )

    def handle(self, *args, **options):
        export_format = options['format']
        days = options['days']
        output_dir = options['output_dir']
        include_analytics = options['include_analytics']

        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Get date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        self.stdout.write(
            self.style.SUCCESS(f'📊 Exporting butter price data...')
        )
        self.stdout.write(f'📅 Date range: {start_date.date()} to {end_date.date()}')
        self.stdout.write(f'📁 Output directory: {output_dir}')

        # Export prices
        prices = Price.objects.filter(
            recorded_at__gte=start_date
        ).select_related('store', 'product').order_by('recorded_at')

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if export_format == 'csv':
            self._export_csv(prices, output_dir, timestamp, include_analytics)
        else:
            self._export_json(prices, output_dir, timestamp, include_analytics)

        self.stdout.write(
            self.style.SUCCESS(f'✅ Export completed successfully!')
        )

    def _export_csv(self, prices, output_dir, timestamp, include_analytics):
        """Export data to CSV format"""
        
        # Main prices file
        prices_file = os.path.join(output_dir, f'butter_prices_{timestamp}.csv')
        
        with open(prices_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'date', 'store_name', 'store_chain', 'product_name', 
                'product_brand', 'weight_grams', 'price', 'price_per_kg',
                'is_on_special', 'special_price', 'special_end_date'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for price in prices:
                writer.writerow({
                    'date': price.recorded_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'store_name': price.store.name,
                    'store_chain': price.store.chain,
                    'product_name': price.product.name,
                    'product_brand': price.product.brand,
                    'weight_grams': price.product.weight_grams,
                    'price': float(price.price),
                    'price_per_kg': float(price.price_per_kg) if price.price_per_kg else None,
                    'is_on_special': price.is_on_special,
                    'special_price': float(price.special_price) if price.special_price else None,
                    'special_end_date': price.special_end_date.strftime('%Y-%m-%d') if price.special_end_date else None
                })
        
        self.stdout.write(f'📄 Prices exported to: {prices_file}')
        
        # Analytics file (if requested)
        if include_analytics:
            analytics_file = os.path.join(output_dir, f'butter_analytics_{timestamp}.csv')
            
            with open(analytics_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = [
                    'date', 'store_name', 'product_name', 'avg_price', 
                    'min_price', 'max_price', 'price_count'
                ]
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                # Group by date and store
                from django.db.models import Avg, Min, Max, Count
                
                analytics = prices.extra(
                    select={'date': 'DATE(recorded_at)'}
                ).values('date', 'store__name', 'product__name').annotate(
                    avg_price=Avg('price'),
                    min_price=Min('price'),
                    max_price=Max('price'),
                    price_count=Count('id')
                ).order_by('date', 'store__name')
                
                for item in analytics:
                    writer.writerow({
                        'date': item['date'],
                        'store_name': item['store__name'],
                        'product_name': item['product__name'],
                        'avg_price': float(item['avg_price']),
                        'min_price': float(item['min_price']),
                        'max_price': float(item['max_price']),
                        'price_count': item['price_count']
                    })
            
            self.stdout.write(f'📊 Analytics exported to: {analytics_file}')

    def _export_json(self, prices, output_dir, timestamp, include_analytics):
        """Export data to JSON format"""
        
        # Main prices file
        prices_file = os.path.join(output_dir, f'butter_prices_{timestamp}.json')
        
        prices_data = []
        for price in prices:
            prices_data.append({
                'date': price.recorded_at.isoformat(),
                'store': {
                    'name': price.store.name,
                    'chain': price.store.chain,
                    'location': price.store.location
                },
                'product': {
                    'name': price.product.name,
                    'brand': price.product.brand,
                    'weight_grams': price.product.weight_grams,
                    'package_type': price.product.package_type
                },
                'price': float(price.price),
                'price_per_kg': float(price.price_per_kg) if price.price_per_kg else None,
                'is_on_special': price.is_on_special,
                'special_price': float(price.special_price) if price.special_price else None,
                'special_end_date': price.special_end_date.isoformat() if price.special_end_date else None
            })
        
        with open(prices_file, 'w', encoding='utf-8') as jsonfile:
            json.dump({
                'export_date': timezone.now().isoformat(),
                'total_records': len(prices_data),
                'data': prices_data
            }, jsonfile, indent=2, ensure_ascii=False)
        
        self.stdout.write(f'📄 Prices exported to: {prices_file}')
        
        # Analytics file (if requested)
        if include_analytics:
            analytics_file = os.path.join(output_dir, f'butter_analytics_{timestamp}.json')
            
            from django.db.models import Avg, Min, Max, Count
            
            analytics = prices.extra(
                select={'date': 'DATE(recorded_at)'}
            ).values('date', 'store__name', 'product__name').annotate(
                avg_price=Avg('price'),
                min_price=Min('price'),
                max_price=Max('price'),
                price_count=Count('id')
            ).order_by('date', 'store__name')
            
            analytics_data = []
            for item in analytics:
                analytics_data.append({
                    'date': item['date'],
                    'store_name': item['store__name'],
                    'product_name': item['product__name'],
                    'avg_price': float(item['avg_price']),
                    'min_price': float(item['min_price']),
                    'max_price': float(item['max_price']),
                    'price_count': item['price_count']
                })
            
            with open(analytics_file, 'w', encoding='utf-8') as jsonfile:
                json.dump({
                    'export_date': timezone.now().isoformat(),
                    'total_records': len(analytics_data),
                    'data': analytics_data
                }, jsonfile, indent=2, ensure_ascii=False)
            
            self.stdout.write(f'📊 Analytics exported to: {analytics_file}') 