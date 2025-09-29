# ButterUp - Import Product Images PowerShell Script
Write-Host "ButterUp - Import Product Images" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "manage.py")) {
    Write-Host "Error: This script must be run from the backend directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Available commands:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Dry run (preview only) - Enhanced version" -ForegroundColor Cyan
Write-Host "2. Import images - Enhanced version" -ForegroundColor Cyan
Write-Host "3. Import with verbose output - Enhanced version" -ForegroundColor Cyan
Write-Host "4. Force reimport existing - Enhanced version" -ForegroundColor Cyan
Write-Host "5. Original import command (dry run)" -ForegroundColor Gray
Write-Host "6. Original import command (import)" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Choose option (1-6)"

switch ($choice) {
    "1" {
        Write-Host "Running enhanced dry run..." -ForegroundColor Yellow
        python manage.py import_product_images_enhanced --dry-run --verbose
    }
    "2" {
        Write-Host "Running enhanced import..." -ForegroundColor Yellow
        python manage.py import_product_images_enhanced
    }
    "3" {
        Write-Host "Running enhanced import with verbose output..." -ForegroundColor Yellow
        python manage.py import_product_images_enhanced --verbose
    }
    "4" {
        Write-Host "Running enhanced import with force..." -ForegroundColor Yellow
        python manage.py import_product_images_enhanced --force --verbose
    }
    "5" {
        Write-Host "Running original dry run..." -ForegroundColor Yellow
        python manage.py import_product_images --dry-run
    }
    "6" {
        Write-Host "Running original import..." -ForegroundColor Yellow
        python manage.py import_product_images
    }
    default {
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Read-Host "Press Enter to exit"
