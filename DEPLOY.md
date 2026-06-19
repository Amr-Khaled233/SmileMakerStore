# دليل النشر على Hostinger VPS (كل حاجة على سيرفر واحد)

التطبيق + قاعدة البيانات (MongoDB) بيشتغلوا على نفس الـ VPS باستخدام Docker —
أسرع وأبسط ومفيش أي طرف خارجي. nginx بيستقبل الزوار ويوجّههم للتطبيق مع HTTPS.

```
المتصفح ── HTTPS ──> nginx (80/443) ──> app (Docker :3001) ──> mongo (Docker)
```

---

## 0) متطلبات قبل ما تبدأ
- VPS من Hostinger (خطة KVM 1 أو أعلى) بنظام **Ubuntu 22.04/24.04**.
- دومين موجّه لـ IP السيرفر (A record لـ `yourdomain.com` و `www`).
- (اختياري لكن مهم للسرعة) حساب **Cloudinary** لصور المنتجات.

---

## 1) تثبيت Docker + nginx على السيرفر
اتصل بالسيرفر: `ssh root@SERVER_IP` ثم:
```bash
# Docker
curl -fsSL https://get.docker.com | sh

# nginx + أداة شهادة SSL
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx git
```

## 2) جيب المشروع
```bash
cd /var/www
git clone https://github.com/Amr-Khaled233/SmileMakerStore.git
cd SmileMakerStore
```

## 3) اعمل ملف الإعدادات `.env`
```bash
cp .env.example .env
nano .env
```
املأ القيم دي (الباقي سيبه زي ما هو):
```
JWT_SECRET=<شغّل: openssl rand -hex 32 وحط الناتج>
MANAGER_PASSWORD=<باسورد قوي للوحة التحكم>
FRONTEND_URL=https://yourdomain.com
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```
> ملاحظة: `MONGODB_URI` مش محتاج تغيّره — docker-compose بيوصّل التطبيق بقاعدة البيانات تلقائياً.

## 4) شغّل التطبيق
```bash
docker compose up -d --build
docker compose ps           # تتأكد إن app و mongo شغّالين
docker compose logs -f app  # تشوف اللوج (Ctrl+C للخروج)
```
دلوقتي التطبيق شغّال محلياً على `127.0.0.1:3001`.

## 5) إعداد nginx + الدومين
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/smilemaker
sudo nano /etc/nginx/sites-available/smilemaker      # غيّر yourdomain.com
sudo ln -s /etc/nginx/sites-available/smilemaker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6) فعّل HTTPS (شهادة مجانية)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
خلاص — افتح `https://yourdomain.com` 🎉 ولوحة التحكم على `https://yourdomain.com/dashboard`.

---

## التحديثات بعد أي تعديل جديد
```bash
cd /var/www/SmileMakerStore
git pull
docker compose up -d --build
```

## الباك أب (مهم جداً لأن الداتا محلية)
```bash
chmod +x deploy/backup.sh
./deploy/backup.sh                      # باك أب فوري في ./backups
# جدوله يومياً 3 صباحاً:
crontab -e
# ضيف السطر ده:
0 3 * * * /var/www/SmileMakerStore/deploy/backup.sh >> /var/log/smilemaker-backup.log 2>&1
```
الاستعادة:
```bash
docker compose exec -T mongo sh -c 'mongorestore --archive --gzip --drop' < backups/FILE.gz
```

---

## الأمان المُفعّل (جاهز في الكود)
- **Rate limiting**: حد أقصى للأوردرات (8 كل 10 دقايق/IP)، ومحاولات الدخول (10 كل ربع ساعة)، وحد عام للـ API — يمنع سبام الأوردرات وتخمين كلمة المرور.
- **التحقق من الأوردر** على السيرفر: رفض الأوردرات المشوّهة، حد أقصى للأصناف والكميات، ومنع تكرار نفس الأوردر.
- **helmet**: هيدرز حماية (HSTS، منع التضمين، إلخ).
- **MongoDB مقفولة**: مش متاحة من برّه — التطبيق بس اللي بيوصلها عبر شبكة Docker الداخلية.
- **تحقق من الإعدادات عند الإقلاع**: السيرفر بيقف بسرعة ويقولك لو فيه متغير ناقص.

## السرعة المُفعّلة
- ضغط gzip لكل الردود.
- كاش طويل لأصول الواجهة (JS/CSS) المبنية.
- الـ build متحسّن ومقسّم.
- (اختياري) حُط الدومين خلف Cloudflare مجاناً لـ CDN عالمي.

---

## بدون Docker (طريقة بديلة بـ pm2)
لو مش عايز Docker:
```bash
# ثبّت Node 20 و MongoDB محلياً، ثم:
npm install
npm run build
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```
وباقي خطوات nginx و SSL زي ما هي.
