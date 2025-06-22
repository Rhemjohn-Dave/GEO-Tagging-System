// Initialize variables
let currentLocation = null;
let weatherData = null;

// DOM Elements
const locationSearch = document.getElementById('locationSearch');
const searchButton = document.getElementById('searchLocation');
const currentWeatherIcon = document.getElementById('currentWeatherIcon');
const currentTemperature = document.getElementById('currentTemperature');
const currentDescription = document.getElementById('currentDescription');
const currentLocationName = document.getElementById('currentLocation');
const currentWaterLevel = document.getElementById('currentWaterLevel');
const waterLevelStatus = document.getElementById('waterLevelStatus');
const forecastData = document.getElementById('forecastData');

// Event Listeners
searchButton.addEventListener('click', handleLocationSearch);
locationSearch.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLocationSearch();
  }
});

// Check for location in URL parameters on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DEBUG: DOM Content Loaded');
  const urlParams = new URLSearchParams(window.location.search);
  const lat = urlParams.get('lat');
  const lng = urlParams.get('lng');
  
  console.log('DEBUG: URL Parameters:', { lat, lng });
  
  if (lat && lng) {
    try {
      showLoading();
      // Get location name from coordinates
      const locationName = await getLocationName(lat, lng);
      console.log('DEBUG: Location name:', locationName);
      
      if (locationName) {
        locationSearch.value = locationName;
        currentLocation = {
          name: locationName,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        };
        await getWeatherData(lat, lng);
        updateCurrentWeather();
        updateForecast();
        updateWaterLevel();
      }
    } catch (error) {
      console.error('Error loading location:', error);
      showError('Failed to load location data');
    } finally {
      hideLoading();
    }
  } else {
    console.log('DEBUG: No coordinates provided in URL');
  }
});

// Functions
async function handleLocationSearch() {
  const location = locationSearch.value.trim();
  if (!location) return;

  try {
    console.log('DEBUG: Searching for location:', location);
    showLoading();

    // Get coordinates for the location
    const coords = await getCoordinates(location);
    console.log('DEBUG: Coordinates:', coords);
    
    if (!coords) {
      showError('Location not found');
      return;
    }

    currentLocation = {
      name: location,
      lat: coords.lat,
      lng: coords.lng
    };

    // Get weather data
    await getWeatherData(coords.lat, coords.lng);
    
    // Update UI
    updateCurrentWeather();
    updateForecast();
    updateWaterLevel();
    
    // Predict flood risk
    await predictFloodRisk();

  } catch (error) {
    console.error('Error:', error);
    showError('Failed to fetch weather data');
  } finally {
    hideLoading();
  }
}

async function getCoordinates(location) {
  try {
    console.log('DEBUG: Getting coordinates for:', location);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
    const data = await response.json();
    
    console.log('DEBUG: Nominatim response:', data);
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

async function getWeatherData(lat, lng) {
  try {
    console.log('DEBUG: Getting weather data for:', { lat, lng });
    const response = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
    console.log('DEBUG: Weather API response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('DEBUG: Weather API error:', errorData);
      throw new Error('Failed to fetch weather data');
    }
    
    weatherData = await response.json();
    console.log('DEBUG: Weather data received:', weatherData);
  } catch (error) {
    console.error('Error getting weather data:', error);
    throw error;
  }
}

function updateCurrentWeather() {
  console.log('DEBUG: Updating current weather');
  if (!weatherData || !weatherData.current) {
    console.error('DEBUG: No current weather data available');
    return;
  }

  const current = weatherData.current;
  console.log('DEBUG: Current weather data:', current);
  
  // Update current weather
  currentWeatherIcon.src = current.weather_icon;
  currentTemperature.textContent = `${current.temp}°C`;
  currentDescription.textContent = current.weather_description;
  currentLocationName.textContent = currentLocation.name;
}

function updateForecast() {
  console.log('DEBUG: Updating forecast');
  if (!weatherData || !weatherData.forecast) {
    console.error('DEBUG: No forecast data available');
    return;
  }

  forecastData.innerHTML = '';
  
  weatherData.forecast.forEach(day => {
    console.log('DEBUG: Processing forecast day:', day);
    const dayElement = document.createElement('div');
    dayElement.className = 'forecast-day';
    dayElement.innerHTML = `
      <div class="date">${formatDate(day.date)}</div>
      <div class="day">${formatDay(day.date)}</div>
      <div class="weather-icon">
        <img src="${day.weather_icon}" alt="${day.weather_description}">
      </div>
      <div class="temperature">${day.temp}°C</div>
      <div class="description">${day.weather_description}</div>
      <div class="metrics">
        <div class="metric">
          <i class="fas fa-tint"></i>
          <span>${day.humidity}%</span>
        </div>
        <div class="metric">
          <i class="fas fa-wind"></i>
          <span>${day.wind_speed} m/s</span>
        </div>
        <div class="metric">
          <i class="fas fa-cloud-rain"></i>
          <span>${day.precipitation}%</span>
        </div>
      </div>
    `;
    forecastData.appendChild(dayElement);
  });
}

function updateWaterLevel() {
  console.log('DEBUG: Updating water level');
  if (!weatherData || !weatherData.water_level) {
    console.error('DEBUG: No water level data available');
    return;
  }

  const waterLevel = weatherData.water_level;
  console.log('DEBUG: Water level data:', waterLevel);
  
  currentWaterLevel.textContent = waterLevel.value.toFixed(2);
  
  // Update status badge
  waterLevelStatus.textContent = waterLevel.status;
  waterLevelStatus.className = 'status-badge';
  
  if (waterLevel.status === 'HIGH') {
    waterLevelStatus.classList.add('danger');
  } else if (waterLevel.status === 'MEDIUM') {
    waterLevelStatus.classList.add('warning');
  } else {
    waterLevelStatus.classList.add('success');
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function showLoading() {
  document.querySelector('.loader-bg').style.display = 'flex';
}

function hideLoading() {
  document.querySelector('.loader-bg').style.display = 'none';
}

function showError(message) {
  console.error('DEBUG: Error:', message);
  alert(message);
}

async function getLocationName(lat, lng) {
  try {
    console.log('DEBUG: Getting location name for:', { lat, lng });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await response.json();
    console.log('DEBUG: Reverse geocoding response:', data);
    return data.display_name.split(',')[0];
  } catch (error) {
    console.error('Error getting location name:', error);
    return null;
  }
}

async function predictFloodRisk() {
  if (!currentLocation) {
    showError('Please select a location first');
    return;
  }

  try {
    console.log('DEBUG: Predicting flood risk for:', currentLocation);
    showLoading();

    const response = await fetch('/api/predict-flood-risk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng
      })
    });

    if (!response.ok) {
      throw new Error('Failed to predict flood risk');
    }

    const riskData = await response.json();
    console.log('DEBUG: Flood risk data:', riskData);

    // Update water level display with risk information
    currentWaterLevel.textContent = `${riskData.water_level} m`;
    waterLevelStatus.textContent = riskData.risk_level;
    waterLevelStatus.className = 'status-badge';
    
    if (riskData.risk_level === 'HIGH') {
      waterLevelStatus.classList.add('danger');
    } else if (riskData.risk_level === 'MEDIUM') {
      waterLevelStatus.classList.add('warning');
    } else {
      waterLevelStatus.classList.add('success');
    }

    // Create detailed risk assessment display
    const riskAssessmentHtml = `
      <div class="risk-assessment">
        <h3>Flood Risk Assessment</h3>
        <div class="risk-level">
          <span class="label">Risk Level:</span>
          <span class="value ${riskData.risk_level.toLowerCase()}">${riskData.risk_level}</span>
          <span class="percentage">(${riskData.risk_percentage}%)</span>
        </div>
        <div class="risk-factors">
          <h4>Risk Factors:</h4>
          <ul>
            <li>Rainfall Risk: ${riskData.risk_factors.rainfall_risk}/3</li>
            <li>Elevation Risk: ${riskData.risk_factors.elevation_risk}/3</li>
            <li>Humidity Risk: ${riskData.risk_factors.humidity_risk}/3</li>
            <li>Drainage Risk: ${riskData.risk_factors.drainage_risk}/3</li>
          </ul>
        </div>
        <div class="weather-metrics">
          <h4>Weather Metrics:</h4>
          <ul>
            <li>Current Rainfall: ${riskData.weather_data.current_rainfall} mm</li>
            <li>Forecast Rainfall: ${riskData.weather_data.forecast_rainfall} mm</li>
            <li>Average Rainfall: ${riskData.weather_data.avg_rainfall} mm</li>
            <li>Average Humidity: ${riskData.weather_data.avg_humidity}%</li>
            <li>Elevation: ${riskData.weather_data.elevation} m</li>
          </ul>
        </div>
      </div>
    `;

    // Add risk assessment to the page
    const riskAssessmentContainer = document.getElementById('riskAssessment');
    if (riskAssessmentContainer) {
      riskAssessmentContainer.innerHTML = riskAssessmentHtml;
    }

  } catch (error) {
    console.error('Error predicting flood risk:', error);
    showError('Failed to predict flood risk');
  } finally {
    hideLoading();
  }
}

// Add event listener for the predict button
document.getElementById('predictFloodRisk').addEventListener('click', predictFloodRisk); 