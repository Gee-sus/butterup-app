# Fix Android Emulator Issues - ButterUp
# This script will diagnose and fix common emulator problems

Write-Host "Fixing Android Emulator Issues..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Set Android SDK path
$androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$emulatorPath = "$androidHome\emulator\emulator.exe"
$adbPath = "$androidHome\platform-tools\adb.exe"

# Add to PATH
$env:PATH += ";$androidHome\emulator;$androidHome\platform-tools"

Write-Host "Android SDK Path: $androidHome" -ForegroundColor Cyan

# Check if tools exist
if (-not (Test-Path $emulatorPath)) {
    Write-Host "ERROR: Emulator not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $adbPath)) {
    Write-Host "ERROR: ADB not found!" -ForegroundColor Red
    exit 1
}

Write-Host "Android tools found ✓" -ForegroundColor Green

# Kill any existing emulator processes
Write-Host "`nCleaning up existing processes..." -ForegroundColor Yellow
try {
    Get-Process -Name "emulator*" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "qemu*" -ErrorAction SilentlyContinue | Stop-Process -Force
    & $adbPath kill-server 2>$null
    Start-Sleep -Seconds 2
    Write-Host "Cleaned up ✓" -ForegroundColor Green
} catch {
    Write-Host "Cleanup completed" -ForegroundColor Green
}

# List available AVDs
Write-Host "`nAvailable AVDs:" -ForegroundColor Cyan
try {
    $avds = & $emulatorPath -list-avds
    if ($avds -and $avds.Count -gt 0) {
        for ($i = 0; $i -lt $avds.Count; $i++) {
            Write-Host "  [$i] $($avds[$i])" -ForegroundColor White
        }
        
        # Try the most stable AVD first (usually the newer API)
        $selectedAvd = $avds[0]
        foreach ($avd in $avds) {
            if ($avd -like "*API_3*" -or $avd -like "*Medium*") {
                $selectedAvd = $avd
                break
            }
        }
        
        Write-Host "`nSelected AVD: $selectedAvd" -ForegroundColor Green
        
        # Start emulator with optimal settings
        Write-Host "`nStarting emulator with optimal settings..." -ForegroundColor Cyan
        Write-Host "This may take 2-3 minutes on first launch..." -ForegroundColor Yellow
        
        # Use different startup strategies
        $startupArgs = @(
            "-avd", $selectedAvd,
            "-memory", "2048",
            "-gpu", "swiftshader_indirect",
            "-no-boot-anim",
            "-no-snapshot-load",
            "-wipe-data"
        )
        
        Write-Host "Starting: $emulatorPath $($startupArgs -join ' ')" -ForegroundColor Gray
        
        # Start emulator in background
        $process = Start-Process -FilePath $emulatorPath -ArgumentList $startupArgs -PassThru -WindowStyle Hidden
        
        # Wait and check if emulator starts successfully
        Write-Host "`nWaiting for emulator to start..." -ForegroundColor Yellow
        $timeout = 180 # 3 minutes
        $elapsed = 0
        $started = $false
        
        while ($elapsed -lt $timeout -and -not $started) {
            Start-Sleep -Seconds 10
            $elapsed += 10
            
            try {
                $devices = & $adbPath devices 2>$null
                if ($devices -match "emulator.*device") {
                    $started = $true
                    Write-Host "`n✓ Emulator started successfully!" -ForegroundColor Green
                    break
                }
            } catch {
                # Continue waiting
            }
            
            Write-Host "." -NoNewline
        }
        
        if ($started) {
            Write-Host "`n`nEmulator is ready! You can now run your ButterUp app." -ForegroundColor Green
            Write-Host "`nNext steps:" -ForegroundColor Cyan
            Write-Host "1. Wait for Android home screen to appear" -ForegroundColor White
            Write-Host "2. Run: cd ButterUpMobile" -ForegroundColor White
            Write-Host "3. Run: npm run android" -ForegroundColor White
            
            # Ask if user wants to start the app
            Write-Host "`nDo you want to start the ButterUp app now? (y/n)" -ForegroundColor Yellow
            $response = Read-Host
            if ($response -eq "y" -or $response -eq "Y" -or $response -eq "") {
                if (Test-Path "ButterUpMobile\package.json") {
                    Write-Host "`nStarting ButterUp mobile app..." -ForegroundColor Cyan
                    Set-Location "ButterUpMobile"
                    npm run android
                } else {
                    Write-Host "ButterUpMobile folder not found!" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "`n`nEmulator failed to start within $timeout seconds" -ForegroundColor Red
            Write-Host "`nTroubleshooting steps:" -ForegroundColor Yellow
            Write-Host "1. Check if virtualization is enabled in BIOS" -ForegroundColor White
            Write-Host "2. Try restarting your computer" -ForegroundColor White
            Write-Host "3. Create a new AVD with lower RAM (1024 MB)" -ForegroundColor White
            Write-Host "4. Try starting emulator manually from Android Studio" -ForegroundColor White
        }
        
    } else {
        Write-Host "No AVDs found!" -ForegroundColor Red
        Write-Host "`nPlease create an AVD first:" -ForegroundColor Yellow
        Write-Host "1. Open Android Studio" -ForegroundColor White
        Write-Host "2. Go to Tools -> AVD Manager" -ForegroundColor White
        Write-Host "3. Click 'Create Virtual Device'" -ForegroundColor White
        Write-Host "4. Choose Pixel 7, API 33" -ForegroundColor White
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Gray
Read-Host
