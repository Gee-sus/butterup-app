"""
Django settings for butter_tracker project.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-your-secret-key-here')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'

# Get ALLOWED_HOSTS from environment or use default
default_hosts = "127.0.0.1,localhost,10.0.2.2,192.168.1.3"
env_hosts = os.getenv("ALLOWED_HOSTS", default_hosts)

# Always include our IP address for mobile app access
required_hosts = ["192.168.1.3", "10.0.2.2"]  # Android emulator IPs
all_hosts = env_hosts.split(",") + required_hosts
ALLOWED_HOSTS = list(set([host.strip() for host in all_hosts if host.strip()]))  # Remove duplicates and whitespace

print(f"DEBUG: ALLOWED_HOSTS = {ALLOWED_HOSTS}")  # Debug print

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'api',
    'pricing',
    'scraper',
    'tasks',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'butter_tracker.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'butter_tracker.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-nz'
TIME_ZONE = 'Pacific/Auckland'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = os.getenv('MEDIA_URL', '/media/')
MEDIA_ROOT = os.getenv('MEDIA_ROOT', os.path.join(BASE_DIR, 'media'))

# Optional but recommended so /products redirects to /products/
APPEND_SLASH = True

# Image cache settings
IMAGE_CACHE_TTL_HOURS = int(os.getenv('IMAGE_CACHE_TTL_HOURS', '168'))  # 7 days default

# Open Food Facts settings
OFF_BASE = os.getenv('OFF_BASE', 'https://world.openfoodfacts.org')
OFF_USER_AGENT = os.getenv('OFF_USER_AGENT', 'ButterUp/0.1 (contact: support@butterup.nz)')

# GS1 NZ settings (placeholder)
GS1_BASE = os.getenv('GS1_BASE', 'https://api.gs1nz.example')
GS1_API_KEY = os.getenv('GS1_API_KEY', 'changeme')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
}

# CORS settings - Allow all localhost ports and Expo LAN IPs
CORS_ALLOW_ALL_ORIGINS = True

# Additional specific origins for Expo development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    # Expo LAN IPs (common ranges)
    "http://192.168.1.1:8081",
    "http://192.168.0.1:8081",
    "http://10.0.0.1:8081",
    # Allow any IP on port 8081 (Expo default)
    "http://192.168.1.0:8081",
    "http://192.168.0.0:8081",
    "http://10.0.0.0:8081",
]

CORS_ALLOW_CREDENTIALS = True

# CSRF trusted origins for frontend
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS",
    "http://127.0.0.1:8000,http://localhost:8000"
).split(",")

# Allow media files to be served with CORS headers
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Celery Configuration
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Celery Beat Schedule
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'scrape-butter-prices-daily': {
        'task': 'tasks.scraping_tasks.scrape_all_stores',
        'schedule': crontab(hour=6, minute=0),  # Daily at 6 AM
    },
    'check-price-alerts': {
        'task': 'tasks.scraping_tasks.check_price_alerts',
        'schedule': crontab(hour='*/4'),  # Every 4 hours
    },
    'send-weekly-updates': {
        'task': 'tasks.scraping_tasks.send_weekly_price_update',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Every Monday at 9 AM
    },
    'cleanup-old-data': {
        'task': 'tasks.scraping_tasks.cleanup_old_data',
        'schedule': crontab(day_of_week=0, hour=2, minute=0),  # Every Sunday at 2 AM
    },
    'backup-price-data': {
        'task': 'tasks.scraping_tasks.backup_price_data',
        'schedule': crontab(day_of_week=0, hour=3, minute=0),  # Every Sunday at 3 AM
    },
    'generate-weekly-report': {
        'task': 'tasks.scraping_tasks.generate_weekly_report',
        'schedule': crontab(day_of_week=1, hour=10, minute=0),  # Every Monday at 10 AM
    },
}

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@butterup.nz')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
} 