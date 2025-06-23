// Initialize variables
let savedLocations = [];

// DOM Elements
const locationSearch = document.getElementById('locationSearch');
const searchButton = document.getElementById('searchLocation');
const locationsList = document.getElementById('locationsList');

// Event Listeners
searchButton.addEventListener('click', handleLocationSearch);
locationSearch.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLocationSearch();
  }
});

// Load saved locations on page load
document.addEventListener('DOMContentLoaded', loadSavedLocations);

// Functions
async function loadSavedLocations() {
  try {
    showLoading();
    const response = await fetch('/api/locations');
    if (!response.ok) {
      throw new Error('Failed to fetch saved locations');
    }
    savedLocations = await response.json();
    renderLocations();
  } catch (error) {
    console.error('Error loading saved locations:', error);
    showError('Failed to load saved locations');
  } finally {
    hideLoading();
  }
}

function renderLocations() {
  locationsList.innerHTML = '';
  
  if (savedLocations.length === 0) {
    locationsList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-map-marker-alt fa-3x text-muted mb-3"></i>
        <p class="text-muted">No saved locations yet</p>
      </div>
    `;
    return;
  }

  savedLocations.forEach(location => {
    const locationElement = document.createElement('div');
    locationElement.className = 'col-md-6 col-lg-4 mb-4';
    locationElement.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <h5 class="card-title mb-0">${location.name}</h5>
            <div class="dropdown">
              <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="/forecast?lat=${location.lat}&lng=${location.lng}">
                  <i class="fas fa-cloud-sun me-2"></i>View Forecast
                </a></li>
                <li><a class="dropdown-item" href="/?lat=${location.lat}&lng=${location.lng}">
                  <i class="fas fa-map me-2"></i>View on Map
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="shareLocation(${location.id})">
                  <i class="fas fa-share-alt me-2"></i>Share Location
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="deleteLocation(${location.id})">
                  <i class="fas fa-trash-alt me-2"></i>Delete
                </a></li>
              </ul>
            </div>
          </div>
          <p class="card-text text-muted">
            <i class="fas fa-map-marker-alt me-2"></i>
            ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}
          </p>
          ${location.description ? `
            <p class="card-text">${location.description}</p>
          ` : ''}
          <div class="location-stats">
            ${location.elevation ? `
              <div class="stat-item">
                <i class="fas fa-mountain me-2"></i>
                <span>${location.elevation.toFixed(1)}m</span>
              </div>
            ` : ''}
          </div>
          <div class="sharing-buttons mt-3" id="sharing-container-${location.id}"></div>
        </div>
      </div>
    `;
    locationsList.appendChild(locationElement);
    
    // Add sharing buttons after card is created
    setTimeout(() => {
      const sharingContainer = locationElement.querySelector(`#sharing-container-${location.id}`);
      if (sharingContainer) {
        addSharingToPopup(location.id, sharingContainer);
      }
    }, 100);
  });
}

async function handleLocationSearch() {
  const searchTerm = locationSearch.value.trim().toLowerCase();
  if (!searchTerm) {
    renderLocations();
    return;
  }

  const filteredLocations = savedLocations.filter(location => 
    location.name.toLowerCase().includes(searchTerm)
  );
  
  locationsList.innerHTML = '';
  
  if (filteredLocations.length === 0) {
    locationsList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-search fa-3x text-muted mb-3"></i>
        <p class="text-muted">No locations found</p>
      </div>
    `;
    return;
  }

  filteredLocations.forEach(location => {
    const locationElement = document.createElement('div');
    locationElement.className = 'col-md-6 col-lg-4 mb-4';
    locationElement.innerHTML = `
      <div class="card h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <h5 class="card-title mb-0">${location.name}</h5>
            <div class="dropdown">
              <button class="btn btn-link text-muted p-0" type="button" data-bs-toggle="dropdown">
                <i class="fas fa-ellipsis-v"></i>
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="/forecast?lat=${location.lat}&lng=${location.lng}">
                  <i class="fas fa-cloud-sun me-2"></i>View Forecast
                </a></li>
                <li><a class="dropdown-item" href="/?lat=${location.lat}&lng=${location.lng}">
                  <i class="fas fa-map me-2"></i>View on Map
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" onclick="shareLocation(${location.id})">
                  <i class="fas fa-share-alt me-2"></i>Share Location
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" onclick="deleteLocation(${location.id})">
                  <i class="fas fa-trash-alt me-2"></i>Delete
                </a></li>
              </ul>
            </div>
          </div>
          <p class="card-text text-muted">
            <i class="fas fa-map-marker-alt me-2"></i>
            ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}
          </p>
          ${location.description ? `
            <p class="card-text">${location.description}</p>
          ` : ''}
          <div class="location-stats">
            ${location.elevation ? `
              <div class="stat-item">
                <i class="fas fa-mountain me-2"></i>
                <span>${location.elevation.toFixed(1)}m</span>
              </div>
            ` : ''}
          </div>
          <div class="sharing-buttons mt-3" id="sharing-container-${location.id}"></div>
        </div>
      </div>
    `;
    locationsList.appendChild(locationElement);
    
    // Add sharing buttons after card is created
    setTimeout(() => {
      const sharingContainer = locationElement.querySelector(`#sharing-container-${location.id}`);
      if (sharingContainer) {
        addSharingToPopup(location.id, sharingContainer);
      }
    }, 100);
  });
}

async function deleteLocation(locationId) {
  if (!confirm('Are you sure you want to delete this location?')) {
    return;
  }

  try {
    showLoading();
    const response = await fetch(`/api/locations/${locationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete location');
    }

    // Remove from local array and re-render
    savedLocations = savedLocations.filter(loc => loc.id !== locationId);
    renderLocations();
  } catch (error) {
    console.error('Error deleting location:', error);
    showError('Failed to delete location');
  } finally {
    hideLoading();
  }
}

async function shareLocation(locationId) {
  try {
    const shareData = await socialSharing.fetchShareData(locationId);
    if (shareData) {
      // Create a modal to show sharing options
      const modal = document.createElement('div');
      modal.className = 'modal fade';
      modal.id = 'shareModal';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Share Location</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="share-preview mb-3">
                <h6>${shareData.location.name}</h6>
                <p class="text-muted">${shareData.location.latitude.toFixed(4)}, ${shareData.location.longitude.toFixed(4)}</p>
                ${shareData.weather && Object.keys(shareData.weather).length > 0 ? `
                  <p><i class="fas fa-temperature-high"></i> ${shareData.weather.temp}°C, ${shareData.weather.condition}</p>
                ` : ''}
                ${shareData.risk && shareData.risk.risk_level ? `
                  <p><i class="fas fa-exclamation-triangle"></i> Risk: ${shareData.risk.risk_level.toUpperCase()}</p>
                ` : ''}
              </div>
              <div id="modal-sharing-buttons"></div>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
      
      // Add sharing buttons to modal
      const modalSharingContainer = modal.querySelector('#modal-sharing-buttons');
      if (modalSharingContainer) {
        const sharingButtons = socialSharing.createSharingButtons(shareData);
        modalSharingContainer.innerHTML = sharingButtons;
      }
      
      // Remove modal from DOM after it's hidden
      modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
      });
    }
  } catch (error) {
    console.error('Error sharing location:', error);
    showError('Failed to share location');
  }
}

function showLoading() {
  document.querySelector('.loader-bg').style.display = 'flex';
}

function hideLoading() {
  document.querySelector('.loader-bg').style.display = 'none';
}

function showError(message) {
  // You can implement a proper error notification system here
  alert(message);
} 