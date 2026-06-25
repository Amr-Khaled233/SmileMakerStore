# النشر على VPS خاص بيك (دومين واحد + Traefik تلقائي)

الإعداد ده **متكامل**: ملف واحد بيشغّل Traefik + Mongo + الباك + الفرونت.
الموقع على `https://yourdomain.com` والـ API على `/api` (نفس الدومين) — فمحتاج
**دومين واحد بس** و**A record واحد**، ومفيش CORS.

```
المتصفح ── HTTPS ──> Traefik (Docker) ──> frontend (/)      (Docker)
                                     └──> backend  (/api)   (Docker) ──> mongo (Docker)
```

---

## 0) قبل ما تبدأ
- VPS فيه **Docker** (لو فعّلت "Docker manager" في إعداد هوستينجر يبقى موجود؛ لو لأ ثبّته: `curl -fsSL https://get.docker.com | sh`).
- **DNS:** سجل **A** واحد: `yourdomain.com` → IP السيرفر. (ولو عايز www كمان: A record لـ `www`.)

## 1) جيب المشروع (فرع feat/deployment)
```bash
cd /var/www
git clone -b feat/deployment https://github.com/Amr-Khaled233/SmileMakerStore.git
cd SmileMakerStore
```

## 2) ملف الإعدادات `.env`
```bash
cp .env.example .env
nano .env
```
املأ القيم دي:
```
DOMAIN=yourdomain.com
ACME_EMAIL=you@example.com
JWT_SECRET=<شغّل: openssl rand -hex 32 وحط الناتج>
MANAGER_PASSWORD=<باسورد قوي للوحة التحكم>
FRONTEND_URL=https://yourdomain.com
```
(سيب `MONGODB_URI` و `CLOUDINARY_*` زي ما هم.)

## 3) شغّل كل حاجة
```bash
docker compose -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml logs -f backend
```
Traefik هياخد شهادة HTTPS تلقائياً خلال دقيقة. افتح:
- الموقع: `https://yourdomain.com`
- لوحة التحكم: `https://yourdomain.com/dashboard`

> أول طلب ممكن ياخد 10–30 ثانية لحد ما الشهادة تطلع. لو فضل "not secure"
> شوية، استنى شوية وجرّب refresh.

---

## التحديث بعد أي تعديل
```bash
cd /var/www/SmileMakerStore
git pull
docker compose -f docker-compose.vps.yml up -d --build
```

## الباك أب (مهم — الداتا محلية على السيرفر)
```bash
# نسخة احتياطية فورية:
docker compose -f docker-compose.vps.yml exec -T mongo \
  sh -c 'mongodump --db smilemaker --archive --gzip' > backup_$(date +%F).gz

# الاستعادة:
docker compose -f docker-compose.vps.yml exec -T mongo \
  sh -c 'mongorestore --archive --gzip --drop' < backup_FILE.gz
```

---

## حل المشاكل السريع
- **الموقع مش فاتح:** اتأكد إن الـ A record موجّه لـ IP السيرفر، واستنى دقايق للـ DNS.
- **الشهادة مش طالعة:** لازم بورت 80 و 443 مفتوحين (افتراضياً مفتوحين على هوستينجر)، و `ACME_EMAIL` صح.
- **شوف اللوج:** `docker compose -f docker-compose.vps.yml logs -f backend` أو `... logs -f traefik`.
