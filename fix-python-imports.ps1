# PowerShell script to fix Python import issues
Write-Host "🔧 Fixing Python Import Issues..." -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (Test-Path "backend\venv\Scripts\python.exe") {
    Write-Host "✅ Virtual environment found" -ForegroundColor Green
} else {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    exit 1
}

# Test Django imports
Write-Host "🧪 Testing Django imports..." -ForegroundColor Yellow
& "backend\venv\Scripts\Activate.ps1"
$env:DJANGO_SETTINGS_MODULE = "butter_tracker.settings"
python -c 'import django; django.setup(); import rest_framework; import django.urls; print("All imports working!")'

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. In VS Code/Cursor, press Ctrl+Shift+P" -ForegroundColor White
Write-Host "2. Type 'Python: Restart Language Server'" -ForegroundColor White
Write-Host "3. Press Enter" -ForegroundColor White
Write-Host ""
Write-Host "4. If that doesn't work, try:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "   - Type 'Python: Select Interpreter'" -ForegroundColor White
Write-Host "   - Choose: C:\Users\Gagandeep\ButterUp\backend\venv\Scripts\python.exe" -ForegroundColor White
Write-Host ""
Write-Host "5. Finally, reload the window:" -ForegroundColor Yellow
Write-Host "   - Press Ctrl+Shift+P" -ForegroundColor White
Write-Host "   - Type 'Developer: Reload Window'" -ForegroundColor White
Write-Host "   - Press Enter" -ForegroundColor White
