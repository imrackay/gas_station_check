const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MAX_DISTANCE_METERS = 100; // ระยะห่างสูงสุด 100 เมตร

let map;
let markers = {};
let stations = [];
let currentStation = null;
let userLocation = null;
let userMarker = null;

// Initialize map
function initMap() {
  try {
    map = L.map('map').setView([7.56, 99.61], 10); // ตรัง
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Force map to refresh after a short delay
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    // Get user location
    getUserLocation();
  } catch (error) {
    console.error('Error initializing map:', error);
    alert('ไม่สามารถโหลดแผนที่ได้ กรุณารีเฟรชหน้าเว็บ');
  }
}

// Get user's current location
function getUserLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Update or create user marker
        if (userMarker) {
          userMarker.setLatLng([userLocation.lat, userLocation.lng]);
        } else {
          userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: L.divIcon({
              className: 'user-marker',
              html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map);
          
          userMarker.bindPopup('<strong>📍 ตำแหน่งของคุณ</strong>');
        }
      },
      (error) => {
        console.warn('Cannot get location:', error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    );
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Check if user is near the station
function isNearStation(station) {
  if (!userLocation) {
    return { allowed: false, message: 'กรุณาเปิดการเข้าถึงตำแหน่งของคุณ' };
  }
  
  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    station.latitude,
    station.longitude
  );
  
  if (distance <= MAX_DISTANCE_METERS) {
    return { allowed: true, distance: Math.round(distance) };
  } else {
    return { 
      allowed: false, 
      message: `คุณอยู่ห่างจากปั๊มนี้ ${Math.round(distance)} เมตร<br>กรุณาอยู่ในบริเวณปั๊ม (ภายใน ${MAX_DISTANCE_METERS} เมตร) เพื่ออัพเดทข้อมูล`,
      distance: Math.round(distance)
    };
  }
}

// Get fuel level class and text
function getFuelInfo(status) {
  const statusMap = {
    'high': { class: 'high', text: 'ปกติ', color: '#10b981' },
    'medium': { class: 'medium', text: 'ปานกลาง', color: '#eab308' },
    'low': { class: 'low', text: 'น้อย', color: '#f97316' },
    'empty': { class: 'empty', text: 'หมด', color: '#ef4444' },
    null: { class: 'unknown', text: 'ไม่มีข้อมูล', color: '#9ca3af' }
  };
  return statusMap[status] || statusMap[null];
}

// Create custom marker icon
function createMarkerIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'ยังไม่มีข้อมูล';
  const date = new Date(dateString);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Open update modal
function openUpdateModal(stationId) {
  currentStation = stations.find(s => s.id === stationId);
  if (!currentStation) return;
  
  // Check if user is near the station
  const locationCheck = isNearStation(currentStation);
  
  if (!locationCheck.allowed) {
    alert(`🚫 ไม่สามารถอัพเดทข้อมูลได้\n\n${locationCheck.message.replace(/<br>/g, '\n')}`);
    return;
  }
  
  document.getElementById('station-id').value = currentStation.id;
  document.getElementById('station-name').textContent = currentStation.name;
  document.getElementById('distance-info').textContent = `คุณอยู่ห่างจากปั๊มนี้ ${locationCheck.distance} เมตร ✓`;
  
  // Set current status
  if (currentStation.fuel_status) {
    document.querySelector(`input[name="fuel_status"][value="${currentStation.fuel_status}"]`).checked = true;
  } else {
    document.querySelector('input[name="fuel_status"]').checked = false;
  }
  
  document.getElementById('modal').style.display = 'block';
}

// Close modal
function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentStation = null;
}

// Handle form submit
async function handleUpdateSubmit(e) {
  e.preventDefault();
  
  const stationId = document.getElementById('station-id').value;
  const fuelStatus = document.querySelector('input[name="fuel_status"]:checked')?.value;
  
  if (!fuelStatus) {
    alert('กรุณาเลือกสถานะน้ำมัน');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/stations/${stationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fuel_status: fuelStatus
      })
    });
    
    if (response.ok) {
      alert('✅ อัพเดทข้อมูลสำเร็จ!');
      closeModal();
      fetchStations();
    } else {
      throw new Error('Update failed');
    }
  } catch (error) {
    console.error('Error updating station:', error);
    alert('❌ ไม่สามารถอัพเดทข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
  }
}

// Update statistics
function updateStats(stations) {
  const total = stations.length;
  const available = stations.filter(s => s.fuel_status === 'high' || s.fuel_status === 'medium').length;
  const low = stations.filter(s => s.fuel_status === 'low').length;
  const empty = stations.filter(s => s.fuel_status === 'empty').length;
  
  document.getElementById('total-stations').textContent = total;
  document.getElementById('available-stations').textContent = available;
  document.getElementById('low-stations').textContent = low;
  document.getElementById('empty-stations').textContent = empty;
}

// Render stations on map and list
function renderStations(data) {
  stations = data;
  const stationList = document.getElementById('stations');
  stationList.innerHTML = '';
  
  // Clear existing markers
  Object.values(markers).forEach(marker => map.removeLayer(marker));
  markers = {};
  
  // Sort stations by distance from user (if location available)
  if (userLocation) {
    stations.sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    });
  }
  
  stations.forEach(station => {
    const fuelInfo = getFuelInfo(station.fuel_status);
    
    // Add marker to map
    const marker = L.marker([station.latitude, station.longitude], {
      icon: createMarkerIcon(fuelInfo.color)
    }).addTo(map);
    
    marker.bindPopup(`
      <div style="min-width: 200px;">
        <strong style="font-size: 1.1em;">${station.name}</strong><br>
        <div style="margin: 8px 0; color: #666;">${station.address}</div>
        <div style="margin: 8px 0;">
          <strong>สถานะน้ำมัน:</strong> <span style="color: ${fuelInfo.color}; font-weight: bold;">${fuelInfo.text}</span>
        </div>
        <div style="margin: 8px 0; font-size: 0.85em; color: #999;">
          อัพเดท: ${formatDate(station.last_updated)}
        </div>
        <button onclick="openUpdateModal(${station.id})" 
                style="width: 100%; padding: 8px; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.95em; margin-top: 8px;">
          ✏️ อัพเดทข้อมูล
        </button>
      </div>
    `);
    
    markers[station.id] = marker;
    
    // Add to list with distance
    const item = document.createElement('div');
    item.className = `station-item ${fuelInfo.class}`;
    
    let distanceText = '';
    if (userLocation) {
      const distance = calculateDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude);
      if (distance < 1000) {
        distanceText = `<div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">📍 ${Math.round(distance)} ม.</div>`;
      } else {
        distanceText = `<div style="font-size: 0.85rem; color: #666; margin-top: 0.25rem;">📍 ${(distance / 1000).toFixed(1)} กม.</div>`;
      }
    }
    
    item.innerHTML = `
      <span class="station-name">${station.name}</span>
      <div class="fuel-status" style="color: ${fuelInfo.color}; font-weight: bold; margin-top: 0.5rem;">
        ${fuelInfo.text}
      </div>
      ${distanceText}
    `;
    
    item.addEventListener('click', () => {
      map.setView([station.latitude, station.longitude], 15);
      markers[station.id].openPopup();
    });
    
    stationList.appendChild(item);
  });
  
  updateStats(stations);
}

// Fetch stations data
async function fetchStations() {
  try {
    const response = await fetch(`${API_URL}/stations`);
    const stations = await response.json();
    renderStations(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
  }
}

// Initialize app
initMap();
fetchStations();

// Event listeners
document.getElementById('update-form').addEventListener('submit', handleUpdateSubmit);
document.getElementById('add-form').addEventListener('submit', handleAddSubmit);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
  const modal = document.getElementById('modal');
  const addModal = document.getElementById('add-modal');
  if (e.target === modal) {
    closeModal();
  }
  if (e.target === addModal) {
    closeAddStationModal();
  }
});

// Make openUpdateModal available globally
window.openUpdateModal = openUpdateModal;

// Add station functions
let addStationMarker = null;
let addMap = null;

function openAddStationModal() {
  if (!userLocation) {
    alert('กรุณาเปิดการเข้าถึงตำแหน่งของคุณก่อน');
    return;
  }
  
  document.getElementById('add-modal').style.display = 'block';
  
  // Initialize map in modal
  setTimeout(() => {
    if (!addMap) {
      addMap = L.map('add-map').setView([userLocation.lat, userLocation.lng], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(addMap);
    } else {
      addMap.setView([userLocation.lat, userLocation.lng], 13);
    }
    
    // Force map refresh
    setTimeout(() => {
      addMap.invalidateSize();
    }, 100);
    
    // Add user location marker
    if (addStationMarker) {
      addMap.removeLayer(addStationMarker);
    }
    
    addStationMarker = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        className: 'add-marker',
        html: '<div style="background-color: #0ea5e9; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">+</div>',
        iconSize: [35, 35],
        iconAnchor: [17, 17]
      }),
      draggable: true
    }).addTo(addMap);
    
    addStationMarker.bindPopup('📍 ตำแหน่งปั๊มใหม่<br><small>ลากเพื่อย้ายตำแหน่ง</small>').openPopup();
    
    // Set initial coordinates
    document.getElementById('add-latitude').value = userLocation.lat;
    document.getElementById('add-longitude').value = userLocation.lng;
    
    // Update coordinates when marker is dragged
    addStationMarker.on('dragend', function(e) {
      const position = e.target.getLatLng();
      document.getElementById('add-latitude').value = position.lat;
      document.getElementById('add-longitude').value = position.lng;
    });
    
    // Click on map to move marker
    addMap.on('click', function(e) {
      if (addStationMarker) {
        addMap.removeLayer(addStationMarker);
      }
      
      addStationMarker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.divIcon({
          className: 'add-marker',
          html: '<div style="background-color: #0ea5e9; width: 35px; height: 35px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(14, 165, 233, 0.6); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">+</div>',
          iconSize: [35, 35],
          iconAnchor: [17, 17]
        }),
        draggable: true
      }).addTo(addMap);
      
      addStationMarker.bindPopup('📍 ตำแหน่งปั๊มใหม่<br><small>ลากเพื่อย้ายตำแหน่ง</small>').openPopup();
      
      document.getElementById('add-latitude').value = e.latlng.lat;
      document.getElementById('add-longitude').value = e.latlng.lng;
      
      addStationMarker.on('dragend', function(e) {
        const position = e.target.getLatLng();
        document.getElementById('add-latitude').value = position.lat;
        document.getElementById('add-longitude').value = position.lng;
      });
    });
  }, 100);
}

function closeAddStationModal() {
  document.getElementById('add-modal').style.display = 'none';
  document.getElementById('add-form').reset();
  
  // Remove marker from add map
  if (addStationMarker && addMap) {
    addMap.removeLayer(addStationMarker);
    addStationMarker = null;
  }
}

async function handleAddSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('add-name').value;
  const address = document.getElementById('add-address').value;
  const latitude = parseFloat(document.getElementById('add-latitude').value);
  const longitude = parseFloat(document.getElementById('add-longitude').value);
  
  try {
    const response = await fetch(`${API_URL}/stations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        address,
        latitude,
        longitude
      })
    });
    
    if (response.ok) {
      alert('✅ เพิ่มปั๊มใหม่สำเร็จ!');
      closeAddStationModal();
      await fetchStations();
    } else {
      throw new Error('Add failed');
    }
  } catch (error) {
    console.error('Error adding station:', error);
    alert('❌ ไม่สามารถเพิ่มปั๊มได้ กรุณาลองใหม่อีกครั้ง');
  }
}

window.openAddStationModal = openAddStationModal;
window.closeAddStationModal = closeAddStationModal;

// Refresh data every 30 seconds
setInterval(fetchStations, 30000);
