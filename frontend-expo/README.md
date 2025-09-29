# ButterUp Frontend (Expo + TypeScript)

A React Native app built with Expo and TypeScript for comparing butter prices across different stores.

## Features

- **Bottom Tab Navigation**: Home, Compare, List, Scan, Profile
- **Home Screen**: Displays butter products with prices from multiple stores
- **API Integration**: Connects to Django backend for store and price data
- **Components**: Reusable Snackbar, TopBar, and Card components
- **TypeScript**: Full type safety throughout the app

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Open the app on your device/simulator:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Press `w` for web browser

## Project Structure

```
src/
├── api/
│   ├── client.ts          # Axios configuration
│   └── endpoints.ts       # API endpoints and types
├── components/
│   ├── Card.tsx           # Reusable card component
│   ├── Snackbar.tsx       # Toast notifications
│   └── TopBar.tsx         # Custom header component
├── screens/
│   ├── HomeScreen.tsx     # Main screen with price data
│   ├── CompareScreen.tsx  # Price comparison
│   ├── ListScreen.tsx     # Shopping list
│   ├── ScanScreen.tsx     # Barcode scanning
│   └── ProfileScreen.tsx  # User profile
└── types/
    └── index.ts           # TypeScript type definitions
```

## API Integration

The app connects to a Django backend running on `http://localhost:8000` by default.

### Key Endpoints:
- `GET /api/stores/` - Fetch all stores
- `GET /api/products/` - Fetch all products
- `GET /api/prices/latest/` - Fetch latest prices

### Data Flow:
1. HomeScreen fetches stores using `getStores()`
2. Takes first 3 stores for price comparison
3. Fetches grouped prices using `getGroupedPrices()`
4. Displays products with prices in a flat list

## Development

- **Hot Reload**: Changes are reflected instantly
- **TypeScript**: Compile-time type checking
- **ESLint**: Code quality and consistency
- **Expo Dev Tools**: Built-in debugging and testing tools

## Backend Requirements

Make sure your Django backend is running on `http://localhost:8000` with the following endpoints available:
- Stores API
- Products API  
- Prices API

The app will show appropriate error messages if the backend is not available.
