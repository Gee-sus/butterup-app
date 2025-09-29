# ButterUp Android Emulator Setup Script
# This script helps set up and launch Android emulator for ButterUp app testing

Write-Host "ButterUp Android Emulator Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Android Studio is installed
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
    $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
}

if (-not (Test-Path $androidHome)) {
    Write-Host "Android SDK not found!" -ForegroundColor Red
    Write-Host "Please install Android Studio first:" -ForegroundColor Yellow
    Write-Host "https://developer.android.com/studio" -ForegroundColor Cyan
    exit 1
}

Write-Host "Android SDK found at: $androidHome" -ForegroundColor Green

# Add Android tools to PATH for this session
$env:PATH += ";$androidHome\emulator;$androidHome\platform-tools;$androidHome\tools\bin"

# Check for emulator executable
$emulatorPath = "$androidHome\emulator\emulator.exe"
if (-not (Test-Path $emulatorPath)) {
    Write-Host "Android emulator not found!" -ForegroundColor Red
    Write-Host "Please install Android emulator through Android Studio SDK Manager" -ForegroundColor Yellow
    exit 1
}

Write-Host "Android emulator found" -ForegroundColor Green

# List available AVDs
Write-Host "`nAvailable Android Virtual Devices:" -ForegroundColor Cyan
try {
    $avds = & $emulatorPath -list-avds
    if ($avds -and $avds.Count -gt 0) {
        $avds | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }
    } else {
        Write-Host "No AVDs found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Could not list AVDs. Make sure emulator is properly installed." -ForegroundColor Red
    exit 1
}

if (-not $avds -or $avds.Count -eq 0) {
    Write-Host "`nNo Android Virtual Devices found!" -ForegroundColor Red
    Write-Host "Please create an AVD through Android Studio:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools -> AVD Manager" -ForegroundColor White
    Write-Host "3. Click 'Create Virtual Device'" -ForegroundColor White
    Write-Host "4. Choose Pixel 7, API 33+" -ForegroundColor White
    exit 1
}

# Let user choose AVD or use the first one
if ($avds.Count -eq 1) {
    $selectedAvd = $avds[0]
    Write-Host "`nUsing AVD: $selectedAvd" -ForegroundColor Green
} else {
    Write-Host "`nMultiple AVDs found. Using first one: $($avds[0])" -ForegroundColor Green
    $selectedAvd = $avds[0]
}

# Function to check if emulator is running
function Test-EmulatorRunning {
    $adbPath = "$androidHome\platform-tools\adb.exe"
    if (Test-Path $adbPath) {
        try {
            $devices = & $adbPath devices
            return $devices -match "emulator"
        } catch {
            return $false
        }
    }
    return $false
}

# Start emulator if not running
if (Test-EmulatorRunning) {
    Write-Host "`nAndroid emulator is already running" -ForegroundColor Green
} else {
    Write-Host "`nStarting Android emulator..." -ForegroundColor Cyan
    Write-Host "This may take a few minutes on first launch..." -ForegroundColor Yellow
    
    # Start emulator in background
    Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $selectedAvd, "-no-boot-anim" -WindowStyle Hidden
    
    # Wait for emulator to start
    Write-Host "Waiting for emulator to start..." -ForegroundColor Yellow
    $timeout = 120 # 2 minutes
    $elapsed = 0
    
    while (-not (Test-EmulatorRunning) -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        Write-Host "." -NoNewline
    }
    
    if (Test-EmulatorRunning) {
        Write-Host "`nAndroid emulator started successfully!" -ForegroundColor Green
    } else {
        Write-Host "`nEmulator failed to start within $timeout seconds" -ForegroundColor Red
        Write-Host "Try starting it manually through Android Studio" -ForegroundColor Yellow
        exit 1
    }
}

# Check if we're in the ButterUp project
if (Test-Path "ButterUpMobile\package.json") {
    Write-Host "`nButterUp project detected!" -ForegroundColor Green
    
    # Ask if user wants to start the app
    $response = Read-Host "`nDo you want to start the ButterUp mobile app? (y/n)"
    if ($response -eq "y" -or $response -eq "Y" -or $response -eq "") {
        Write-Host "`nStarting ButterUp mobile app..." -ForegroundColor Cyan
        
        # Check if node_modules exists
        if (-not (Test-Path "ButterUpMobile\node_modules")) {
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            Set-Location "ButterUpMobile"
            npm install
            Set-Location ".."
        }
        
        # Start the app
        Set-Location "ButterUpMobile"
        Write-Host "Running: npm run android" -ForegroundColor Cyan
        npm run android
    }
} else {
    Write-Host "`nTo test ButterUp mobile app:" -ForegroundColor Cyan
    Write-Host "cd ButterUpMobile" -ForegroundColor White
    Write-Host "npm run android" -ForegroundColor White
}

Write-Host "`nAndroid emulator setup complete!" -ForegroundColor Green
Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "• List AVDs: emulator -list-avds" -ForegroundColor White
Write-Host "• Start specific AVD: emulator -avd AVD_NAME" -ForegroundColor White
Write-Host "• Check devices: adb devices" -ForegroundColor White
Write-Host "• Kill emulator: adb emu kill" -ForegroundColor White
