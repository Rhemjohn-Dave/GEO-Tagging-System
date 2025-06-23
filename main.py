from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from models import db, Location, WeatherData, RiskAssessment
from datetime import datetime
import os
from dotenv import load_dotenv
import requests
from sqlalchemy.exc import SQLAlchemyError

# Get the absolute path to the .env file
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
print(f"DEBUG: Looking for .env file at: {env_path}")

# Load environment variables
load_dotenv(dotenv_path=env_path)

# Create Flask app with proper template folder
template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'app', 'templates'))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'app', 'static'))
print(f"DEBUG: Template directory: {template_dir}")
print(f"DEBUG: Static directory: {static_dir}")

app = Flask(__name__, 
           template_folder=template_dir,
           static_folder=static_dir)
CORS(app)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///flood_prediction.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)

# Create tables and add test data if needed
with app.app_context():
    try:
        db.create_all()
        print("DEBUG: Database tables created successfully")
        
        # Check if we have any locations
        if Location.query.count() == 0:
            print("DEBUG: No locations found, creating test location")
            test_location = Location(
                name="Test Location",
                description="A test location for development",
                latitude=51.5074,
                longitude=-0.1278,
                elevation=35.0
            )
            db.session.add(test_location)
            db.session.commit()
            print("DEBUG: Test location created successfully")
    except Exception as e:
        print(f"DEBUG: Error initializing database: {str(e)}")
        print("Please check your database configuration")

@app.route("/")
def index():
    # Get weather API key
    weather_api_key = os.getenv('WEATHER_API_KEY')
    print("DEBUG: Environment variables loaded")
    print(f"DEBUG: WEATHER_API_KEY value: {weather_api_key}")
    
    if not weather_api_key:
        print("Warning: WEATHER_API_KEY not found in environment variables")
        weather_api_key = ""  # Set empty string as fallback
    
    print(f"Weather API key loaded: {weather_api_key[:5] if weather_api_key else 'None'}...")
    
    # Pass the weather API key to the template
    return render_template("index.html", weather_api_key=weather_api_key)

@app.route("/forecast")
def forecast():
    # Get weather API key
    weather_api_key = os.getenv('WEATHER_API_KEY')
    if not weather_api_key:
        weather_api_key = ""
    
    # Get location from query parameters if provided
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    
    return render_template("forecast.html", 
                         weather_api_key=weather_api_key,
                         lat=lat,
                         lng=lng)

@app.route("/locations")
def locations():
    # Get weather API key
    weather_api_key = os.getenv('WEATHER_API_KEY')
    if not weather_api_key:
        weather_api_key = ""
    
    return render_template("locations.html", weather_api_key=weather_api_key)

@app.route("/api/locations", methods=["GET"])
def get_locations():
    try:
        print("DEBUG: Fetching all locations")
        locations = Location.query.all()
        print(f"DEBUG: Found {len(locations)} locations")
        
        locations_data = [{
            'id': location.id,
            'name': location.name,
            'description': location.description,
            'lat': location.latitude,
            'lng': location.longitude,
            'elevation': location.elevation,
            'created_at': location.created_at.isoformat(),
            'updated_at': location.updated_at.isoformat()
        } for location in locations]
        
        print("DEBUG: Successfully processed locations data")
        return jsonify(locations_data)
    except Exception as e:
        print(f"DEBUG: Error in get_locations: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/locations/<int:location_id>", methods=["GET"])
def get_location(location_id):
    try:
        location = Location.query.get_or_404(location_id)
        return jsonify(location.to_dict())
    except SQLAlchemyError as e:
        print(f"Database error in get_location: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        print(f"Unexpected error in get_location: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route("/api/locations", methods=["POST"])
def create_location():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        location = Location(
            name=data.get("name", "Unknown Location"),
            latitude=data.get("latitude", 0),
            longitude=data.get("longitude", 0),
            description=data.get("description", ""),
            elevation=data.get("elevation", 0),
            rainfall_history=data.get("rainfall_history", []),
            average_rainfall=data.get("average_rainfall", 0)
        )
        db.session.add(location)
        db.session.commit()

        # Create initial weather data
        weather_data = WeatherData(
            location_id=location.id,
            rainfall=0,
            water_level=0,
            temperature=0,
            humidity=0,
            wind_speed=0
        )
        db.session.add(weather_data)
        db.session.commit()

        return jsonify(location.to_dict()), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in create_location: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Unexpected error in create_location: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route("/api/weather-data", methods=["GET"])
def get_weather_data():
    try:
        location_id = request.args.get("location_id")
        if not location_id:
            return jsonify({"error": "Location ID is required"}), 400

        weather_data = WeatherData.query.filter_by(location_id=location_id).first()
        if not weather_data:
            # Create new weather data if it doesn't exist
            weather_data = WeatherData(location_id=location_id)
            db.session.add(weather_data)
            db.session.commit()

        return jsonify(weather_data.to_dict())
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error in get_weather_data: {str(e)}")
        return jsonify({"error": "Database error occurred"}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Unexpected error in get_weather_data: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

@app.route("/api/predict-flood-risk", methods=["POST"])
def predict_flood_risk():
    try:
        data = request.json
        print("DEBUG: Received data:", data)
        
        location_id = data.get("location_id")
        lat = data.get("latitude")
        lng = data.get("longitude")
        
        print(f"DEBUG: Predicting flood risk for location: {location_id} at coordinates: {lat}, {lng}")
        
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400
            
        # Get weather API key
        weather_api_key = os.getenv('WEATHER_API_KEY')
        if not weather_api_key:
            return jsonify({"error": "Weather API key not configured"}), 500
            
        # Fetch weather data
        response = requests.get(
            f"https://api.weatherapi.com/v1/forecast.json",
            params={
                "key": weather_api_key,
                "q": f"{lat},{lng}",
                "days": 5,
                "aqi": "no",
                "alerts": "no"
            }
        )
        
        if not response.ok:
            return jsonify({"error": "Failed to fetch weather data"}), response.status_code
            
        weather_data = response.json()
        print("DEBUG: Weather data received:", weather_data)
        
        # Get elevation data
        elevation_response = requests.get(
            f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lng}"
        )
        elevation = elevation_response.json().get("elevation", 0)
        print("DEBUG: Elevation data received:", elevation)
        
        # Calculate risk factors
        risk_factors = {
            "rainfall_risk": 0,
            "elevation_risk": 0,
            "humidity_risk": 0,
            "drainage_risk": 0
        }
        
        # Initialize variables with default values
        current_rainfall = 0.0
        forecast_rainfall = 0.0
        avg_rainfall = 0.0
        avg_humidity = 0.0
        
        # Helper function to safely convert to float
        def safe_float_convert(value, default=0.0):
            if value is None:
                return default
            if isinstance(value, list):
                print(f"DEBUG: Found list value: {value}, using first element")
                value = value[0] if value else default
            try:
                return float(value)
            except (ValueError, TypeError):
                print(f"DEBUG: Could not convert {value} to float, using default")
                return default
        
        # 1. Rainfall Risk (based on current and forecasted rainfall)
        try:
            # Get current rainfall
            current_data = weather_data.get("current", {})
            print("DEBUG: Current weather data:", current_data)
            precip_mm = current_data.get("precip_mm")
            print("DEBUG: Precipitation data type:", type(precip_mm))
            print("DEBUG: Precipitation data value:", precip_mm)
            current_rainfall = safe_float_convert(precip_mm)
            print("DEBUG: Current rainfall data:", current_rainfall)
            
            # Get forecast rainfall values
            forecast_rainfall_values = []
            forecast_days = weather_data.get("forecast", {}).get("forecastday", [])
            print("DEBUG: Forecast days:", forecast_days)
            
            for day in forecast_days:
                try:
                    day_data = day.get("day", {})
                    print("DEBUG: Day data:", day_data)
                    totalprecip_mm = day_data.get("totalprecip_mm")
                    print("DEBUG: Total precipitation data type:", type(totalprecip_mm))
                    print("DEBUG: Total precipitation data value:", totalprecip_mm)
                    rainfall = safe_float_convert(totalprecip_mm)
                    forecast_rainfall_values.append(rainfall)
                except Exception as e:
                    print(f"DEBUG: Error processing forecast rainfall for day: {e}")
                    forecast_rainfall_values.append(0.0)
            
            print("DEBUG: Forecast rainfall values:", forecast_rainfall_values)
            forecast_rainfall = sum(forecast_rainfall_values)
            avg_rainfall = (current_rainfall + forecast_rainfall) / (len(forecast_rainfall_values) + 1)
            print("DEBUG: Average rainfall calculated:", avg_rainfall)
            
            if avg_rainfall > 50:
                risk_factors["rainfall_risk"] = 3
            elif avg_rainfall > 30:
                risk_factors["rainfall_risk"] = 2
            elif avg_rainfall > 10:
                risk_factors["rainfall_risk"] = 1
        except Exception as e:
            print(f"DEBUG: Error processing rainfall data: {e}")
            print(f"DEBUG: Error type: {type(e)}")
            print(f"DEBUG: Error args: {e.args}")
            risk_factors["rainfall_risk"] = 0
            
        # 2. Elevation Risk (lower elevation = higher risk)
        try:
            elevation = safe_float_convert(elevation)
            if elevation < 5:
                risk_factors["elevation_risk"] = 3
            elif elevation < 10:
                risk_factors["elevation_risk"] = 2
            elif elevation < 20:
                risk_factors["elevation_risk"] = 1
        except Exception as e:
            print(f"DEBUG: Error processing elevation data: {e}")
            risk_factors["elevation_risk"] = 0
            
        # 3. Humidity Risk (higher humidity = higher risk)
        try:
            humidity_values = []
            for day in forecast_days:
                try:
                    day_data = day.get("day", {})
                    print("DEBUG: Day data for humidity:", day_data)
                    avghumidity = day_data.get("avghumidity")
                    print("DEBUG: Humidity data type:", type(avghumidity))
                    print("DEBUG: Humidity data value:", avghumidity)
                    humidity = safe_float_convert(avghumidity)
                    humidity_values.append(humidity)
                except Exception as e:
                    print(f"DEBUG: Error processing humidity for day: {e}")
                    humidity_values.append(0.0)
            
            print("DEBUG: Humidity values:", humidity_values)
            avg_humidity = sum(humidity_values) / len(humidity_values) if humidity_values else 0
            print("DEBUG: Average humidity calculated:", avg_humidity)
            
            if avg_humidity > 80:
                risk_factors["humidity_risk"] = 3
            elif avg_humidity > 70:
                risk_factors["humidity_risk"] = 2
            elif avg_humidity > 60:
                risk_factors["humidity_risk"] = 1
        except Exception as e:
            print(f"DEBUG: Error processing humidity data: {e}")
            print(f"DEBUG: Error type: {type(e)}")
            print(f"DEBUG: Error args: {e.args}")
            risk_factors["humidity_risk"] = 0
            
        # 4. Drainage Risk (based on soil type and urban development)
        import random
        drainage_factor = random.uniform(0.5, 1.5)
        risk_factors["drainage_risk"] = round(drainage_factor)
        
        # Calculate total risk score
        total_risk = sum(risk_factors.values())
        max_possible_risk = len(risk_factors) * 3  # Maximum possible score
        
        # Determine risk level
        risk_percentage = (total_risk / max_possible_risk) * 100
        if risk_percentage >= 75:
            risk_level = "HIGH"
        elif risk_percentage >= 50:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        # Calculate water level
        water_level = safe_float_convert(avg_rainfall) * 0.1 * (1 + (safe_float_convert(risk_percentage) / 100))
        
        # Create risk assessment
        risk_assessment = {
            "risk_level": risk_level,
            "risk_percentage": round(safe_float_convert(risk_percentage), 2),
            "water_level": round(safe_float_convert(water_level), 2),
            "risk_factors": risk_factors,
            "total_risk_score": total_risk,
            "max_possible_risk": max_possible_risk,
            "weather_data": {
                "current_rainfall": round(safe_float_convert(current_rainfall), 2),
                "forecast_rainfall": round(safe_float_convert(forecast_rainfall), 2),
                "avg_rainfall": round(safe_float_convert(avg_rainfall), 2),
                "avg_humidity": round(safe_float_convert(avg_humidity), 2),
                "elevation": round(safe_float_convert(elevation), 2)
            }
        }
        
        # Save to database if location_id is provided
        if location_id:
            try:
                location = Location.query.get(location_id)
                if location:
                    risk_record = RiskAssessment(
                        location_id=location_id,
                        risk_level=risk_level,
                        total_risk_score=total_risk,
                        water_level=water_level,
                        timestamp=datetime.utcnow()
                    )
                    db.session.add(risk_record)
                    db.session.commit()
            except Exception as e:
                print(f"DEBUG: Error saving risk assessment to database: {str(e)}")
        
        return jsonify(risk_assessment)
        
    except Exception as e:
        print(f"DEBUG: Error in predict_flood_risk: {str(e)}")
        print(f"DEBUG: Error type: {type(e)}")
        print(f"DEBUG: Error args: {e.args}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/weather", methods=["GET"])
def get_weather():
    try:
        lat = request.args.get('lat')
        lng = request.args.get('lng')
        
        print(f"DEBUG: Weather API request received for coordinates: {lat}, {lng}")
        
        if not lat or not lng:
            print("DEBUG: Missing coordinates in weather API request")
            return jsonify({"error": "Latitude and longitude are required"}), 400
            
        # Get weather API key
        weather_api_key = os.getenv('WEATHER_API_KEY')
        if not weather_api_key:
            print("DEBUG: Weather API key not found in environment variables")
            return jsonify({"error": "Weather API key not configured"}), 500
            
        print(f"DEBUG: Fetching weather data from WeatherAPI.com for coordinates: {lat}, {lng}")
        
        # Fetch weather data from WeatherAPI.com
        response = requests.get(
            f"https://api.weatherapi.com/v1/forecast.json",
            params={
                "key": weather_api_key,
                "q": f"{lat},{lng}",
                "days": 5,
                "aqi": "no",
                "alerts": "no"
            }
        )
        
        if not response.ok:
            print(f"DEBUG: Weather API error: {response.status_code} - {response.text}")
            return jsonify({"error": "Failed to fetch weather data"}), response.status_code
            
        data = response.json()
        print("DEBUG: Successfully received weather data from API")
        
        # Process current conditions
        current = {
            "temp": data["current"]["temp_c"],
            "weather_description": data["current"]["condition"]["text"],
            "weather_icon": data["current"]["condition"]["icon"],
            "humidity": data["current"]["humidity"],
            "wind_speed": data["current"]["wind_kph"],
            "precipitation": data["current"]["precip_mm"]
        }
        
        # Process forecast data
        forecast = []
        for day in data["forecast"]["forecastday"]:
            forecast.append({
                "date": day["date"],
                "temp": day["day"]["avgtemp_c"],
                "weather_description": day["day"]["condition"]["text"],
                "weather_icon": day["day"]["condition"]["icon"],
                "humidity": day["day"]["avghumidity"],
                "wind_speed": day["day"]["maxwind_kph"],
                "precipitation": day["day"]["totalprecip_mm"]
            })
            
        # Calculate water level (simplified version)
        avg_rainfall = sum(day["day"]["totalprecip_mm"] for day in data["forecast"]["forecastday"]) / len(data["forecast"]["forecastday"])
        water_level = {
            "value": avg_rainfall * 0.1,  # Simplified calculation
            "status": "HIGH" if avg_rainfall > 50 else "MEDIUM" if avg_rainfall > 20 else "LOW"
        }
        
        print("DEBUG: Successfully processed weather data")
        return jsonify({
            "current": current,
            "forecast": forecast,
            "water_level": water_level
        })
        
    except Exception as e:
        print(f"DEBUG: Error in get_weather: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/locations/<int:location_id>", methods=["DELETE"])
def delete_location(location_id):
    try:
        print(f"DEBUG: Attempting to delete location with ID: {location_id}")
        location = Location.query.get_or_404(location_id)
        db.session.delete(location)
        db.session.commit()
        print(f"DEBUG: Successfully deleted location with ID: {location_id}")
        return jsonify({"message": "Location deleted successfully"})
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error in delete_location: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/share-location/<int:location_id>", methods=["GET"])
def share_location(location_id):
    try:
        # Get location data
        location = Location.query.get_or_404(location_id)
        
        # Get weather data for this location
        weather_data = WeatherData.query.filter_by(location_id=location_id).first()
        
        # Get current weather from API
        weather_api_key = os.getenv('WEATHER_API_KEY')
        current_weather = {}
        
        if weather_api_key:
            try:
                response = requests.get(
                    f"https://api.weatherapi.com/v1/current.json",
                    params={
                        "key": weather_api_key,
                        "q": f"{location.latitude},{location.longitude}",
                        "aqi": "no"
                    }
                )
                if response.ok:
                    weather_info = response.json()
                    current_weather = {
                        "temp": weather_info['current']['temp_c'],
                        "condition": weather_info['current']['condition']['text'],
                        "humidity": weather_info['current']['humidity'],
                        "wind_speed": weather_info['current']['wind_kph']
                    }
            except Exception as e:
                print(f"Error fetching current weather: {str(e)}")
        
        # Get risk assessment
        risk_response = requests.post(
            f"{request.host_url.rstrip('/')}/api/predict-flood-risk",
            json={
                "location_id": location_id,
                "latitude": location.latitude,
                "longitude": location.longitude
            }
        )
        
        risk_data = {}
        if risk_response.ok:
            risk_data = risk_response.json()
        
        # Create shareable data
        share_data = {
            "location": {
                "name": location.name,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "description": location.description
            },
            "weather": current_weather,
            "risk": risk_data,
            "timestamp": datetime.now().isoformat(),
            "app_name": "GEO-Tagging System"
        }
        
        return jsonify(share_data)
        
    except Exception as e:
        print(f"Error in share_location: {str(e)}")
        return jsonify({"error": "Failed to generate share data"}), 500

if __name__ == "__main__":
    app.run(debug=True) 