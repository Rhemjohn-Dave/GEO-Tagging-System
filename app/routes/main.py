from flask import Blueprint, render_template, jsonify, request
from app.models.location import Location
from app.models.weather_data import WeatherData
from app.utils.flood_prediction import predict_flood_risk
from app.utils.gis_data import fetch_and_store_gis_data
from app import db

bp = Blueprint('main', __name__)

@bp.route('/')
def index():
    """Render the main map page."""
    return render_template('index.html')

@bp.route('/api/locations', methods=['POST'])
def create_location():
    """
    Create a new location with GIS data
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create location with GIS data
        location = fetch_and_store_gis_data(
            lat=float(data['latitude']),
            lon=float(data['longitude']),
            name=data['name'],
            description=data.get('description', '')
        )
        
        return jsonify(location.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/locations', methods=['GET'])
def get_locations():
    """
    Get all locations
    """
    try:
        locations = Location.query.all()
        return jsonify([location.to_dict() for location in locations])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/locations/<int:location_id>', methods=['GET'])
def get_location(location_id):
    """
    Get a specific location by ID
    """
    try:
        location = Location.query.get_or_404(location_id)
        return jsonify(location.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/api/weather-data', methods=['GET'])
def get_weather_data():
    """Get weather data for a specific location."""
    location_id = request.args.get('location_id')
    if not location_id:
        return jsonify({'error': 'Location ID is required'}), 400
    
    weather_data = WeatherData.query.filter_by(location_id=location_id).first()
    if not weather_data:
        return jsonify({'error': 'Weather data not found'}), 404
    
    return jsonify(weather_data.to_dict())

@bp.route('/api/predict-flood-risk', methods=['POST'])
def predict_risk():
    """Predict flood risk for a given location."""
    data = request.get_json()
    if not data or 'location_id' not in data:
        return jsonify({'error': 'Location ID is required'}), 400
    
    location = Location.query.get(data['location_id'])
    if not location:
        return jsonify({'error': 'Location not found'}), 404
    
    risk_level = predict_flood_risk(location)
    return jsonify({
        'location_id': location.id,
        'risk_level': risk_level,
        'timestamp': location.updated_at.isoformat()
    }) 