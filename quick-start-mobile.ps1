# ButterUp Mobile Quick Start
# Gets you testing the mobile app in under 5 minutes!

Write-Host "🚀 ButterUp Mobile Quick Start" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Get your mobile app running in under 5 minutes!" -ForegroundColor Cyan

# Check prerequisites
$hasNode = $false
$hasExpo = $false

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    $hasNode = $true
} catch {
    Write-Host "❌ Node.js not found" -ForegroundColor Red
}

try {
    $expoVersion = npx expo --version 2>$null
    Write-Host "✅ Expo CLI available" -ForegroundColor Green
    $hasExpo = $true
} catch {
    Write-Host "⚠️ Expo CLI will be installed" -ForegroundColor Yellow
}

if (-not $hasNode) {
    Write-Host "`n🔗 Please install Node.js first:" -ForegroundColor Red
    Write-Host "https://nodejs.org/en/download/" -ForegroundColor Cyan
    Write-Host "`nThen run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📱 Choose your testing method:" -ForegroundColor Cyan
Write-Host "1. 📲 Expo Go (Easiest - Use your phone)" -ForegroundColor White
Write-Host "2. 🤖 Android Emulator (Full experience)" -ForegroundColor White
Write-Host "3. 🌐 Web Browser (Quick preview)" -ForegroundColor White

$choice = Read-Host "`nEnter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`n📲 Setting up Expo Go method..." -ForegroundColor Green
        Write-Host "`n📋 Steps to follow:" -ForegroundColor Cyan
        Write-Host "1. Install 'Expo Go' app on your phone:" -ForegroundColor White
        Write-Host "   📱 Android: https://play.google.com/store/apps/details?id=host.exp.exponent" -ForegroundColor Blue
        Write-Host "   📱 iOS: https://apps.apple.com/app/expo-go/id982107779" -ForegroundColor Blue
        Write-Host "`n2. Make sure your phone and computer are on the same WiFi" -ForegroundColor White
        Write-Host "`n3. When the QR code appears, scan it with:" -ForegroundColor White
        Write-Host "   🤖 Android: Expo Go app" -ForegroundColor White
        Write-Host "   🍎 iOS: Camera app (will open Expo Go)" -ForegroundColor White
        
        Read-Host "`nPress Enter when you've installed Expo Go"
        
        Write-Host "`n🚀 Starting ButterUp mobile app..." -ForegroundColor Green
        
        # Install dependencies if needed
        if (-not (Test-Path "ButterUpMobile\node_modules")) {
            Write-Host "📦 Installing dependencies (this may take a minute)..." -ForegroundColor Yellow
            Set-Location "ButterUpMobile"
            npm install
            Set-Location ".."
        }
        
        Set-Location "ButterUpMobile"
        Write-Host "`n📱 Scan the QR code with your phone!" -ForegroundColor Green
        npm start
    }
    
    "2" {
        Write-Host "`n🤖 Setting up Android Emulator..." -ForegroundColor Green
        
        # Check if Android Studio is installed
        $androidHome = $env:ANDROID_HOME
        if (-not $androidHome) {
            $androidHome = "$env:USERPROFILE\AppData\Local\Android\Sdk"
        }
        
        if (-not (Test-Path "$androidHome\emulator\emulator.exe")) {
            Write-Host "`n❌ Android Studio not found!" -ForegroundColor Red
            Write-Host "`n📋 Please install Android Studio first:" -ForegroundColor Yellow
            Write-Host "1. Download from: https://developer.android.com/studio" -ForegroundColor Cyan
            Write-Host "2. Install and set up an Android Virtual Device (AVD)" -ForegroundColor Cyan
            Write-Host "3. Run: .\setup-android-emulator.ps1" -ForegroundColor Cyan
            exit 1
        }
        
        Write-Host "✅ Android SDK found!" -ForegroundColor Green
        Write-Host "`n🚀 Starting Android emulator and app..." -ForegroundColor Green
        
        # Install dependencies if needed
        if (-not (Test-Path "ButterUpMobile\node_modules")) {
            Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
            Set-Location "ButterUpMobile"
            npm install
            Set-Location ".."
        }
        
        Set-Location "ButterUpMobile"
        npm run android
    }
    
    "3" {
        Write-Host "`n🌐 Setting up web preview..." -ForegroundColor Green
        Write-Host "This will open ButterUp in your default browser" -ForegroundColor Cyan
        
        # Install dependencies if needed
        if (-not (Test-Path "ButterUpMobile\node_modules")) {
            Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
            Set-Location "ButterUpMobile"
            npm install
            Set-Location ".."
        }
        
        Write-Host "`n🚀 Starting web version..." -ForegroundColor Green
        Set-Location "ButterUpMobile"
        npm run web
    }
    
    default {
        Write-Host "`n❌ Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nButterUp mobile app is starting!" -ForegroundColor Green
Write-Host "`nUseful tips:" -ForegroundColor Cyan
Write-Host "- Press r to reload the app" -ForegroundColor White
Write-Host "- Press c to clear cache" -ForegroundColor White
Write-Host "- Press q to quit" -ForegroundColor White
Write-Host "- Check the terminal for any error messages" -ForegroundColor White
