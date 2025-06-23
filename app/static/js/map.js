// Initialize map with a more professional base layer
const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 18,
    worldCopyJump: true,
    maxBounds: [
        [-90, -180],
        [90, 180]
    ]
});

// Add click event listener to map
map.on('click', handleMapClick);

// Add event listener for map load
map.on('load', () => {
    // Hide loading spinner
    const loadingElement = document.querySelector('.map-loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
});

// Add event listener for window resize
window.addEventListener('resize', () => {
    map.invalidateSize();
});

// Add professional base layers
const baseLayers = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }),
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    }),
    'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap'
    })
};

// Add default base layer
baseLayers['OpenStreetMap'].addTo(map);

// Hide loading spinner when tiles are loaded
baseLayers['OpenStreetMap'].on('load', () => {
    const loadingElement = document.querySelector('.map-loading');
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
});

// Fallback: hide spinner after 2 seconds in case event doesn't fire
setTimeout(() => {
    const loadingElement = document.querySelector('.map-loading');
    if (loadingElement && !loadingElement.classList.contains('hidden')) {
        loadingElement.classList.add('hidden');
    }
}, 2000);

// Add zoom control with custom position
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Add scale control
L.control.scale({
    imperial: false,
    position: 'bottomleft'
}).addTo(map);

// Add layer control
const layerControl = L.control.layers(baseLayers, null, {
    position: 'topright',
    collapsed: false
}).addTo(map);

// Add custom controls
const customControls = L.control({ position: 'topright' });

customControls.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-overlay');
    div.innerHTML = `
        <div class="map-controls">
            <button class="map-control-btn" id="locateMe">
                <i class="fas fa-location-arrow"></i>
                Locate Me
            </button>
            <button class="map-control-btn" id="toggleFullscreen">
                <i class="fas fa-expand"></i>
                Fullscreen
            </button>
        </div>
        <div class="map-legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ff4444;"></div>
                <span class="legend-label">High Risk</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #ffbb33;"></div>
                <span class="legend-label">Medium Risk</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #00C851;"></div>
                <span class="legend-label">Low Risk</span>
            </div>
        </div>
    `;
    return div;
};

customControls.addTo(map);

// Initialize controls after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize locate me button
    const locateMeBtn = document.getElementById('locateMe');
    if (locateMeBtn) {
        locateMeBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 13);
                        L.marker([latitude, longitude])
                            .addTo(map)
                            .bindPopup('Your current location')
                            .openPopup();
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        alert('Unable to get your location. Please check your location settings.');
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        });
    }

    // Initialize fullscreen button
    const fullscreenBtn = document.getElementById('toggleFullscreen');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const mapContainer = document.querySelector('.map-container');
            if (!document.fullscreenElement) {
                mapContainer.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    // Get weather API key from server
    weatherApiKey = window.WEATHER_API_KEY;
    console.log('Weather API key initialized:', weatherApiKey ? 'Yes' : 'No');
    if (weatherApiKey) {
        console.log('Weather API key value:', weatherApiKey.substring(0, 5) + '...');
    }

    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    
    if (lat && lng) {
        // If coordinates are in URL, update forecast data
        updateForecastData(parseFloat(lat), parseFloat(lng));
    }
});

// Layer groups for different data types
const rainfallLayer = L.layerGroup().addTo(map);
const waterLevelLayer = L.layerGroup().addTo(map);
const riskLayer = L.layerGroup().addTo(map);

// Make layers accessible globally
window.rainfallLayer = rainfallLayer;
window.waterLevelLayer = waterLevelLayer;
window.riskLayer = riskLayer;

// Custom icons for different risk levels
const riskIcons = {
  high: L.divIcon({
    className: "risk-marker high",
    html: '<div class="risk-dot high"></div>',
    iconSize: [12, 12],
  }),
  medium: L.divIcon({
    className: "risk-marker medium",
    html: '<div class="risk-dot medium"></div>',
    iconSize: [12, 12],
  }),
  low: L.divIcon({
    className: "risk-marker low",
    html: '<div class="risk-dot low"></div>',
    iconSize: [12, 12],
  }),
};

// Add flood risk visualization layer
const floodRiskLayer = L.layerGroup().addTo(map);

// Function to create flood risk circle with animation
function createFloodRiskCircle(lat, lng, riskLevel, waterLevel) {
    // Remove existing flood risk circles
    floodRiskLayer.clearLayers();
    
    // Define colors based on risk level
    const colors = {
        'HIGH': '#ff4444',
        'MEDIUM': '#ffbb33',
        'LOW': '#00C851'
    };
    
    // Create circle with initial small radius
    const circle = L.circle([lat, lng], {
        radius: 50, // Start with 50m radius
        color: colors[riskLevel],
        fillColor: colors[riskLevel],
        fillOpacity: 0.3,
        weight: 2
    }).addTo(floodRiskLayer);
    
    // Animate the circle expansion
    let currentRadius = 50;
    const targetRadius = 1000; // 1km radius
    const animationDuration = 2000; // 2 seconds
    const steps = 50;
    const radiusIncrement = (targetRadius - currentRadius) / steps;
    
    // Add pulsing effect
    const pulseCircle = L.circle([lat, lng], {
        radius: currentRadius,
        color: colors[riskLevel],
        fillColor: colors[riskLevel],
        fillOpacity: 0.1,
        weight: 1
    }).addTo(floodRiskLayer);
    
    // Animation function
    function animate() {
        if (currentRadius < targetRadius) {
            currentRadius += radiusIncrement;
            circle.setRadius(currentRadius);
            pulseCircle.setRadius(currentRadius);
            requestAnimationFrame(animate);
        }
    }
    
    // Start animation
    animate();
    
    // Add water level indicator
    const waterLevelIndicator = L.circle([lat, lng], {
        radius: 20,
        color: '#007bff',
        fillColor: '#007bff',
        fillOpacity: 0.7,
        weight: 1
    }).addTo(floodRiskLayer);
    
    // Add popup with risk information
    circle.bindPopup(`
        <div class="flood-risk-popup">
            <h3>Flood Risk Assessment</h3>
            <div class="risk-level ${riskLevel.toLowerCase()}">
                <span>Risk Level: ${riskLevel}</span>
            </div>
            <div class="water-level">
                <span>Water Level: ${waterLevel.toFixed(2)}m</span>
            </div>
            <div class="area-info">
                <span>Area: 1km radius</span>
            </div>
        </div>
    `);
    
    return circle;
}

// Function to validate coordinates
function isValidCoordinates(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Function to get elevation data
async function getElevationData(lat, lng) {
  try {
    // Using Open-Meteo API for elevation data
    const response = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    if (!response.ok) {
      throw new Error('Failed to fetch elevation data');
    }
    const data = await response.json();
    return parseFloat(data.elevation) || 0;
  } catch (error) {
    console.error('Error fetching elevation:', error);
    return 0;
  }
}

// Function to get address from coordinates
async function getAddressFromCoordinates(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        if (!response.ok) {
            throw new Error('Failed to fetch address data');
        }
        const data = await response.json();
        return data.display_name || 'Unknown Location';
    } catch (error) {
        console.error('Error fetching address:', error);
        return 'Unknown Location';
    }
}

// Function to get historical rainfall data
async function getHistoricalRainfall(lat, lng) {
    try {
        if (!weatherApiKey) {
            console.error('Weather API key is not set');
            return { rainfallData: [], waterLevelData: [], currentConditions: {} };
        }

        if (!isValidCoordinates(lat, lng)) {
            console.error('Invalid coordinates:', { lat, lng });
            return { rainfallData: [], waterLevelData: [], currentConditions: {} };
        }

        console.log('Fetching weather data for coordinates:', { lat, lng });
        console.log('Using Weather API key:', weatherApiKey.substring(0, 5) + '...');
        
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${lat},${lng}&days=5&aqi=no&alerts=no`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Weather API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received weather data:', data);
        
        if (!data.forecast || !data.forecast.forecastday) {
            console.error('Invalid weather data format:', data);
            throw new Error('Invalid weather data format');
        }

        // Process current conditions
        const currentConditions = {
            lastUpdated: data.current.last_updated,
            temp: data.current.temp_c,
            feelsLike: data.current.feelslike_c,
            humidity: data.current.humidity,
            windSpeed: data.current.wind_kph,
            windDir: data.current.wind_dir,
            pressure: data.current.pressure_mb,
            precip: data.current.precip_mm,
            cloud: data.current.cloud,
            uv: data.current.uv,
            visibility: data.current.vis_km,
            gust: data.current.gust_kph,
            condition: data.current.condition.text,
            icon: data.current.condition.icon
        };
        
        console.log('Processed current conditions:', currentConditions);
        
        // Process forecast data
        const rainfallData = data.forecast.forecastday.map(day => ({
            date: day.date,
            dateEpoch: day.date_epoch,
            rainfall: day.day.totalprecip_mm || 0,
            humidity: day.day.avghumidity || 0,
            maxTemp: day.day.maxtemp_c || 0,
            minTemp: day.day.mintemp_c || 0,
            avgTemp: day.day.avgtemp_c || 0,
            maxWind: day.day.maxwind_kph || 0,
            avgVis: day.day.avgvis_km || 0,
            uv: day.day.uv || 0,
            condition: day.day.condition.text,
            icon: day.day.condition.icon,
            chanceOfRain: day.day.daily_chance_of_rain || 0,
            chanceOfSnow: day.day.daily_chance_of_snow || 0,
            totalSnow: day.day.totalsnow_cm || 0,
            astro: {
                sunrise: day.astro.sunrise,
                sunset: day.astro.sunset,
                moonrise: day.astro.moonrise,
                moonset: day.astro.moonset,
                moonPhase: day.astro.moon_phase,
                moonIllumination: day.astro.moon_illumination
            }
        }));

        console.log('Processed rainfall data:', rainfallData);

        // Calculate water level based on multiple factors
        const waterLevelData = rainfallData.map(day => ({
            date: day.date,
            waterLevel: calculateWaterLevel(
                day.rainfall,
                day.humidity,
                day.maxTemp,
                day.minTemp,
                day.avgTemp,
                day.chanceOfRain,
                day.chanceOfSnow,
                day.totalSnow
            )
        }));

        console.log('Calculated water level data:', waterLevelData);

        // Calculate average water level
        const avgWaterLevel = waterLevelData.reduce((sum, day) => sum + day.waterLevel, 0) / waterLevelData.length;
        console.log('Average water level:', avgWaterLevel);

        return { 
            rainfallData, 
            waterLevelData,
            currentConditions,
            avgWaterLevel
        };
    } catch (error) {
        console.error('Error fetching historical rainfall:', error);
        return { rainfallData: [], waterLevelData: [], currentConditions: {}, avgWaterLevel: 0 };
    }
}

function calculateWaterLevel(rainfall, humidity, maxTemp, minTemp, avgTemp, chanceOfRain, chanceOfSnow, totalSnow) {
    // Enhanced water level calculation based on multiple factors
    const baseLevel = 0.5; // Base water level in meters
    const rainfallFactor = 0.1; // How much each mm of rain affects water level
    const humidityFactor = 0.005; // How much humidity affects water level
    const tempFactor = 0.02; // How much temperature affects water level
    const snowFactor = 0.05; // How much snow affects water level (when melting)
    
    // Calculate water level based on all factors
    let waterLevel = baseLevel;
    
    // Add rainfall effect
    waterLevel += rainfall * rainfallFactor;
    
    // Add humidity effect
    waterLevel += humidity * humidityFactor;
    
    // Add temperature effect (higher temperatures increase evaporation)
    const tempEffect = (avgTemp > 25 ? avgTemp - 25 : 0) * tempFactor;
    waterLevel -= tempEffect;
    
    // Add snow effect (snow will eventually melt and contribute to water level)
    const snowEffect = totalSnow * snowFactor * (chanceOfRain / 100);
    waterLevel += snowEffect;
    
    // Adjust based on precipitation probability
    const precipAdjustment = (chanceOfRain / 100) * 0.1;
    waterLevel += precipAdjustment;
    
    return Math.max(0, waterLevel); // Ensure water level is never negative
}

// Function to switch to forecast tab
function switchToForecastTab(lat, lng) {
    // Redirect to forecast page with coordinates
    window.location.href = `/forecast?lat=${lat}&lng=${lng}`;
}

// Function to update forecast data
async function updateForecastData(lat, lng) {
    try {
        const weatherInfo = await getHistoricalRainfall(lat, lng);
        const { rainfallData, waterLevelData, currentConditions, avgWaterLevel } = weatherInfo;
        
        // Update forecast container
        const forecastContainer = document.getElementById('forecastData');
        if (forecastContainer) {
            forecastContainer.innerHTML = rainfallData.map((day, index) => `
                <div class="forecast-day-card">
                    <div class="day-name">${new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                    <div class="date">${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div class="weather-icon">
                        <img src="${day.icon}" alt="${day.condition}">
                    </div>
                    <div class="weather-condition">${day.condition}</div>
                    <div class="temp-range">
                        <span class="min">${day.minTemp.toFixed(1)}°</span>
                        <span class="max">${day.maxTemp.toFixed(1)}°</span>
                    </div>
                    <div class="weather-metrics">
                        <div class="metric rainfall">
                            <i class="fas fa-tint"></i>
                            <span>${day.rainfall.toFixed(1)}mm</span>
                        </div>
                        <div class="metric humidity">
                            <i class="fas fa-humidity"></i>
                            <span>${day.humidity}%</span>
                        </div>
                        <div class="metric wind">
                            <i class="fas fa-wind"></i>
                            <span>${day.maxWind} km/h</span>
                        </div>
                        <div class="metric water-level">
                            <i class="fas fa-water"></i>
                            <span>${waterLevelData[index].waterLevel.toFixed(2)}m</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        // Update current conditions
        const currentConditionsContainer = document.getElementById('currentConditions');
        if (currentConditionsContainer) {
            currentConditionsContainer.innerHTML = `
                <div class="current-weather-card">
                    <div class="weather-main">
                        <div class="weather-icon-large">
                            <img src="${currentConditions.icon}" alt="${currentConditions.condition}">
                            <span>${currentConditions.condition}</span>
                        </div>
                        <div class="weather-temp">
                            <p class="temperature">${currentConditions.temp.toFixed(1)}°C</p>
                            <p class="feels-like">Feels like: ${currentConditions.feelsLike.toFixed(1)}°C</p>
                        </div>
                    </div>
                    <div class="weather-details">
                        <div class="detail-item">
                            <i class="fas fa-tint"></i>
                            <span>Humidity: ${currentConditions.humidity}%</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-wind"></i>
                            <span>Wind: ${currentConditions.windSpeed} km/h ${currentConditions.windDir}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-cloud-rain"></i>
                            <span>Precipitation: ${currentConditions.precip.toFixed(1)}mm</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-water"></i>
                            <span>Water Level: ${avgWaterLevel.toFixed(2)}m</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating forecast data:', error);
    }
}

// Function to handle map clicks
async function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    console.log('Map clicked at coordinates:', { lat, lng });
    
    try {
        // Validate coordinates
        if (!isValidCoordinates(lat, lng)) {
            throw new Error('Invalid coordinates selected. Please select a valid location on the map.');
        }

        // Check if weather API key is available
        if (!weatherApiKey) {
            console.error('Weather API key is not set');
            throw new Error('Weather API key is not configured. Please check your configuration.');
        }

        console.log('Starting to fetch address and weather data...');
        
        // Get address and weather data in parallel
        const [address, weatherInfo] = await Promise.all([
            getAddressFromCoordinates(lat, lng).catch(error => {
                console.error('Error fetching address:', error);
                return 'Unknown Location';
            }),
            getHistoricalRainfall(lat, lng).catch(error => {
                console.error('Error fetching weather data:', error);
                throw new Error('Failed to fetch weather data: ' + error.message);
            })
        ]);

        console.log('Address fetched:', address);
        console.log('Weather info received:', weatherInfo);

        const { rainfallData, waterLevelData, currentConditions, avgWaterLevel } = weatherInfo;
        
        if (!rainfallData || rainfallData.length === 0) {
            console.error('No rainfall data available');
            throw new Error('No weather data available for this location.');
        }

        console.log('Creating location data...');
        
        // Create location data
        const locationData = {
            name: address,
            latitude: lat,
            longitude: lng,
            description: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            elevation: 0,
            rainfall_history: rainfallData.map(d => d.rainfall),
            average_rainfall: rainfallData.reduce((sum, d) => sum + d.rainfall, 0) / rainfallData.length,
            average_water_level: avgWaterLevel
        };

        console.log('Sending location data to server:', locationData);

        // Create location
        const response = await fetch('/api/locations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Server response error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Failed to create location: ${response.status} ${response.statusText}`);
        }

        const location = await response.json();
        console.log('Location created:', location);

        console.log('Fetching risk assessment...');
        
        // Get risk assessment
        const riskResponse = await fetch('/api/predict-flood-risk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location_id: location.id,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng)
            })
        });
        
        if (!riskResponse.ok) {
            const errorData = await riskResponse.json().catch(() => ({}));
            console.error('Risk assessment error:', {
                status: riskResponse.status,
                statusText: riskResponse.statusText,
                error: errorData
            });
            throw new Error(`Failed to get risk assessment: ${riskResponse.status} ${riskResponse.statusText}`);
        }
        
        const riskData = await riskResponse.json();
        console.log('Risk assessment received:', riskData);
        
        // Create flood risk visualization
        console.log('Creating flood risk visualization...');
        createFloodRiskCircle(lat, lng, riskData.risk_level, riskData.water_level);

        // Create marker with simplified popup
        console.log('Creating marker...');
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`
            <div class="map-popup">
                <div class="popup-header">
                    <h3>${location.name}</h3>
                    <span class="coordinates">${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
                </div>
                
                <div class="current-conditions">
                    <div class="weather-icon">
                        <img src="${currentConditions.icon}" alt="${currentConditions.condition}">
                    </div>
                    <div class="current-stats">
                        <p class="temperature">${currentConditions.temp.toFixed(1)}°C</p>
                        <p class="feels-like">Feels like: ${currentConditions.feelsLike.toFixed(1)}°C</p>
                        <div class="quick-stats">
                            <div class="stat-item">
                                <i class="fas fa-tint"></i>
                                <span>${currentConditions.humidity}%</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-wind"></i>
                                <span>${currentConditions.windSpeed} km/h</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-cloud-rain"></i>
                                <span>${currentConditions.precip.toFixed(1)}mm</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="risk-info">
                    <div class="water-level">
                        <i class="fas fa-water"></i>
                        <span>Water Level: ${riskData.water_level.toFixed(2)}m</span>
                    </div>
                    <div class="risk-level ${riskData.risk_level.toLowerCase()}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Risk: ${riskData.risk_level.toUpperCase()}</span>
                    </div>
                </div>

                <button class="view-details-btn" onclick="switchToForecastTab(${lat}, ${lng})">
                    <i class="fas fa-info-circle"></i> View Full Details
                </button>
                
                <div id="sharing-container-${location.id}"></div>
            </div>
        `);
        marker.openPopup();

        // Add sharing buttons after popup is created
        setTimeout(() => {
            const popupElement = document.querySelector('.leaflet-popup-content');
            if (popupElement) {
                const sharingContainer = popupElement.querySelector(`#sharing-container-${location.id}`);
                if (sharingContainer) {
                    addSharingToPopup(location.id, sharingContainer);
                }
            }
        }, 100);

        // Create details content for the location list
        const detailsContent = `
            <div class="location-details">
                <div class="weather-info">
                    <h4>Current Weather</h4>
                    <div class="weather-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-temperature-high"></i>
                            <span>Temperature: ${currentConditions.temp.toFixed(1)}°C</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-tint"></i>
                            <span>Humidity: ${currentConditions.humidity}%</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-wind"></i>
                            <span>Wind: ${currentConditions.windSpeed} km/h</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-cloud-rain"></i>
                            <span>Precipitation: ${currentConditions.precip.toFixed(1)}mm</span>
                        </div>
                    </div>
                </div>
                
                <div class="risk-assessment">
                    <h4>Risk Assessment</h4>
                    <div class="risk-details-grid">
                        <div class="detail-item">
                            <i class="fas fa-water"></i>
                            <span>Water Level: ${riskData.water_level.toFixed(2)}m</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>Risk Level: ${riskData.risk_level.toUpperCase()}</span>
                        </div>
                        ${riskData.risk_factors ? `
                            <div class="detail-item">
                                <i class="fas fa-mountain"></i>
                                <span>Elevation Risk: ${riskData.risk_factors.elevation_risk}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-cloud-showers-heavy"></i>
                                <span>Rainfall Risk: ${riskData.risk_factors.rainfall_risk}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-tint"></i>
                                <span>Humidity Risk: ${riskData.risk_factors.humidity_risk}</span>
                            </div>
                            <div class="detail-item">
                                <i class="fas fa-water"></i>
                                <span>Drainage Risk: ${riskData.risk_factors.drainage_risk}</span>
                            </div>
                            <div class="detail-item total-risk">
                                <i class="fas fa-calculator"></i>
                                <span>Total Risk Score: ${riskData.total_risk_score}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Add to locations list
        console.log('Adding location to list...');
        addLocationToList(location, detailsContent);
        
        console.log('Map click handling completed successfully');
    } catch (error) {
        console.error('Error handling map click:', error);
        console.error('Error stack:', error.stack);
        alert('Error: ' + error.message);
    }
}

// Function to add a location marker
function addLocationMarker(location) {
  const marker = L.marker([location.latitude, location.longitude], {
    icon: L.divIcon({
      className: "location-marker",
      html: `<div class="marker-dot"></div>`,
      iconSize: [12, 12],
    }),
  });

  marker.bindPopup(`
        <div class="map-popup">
            <h3>${location.name}</h3>
            <p>${location.description || ""}</p>
            <p>Elevation: ${location.elevation}m</p>
            <div id="sharing-container-${location.id}"></div>
        </div>
    `);

  marker.on("click", () => {
    fetchLocationData(location.id);
    
    // Add sharing buttons after popup is created
    setTimeout(() => {
      const popupElement = document.querySelector('.leaflet-popup-content');
      if (popupElement) {
        const sharingContainer = popupElement.querySelector(`#sharing-container-${location.id}`);
        if (sharingContainer) {
          addSharingToPopup(location.id, sharingContainer);
        }
      }
    }, 100);
  });

  return marker;
}

// Function to update rainfall visualization
function updateRainfallData(locations) {
  console.log('Updating rainfall data for locations:', locations);
  
  // Clear existing layers
  rainfallLayer.clearLayers();
  
  if (!locations || locations.length === 0) {
    console.log('No locations to display rainfall for');
    return;
  }

  locations.forEach((location) => {
    console.log('Processing location:', location);
    
    // Get current rainfall from weather data or use average rainfall
    const currentRainfall = location.weather_data?.rainfall || 
                          location.average_rainfall || 
                          (location.rainfall_history && location.rainfall_history.length > 0 ? 
                           location.rainfall_history[location.rainfall_history.length - 1] : 0);
    
    console.log('Current rainfall for location:', currentRainfall);
    
    if (currentRainfall > 0) {
      // Calculate circle size based on rainfall amount
      const radius = Math.min(1000, Math.max(100, currentRainfall * 20)); // Scale radius based on rainfall
      
      // Calculate color intensity based on rainfall amount
      const intensity = Math.min(1, Math.max(0.1, currentRainfall / 50));
      
      console.log('Creating circle with radius:', radius, 'and intensity:', intensity);
      
      const circle = L.circle([location.latitude, location.longitude], {
        radius: radius,
        color: "#007bff",
        fillColor: "#007bff",
        fillOpacity: intensity,
        weight: 2
      });

      circle.bindPopup(`
        <div class="rainfall-popup">
          <h3>${location.name}</h3>
          <div class="rainfall-info">
            <p><i class="fas fa-cloud-rain"></i> Current Rainfall: ${currentRainfall.toFixed(2)}mm</p>
            <p><i class="fas fa-chart-line"></i> Average Rainfall: ${(location.average_rainfall || 0).toFixed(2)}mm</p>
            <p><i class="fas fa-calendar"></i> Last Updated: ${new Date(location.updated_at || Date.now()).toLocaleString()}</p>
          </div>
        </div>
      `);

      rainfallLayer.addLayer(circle);
      console.log('Added rainfall circle for location:', location.name);
    } else {
      console.log('No rainfall data for location:', location.name);
    }
  });
  
  // Ensure the layer is visible
  if (window.rainfallVisible) {
    map.addLayer(rainfallLayer);
  }
  
  console.log('Rainfall layer updated');
}

// Function to update water level visualization
function updateWaterLevelData(locations) {
  waterLevelLayer.clearLayers();

  locations.forEach((location) => {
    if (location.weather_data && location.weather_data.water_level) {
      const circle = L.circle([location.latitude, location.longitude], {
        radius: 1000, // 1km radius
        color: "#17a2b8",
        fillColor: "#17a2b8",
        fillOpacity: 0.3,
      });

      circle.bindPopup(`
                <h3>${location.name}</h3>
                <p>Water Level: ${location.weather_data.water_level.toFixed(2)}m</p>
                <p>Elevation: ${location.elevation?.toFixed(2) || 'N/A'}m</p>
            `);

      waterLevelLayer.addLayer(circle);
    }
  });
}

// Function to update risk visualization
function updateRiskData(locations) {
  riskLayer.clearLayers();

  locations.forEach((location) => {
    if (location.risk_level) {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: riskIcons[location.risk_level],
      });

      marker.bindPopup(`
                <h3>${location.name}</h3>
                <p>Risk Level: ${location.risk_level.toUpperCase()}</p>
                <p>Elevation: ${location.elevation?.toFixed(2) || 'N/A'}m</p>
            `);

      riskLayer.addLayer(marker);
    }
  });
}

// Function to add a location to the list
function addLocationToList(location, detailsContent) {
    const locationsList = document.getElementById('locationsList');
    if (!locationsList) return;

    const listItem = document.createElement('li');
    listItem.className = 'location-item';
    listItem.innerHTML = `
        <div class="location-info">
            <h4>${location.name}</h4>
            <p>Elevation: ${(location.elevation || 0).toFixed(2)}m</p>
            <p>Average Rainfall: ${(location.average_rainfall || 0).toFixed(2)}mm</p>
            <p>Average Water Level: ${(location.average_water_level || 0).toFixed(2)}m</p>
        </div>
        <div class="location-actions">
            <button class="view-details" data-location-id="${location.id}">View Details</button>
            <button class="remove-location" data-location-id="${location.id}">Remove</button>
        </div>
        <div class="location-details-panel" id="details-${location.id}" style="display: none;">
            ${detailsContent}
        </div>
    `;

    // Add click event to the view details button
    const viewDetailsBtn = listItem.querySelector('.view-details');
    viewDetailsBtn.addEventListener('click', () => {
        const detailsPanel = listItem.querySelector('.location-details-panel');
        if (detailsPanel.style.display === 'none') {
            detailsPanel.style.display = 'block';
            viewDetailsBtn.textContent = 'Hide Details';
        } else {
            detailsPanel.style.display = 'none';
            viewDetailsBtn.textContent = 'View Details';
        }
    });

    // Add click event to the remove button
    const removeBtn = listItem.querySelector('.remove-location');
    removeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this location?')) {
            listItem.remove();
        }
    });

    locationsList.appendChild(listItem);
}

// Function to fetch detailed location data
async function fetchLocationData(locationId) {
    try {
        const [locationResponse, weatherResponse, riskResponse] = await Promise.all([
            fetch(`/api/locations/${locationId}`),
            fetch(`/api/weather-data?location_id=${locationId}`),
            fetch('/api/predict-flood-risk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ location_id: locationId })
            })
        ]);

        if (!locationResponse.ok || !weatherResponse.ok || !riskResponse.ok) {
            throw new Error('Failed to fetch location data');
        }

        const location = await locationResponse.json();
        const weatherData = await weatherResponse.json();
        const riskData = await riskResponse.json();

        // Create popup content
        const popupContent = `
            <div class="location-popup">
                <h3>${location.name}</h3>
                <p>Elevation: ${(location.elevation || 0).toFixed(2)}m</p>
                <p>Current Rainfall: ${(weatherData.rainfall || 0).toFixed(2)}mm</p>
                <p>Current Water Level: ${(weatherData.water_level || 0).toFixed(2)}m</p>
                <p>Risk Level: ${riskData.risk_level}</p>
                ${riskData.risk_factors ? `
                    <h4>Risk Factors:</h4>
                    <ul>
                        <li>Elevation Risk: ${riskData.risk_factors.elevation_risk}</li>
                        <li>Rainfall Risk: ${riskData.risk_factors.rainfall_risk}</li>
                        <li>Water Level Risk: ${riskData.risk_factors.water_level_risk}</li>
                    </ul>
                    <p>Total Risk Score: ${riskData.total_risk_score}</p>
                ` : ''}
            </div>
        `;

        // Create or update marker
        const marker = L.marker([location.latitude, location.longitude]).addTo(map);
        marker.bindPopup(popupContent).openPopup();

        // Center map on location
        map.setView([location.latitude, location.longitude], 13);
    } catch (error) {
        console.error('Error fetching location data:', error);
        alert('Error: ' + error.message);
    }
}

// Export functions and layers for use in app.js
window.mapFunctions = {
  addLocationMarker,
  updateRainfallData,
  updateWaterLevelData,
  updateRiskData,
  rainfallLayer: {
    setVisible: (visible) => {
      console.log('Setting rainfall layer visibility:', visible);
      if (visible) {
        map.addLayer(rainfallLayer);
        updateRainfallData(window.locations);
      } else {
        map.removeLayer(rainfallLayer);
      }
    }
  },
  waterLevelLayer: {
    setVisible: (visible) => {
      if (visible) {
        map.addLayer(waterLevelLayer);
      } else {
        map.removeLayer(waterLevelLayer);
      }
    }
  },
  riskLayer: {
    setVisible: (visible) => {
      if (visible) {
        map.addLayer(riskLayer);
      } else {
        map.removeLayer(riskLayer);
      }
    }
  }
};

// Add CSS for flood risk visualization
const style = document.createElement('style');
style.textContent = `
    .flood-risk-popup {
        padding: 10px;
    }
    
    .flood-risk-popup h3 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    .risk-level {
        padding: 5px 10px;
        border-radius: 4px;
        margin: 5px 0;
        font-weight: bold;
    }
    
    .risk-level.high {
        background-color: #ff4444;
        color: white;
    }
    
    .risk-level.medium {
        background-color: #ffbb33;
        color: black;
    }
    
    .risk-level.low {
        background-color: #00C851;
        color: white;
    }
    
    .water-level {
        margin: 5px 0;
        color: #007bff;
    }
    
    .area-info {
        margin: 5px 0;
        color: #666;
        font-size: 0.9em;
    }
`;
document.head.appendChild(style);
