// State management
let locations = [];
let selectedLocation = null;

// Make locations accessible globally for map.js
window.locations = locations;

// UI Elements
const toggleRainfallBtn = document.getElementById("toggleRainfall");
const toggleWaterLevelBtn = document.getElementById("toggleWaterLevel");
const toggleRiskBtn = document.getElementById("toggleRisk");
const locationDetails = document.getElementById("location-details");
const riskDetails = document.getElementById("risk-details");

// Layer visibility state
let rainfallVisible = false;
let waterLevelVisible = false;
let riskVisible = false;

// Make layer visibility state accessible globally for map.js
window.rainfallVisible = rainfallVisible;
window.waterLevelVisible = waterLevelVisible;
window.riskVisible = riskVisible;

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const locationsList = document.getElementById("locations-list");

  // Check if weather API key is set
  if (!window.WEATHER_API_KEY) {
    console.error('Weather API key is not set. Please check your .env file and server configuration.');
  } else {
    console.log('Weather API key is set:', window.WEATHER_API_KEY.substring(0, 5) + '...');
  }

  // Add event listeners for layer toggles if elements exist
  if (toggleRainfallBtn) {
    console.log('Initializing rainfall toggle button');
    toggleRainfallBtn.addEventListener("click", () => {
      console.log('Rainfall toggle clicked');
      rainfallVisible = !rainfallVisible;
      window.rainfallVisible = rainfallVisible;
      
      // Update button appearance
      toggleRainfallBtn.classList.toggle('active', rainfallVisible);
      toggleRainfallBtn.textContent = rainfallVisible ? 'Hide Rainfall' : 'Show Rainfall';
      
      // Update layer visibility
      if (window.mapFunctions && window.mapFunctions.rainfallLayer) {
        console.log('Updating rainfall layer visibility:', rainfallVisible);
        window.mapFunctions.rainfallLayer.setVisible(rainfallVisible);
      } else {
        console.error('Map functions or rainfall layer not available');
      }
    });
  }

  if (toggleWaterLevelBtn) {
    toggleWaterLevelBtn.addEventListener("click", () => {
      waterLevelVisible = !waterLevelVisible;
      window.waterLevelVisible = waterLevelVisible;
      window.mapFunctions.waterLevelLayer.setVisible(waterLevelVisible);
      toggleWaterLevelBtn.textContent = waterLevelVisible ? 'Hide Water Level' : 'Show Water Level';
    });
  }

  if (toggleRiskBtn) {
    toggleRiskBtn.addEventListener("click", () => {
      riskVisible = !riskVisible;
      window.riskVisible = riskVisible;
      window.mapFunctions.riskLayer.setVisible(riskVisible);
      toggleRiskBtn.textContent = riskVisible ? 'Hide Risk Level' : 'Show Risk Level';
    });
  }

  // Function to update locations list
  function updateLocationsList() {
    if (!locationsList) return;
    
    locationsList.innerHTML = "";
    locations.forEach((location) => {
      const li = document.createElement("li");
      li.textContent = `${location.name} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`;
      li.onclick = () => fetchLocationData(location.id);
      locationsList.appendChild(li);
    });
  }

  // Initial data load
  fetchLocations();
});

// Fetch all locations
async function fetchLocations() {
  try {
    console.log('Fetching locations...');
    const response = await fetch("/api/locations");
    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.status}`);
    }
    locations = await response.json();
    console.log('Fetched locations:', locations);
    window.locations = locations; // Update global locations
    
    // Update map with current data
    if (window.mapFunctions) {
      console.log('Updating map with fetched locations');
      updateMap();
    } else {
      console.error('Map functions not available');
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
  }
}

// Fetch data for a specific location
async function fetchLocationData(locationId) {
  try {
    const response = await fetch(`/api/locations/${locationId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch location data");
    }
    const location = await response.json();
    updateLocationDetails(location);
  } catch (error) {
    console.error("Error fetching location data:", error);
  }
}

// Update location details in the info panel
function updateLocationDetails(location) {
  selectedLocation = location;

  if (locationDetails) {
    locationDetails.innerHTML = `
      <h3>${location.name}</h3>
      <p>${location.description || ""}</p>
      <p>Elevation: ${location.elevation}m</p>
      <p>Risk Level: ${location.risk_level || "Unknown"}</p>
    `;
  }

  if (riskDetails) {
    riskDetails.innerHTML = `
      <div class="risk-level ${location.risk_level}">
        <h4>Risk Level: ${location.risk_level.toUpperCase()}</h4>
        <p>Last Updated: ${new Date(location.timestamp).toLocaleString()}</p>
      </div>
    `;
  }
}

// Update map with current data
function updateMap() {
  if (!window.mapFunctions) {
    console.error('Map functions not available');
    return;
  }

  console.log('Updating map with locations:', locations);
  const { updateRainfallData, updateWaterLevelData, updateRiskData } = window.mapFunctions;

  if (rainfallVisible) {
    console.log('Updating rainfall data');
    updateRainfallData(locations);
  }

  if (waterLevelVisible) {
    updateWaterLevelData(locations);
  }

  if (riskVisible) {
    updateRiskData(locations);
  }
}

// Toggle sidebar
document.getElementById('toggleSidebar').addEventListener('click', function(e) {
    e.preventDefault();
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    sidebar.classList.toggle('active');
    mainContent.classList.toggle('sidebar-active');
});

// Handle tab changes
document.querySelectorAll('#sidebarTabs .nav-link').forEach(tab => {
    tab.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs
        document.querySelectorAll('#sidebarTabs .nav-link').forEach(t => {
            t.classList.remove('active');
        });
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Show corresponding content
        const target = this.getAttribute('data-bs-target');
        document.querySelectorAll('.tab-content .tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        document.querySelector(target).classList.add('show', 'active');
    });
});

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
