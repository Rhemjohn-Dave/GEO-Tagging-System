from app.models.location import Location
from app.models.weather_data import WeatherData
from flask import current_app

def predict_flood_risk(location):
    """
    Predict flood risk based on current weather data and location characteristics.
    Returns: 'low', 'medium', or 'high'
    """
    # Get latest weather data
    weather_data = WeatherData.query.filter_by(location_id=location.id).order_by(
        WeatherData.timestamp.desc()
    ).first()
    
    if not weather_data:
        return 'unknown'
    
    # Get thresholds from config
    rainfall_threshold = current_app.config['RAINFALL_THRESHOLD']
    water_level_threshold = current_app.config['WATER_LEVEL_THRESHOLD']
    
    # Simple rule-based risk assessment
    risk_score = 0
    
    # Rainfall factor
    if weather_data.rainfall > rainfall_threshold:
        risk_score += 2
    elif weather_data.rainfall > rainfall_threshold * 0.7:
        risk_score += 1
    
    # Water level factor
    if weather_data.water_level > water_level_threshold:
        risk_score += 2
    elif weather_data.water_level > water_level_threshold * 0.8:
        risk_score += 1
    
    # Elevation factor
    if location.elevation < 10:  # Low elevation areas are more prone to flooding
        risk_score += 1
    
    # Determine risk level
    if risk_score >= 4:
        return 'high'
    elif risk_score >= 2:
        return 'medium'
    else:
        return 'low' 