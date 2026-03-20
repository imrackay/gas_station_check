// สคริปต์สำหรับดึงข้อมูลปั๊มน้ำมันจาก Google Places API
// ต้องมี Google Maps API Key ที่เปิดใช้งาน Places API

const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY_HERE'; // ใส่ API Key ของคุณที่นี่

// พื้นที่ค้นหา - จังหวัดตรัง
const searchAreas = [
  { name: 'ตรังเมือง', lat: 7.5563, lng: 99.6114, radius: 10000 },
  { name: 'กันตัง', lat: 7.4167, lng: 99.5167, radius: 10000 },
  { name: 'ย่านตาขาว', lat: 7.4833, lng: 99.6333, radius: 10000 },
  { name: 'ปะเหลียน', lat: 7.6500, lng: 99.7167, radius: 10000 },
  { name: 'สิเกา', lat: 7.5500, lng: 99.4500, radius: 10000 }
];

// ประเภทปั๊มน้ำมัน
const stationTypes = ['gas_station', 'petrol_station'];

async function fetchStationsInArea(area) {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${area.lat},${area.lng}&radius=${area.radius}&type=gas_station&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.results.map(place => ({
        name: place.name,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        place_id: place.place_id,
        rating: place.rating || 0,
        user_ratings_total: place.user_ratings_total || 0
      }));
    } else {
      console.error(`Error fetching ${area.name}:`, data.status);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching ${area.name}:`, error);
    return [];
  }
}

async function getAllStations() {
  console.log('🔍 กำลังค้นหาปั๊มน้ำมันในจังหวัดตรัง...\n');
  
  const allStations = [];
  
  for (const area of searchAreas) {
    console.log(`📍 ค้นหาในพื้นที่: ${area.name}`);
    const stations = await fetchStationsInArea(area);
    allStations.push(...stations);
    
    // รอ 1 วินาทีเพื่อไม่ให้เกิน rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // ลบข้อมูลซ้ำ (ใช้ place_id เป็นตัวเช็ค)
  const uniqueStations = Array.from(
    new Map(allStations.map(s => [s.place_id, s])).values()
  );
  
  console.log(`\n✅ พบปั๊มน้ำมันทั้งหมด ${uniqueStations.length} แห่ง\n`);
  
  // แสดงผลลัพธ์
  uniqueStations.forEach((station, index) => {
    console.log(`${index + 1}. ${station.name}`);
    console.log(`   ที่อยู่: ${station.address}`);
    console.log(`   พิกัด: ${station.latitude}, ${station.longitude}`);
    console.log(`   Rating: ${station.rating} (${station.user_ratings_total} reviews)`);
    console.log('');
  });
  
  // สร้างโค้ด SQL สำหรับใส่ใน database
  console.log('\n📝 SQL Code สำหรับใส่ใน server/index.js:\n');
  console.log('const sampleStations = [');
  uniqueStations.forEach(station => {
    console.log(`  ['${station.name}', '${station.address}', ${station.latitude}, ${station.longitude}, 50000, 45000],`);
  });
  console.log('];\n');
  
  return uniqueStations;
}

// วิธีใช้งาน:
// 1. ไปที่ https://console.cloud.google.com/
// 2. สร้างโปรเจกต์ใหม่หรือเลือกโปรเจกต์ที่มีอยู่
// 3. เปิดใช้งาน "Places API"
// 4. สร้าง API Key
// 5. ใส่ API Key ในตัวแปร GOOGLE_API_KEY ด้านบน
// 6. รันคำสั่ง: node scripts/fetch-stations.js

if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
  console.log('❌ กรุณาใส่ Google API Key ก่อนใช้งาน\n');
  console.log('วิธีการ:');
  console.log('1. ไปที่ https://console.cloud.google.com/');
  console.log('2. สร้างโปรเจกต์และเปิดใช้งาน Places API');
  console.log('3. สร้าง API Key');
  console.log('4. แก้ไขไฟล์นี้และใส่ API Key ในบรรทัดที่ 4');
  console.log('5. รันคำสั่ง: node scripts/fetch-stations.js\n');
} else {
  getAllStations();
}
