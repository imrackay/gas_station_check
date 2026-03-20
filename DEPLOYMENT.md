# คู่มือการ Deploy ขึ้น Internet

## วิธีที่ 1: Deploy ด้วย Vercel (แนะนำ - ฟรี)

### ขั้นตอนการ Deploy:

1. **สร้างบัญชี Vercel**
   - ไปที่ https://vercel.com
   - Sign up ด้วย GitHub, GitLab, หรือ Bitbucket

2. **Push โค้ดขึ้น GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. **Import Project ใน Vercel**
   - ไปที่ https://vercel.com/new
   - เลือก Import Git Repository
   - เลือก repository ของคุณ
   - คลิก Deploy

4. **ตั้งค่า Environment Variables (ถ้าต้องการ)**
   - ไปที่ Settings > Environment Variables
   - เพิ่ม `VITE_API_URL` = `https://your-app-name.vercel.app/api`

5. **เสร็จสิ้น!**
   - Vercel จะให้ URL เช่น `https://your-app-name.vercel.app`
   - ทุกครั้งที่ push code ใหม่ จะ auto-deploy

### หรือ Deploy ด้วย Vercel CLI:

```bash
# ติดตั้ง Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy production
vercel --prod
```

---

## วิธีที่ 2: Deploy ด้วย Netlify (ฟรี)

1. **สร้างบัญชี Netlify**
   - ไปที่ https://netlify.com
   - Sign up ด้วย GitHub

2. **Push โค้ดขึ้น GitHub** (เหมือนข้างบน)

3. **Import Project ใน Netlify**
   - ไปที่ https://app.netlify.com/start
   - เลือก repository
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
   - คลิก Deploy

4. **ตั้งค่า Serverless Functions**
   - สร้างโฟลเดอร์ `netlify/functions`
   - ย้าย API code ไปที่นั่น
   - ปรับ API URL ใน frontend

---

## วิธีที่ 3: Deploy ด้วย Railway (ฟรี $5/เดือน)

1. **สร้างบัญชี Railway**
   - ไปที่ https://railway.app
   - Sign up ด้วย GitHub

2. **New Project**
   - เลือก Deploy from GitHub repo
   - เลือก repository ของคุณ

3. **ตั้งค่า**
   - Railway จะ auto-detect และ deploy
   - ได้ URL เช่น `https://your-app.railway.app`

---

## วิธีที่ 4: Deploy บน VPS (DigitalOcean, AWS, etc.)

### ติดตั้งบน Ubuntu Server:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# ติดตั้ง dependencies
npm install

# Build frontend
npm run build

# รัน server ด้วย PM2
pm2 start server/index.js --name fuel-monitor
pm2 startup
pm2 save

# ติดตั้ง Nginx
sudo apt install -y nginx

# ตั้งค่า Nginx
sudo nano /etc/nginx/sites-available/fuel-monitor
```

### Nginx Configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/YOUR_REPO/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/fuel-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# ติดตั้ง SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## การอัพเดทข้อมูลปั๊ม

หลัง deploy แล้ว ผู้ใช้สามารถ:
1. เข้าไปที่ `https://your-app.vercel.app/add-station.html`
2. เพิ่มปั๊มใหม่ด้วย GPS จริง
3. อัพเดทข้อมูลน้ำมันคงเหลือได้ (ต้องอยู่ภายใน 100 เมตร)

---

## ปัญหาที่อาจพบ

### 1. API ไม่ทำงาน
- ตรวจสอบ CORS settings
- ตรวจสอบ Environment Variables
- ดู logs ใน Vercel Dashboard

### 2. Database หายหลัง deploy
- ใช้ SQLite in-memory (จะ reset ทุกครั้งที่ restart)
- แนะนำเปลี่ยนเป็น PostgreSQL หรือ MongoDB สำหรับ production

### 3. GPS ไม่ทำงาน
- ต้องใช้ HTTPS (Vercel ให้ฟรี)
- ผู้ใช้ต้องอนุญาตการเข้าถึงตำแหน่ง

---

## แนะนำสำหรับ Production

1. **เปลี่ยน Database**
   - ใช้ PostgreSQL (Supabase ฟรี)
   - หรือ MongoDB (MongoDB Atlas ฟรี)

2. **เพิ่ม Authentication**
   - ใช้ Firebase Auth
   - หรือ Auth0

3. **เพิ่ม Rate Limiting**
   - ป้องกัน spam
   - จำกัดการอัพเดทต่อวัน

4. **เพิ่ม Analytics**
   - Google Analytics
   - Vercel Analytics

5. **เพิ่ม Monitoring**
   - Sentry สำหรับ error tracking
   - Uptime monitoring

---

## ค่าใช้จ่าย

- **Vercel**: ฟรี (Hobby plan)
- **Netlify**: ฟรี (100GB bandwidth/เดือน)
- **Railway**: ฟรี $5/เดือน
- **Domain**: ~300-500 บาท/ปี (ถ้าต้องการ custom domain)

---

## Support

หากมีปัญหาในการ deploy:
1. ดู logs ใน Vercel/Netlify Dashboard
2. ตรวจสอบ GitHub Issues
3. อ่าน documentation ของแต่ละ platform
