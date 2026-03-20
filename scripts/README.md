# สคริปต์ดึงข้อมูลปั๊มน้ำมัน

## วิธีใช้งาน fetch-stations.js

สคริปต์นี้ใช้ Google Places API เพื่อดึงข้อมูลปั๊มน้ำมันจริงๆ จาก Google Maps

### ขั้นตอนการใช้งาน:

1. **สร้าง Google API Key**
   - ไปที่ https://console.cloud.google.com/
   - สร้างโปรเจกต์ใหม่หรือเลือกโปรเจกต์ที่มีอยู่
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหาและเปิดใช้งาน "Places API"
   - ไปที่ "Credentials" > "Create Credentials" > "API Key"
   - คัดลอก API Key

2. **ตั้งค่า API Key**
   ```bash
   # แก้ไขไฟล์ scripts/fetch-stations.js
   # เปลี่ยนบรรทัดที่ 4:
   const GOOGLE_API_KEY = 'ใส่_API_KEY_ของคุณที่นี่';
   ```

3. **รันสคริปต์**
   ```bash
   node scripts/fetch-stations.js
   ```

4. **คัดลอกผลลัพธ์**
   - สคริปต์จะแสดงรายการปั๊มทั้งหมดพร้อมพิกัด
   - คัดลอกโค้ด SQL ที่สร้างให้
   - นำไปใส่ใน `server/index.js`

### ปรับแต่งพื้นที่ค้นหา:

แก้ไขตัวแปร `searchAreas` ในไฟล์เพื่อเปลี่ยนพื้นที่ค้นหา:

```javascript
const searchAreas = [
  { name: 'ชื่อพื้นที่', lat: ละติจูด, lng: ลองจิจูด, radius: รัศมี_เมตร }
];
```

### ข้อจำกัด:

- Google Places API มี quota จำกัด (ฟรี $200/เดือน)
- Nearby Search: $32 per 1000 requests
- ควรใช้อย่างประหยัดและเก็บผลลัพธ์ไว้

### ทางเลือกอื่น:

ถ้าไม่ต้องการใช้ Google API สามารถ:
1. ใช้ฟีเจอร์ "เพิ่มปั๊มใหม่" ในระบบ
2. ให้เจ้าหน้าที่ปั๊มลงทะเบียนเอง
3. ใช้ข้อมูลจาก OpenStreetMap (ฟรี)
