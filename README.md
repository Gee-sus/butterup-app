# 🧈 ButterUp - Smart Butter Price Tracker

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Django](https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Expo](https://img.shields.io/badge/Expo-1B1F23?logo=expo&logoColor=white)](https://expo.dev/)

> **Stop overpaying for butter!** ButterUp helps New Zealand shoppers find the best butter prices across major supermarkets with AI-powered barcode scanning and OCR price detection.

---

## 🎯 Overview

ButterUp is a mobile-first price comparison platform that empowers consumers to make informed purchasing decisions. Using computer vision and real-time price tracking, we help Kiwi families save money on their weekly grocery shopping.

**Built for New Zealanders** | **Real-time Price Data** | **Community-Driven**

---

## ✨ Features

### 🚀 Current Features

- **📷 Barcode Scanner** - Instant product lookup using `expo-camera`
- **💰 Real-Time Price Comparison** - Compare prices across Pak'nSave, Woolworths & New World
- **📍 Location-Based Search** - Find cheapest options near you with geolocation
- **⭐ Product Ratings** - Community ratings and reviews
- **🗺️ Price Heatmap** - Visual price comparison across stores
- **📊 Quick Compare** - Side-by-side brand comparisons
- **📈 Historical Trends** - View price trends with interactive charts
- **📱 Mobile & Web Apps** - Access via mobile app or web browser
- **🎨 Beautiful UI** - Modern, intuitive design with Tailwind CSS
- **🔄 Automated Scraping** - Background price updates via Celery

### 🔮 Coming Soon

- **🤖 OCR Price Recognition** - Snap a photo of shelf price tags and automatically detect prices
- **📸 Receipt Scanner** - Upload receipts to contribute real-time price data
- **🔔 Price Alerts** - Get notified when your favorite butter goes on sale
- **📈 Price History Charts** - Track price trends over time
- **🏷️ Digital Shopping List** - Save products and compare total costs across stores
- **🤝 Community Contributions** - Crowdsourced price updates from shoppers
- **📦 Bulk Price Calculator** - Compare per-kg prices automatically
- **🍃 Sustainability Scores** - Track environmental impact of different brands
- **👤 User Authentication** - Personal accounts across all platforms
- **🔔 Push Notifications** - Real-time alerts for price drops

---

## 🏗️ Tech Stack

### Frontend (Web)
- **React.js** - Modern UI with hooks and functional components
- **Vite** - Fast development and build tool
- **Tailwind CSS** - Responsive styling
- **Chart.js** - Interactive data visualization

### Mobile App
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe development
- **expo-camera** - Barcode scanning
- **expo-location** - Geolocation services
- **React Navigation** - Screen routing

### Backend
- **Django** - Python web framework
- **Django REST Framework** - RESTful API development
- **SQLite/PostgreSQL** - Database
- **Celery** - Task queue for web scraping
- **BeautifulSoup** - Web scraping

### Planned Integrations
- **Google Cloud Vision API / Tesseract OCR** - Price tag text recognition
- **OpenFoodFacts API** - Product nutrition & metadata
- **Firebase** - Push notifications & real-time updates

---

## 📱 Screenshots

```
[Home Screen]  [Barcode Scanner]  [Price Comparison]  [Price Heatmap]
```
*Screenshots coming soon!*

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+**
- **Node.js 16+**
- **Expo CLI** (install with `npm install -g expo-cli`)

### Quick Start

#### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### 2. Web Frontend
```bash
cd frontend
npm install
npm run dev
```

#### 3. Mobile App
```bash
cd ButterUpMobile
npm install
npx expo start

# Press 'a' for Android
# Press 'i' for iOS
# Press 'w' for web preview
```

### Access Points
- **Backend API**: http://localhost:8000/api/
- **Web App**: http://localhost:5173/
- **Mobile App**: Scan QR code with Expo Go app

---

## 📊 Project Structure

```
ButterUp/
├── frontend/                 # React.js web application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── utils/          # Helper functions
│   └── package.json
├── ButterUpMobile/          # React Native mobile app
│   ├── src/
│   │   ├── screens/        # Mobile app screens
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React Context providers
│   │   ├── services/       # API services
│   │   ├── navigation/     # App navigation
│   │   └── types/          # TypeScript definitions
│   └── package.json
└── backend/                 # Django API backend
    ├── butter_tracker/     # Main Django project
    ├── api/               # REST API endpoints
    │   ├── models.py      # Database models
    │   ├── views.py       # API views
    │   ├── serializers.py # Data serialization
    │   └── utils/         # Helper utilities
    │       ├── gtin.py    # Barcode validation
    │       └── geo.py     # Location calculations
    ├── scraper/           # Web scraping modules
    ├── tasks/             # Background tasks
    └── requirements.txt
```

---

## 🎓 How It Works

### Barcode Scanning Flow
1. **User opens scanner** → Camera activates
2. **Barcode detected** → EAN-13, UPC-A, etc.
3. **GTIN validated** → Normalized to 14 digits
4. **Backend query** → Search price database
5. **Geolocation** → Find nearby stores
6. **Sort results** → By price and distance
7. **Display** → Show prices with savings info

### OCR Price Recognition (Upcoming)
1. **Photo capture** → User snaps shelf price tag
2. **OCR processing** → Extract text from image
3. **Price parsing** → Identify price, product, store
4. **Validation** → Match to existing products
5. **Database update** → Store new price
6. **Community alert** → Notify other users

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅ (Completed)
- [x] Backend API with Django REST Framework
- [x] Web frontend with React & Vite
- [x] Mobile app with React Native & Expo
- [x] Barcode scanning with expo-camera
- [x] Price comparison engine
- [x] Store locator with geolocation
- [x] Product ratings system
- [x] Price heatmap visualization
- [x] Automated web scraping

### Phase 2: AI & Computer Vision 🔄 (In Progress)
- [ ] OCR price tag recognition
- [ ] Receipt scanning & parsing
- [ ] Automated price extraction
- [ ] Image-based product identification
- [ ] GTIN validation & normalization

### Phase 3: Community & Social 📅 (Planned)
- [ ] User authentication system
- [ ] User-submitted price updates
- [ ] Price alert notifications
- [ ] Shopping list sharing
- [ ] Price history tracking
- [ ] Community ratings & reviews

### Phase 4: Advanced Analytics 🔮 (Future)
- [ ] Price trend predictions
- [ ] Personalized recommendations
- [ ] Savings dashboard
- [ ] Multi-product comparison
- [ ] Store inventory tracking
- [ ] Sustainability metrics

---

## 📈 Current Stats

- **18+ Products** in database
- **76+ Stores** across New Zealand
- **3 Major Chains** supported (Pak'nSave, Woolworths, New World)
- **Real-time** price updates via automated scraping

---

## 🎯 Why ButterUp?

**The Problem:**
- Butter prices vary wildly between stores (sometimes 40%+ difference!)
- No easy way to compare prices across multiple supermarkets
- Time-consuming to check prices at different locations

**Our Solution:**
- Instant barcode scanning for quick price lookup
- Real-time price comparison across all major NZ supermarkets
- Location-based results show cheapest nearby options
- Visual heatmaps make price differences obvious

**The Impact:**
- Average savings of **$200-300/year** for families
- Save time - no need to visit multiple stores
- Make informed decisions with historical price data
- Contribute to price transparency in NZ retail

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute
1. 🐛 **Report Bugs** - [Open an issue](https://github.com/Gee-sus/butterup-app/issues)
2. 💡 **Suggest Features** - Share your ideas
3. 📊 **Submit Price Data** - Help keep our database current
4. 💻 **Code Contributions** - Fork, code, and submit a PR
5. 📖 **Improve Documentation** - Help others get started

### Development Workflow
```bash
# 1. Fork & Clone
git clone https://github.com/YOUR_USERNAME/butterup-app.git
cd butterup-app

# 2. Create a feature branch
git checkout -b feature/amazing-feature

# 3. Make changes & test
# Test on both web and mobile platforms

# 4. Commit your changes
git add .
git commit -m "feat: add amazing feature"

# 5. Push & create PR
git push origin feature/amazing-feature
```

### Commit Message Convention
We use conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test updates
- `chore:` - Build/config changes

---

## 🔧 Development Notes

### Architecture
- **API-First Design** - All data flows through Django REST API
- **Shared Backend** - Mobile and web apps use same endpoints
- **Modular Frontend** - Independent web and mobile codebases
- **Clean Separation** - Clear boundaries between concerns

### Current Status

✅ **Working Components:**
- Django REST API with comprehensive endpoints
- React web frontend with charts and visualizations
- React Native mobile app with barcode scanning
- Automated web scraping system
- Location-based store filtering
- Product rating system

📋 **Ready for Development:**
- All three applications functional
- Clean, minimal codebase
- Proper separation of concerns
- Type-safe mobile app with TypeScript

---

## 🧪 Testing

```bash
# Backend tests
cd backend
python manage.py test

# Mobile app tests
cd ButterUpMobile
npm test
```

---

## 🚀 Deployment

### Backend
- Deploy to **Heroku**, **Railway**, or **DigitalOcean**
- Use **PostgreSQL** for production database
- Configure **Celery** with Redis for background tasks

### Mobile App
Coming soon to:
- 📱 **Google Play Store**
- 🍎 **Apple App Store**

### Web App
- Deploy to **Vercel** or **Netlify**
- Configure environment variables for API endpoint

---

## 🛠️ Environment Variables

### Backend (.env)
```bash
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://...
ALLOWED_HOSTS=your-domain.com
```

### Frontend (.env)
```bash
VITE_API_URL=https://api.butterup.nz
```

### Mobile App (src/config.ts)
```typescript
export const API_BASE_URL = 'https://api.butterup.nz';
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Open Food Facts** - Product database and API
- **Expo Team** - Amazing development tools
- **NZ Supermarkets** - Price data sources
- **React Native Community** - Libraries and support
- **Contributors** - Thank you for your contributions! 💙

---

## 📬 Contact & Support

- **GitHub Issues:** [Report a bug](https://github.com/Gee-sus/butterup-app/issues)
- **GitHub Discussions:** [Ask questions](https://github.com/Gee-sus/butterup-app/discussions)
- **Email:** support@butterup.nz *(coming soon)*
- **Developer:** [@Gee-sus](https://github.com/Gee-sus)

---

## 🌟 Show Your Support

If you find ButterUp useful, please consider:
- ⭐ **Starring this repository**
- 🐛 **Reporting bugs**
- 💡 **Suggesting features**
- 📢 **Sharing with friends**
- 🤝 **Contributing code**

---

**Built with ❤️ in New Zealand 🇳🇿**

**Save money, shop smarter with ButterUp!** 🧈💰
