from django.core.management.base import BaseCommand
from tasks.scraping_tasks import (
    scrape_all_stores, 
    check_price_alerts, 
    send_weekly_price_update,
    cleanup_old_data,
    backup_price_data,
    generate_weekly_report
)

class Command(BaseCommand):
    help = 'Test Celery tasks'

    def add_arguments(self, parser):
        parser.add_argument(
            '--task',
            type=str,
            choices=['scrape', 'alerts', 'weekly', 'cleanup', 'backup', 'report', 'all'],
            default='all',
            help='Which task to test'
        )

    def handle(self, *args, **options):
        task = options['task']
        
        self.stdout.write(
            self.style.SUCCESS('🧈 Testing Celery Tasks')
        )
        
        if task == 'scrape' or task == 'all':
            self.stdout.write('Testing scrape_all_stores...')
            result = scrape_all_stores.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        if task == 'alerts' or task == 'all':
            self.stdout.write('Testing check_price_alerts...')
            result = check_price_alerts.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        if task == 'weekly' or task == 'all':
            self.stdout.write('Testing send_weekly_price_update...')
            result = send_weekly_price_update.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        if task == 'cleanup' or task == 'all':
            self.stdout.write('Testing cleanup_old_data...')
            result = cleanup_old_data.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        if task == 'backup' or task == 'all':
            self.stdout.write('Testing backup_price_data...')
            result = backup_price_data.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        if task == 'report' or task == 'all':
            self.stdout.write('Testing generate_weekly_report...')
            result = generate_weekly_report.delay()
            self.stdout.write(f'Task ID: {result.id}')
            
        self.stdout.write(
            self.style.SUCCESS('✅ Celery task testing completed!')
        ) 