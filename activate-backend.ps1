# PowerShell script to activate the backend virtual environment
Write-Host "Activating ButterUp backend virtual environment..." -ForegroundColor Green
Set-Location -Path "backend"
& ".\venv\Scripts\Activate.ps1"
Write-Host "Virtual environment activated! Python path:" -ForegroundColor Yellow
python -c "import sys; print(sys.executable)"
Write-Host "Django version:" -ForegroundColor Yellow
python -c "import django; print(django.get_version())"
Write-Host "Django REST Framework version:" -ForegroundColor Yellow
python -c "import rest_framework; print(rest_framework.VERSION)"

