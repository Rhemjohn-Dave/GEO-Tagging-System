import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-please-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://postgres:postgres@localhost/flood_prediction'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Weather API configuration
    WEATHER_API_KEY = os.environ.get('WEATHER_API_KEY')
    
    # Map configuration
    MAP_CENTER_LAT = 0.0  # Default center latitude
    MAP_CENTER_LNG = 0.0  # Default center longitude
    MAP_ZOOM = 13  # Default zoom level
    
    # Flood prediction thresholds
    RAINFALL_THRESHOLD = 100  # mm
    WATER_LEVEL_THRESHOLD = 2.0  # meters 