import requests
from shapely.geometry import Point
from geoalchemy2.shape import from_shape
import elevation
import numpy as np
from datetime import datetime
from flask import current_app
from app import db
from app.models.location import Location
from app.models.weather_data import WeatherData

def get_location_data(lat, lon):
    """
    Fetch location data from OpenStreetMap using Overpass API
    """
    query = f"""
    [out:json][timeout:25];
    (
      node(around:100,{lat},{lon});
      way(around:100,{lat},{lon});
      relation(around:100,{lat},{lon});
    );
    out body;
    >;
    out skel qt;
    """
    try:
        response = requests.get('http://overpass-api.de/api/interpreter', params={'data': query})
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error fetching OSM data: {str(e)}")
        return None

def get_elevation_data(lat, lon):
    """
    Fetch elevation data using SRTM
    """
    try:
        # Download SRTM data for the area
        elevation.clip(bounds=(lon-0.01, lat-0.01, lon+0.01, lat+0.01), output='elevation.tif')
        # Read the elevation data
        elevation_data = elevation.read_elevation('elevation.tif')
        return elevation_data
    except Exception as e:
        current_app.logger.error(f"Error fetching elevation data: {str(e)}")
        return np.array([0])  # Return default elevation if error occurs

def get_weather_data(lat, lon, api_key):
    """
    Fetch weather data from OpenWeatherMap API
    """
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Error fetching weather data: {str(e)}")
        return None

def fetch_and_store_gis_data(lat, lon, name, description=""):
    """
    Fetch and store GIS data for a location
    """
    try:
        # Create point geometry
        point = Point(lon, lat)
        
        # Get elevation data
        elevation_data = get_elevation_data(lat, lon)
        avg_elevation = float(np.mean(elevation_data))
        
        # Create location with GIS data
        location = Location(
            name=name,
            description=description,
            latitude=lat,
            longitude=lon,
            elevation=avg_elevation,
            geometry=from_shape(point, srid=4326)
        )
        
        # Get weather data
        weather_data = get_weather_data(lat, lon, current_app.config['WEATHER_API_KEY'])
        
        if weather_data:
            # Create weather data entry
            weather_entry = WeatherData(
                location=location,
                rainfall=weather_data.get('rain', {}).get('1h', 0),
                water_level=weather_data.get('main', {}).get('sea_level', 0),
                timestamp=datetime.utcnow()
            )
            db.session.add(weather_entry)
        
        # Save to database
        db.session.add(location)
        db.session.commit()
        
        return location
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error storing GIS data: {str(e)}")
        raise 