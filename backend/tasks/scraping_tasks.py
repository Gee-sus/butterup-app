from celery import shared_task
from django.core.management import call_command
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from api.models import Price, Product, Store, PriceAlert, EmailSubscription
from decimal import Decimal
import logging
from datetime import datetime, timedelta
import csv
import os

logger = logging.getLogger(__name__)

@shared_task
def scrape_all_stores():
    """Scrape all stores and save to database"""
    try:
        logger.info("Starting automated scraping of all stores")
        call_command('scrape_prices', stores=['countdown', 'paknsave', 'newworld'], verbose=True)
        logger.info("Automated scraping completed successfully")
        return "Scraping completed successfully"
    except Exception as e:
        logger.error(f"Automated scraping failed: {e}")
        return f"Scraping failed: {e}"

@shared_task
def scrape_specific_stores(store_names, use_test=False):
    """Scrape specific stores"""
    try:
        logger.info(f"Starting automated scraping of stores: {store_names}")
        call_command('scrape_prices', stores=store_names, test=use_test, verbose=True)
        logger.info("Specific store scraping completed successfully")
        return "Specific store scraping completed successfully"
    except Exception as e:
        logger.error(f"Specific store scraping failed: {e}")
        return f"Specific store scraping failed: {e}"

@shared_task
def check_price_alerts():
    """Check for price changes and send alerts"""
    try:
        logger.info("Checking for price alerts")
        
        # Get all price alerts
        alerts = PriceAlert.objects.filter(is_active=True)
        alert_count = 0
        
        for alert in alerts:
            try:
                # Get the latest price for the product
                latest_price = Price.objects.filter(
                    product=alert.product,
                    store=alert.store
                ).order_by('-recorded_at').first()
                
                if not latest_price:
                    continue
                
                # Check if price has changed significantly
                price_change = abs(latest_price.price - alert.target_price)
                price_change_percent = (price_change / alert.target_price) * 100
                
                if price_change_percent >= alert.threshold_percent:
                    # Send email alert
                    send_price_alert_email(alert, latest_price, price_change_percent)
                    alert_count += 1
                    
            except Exception as e:
                logger.error(f"Error processing alert {alert.id}: {e}")
                continue
        
        logger.info(f"Price alert check completed. {alert_count} alerts sent")
        return f"Price alert check completed. {alert_count} alerts sent"
        
    except Exception as e:
        logger.error(f"Price alert check failed: {e}")
        return f"Price alert check failed: {e}"

@shared_task
def send_weekly_price_update():
    """Send weekly price update to subscribers"""
    try:
        logger.info("Sending weekly price updates")
        
        # Get all email subscriptions
        subscriptions = EmailSubscription.objects.filter(is_active=True)
        
        # Generate weekly report
        report_data = generate_weekly_report_data()
        
        for subscription in subscriptions:
            try:
                send_weekly_update_email(subscription.email, report_data)
            except Exception as e:
                logger.error(f"Error sending weekly update to {subscription.email}: {e}")
                continue
        
        logger.info(f"Weekly price updates sent to {len(subscriptions)} subscribers")
        return f"Weekly price updates sent to {len(subscriptions)} subscribers"
        
    except Exception as e:
        logger.error(f"Weekly price update failed: {e}")
        return f"Weekly price update failed: {e}"

@shared_task
def cleanup_old_data():
    """Clean up old price data (keep last 90 days)"""
    try:
        logger.info("Starting data cleanup")
        
        # Keep only last 90 days of data
        cutoff_date = timezone.now() - timedelta(days=90)
        deleted_count = Price.objects.filter(recorded_at__lt=cutoff_date).delete()[0]
        
        logger.info(f"Data cleanup completed. Deleted {deleted_count} old price records")
        return f"Data cleanup completed. Deleted {deleted_count} old price records"
        
    except Exception as e:
        logger.error(f"Data cleanup failed: {e}")
        return f"Data cleanup failed: {e}"

@shared_task
def backup_price_data():
    """Backup price data to CSV"""
    try:
        logger.info("Starting price data backup")
        
        # Create exports directory if it doesn't exist
        exports_dir = os.path.join(settings.BASE_DIR, 'exports')
        os.makedirs(exports_dir, exist_ok=True)
        
        # Generate backup filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"butter_prices_backup_{timestamp}.csv"
        filepath = os.path.join(exports_dir, filename)
        
        # Export data
        call_command('export_data', days=90, format='csv', output_dir=os.path.dirname(filepath))
        
        logger.info(f"Price data backup completed: {filepath}")
        return f"Price data backup completed: {filepath}"
        
    except Exception as e:
        logger.error(f"Price data backup failed: {e}")
        return f"Price data backup failed: {e}"

@shared_task
def generate_weekly_report():
    """Generate and save weekly price report"""
    try:
        logger.info("Generating weekly price report")
        
        # Get data for the last week
        end_date = timezone.now()
        start_date = end_date - timedelta(days=7)
        
        # Generate report data
        report_data = generate_weekly_report_data(start_date, end_date)
        
        # Save report to database or file
        save_weekly_report(report_data)
        
        logger.info("Weekly price report generated successfully")
        return "Weekly price report generated successfully"
        
    except Exception as e:
        logger.error(f"Weekly report generation failed: {e}")
        return f"Weekly report generation failed: {e}"

def send_price_alert_email(alert, latest_price, price_change_percent):
    """Send price alert email"""
    subject = f"Price Alert: {alert.product.name}"
    
    message = f"""
    Price Alert for {alert.product.name}
    
    Store: {alert.store.name}
    Current Price: ${latest_price.price}
    Target Price: ${alert.target_price}
    Price Change: {price_change_percent:.1f}%
    
    Visit the ButterUp app to see more details.
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[alert.user.email],
            fail_silently=False,
        )
        logger.info(f"Price alert email sent to {alert.user.email}")
    except Exception as e:
        logger.error(f"Failed to send price alert email: {e}")

def send_weekly_update_email(email, report_data):
    """Send weekly update email"""
    subject = "ButterUp Weekly Price Update"
    
    message = f"""
    Weekly Butter Price Update
    
    {report_data['summary']}
    
    Key Findings:
    - Average Price: ${report_data['avg_price']}
    - Price Range: ${report_data['min_price']} - ${report_data['max_price']}
    - Total Products Tracked: {report_data['total_products']}
    
    Visit the ButterUp app for detailed analysis.
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Weekly update email sent to {email}")
    except Exception as e:
        logger.error(f"Failed to send weekly update email: {e}")

def generate_weekly_report_data(start_date=None, end_date=None):
    """Generate weekly report data"""
    if not start_date:
        start_date = timezone.now() - timedelta(days=7)
    if not end_date:
        end_date = timezone.now()
    
    # Get price data for the period
    prices = Price.objects.filter(
        recorded_at__gte=start_date,
        recorded_at__lte=end_date
    )
    
    if not prices.exists():
        return {
            'summary': 'No price data available for this period.',
            'avg_price': 0,
            'min_price': 0,
            'max_price': 0,
            'total_products': 0
        }
    
    # Calculate statistics
    price_values = [p.price for p in prices]
    avg_price = sum(price_values) / len(price_values)
    min_price = min(price_values)
    max_price = max(price_values)
    total_products = prices.values('product').distinct().count()
    
    return {
        'summary': f'Price data from {start_date.strftime("%Y-%m-%d")} to {end_date.strftime("%Y-%m-%d")}',
        'avg_price': round(avg_price, 2),
        'min_price': round(min_price, 2),
        'max_price': round(max_price, 2),
        'total_products': total_products
    }

def save_weekly_report(report_data):
    """Save weekly report to file"""
    exports_dir = os.path.join(settings.BASE_DIR, 'exports')
    os.makedirs(exports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"weekly_report_{timestamp}.csv"
    filepath = os.path.join(exports_dir, filename)
    
    with open(filepath, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Metric', 'Value'])
        writer.writerow(['Summary', report_data['summary']])
        writer.writerow(['Average Price', report_data['avg_price']])
        writer.writerow(['Min Price', report_data['min_price']])
        writer.writerow(['Max Price', report_data['max_price']])
        writer.writerow(['Total Products', report_data['total_products']])
    
    logger.info(f"Weekly report saved to {filepath}") 