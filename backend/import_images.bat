@echo off
echo ButterUp - Import Product Images
echo ================================
echo.

REM Check if we're in the right directory
if not exist "manage.py" (
    echo Error: This script must be run from the backend directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Available commands:
echo.
echo 1. Dry run (preview only) - Enhanced version
echo 2. Import images - Enhanced version  
echo 3. Import with verbose output - Enhanced version
echo 4. Force reimport existing - Enhanced version
echo 5. Original import command (dry run)
echo 6. Original import command (import)
echo.

set /p choice="Choose option (1-6): "

if "%choice%"=="1" (
    echo Running enhanced dry run...
    python manage.py import_product_images_enhanced --dry-run --verbose
) else if "%choice%"=="2" (
    echo Running enhanced import...
    python manage.py import_product_images_enhanced
) else if "%choice%"=="3" (
    echo Running enhanced import with verbose output...
    python manage.py import_product_images_enhanced --verbose
) else if "%choice%"=="4" (
    echo Running enhanced import with force...
    python manage.py import_product_images_enhanced --force --verbose
) else if "%choice%"=="5" (
    echo Running original dry run...
    python manage.py import_product_images --dry-run
) else if "%choice%"=="6" (
    echo Running original import...
    python manage.py import_product_images
) else (
    echo Invalid choice. Please run the script again.
    pause
    exit /b 1
)

echo.
echo Done! Press any key to exit...
pause > nul
