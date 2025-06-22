# Flood Risk Prediction System

A web application that visualizes geospatial data to predict flood risks in specific areas using real-time data and machine learning.

## Features

- Interactive map visualization using Leaflet.js
- Real-time GIS data integration
- Flood risk prediction engine
- Alert system for high-risk areas
- User-friendly interface for area selection and risk assessment

## Tech Stack

- Frontend: HTML, CSS, JavaScript, Leaflet.js
- Backend: Flask (Python)
- Database: PostgreSQL with PostGIS
- Maps: Leaflet with OpenStreetMap
- ML: scikit-learn

## Setup Instructions

1. Install PostgreSQL with PostGIS extension
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:

   - Copy `.env.example` to `.env`
   - Update database credentials and API keys

5. Initialize the database:

   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```

6. Run the application:
   ```bash
   flask run
   ```

## Project Structure

```
GEO-Tagging/
├── app/
│   ├── static/          # CSS, JS, images
│   ├── templates/       # HTML templates
│   ├── models/         # Database models
│   ├── routes/         # API endpoints
│   └── utils/          # Helper functions
├── config.py           # Configuration
├── requirements.txt    # Dependencies
└── README.md          # Documentation
```

## API Documentation

The API endpoints will be documented here as they are developed.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
