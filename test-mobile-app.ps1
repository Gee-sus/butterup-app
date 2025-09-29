# ButterUp Mobile App Testing Script
# This script provides an easy way to test your app on different platforms

param(
    [string]$Platform = "",
    [switch]$List,
    [switch]$Install,
    [switch]$Clean
)

Write-Host "📱 ButterUp Mobile App Testing" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "ButterUpMobile\package.json")) {
    Write-Host "❌ ButterUp mobile project not found!" -ForegroundColor Red
    Write-Host "Please run this script from the ButterUp project root directory" -ForegroundColor Yellow
    exit 1
}

# Function to check if Node.js is installed
function Test-NodeJS {
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Node.js not found!" -ForegroundColor Red
        Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
        return $false
    }
}

# Function to check if Expo CLI is available
function Test-ExpoCLI {
    try {
        $expoVersion = npx expo --version
        Write-Host "✅ Expo CLI found: $expoVersion" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Expo CLI not found!" -ForegroundColor Red
        return $false
    }
}

# Function to install dependencies
function Install-Dependencies {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    Set-Location "ButterUpMobile"
    npm install
    Set-Location ".."
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
}

# Function to clean project
function Clear-Project {
    Write-Host "🧹 Cleaning project..." -ForegroundColor Cyan
    Set-Location "ButterUpMobile"
    
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
        Write-Host "🗑️ Removed node_modules" -ForegroundColor Yellow
    }
    
    if (Test-Path ".expo") {
        Remove-Item -Recurse -Force ".expo"
        Write-Host "🗑️ Removed .expo cache" -ForegroundColor Yellow
    }
    
    npm install
    Set-Location ".."
    Write-Host "✅ Project cleaned and dependencies reinstalled!" -ForegroundColor Green
}

# Function to list available testing options
function Show-TestingOptions {
    Write-Host "`n🎯 Available Testing Platforms:" -ForegroundColor Cyan
    Write-Host "1. 📱 Expo Go (Physical Device) - Easiest" -ForegroundColor White
    Write-Host "2. 🤖 Android Emulator - Full native experience" -ForegroundColor White
    Write-Host "3. 🍎 iOS Simulator - macOS only" -ForegroundColor White
    Write-Host "4. 🌐 Web Browser - Quick testing" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Commands:" -ForegroundColor Cyan
    Write-Host "• .\test-mobile-app.ps1 -Platform expo     # Start with Expo Go" -ForegroundColor White
    Write-Host "• .\test-mobile-app.ps1 -Platform android  # Start Android emulator" -ForegroundColor White
    Write-Host "• .\test-mobile-app.ps1 -Platform ios      # Start iOS simulator" -ForegroundColor White
    Write-Host "• .\test-mobile-app.ps1 -Platform web      # Start web version" -ForegroundColor White
    Write-Host "• .\test-mobile-app.ps1 -Install           # Install dependencies" -ForegroundColor White
    Write-Host "• .\test-mobile-app.ps1 -Clean             # Clean and reinstall" -ForegroundColor White
}

# Main script logic
if (-not (Test-NodeJS)) {
    exit 1
}

if (-not (Test-ExpoCLI)) {
    Write-Host "Installing Expo CLI globally..." -ForegroundColor Yellow
    npm install -g @expo/cli
}

# Handle command line arguments
if ($List) {
    Show-TestingOptions
    exit 0
}

if ($Install) {
    Install-Dependencies
    exit 0
}

if ($Clean) {
    Clear-Project
    exit 0
}

# Check if dependencies are installed
if (-not (Test-Path "ButterUpMobile\node_modules")) {
    Write-Host "📦 Dependencies not found. Installing..." -ForegroundColor Yellow
    Install-Dependencies
}

# Platform selection
switch ($Platform.ToLower()) {
    "expo" {
        Write-Host "`n📱 Starting with Expo Go..." -ForegroundColor Cyan
        Write-Host "1. Install 'Expo Go' app on your phone" -ForegroundColor Yellow
        Write-Host "2. Scan the QR code that appears" -ForegroundColor Yellow
        Write-Host "3. Your app will load on your device" -ForegroundColor Yellow
        Write-Host ""
        Set-Location "ButterUpMobile"
        npm start
    }
    
    "android" {
        Write-Host "`n🤖 Starting Android emulator..." -ForegroundColor Cyan
        
        # Check if Android emulator is available
        $androidHome = $env:ANDROID_HOME
        if (-not $androidHome) {
            $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
        }
        
        if (-not (Test-Path "$androidHome\emulator\emulator.exe")) {
            Write-Host "❌ Android emulator not found!" -ForegroundColor Red
            Write-Host "Please run: .\setup-android-emulator.ps1" -ForegroundColor Yellow
            exit 1
        }
        
        Set-Location "ButterUpMobile"
        npm run android
    }
    
    "ios" {
        Write-Host "`n🍎 Starting iOS simulator..." -ForegroundColor Cyan
        
        if ($IsWindows -or $env:OS -eq "Windows_NT") {
            Write-Host "❌ iOS Simulator only works on macOS!" -ForegroundColor Red
            Write-Host "Use Android emulator or Expo Go instead" -ForegroundColor Yellow
            exit 1
        }
        
        Set-Location "ButterUpMobile"
        npm run ios
    }
    
    "web" {
        Write-Host "`n🌐 Starting web version..." -ForegroundColor Cyan
        Write-Host "Opening in your default browser..." -ForegroundColor Yellow
        Set-Location "ButterUpMobile"
        npm run web
    }
    
    default {
        if ($Platform -eq "") {
            Show-TestingOptions
            Write-Host "`n❓ Which platform would you like to test?" -ForegroundColor Cyan
            $choice = Read-Host "Enter platform (expo/android/ios/web)"
            
            if ($choice) {
                & $MyInvocation.MyCommand.Path -Platform $choice
            }
        } else {
            Write-Host "❌ Unknown platform: $Platform" -ForegroundColor Red
            Show-TestingOptions
        }
    }
}
