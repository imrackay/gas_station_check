// สคริปต์ดึงข้อมูลปั๊มน้ำมันจาก OpenStreetMap (ฟรี ไม่ต้องใช้ API Key)
// ใช้ Overpass API ของ OpenStreetMap

const https = require('https');

// พื้นที่ค้นหา - ขยายพื้นที่ให้ครอบคลุมมากขึ้น
const TRANG_EXTENDED_BBOX = '7.0,99.2,8.0,100.0'; // ขยายพื้นที่ให้กว้างขึ้น

// Overpass Query สำหรับค้นหาปั๊มน้ำมัน (ค้นหาหลายเงื่อนไข)
const query = `[out:json][timeout:90];
(
  node["amenity"="fuel"](${TRANG_EXTENDED_BBOX});
  way["amenity"="fuel"](${TRANG_EXTENDED_BBOX});
  node["shop"="gas"](${TRANG_EXTENDED_BBOX});
  way["shop"="gas"](${TRANG_EXTENDED_BBOX});
  node["shop"="fuel"](${TRANG_EXTENDED_BBOX});
  way["shop"="fuel"](${TRANG_EXTENDED_BBOX});
);
out body;
>;
out skel qt;`;

function fetchFromOverpass() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(query)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(query);
    req.end();
  });
}

// ฟังก์ชันคำนวณ center ของ way
function calculateWayCenter(wayNodes, allNodes) {
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const validNodes = wayNodes.map(id => nodeMap.get(id)).filter(n => n && n.lat && n.lon);
  
  if (validNodes.length === 0) return null;
  
  const avgLat = validNodes.reduce((sum, n) => sum + n.lat, 0) / validNodes.length;
  const avgLon = validNodes.reduce((sum, n) => sum + n.lon, 0) / validNodes.length;
  
  return { lat: avgLat, lon: avgLon };
}

// ฟังก์ชันตรวจสอบว่าอยู่ในจังหวัดตรังหรือใกล้เคียง
function isInTrangArea(lat, lon) {
  // พื้นที่จังหวัดตรังและขอบจังหวัด
  return lat >= 7.15 && lat <= 7.95 && lon >= 99.35 && lon <= 99.95;
}

async function getStations() {
  console.log('🔍 กำลังค้นหาปั๊มน้ำมันในจังหวัดตรังและพื้นที่ใกล้เคียง...\n');
  console.log('📍 ขยายพื้นที่ค้นหาให้ครอบคลุมมากขึ้น\n');
  
  try {
    const data = await fetchFromOverpass();
    
    // แยก nodes และ ways
    const nodes = data.elements.filter(el => el.type === 'node');
    const ways = data.elements.filter(el => el.type === 'way' && el.tags);
    
    const stations = [];
    
    // ประมวลผล nodes (ปั๊มที่เป็นจุด)
    nodes.filter(el => el.tags).forEach(el => {
      // กรองเฉพาะที่อยู่ในพื้นที่ตรัง
      if (!isInTrangArea(el.lat, el.lon)) return;
      
      const brand = el.tags.brand || el.tags.operator || el.tags.name || '';
      const name = el.tags.name || (brand ? `ปั๊ม ${brand}` : 'ปั๊มน้ำมัน');
      const address = el.tags['addr:full'] || 
                     el.tags['addr:street'] || 
                     el.tags['addr:district'] || 
                     el.tags['addr:subdistrict'] ||
                     'จ.ตรัง';
      
      stations.push({
        name: name,
        address: address,
        latitude: el.lat,
        longitude: el.lon,
        brand: brand,
        operator: el.tags.operator || '',
        type: 'node',
        osm_id: el.id
      });
    });
    
    // ประมวลผล ways (ปั๊มที่เป็นพื้นที่)
    ways.forEach(way => {
      if (way.nodes && way.nodes.length > 0) {
        const center = calculateWayCenter(way.nodes, nodes);
        if (center && isInTrangArea(center.lat, center.lon)) {
          const brand = way.tags.brand || way.tags.operator || way.tags.name || '';
          const name = way.tags.name || (brand ? `ปั๊ม ${brand}` : 'ปั๊มน้ำมัน');
          const address = way.tags['addr:full'] || 
                         way.tags['addr:street'] || 
                         way.tags['addr:district'] || 
                         way.tags['addr:subdistrict'] ||
                         'จ.ตรัง';
          
          stations.push({
            name: name,
            address: address,
            latitude: center.lat,
            longitude: center.lon,
            brand: brand,
            operator: way.tags.operator || '',
            type: 'way',
            osm_id: way.id
          });
        }
      }
    });

    // ลบข้อมูลซ้ำ (ใช้ osm_id และตำแหน่งใกล้เคียง)
    const uniqueStations = [];
    const seen = new Set();
    
    stations.forEach(station => {
      const key = `${station.type}_${station.osm_id}`;
      const posKey = `${station.latitude.toFixed(4)}_${station.longitude.toFixed(4)}`;
      
      if (!seen.has(key) && !seen.has(posKey)) {
        seen.add(key);
        seen.add(posKey);
        uniqueStations.push(station);
      }
    });

    // เรียงตามแบรนด์และตำแหน่ง
    uniqueStations.sort((a, b) => {
      if (a.brand && !b.brand) return -1;
      if (!a.brand && b.brand) return 1;
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
      return a.latitude - b.latitude;
    });

    console.log(`✅ พบปั๊มน้ำมันทั้งหมด ${uniqueStations.length} แห่ง\n`);

    // สรุปตามแบรนด์
    const brandCount = {};
    uniqueStations.forEach(s => {
      const brand = s.brand || 'ไม่ระบุแบรนด์';
      brandCount[brand] = (brandCount[brand] || 0) + 1;
    });

    console.log('📊 สรุปตามแบรนด์:');
    Object.entries(brandCount).sort((a, b) => b[1] - a[1]).forEach(([brand, count]) => {
      console.log(`   ${brand}: ${count} ปั๊ม`);
    });
    console.log('');

    // แสดงผลลัพธ์
    uniqueStations.forEach((station, index) => {
      console.log(`${index + 1}. ${station.name}`);
      console.log(`   แบรนด์: ${station.brand || 'ไม่ระบุ'}`);
      console.log(`   ที่อยู่: ${station.address}`);
      console.log(`   พิกัด: ${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}`);
      console.log(`   ประเภท: ${station.type === 'node' ? 'จุด' : 'พื้นที่'}`);
      console.log('');
    });

    // สร้างโค้ด SQL
    console.log('\n📝 SQL Code สำหรับใส่ใน server/index.js:\n');
    console.log('const sampleStations = [');
    uniqueStations.forEach(station => {
      const capacity = station.brand && ['PTT', 'Shell', 'Bangchak', 'Caltex', 'Esso', 'บางจาก', 'ป.ต.ท.', 'เชลล์'].some(b => station.brand.includes(b)) 
        ? 50000 
        : 40000;
      const current = Math.floor(capacity * (0.3 + Math.random() * 0.6)); // สุ่ม 30-90%
      
      console.log(`  ['${station.name}', '${station.address}', ${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)}, ${capacity}, ${current}],`);
    });
    console.log('];\n');

    return uniqueStations;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error(error);
  }
}

// รันสคริปต์
console.log('🌍 ใช้ OpenStreetMap Overpass API (ฟรี ไม่ต้องใช้ API Key)\n');
getStations();
