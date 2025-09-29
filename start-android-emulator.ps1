# Simple Android Emulator Launcher for ButterUp
# This script will start your Android emulator and optionally launch the ButterUp app

Write-Host "Starting Android Emulator for ButterUp..." -ForegroundColor Green

# Set Android SDK path
$androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$emulatorPath = "$androidHome\emulator\emulator.exe"

# Add to PATH for this session
$env:PATH += ";$androidHome\emulator;$androidHome\platform-tools"

# Check if emulator exists
if (-not (Test-Path $emulatorPath)) {
    Write-Host "Android emulator not found at: $emulatorPath" -ForegroundColor Red
    Write-Host "Please make sure Android Studio is installed and emulator is set up." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# List available AVDs
Write-Host "`nChecking for available Android Virtual Devices..." -ForegroundColor Cyan
try {
    $avds = & $emulatorPath -list-avds
    if ($avds -and $avds.Count -gt 0) {
        Write-Host "Found AVDs:" -ForegroundColor Green
        for ($i = 0; $i -lt $avds.Count; $i++) {
            Write-Host "  [$i] $($avds[$i])" -ForegroundColor White
        }
        
        # Use first AVD or let user choose
        if ($avds.Count -eq 1) {
            $selectedAvd = $avds[0]
            Write-Host "`nUsing: $selectedAvd" -ForegroundColor Green
        } else {
            Write-Host "`nSelect an AVD (press Enter for first one):" -ForegroundColor Yellow
            $choice = Read-Host "Enter number (0-$($avds.Count-1))"
            if ($choice -eq "" -or $choice -eq "0") {
                $selectedAvd = $avds[0]
            } else {
                $index = [int]$choice
                if ($index -ge 0 -and $index -lt $avds.Count) {
                    $selectedAvd = $avds[$index]
                } else {
                    $selectedAvd = $avds[0]
                }
            }
        }
        
        # Start the emulator
        Write-Host "`nStarting emulator: $selectedAvd" -ForegroundColor Cyan
        Write-Host "This may take a few minutes..." -ForegroundColor Yellow
        
        Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $selectedAvd
        
        Write-Host "`nEmulator is starting! You can minimize this window." -ForegroundColor Green
        Write-Host "`nOnce the emulator is fully loaded, you can run your ButterUp app:" -ForegroundColor Cyan
        Write-Host "cd ButterUpMobile" -ForegroundColor White
        Write-Host "npm run android" -ForegroundColor White
        
        # Ask if user wants to start the app
        Write-Host "`nDo you want to start the ButterUp app now? (y/n)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -eq "y" -or $response -eq "Y" -or $response -eq "") {
            if (Test-Path "ButterUpMobile\package.json") {
                Write-Host "`nStarting ButterUp mobile app..." -ForegroundColor Cyan
                Set-Location "ButterUpMobile"
                npm run android
            } else {
                Write-Host "ButterUpMobile folder not found. Please run this script from the ButterUp root directory." -ForegroundColor Red
            }
        }
        
    } else {
        Write-Host "No Android Virtual Devices found!" -ForegroundColor Red
        Write-Host "`nPlease create an AVD first:" -ForegroundColor Yellow
        Write-Host "1. Open Android Studio" -ForegroundColor White
        Write-Host "2. Go to Tools -> AVD Manager" -ForegroundColor White
        Write-Host "3. Click 'Create Virtual Device'" -ForegroundColor White
        Write-Host "4. Choose Pixel 7, API 33+" -ForegroundColor White
    }
} catch {
    Write-Host "Error listing AVDs: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure Android Studio is properly installed." -ForegroundColor Yellow
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host
