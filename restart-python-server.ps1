# PowerShell script to restart Python language server
Write-Host "Restarting Python language server..." -ForegroundColor Green
Write-Host "Please run the following commands in VS Code/Cursor:" -ForegroundColor Yellow
Write-Host "1. Press Ctrl+Shift+P" -ForegroundColor Cyan
Write-Host "2. Type 'Python: Restart Language Server'" -ForegroundColor Cyan
Write-Host "3. Press Enter" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or alternatively:" -ForegroundColor Yellow
Write-Host "1. Press Ctrl+Shift+P" -ForegroundColor Cyan
Write-Host "2. Type 'Python: Select Interpreter'" -ForegroundColor Cyan
Write-Host "3. Choose: C:\Users\Gagandeep\ButterUp\backend\venv\Scripts\python.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current Python interpreter path:" -ForegroundColor Yellow
& ".\backend\venv\Scripts\Activate.ps1"; python -c "import sys; print(sys.executable)"

