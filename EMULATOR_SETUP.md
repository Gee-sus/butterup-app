# 📱 Mobile Platform Emulator Setup Guide

This guide will help you set up Android and iOS emulators to test your ButterUp mobile app.

## 🤖 Android Emulator Setup

### Prerequisites
- **Android Studio** (Required for Android emulator)
- **Java Development Kit (JDK)** 8 or newer
- At least **8GB RAM** and **20GB free disk space**

### Step 1: Install Android Studio
1. Download Android Studio from: https://developer.android.com/studio
2. Run the installer and follow the setup wizard
3. Make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)

### Step 2: Set Up Environment Variables
Add these to your system environment variables:

```bash
# Windows
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk

# Add to PATH:
%ANDROID_HOME%\emulator
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
%ANDROID_HOME%\platform-tools
```

### Step 3: Create Android Virtual Device (AVD)
1. Open Android Studio
2. Go to **Tools → AVD Manager**
3. Click **Create Virtual Device**
4. Choose a device (recommended: **Pixel 7** or **Pixel 6**)
5. Select system image (recommended: **API 33** or **API 34**)
6. Configure AVD settings:
   - **Name**: ButterUp_Android
   - **RAM**: 4096 MB (if you have 16GB+ system RAM)
   - **Internal Storage**: 8192 MB
   - **SD Card**: 1024 MB
7. Click **Finish**

### Step 4: Test Android Emulator
```bash
# Start emulator from command line
emulator -avd ButterUp_Android

# Or use the setup script (see below)
.\setup-android-emulator.ps1
```

## 🍎 iOS Simulator Setup (macOS Only)

### Prerequisites
- **macOS** (iOS Simulator only works on Mac)
- **Xcode** (from Mac App Store)
- **Xcode Command Line Tools**

### Step 1: Install Xcode
1. Install Xcode from the Mac App Store
2. Open Xcode and accept the license agreement
3. Install additional components when prompted

### Step 2: Install Command Line Tools
```bash
xcode-select --install
```

### Step 3: Set Up iOS Simulator
The iOS Simulator comes with Xcode and includes multiple device types:
- iPhone 15 Pro Max
- iPhone 15 Pro
- iPhone 14
- iPad Air
- iPad Pro

### Step 4: Test iOS Simulator
```bash
# Open simulator
open -a Simulator

# Or use Expo CLI
npx expo start --ios
```

## 🚀 Quick Setup Scripts

### Windows Android Setup Script
I've created a PowerShell script to automate Android emulator setup.

### Expo Development Workflow

### Option 1: Expo Go App (Easiest)
1. Install **Expo Go** on your physical device:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start your app:
   ```bash
   cd ButterUpMobile
   npm start
   ```

3. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (will open in Expo Go)

### Option 2: Emulators (Full Native Experience)
1. Start your emulator first
2. Run your app:
   ```bash
   cd ButterUpMobile
   npm run android  # For Android emulator
   npm run ios      # For iOS simulator (macOS only)
   ```

## 🛠 Troubleshooting

### Android Issues
- **Emulator won't start**: Check if virtualization is enabled in BIOS
- **Slow performance**: Increase RAM allocation or enable hardware acceleration
- **ADB not found**: Make sure Android SDK is in your PATH

### iOS Issues (macOS only)
- **Simulator not opening**: Try `sudo xcode-select -r`
- **Build errors**: Clean build folder in Xcode

### Expo Issues
- **Metro bundler errors**: Clear cache with `npx expo start -c`
- **Network issues**: Make sure your device and computer are on the same WiFi

## 📋 Recommended Testing Devices

### Android
- **Pixel 7** (API 33) - Modern Android experience
- **Pixel 6** (API 32) - Good performance balance
- **Galaxy S21** (API 31) - Samsung-specific testing

### iOS
- **iPhone 15 Pro** - Latest features
- **iPhone 14** - Most common device
- **iPad Air** - Tablet testing

## 🎯 Next Steps

1. Choose your preferred testing method (Expo Go vs Emulators)
2. Run the setup scripts provided
3. Test your ButterUp app on multiple devices
4. Use device-specific features (GPS, camera, etc.)

## 💡 Pro Tips

- **Use Expo Go for rapid development** - instant updates without rebuilding
- **Use emulators for final testing** - closer to production environment
- **Test on both platforms** - iOS and Android have different behaviors
- **Use different screen sizes** - phones, tablets, and foldable devices
- **Test network conditions** - slow 3G, WiFi, offline mode
