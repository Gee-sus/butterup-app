# ButterUp Mobile - Expo Version

A React Native mobile app for comparing butter prices across New Zealand supermarkets, built with Expo for easy development and hot reloading.

## 🚀 Quick Start with Hot Reloading

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm start
```

This will start the Expo development server with **hot reloading enabled**!

### 3. Run on Your Device/Emulator

**Option A: Scan QR Code (Recommended)**
- Install the **Expo Go** app on your phone
- Scan the QR code that appears in your terminal/browser
- The app will load instantly with hot reloading!

**Option B: Use Emulator**
```bash
# Quick setup (Windows)
..\quick-start-mobile.ps1

# Set up Android emulator first
..\setup-android-emulator.ps1
npm run android

# Set up iOS simulator (macOS only)
..\setup-ios-simulator.sh
npm run ios

# Web preview
npm run web
```

## 🔥 Hot Reloading Features

With Expo, you get **instant hot reloading**:

- **Fast Refresh**: Changes to React components update instantly
- **Live Reload**: Full app reload when needed
- **Error Overlay**: See errors directly in the app
- **Debug Menu**: Shake your device or press `Ctrl+M` (Android) / `Cmd+D` (iOS)

### Hot Reloading Commands:
- **Press `r`** in terminal: Reload the app
- **Press `m`** in terminal: Toggle the menu
- **Press `j`** in terminal: Open debugger
- **Press `?`** in terminal: Show all commands

## 🔧 Configuration

### Backend API URL
Update your Django backend URL in `src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://your-computer-ip:8000/api';
```

**Important**: Use your computer's IP address, not `localhost`, so your phone can connect to your Django server.

### Find Your IP Address:
- **Windows**: Run `ipconfig` and look for "IPv4 Address"
- **Mac/Linux**: Run `ifconfig` or `ip addr`

Example: If your IP is `192.168.1.100`, use:
```typescript
const API_BASE_URL = 'http://192.168.1.100:8000/api';
```

## 📱 Features

- ✅ **Hot Reloading** - See changes instantly
- ✅ **Location Services** - Find nearby stores
- ✅ **Store Selection** - Choose from NZ supermarkets
- ✅ **Product Browsing** - View butter products and prices
- ✅ **Price History** - Track price trends
- ✅ **Price Alerts** - Get notified of price changes
- ✅ **Cross-Platform** - Works on iOS, Android, and Web

## 🛠 Development Tips

### Making Changes
1. Edit any file in `src/`
2. Save the file
3. See changes instantly in the app!

### Debugging
- **Console Logs**: Check the Expo CLI terminal
- **React DevTools**: Available in Expo Go
- **Network Requests**: Visible in the terminal

### Common Commands
```bash
npm start          # Start with hot reloading
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in browser
npm run build      # Build for production
```

## 🔗 Backend Integration

Make sure your Django backend is running:
```bash
cd ../backend
python manage.py runserver 0.0.0.0:8000
```

The mobile app will connect to your Django API endpoints:
- `/api/stores/` - Store data
- `/api/products/` - Product information
- `/api/prices/` - Price data
- `/api/price-alerts/` - User alerts

## 📦 Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context (Location, Store)
├── screens/        # App screens
├── services/       # API integration
├── types/          # TypeScript definitions
└── utils/          # Helper functions
```

## 🎯 Next Steps

1. **Start the app**: `npm start`
2. **Scan QR code** with Expo Go app
3. **Make changes** to see hot reloading in action
4. **Connect to your Django backend** by updating the API URL
5. **Test location services** and store selection

## 🆘 Troubleshooting

### App won't connect to backend
- Check your IP address in `src/services/api.ts`
- Make sure Django server is running on `0.0.0.0:8000`
- Ensure phone and computer are on the same WiFi network

### Hot reloading not working
- Try pressing `r` in the terminal to reload
- Restart with `npm start`
- Check for syntax errors in your code

### Location not working
- Grant location permissions in Expo Go
- Check device location settings

Happy coding! 🧈📱
