# ButterUp - NZ Butter Price Tracker 🧈

A minimalist application suite that tracks butter prices across major New Zealand supermarkets. Includes a Django backend API, React web frontend, and React Native mobile app.

## Features

### Core Functionality
- **Price Tracking**: Monitor butter prices from Woolworths, Pak'nSave, and New World
- **Historical Trends**: View price trends with interactive charts
- **Store Comparison**: Side-by-side price analysis across retailers
- **Mobile & Web**: Access via web browser or mobile app
- **API-First**: RESTful API for all data operations
core functionality: bar code scanning of products, 

### Platforms
- **Web Application**: React.js with responsive design
- **Mobile App**: React Native with Expo for iOS and Android
- **Backend API**: Django REST Framework

## Tech Stack

### Frontend (Web)
- **React.js** - Modern UI with hooks and functional components
- **Chart.js** - Interactive data visualization
- **Tailwind CSS** - Responsive styling
- **Vite** - Fast development and build tool

### Mobile App
- **React Native** - Cross-platform mobile development
- **Expo** - Development platform and tools
- **TypeScript** - Type-safe development

### Backend
- **Django** - Web framework
- **Django REST Framework** - API endpoints
- **SQLite** - Database (development)
- **Celery** - Background tasks for scraping

## Project Structure

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
│   │   ├── contexts/       # React Context providers
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript definitions
│   └── package.json
└── backend/                 # Django API backend
    ├── butter_tracker/     # Main Django project
    ├── api/               # REST API endpoints
    ├── scraper/           # Web scraping modules
    ├── tasks/             # Background tasks
    └── requirements.txt
```

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+

### Quick Start

1. **Backend Setup**
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

2. **Web Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Mobile App**
   ```bash
   cd ButterUpMobile
   npm install
   npm run web  # For web preview
   # or
   npm start    # For mobile (requires Expo Go app)
   ```

### Access Points
- **Backend API**: http://localhost:8000/api/
- **Web App**: http://localhost:5173/
- **Mobile Web**: http://localhost:8081/

## Current Status

✅ **Working Components:**
- Django REST API with stores, products, and prices endpoints
- React web frontend with price comparison and charts
- React Native mobile app with store selection and product browsing
- Web scraping system for automated price collection

📋 **Ready for Development:**
- All three applications are functional and ready for feature development
- Clean, minimal codebase with no unnecessary files
- Proper separation between web, mobile, and backend concerns

## Development Notes

### Architecture
- **API-First**: All data flows through the Django REST API
- **Shared Components**: Mobile and web apps share the same backend
- **Modular Design**: Each application can be developed independently

### Next Steps
- Add user authentication across all platforms
- Implement real-time price alerts
- Add more supermarket chains
- Enhance mobile app with push notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both web and mobile
5. Submit a pull request

## License

MIT License - see LICENSE file for details 