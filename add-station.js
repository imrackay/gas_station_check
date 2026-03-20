const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let map;
let marker;

// Initialize map
function initMap() {
  map = L.map('add-map').setView([8.5, 99.5], 7);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  
  // Click on map to set location
  map.on('click', function(e) {
    setLocation(e.latlng.lat, e.latlng.lng);
  });
}

// Set location on map
function setLocation(lat, lng) {
  document.getElementById('latitude-input').value = lat.toFixed(6);
  document.getElementById('longitude-input').value = lng.toFixed(6);
  
  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      })
    }).addTo(map);
  }
  
  map.setView([lat, lng], 15);
}

// Use current location
window.useCurrentLocation = function() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        alert('ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
      }
    );
  } else {
    alert('เบราว์เซอร์ของคุณไม่รองรับ GPS');
  }
};

// Handle form submit
document.getElementById('add-station-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('station-name-input').value;
  const address = document.getElementById('station-address-input').value;
  const latitude = parseFloat(document.getElementById('latitude-input').value);
  const longitude = parseFloat(document.getElementById('longitude-input').value);
  const capacity = parseInt(document.getElementById('capacity-input').value);
  const current = parseInt(document.getElementById('current-input').value);
  
  if (current > capacity) {
    alert('น้ำมันคงเหลือไม่สามารถมากกว่าความจุถังได้');
    return;
  }
  
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
        longitude,
        fuel_capacity: capacity,
        fuel_current: current
      })
    });
    
    if (response.ok) {
      alert('✅ เพิ่มปั๊มใหม่สำเร็จ!');
      window.location.href = '/';
    } else {
      throw new Error('Failed to add station');
    }
  } catch (error) {
    console.error('Error adding station:', error);
    alert('❌ ไม่สามารถเพิ่มปั๊มได้ กรุณาลองใหม่อีกครั้ง');
  }
});

// Initialize
initMap();
