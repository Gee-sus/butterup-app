# Simple Android Emulator Starter
Write-Host "Starting Android Emulator..." -ForegroundColor Green

# Set paths
$androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$emulatorPath = "$androidHome\emulator\emulator.exe"

# Add to PATH
$env:PATH += ";$androidHome\emulator;$androidHome\platform-tools"

# Check if emulator exists
if (-not (Test-Path $emulatorPath)) {
    Write-Host "Android emulator not found!" -ForegroundColor Red
    Write-Host "Please install Android Studio first." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Kill existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "emulator*" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "qemu*" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# List AVDs
Write-Host "`nAvailable AVDs:" -ForegroundColor Cyan
$avds = & $emulatorPath -list-avds
if ($avds -and $avds.Count -gt 0) {
    for ($i = 0; $i -lt $avds.Count; $i++) {
        Write-Host "  [$i] $($avds[$i])" -ForegroundColor White
    }
    
    # Use the first AVD
    $selectedAvd = $avds[0]
    Write-Host "`nUsing: $selectedAvd" -ForegroundColor Green
    
    # Start emulator
    Write-Host "`nStarting emulator..." -ForegroundColor Cyan
    Write-Host "This may take 2-3 minutes..." -ForegroundColor Yellow
    
    Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $selectedAvd, "-memory", "2048", "-gpu", "swiftshader_indirect"
    
    Write-Host "`nEmulator is starting!" -ForegroundColor Green
    Write-Host "Wait for the Android home screen to appear." -ForegroundColor Yellow
    Write-Host "`nThen run:" -ForegroundColor Cyan
    Write-Host "cd ButterUpMobile" -ForegroundColor White
    Write-Host "npm run android" -ForegroundColor White
    
} else {
    Write-Host "No AVDs found!" -ForegroundColor Red
    Write-Host "Please create an AVD in Android Studio first." -ForegroundColor Yellow
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host
