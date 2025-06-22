import requests
import json
from datetime import datetime

# Base URL for the API
BASE_URL = 'http://localhost:5000/api'

def test_create_location():
    """Test creating a new location"""
    print("\nTesting create location endpoint...")
    
    # Test data for London
    data = {
        'name': 'London',
        'latitude': 51.5074,
        'longitude': -0.1278,
        'description': 'London, UK'
    }
    
    try:
        response = requests.post(f'{BASE_URL}/locations', json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.json().get('id')  # Return the location ID for later tests
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is Flask running?")
        return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_get_locations():
    """Test getting all locations"""
    print("\nTesting get all locations endpoint...")
    
    try:
        response = requests.get(f'{BASE_URL}/locations')
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is Flask running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def test_get_location(location_id):
    """Test getting a specific location"""
    print(f"\nTesting get location {location_id} endpoint...")
    
    try:
        response = requests.get(f'{BASE_URL}/locations/{location_id}')
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is Flask running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def test_get_weather_data(location_id):
    """Test getting weather data for a location"""
    print(f"\nTesting get weather data for location {location_id}...")
    
    try:
        response = requests.get(f'{BASE_URL}/weather-data?location_id={location_id}')
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is Flask running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def test_predict_flood_risk(location_id):
    """Test predicting flood risk for a location"""
    print(f"\nTesting predict flood risk for location {location_id}...")
    
    try:
        response = requests.post(f'{BASE_URL}/predict-flood-risk', json={'location_id': location_id})
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Is Flask running?")
    except Exception as e:
        print(f"Error: {str(e)}")

def main():
    """Run all tests"""
    print("Starting API tests...")
    print(f"Testing against API at: {BASE_URL}")
    
    # Test creating a location
    location_id = test_create_location()
    
    if location_id:
        # Test getting all locations
        test_get_locations()
        
        # Test getting the specific location
        test_get_location(location_id)
        
        # Test getting weather data
        test_get_weather_data(location_id)
        
        # Test predicting flood risk
        test_predict_flood_risk(location_id)
    else:
        print("\nSkipping remaining tests due to failed location creation.")
    
    print("\nAll tests completed!")

if __name__ == '__main__':
    main() 