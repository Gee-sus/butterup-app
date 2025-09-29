# Android Environment Setup for ButterUp

Write-Host "Setting up Android environment..." -ForegroundColor Green

# Check if Android SDK exists in default location
$defaultAndroidPath = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$alternativePath = "$env:LOCALAPPDATA\Android\Sdk"

$androidSdkPath = $null

if (Test-Path $defaultAndroidPath) {
    $androidSdkPath = $defaultAndroidPath
    Write-Host "Found Android SDK at: $androidSdkPath" -ForegroundColor Green
} elseif (Test-Path $alternativePath) {
    $androidSdkPath = $alternativePath
    Write-Host "Found Android SDK at: $androidSdkPath" -ForegroundColor Green
} else {
    Write-Host "Android SDK not found!" -ForegroundColor Red
    Write-Host "Please install Android Studio first from: https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Set environment variables for current session
$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath

# Add to PATH for current session
$env:PATH += ";$androidSdkPath\emulator"
$env:PATH += ";$androidSdkPath\platform-tools"
$env:PATH += ";$androidSdkPath\tools"
$env:PATH += ";$androidSdkPath\tools\bin"

Write-Host "Environment variables set for current session:" -ForegroundColor Green
Write-Host "ANDROID_HOME: $env:ANDROID_HOME" -ForegroundColor Cyan
Write-Host "PATH updated with Android tools" -ForegroundColor Cyan

# Test if adb is now available
try {
    $adbVersion = & "$androidSdkPath\platform-tools\adb.exe" version
    Write-Host "ADB is working: $($adbVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "ADB not found. Please ensure Android SDK is properly installed." -ForegroundColor Red
}

Write-Host ""
Write-Host "To make these changes permanent:" -ForegroundColor Yellow
Write-Host "1. Open System Properties > Environment Variables" -ForegroundColor White
Write-Host "2. Add ANDROID_HOME = $androidSdkPath" -ForegroundColor White
Write-Host "3. Add to PATH: $androidSdkPath\platform-tools" -ForegroundColor White
Write-Host ""
Write-Host "Or run this PowerShell command as Administrator:" -ForegroundColor Yellow
Write-Host "[Environment]::SetEnvironmentVariable('ANDROID_HOME', '$androidSdkPath', 'User')" -ForegroundColor Cyan
