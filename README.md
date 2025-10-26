## ButterUp Backend MVP

This Django project powers the ButterUp mobile app MVP (photo → cheapest butter prices nearby).

### Tech Stack

- Python 3.11
- Django 5 + Django REST Framework
- Pillow (image resize)
- pytesseract (OCR – processed in-memory only)
- rapidfuzz (fuzzy product matching)
- haversine (distance calculations)
- django-cors-headers
- gunicorn
- psycopg2-binary (Postgres ready)
- dj-database-url (optional DATABASE_URL parsing)

### Setup

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py shell -c "from compare.seeds.seed_data import run as s; s()"
python manage.py runserver 0.0.0.0:8000
```

### OCR Prerequisite

The backend relies on Tesseract OCR. Install it on the host machine or container before running the server.

- **Ubuntu/Debian:** `sudo apt-get install tesseract-ocr`
- **macOS (Homebrew):** `brew install tesseract`
- **Windows:** download and install from <https://github.com/UB-Mannheim/tesseract/wiki>. Ensure the Tesseract binary is on your system `PATH`.

### Key Endpoints

- `POST /api/photo/identify` – Accepts an image, runs OCR + fuzzy match, returns a product candidate or suggestions.
- `GET /api/compare?product_id=&lat=&lng=` – Returns prices sorted by cheapest then distance with summary stats.
- `GET /api/products/suggest?q=` – Quick fuzzy search against known products.

### Safety Notes

- Uploaded images are processed strictly in memory; nothing is written to disk.
- Anonymous requests are throttled (60/min by default) via DRF throttling.
