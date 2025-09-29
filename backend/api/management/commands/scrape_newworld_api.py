from django.core.management.base import BaseCommand
from tasks.api_scraping_tasks import scrape_newworld_prices, scrape_multiple_newworld_stores

class Command(BaseCommand):
    help = 'Scrape New World prices using their API'

    def add_arguments(self, parser):
        parser.add_argument(
            '--store-id',
            type=str,
            default='51112',
            help='New World store ID (default: 51112)'
        )
        parser.add_argument(
            '--search-term',
            type=str,
            default='butter',
            help='Search term for products (default: butter)'
        )
        parser.add_argument(
            '--multiple',
            action='store_true',
            help='Scrape multiple stores and search terms'
        )
        parser.add_argument(
            '--store-ids',
            nargs='+',
            type=str,
            default=['51112', '51113', '51114'],
            help='List of store IDs for multiple scraping'
        )
        parser.add_argument(
            '--search-terms',
            nargs='+',
            type=str,
            default=['butter', 'margarine', 'spread'],
            help='List of search terms for multiple scraping'
        )
        parser.add_argument(
            '--direct',
            action='store_true',
            help='Run multiple scraping directly without Celery (for testing)'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🧈 Starting New World API Scraping')
        )
        
        if options['multiple']:
            if options['direct']:
                self.stdout.write('Running multiple store scraping directly...')
                # Run directly without Celery
                total_saved = 0
                for store_id in options['store_ids']:
                    for search_term in options['search_terms']:
                        self.stdout.write(f'Scraping store {store_id}, search "{search_term}"...')
                        result = scrape_newworld_prices(store_id, search_term)
                        self.stdout.write(f'Result: {result}')
                        total_saved += 1
                self.stdout.write(f'Completed {total_saved} scraping tasks')
            else:
                self.stdout.write('Running multiple store scraping with Celery...')
                result = scrape_multiple_newworld_stores(
                    store_ids=options['store_ids'],
                    search_terms=options['search_terms']
                )
                self.stdout.write(f'Result: {result}')
        else:
            self.stdout.write(f'Running single store scraping for store {options["store_id"]}, search "{options["search_term"]}"...')
            result = scrape_newworld_prices(
                store_id=options['store_id'],
                search_term=options['search_term']
            )
            self.stdout.write(f'Result: {result}')
        
        self.stdout.write(
            self.style.SUCCESS('✅ New World API scraping completed!')
        ) 