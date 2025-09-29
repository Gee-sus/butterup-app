# 📱 ButterUp Mobile Testing Guide

Your mobile emulator setup is now complete! Here's how to test your ButterUp mobile app on different platforms.

## 🚀 Quick Start

### Easiest Way (Recommended)
```bash
.\start-mobile.ps1
```
This script will guide you through the setup process.

## 📋 Testing Options

### 1. 📲 Expo Go (Easiest - Real Device)
**Best for:** Rapid development and testing
- Install "Expo Go" app on your phone
- Run: `cd ButterUpMobile && npm start`
- Scan QR code with your phone
- ✅ Instant hot reloading
- ✅ Real device testing
- ✅ No emulator setup needed

### 2. 🤖 Android Emulator (Full Native)
**Best for:** Complete Android testing
- Run: `.\setup-android-emulator.ps1` (first time only)
- Run: `cd ButterUpMobile && npm run android`
- ✅ Full Android experience
- ✅ Debug tools available
- ❌ Requires Android Studio

### 3. 🍎 iOS Simulator (macOS Only)
**Best for:** iOS testing on Mac
- Run: `./setup-ios-simulator.sh` (first time only)
- Run: `cd ButterUpMobile && npm run ios`
- ✅ Full iOS experience
- ✅ Multiple device types
- ❌ macOS required

### 4. 🌐 Web Browser (Quick Preview)
**Best for:** Quick UI testing
- Run: `cd ButterUpMobile && npm run web`
- ✅ Fastest iteration
- ✅ Easy debugging
- ❌ Not fully native

## 🛠 Setup Files Created

| File | Purpose |
|------|---------|
| `EMULATOR_SETUP.md` | Comprehensive setup guide |
| `setup-android-emulator.ps1` | Automated Android setup |
| `setup-ios-simulator.sh` | Automated iOS setup (macOS) |
| `start-mobile.ps1` | Quick start script |
| `test-mobile-app.ps1` | Advanced testing script |
| `emulator-configs.json` | Device configurations |

## 🎯 Recommended Testing Workflow

### For Development:
1. **Primary**: Use Expo Go on your phone for instant feedback
2. **Secondary**: Test on Android emulator for native features
3. **Final**: Test on iOS simulator (if on macOS)

### For Different Features:
- **UI/UX**: Expo Go + Web browser
- **Location Services**: Android/iOS emulators
- **Performance**: Native emulators
- **Cross-platform**: Test on both Android and iOS

## 🔧 Troubleshooting

### Common Issues:
- **"Metro bundler not found"**: Run `npm install -g @expo/cli`
- **"Android emulator won't start"**: Check if virtualization is enabled
- **"Network issues"**: Ensure phone and computer on same WiFi
- **"Slow performance"**: Increase emulator RAM or use physical device

### Quick Fixes:
```bash
# Clear cache
cd ButterUpMobile
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Reset Android emulator
# In Android Studio: Wipe Data in AVD Manager
```

## 📱 Device Testing Matrix

| Device Type | Screen Size | Use Case |
|-------------|-------------|----------|
| Phone (Small) | 4.7" - 5.4" | Compact layout testing |
| Phone (Large) | 6.1" - 6.7" | Standard testing |
| Tablet | 10"+ | Large screen layouts |
| Foldable | Variable | Responsive design |

## 🎉 You're Ready!

Your ButterUp mobile app testing environment is fully set up. You can now:

✅ Test on real devices with Expo Go  
✅ Use Android emulator for full native testing  
✅ Use iOS simulator on macOS  
✅ Quick preview in web browsers  
✅ Hot reload for instant development feedback  

## 💡 Pro Tips

- **Start with Expo Go** for fastest development
- **Use emulators for final testing** before releases  
- **Test on multiple screen sizes** to ensure responsive design
- **Check both portrait and landscape** orientations
- **Test network conditions** (slow, offline, etc.)
- **Use device-specific features** (GPS, camera, notifications)

Happy testing! 🧈📱
