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

## Assistant Tools Available

These tools are used by the in-repo AI assistant (in Cursor) to work on this codebase. They are not part of the runtime app.

- **`functions.codebase_search`**: semantic code search
  - **Use for**: finding how/where functionality works across the repo
  - **Avoid**: exact text matches (prefer `functions.grep`)

- **`functions.grep`**: exact string/regex search
  - **Use for**: symbol names, imports, precise patterns; respects `.gitignore`
  - **Avoid**: broad “how does X work?” queries (prefer `functions.codebase_search`)

- **`functions.read_file`**: read file contents (text/images)
  - **Use for**: inspecting specific files before editing
  - **Avoid**: listing directories (prefer `functions.list_dir`)

- **`functions.list_dir`**: list directory contents
  - **Use for**: quick structure overviews
  - **Avoid**: searching by name pattern (prefer `functions.glob_file_search`)

- **`functions.glob_file_search`**: find files by glob pattern
  - **Use for**: locating files by extension/name across folders
  - **Avoid**: content search (prefer `functions.grep` or `functions.codebase_search`)

- **`functions.apply_patch`**: structured file edits via diffs
  - **Use for**: reliable, reviewable code/document edits
  - **Note**: re-read files before large/iterative edits to keep context fresh

- **`functions.edit_file`**: direct edit helper (fallback)
  - **Use for**: small, targeted changes when a structured diff is impractical
  - **Avoid**: multi-hunk edits (prefer `functions.apply_patch`)

- **`functions.delete_file`**: remove a file
  - **Use for**: deleting generated or obsolete files
  - **Avoid**: directories (not supported)

- **`functions.read_lints`**: read linter/type-check diagnostics
  - **Use for**: validating edited files are clean
  - **Avoid**: non-code files (may not apply)

- **`functions.edit_notebook`**: edit Jupyter notebook cells
  - **Use for**: modifying `.ipynb` notebooks in-place
  - **Avoid**: plain markdown/code files

- **`functions.todo_write`**: manage a structured TODO list
  - **Use for**: tracking multi-step implementation tasks
  - **Avoid**: trivial, single-step changes

- **`functions.update_memory`**: manage assistant memory
  - **Use for**: storing user-requested preferences/notes
  - **Avoid**: saving without explicit user consent

- **`functions.web_search`**: web lookups for up-to-date info
  - **Use for**: external references, breaking changes, recent docs
  - **Avoid**: internal code questions

- **`functions.run_terminal_cmd`**: propose/run non-interactive shell commands
  - **Use for**: installs, scripts, and commands that do not require prompts
  - **Avoid**: long-running foreground jobs (run in background), interactive prompts

- **`multi_tool_use.parallel`**: run tool calls concurrently
  - **Use for**: parallel searches/reads across files to speed up discovery
  - **Avoid**: dependent steps where order matters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both web and mobile
5. Submit a pull request

## License

MIT License - see LICENSE file for details 