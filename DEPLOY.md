# دليل النشر على VPS (Traefik + Frontend/Backend منفصلين)

التطبيق دلوقتي 3 كونتينرز منفصلة: `frontend` (الواجهة الثابتة عبر nginx)،
`backend` (الـ API)، و `mongo` (قاعدة البيانات). الـ **Traefik** اللي شغّال
على السيرفر بالفعل (بيدير مواقع تانية) هو اللي بيستقبل الزوار، يعمل HTTPS،
ويوجّه الطلبات لكل كونتينر حسب الدومين.

```
المتصفح ── HTTPS ──> Traefik (موجود على السيرفر) ──> frontend (Docker)
                                               └────> backend  (Docker) ──> mongo (Docker)
```

- `smile.alisoliman.net` → كونتينر `frontend`
- `backend-smile.alisoliman.net` → كونتينر `backend`

نفس الـ Traefik وشبكة `traefik_public` اللي مستخدمة من مشاريع تانية على نفس
السيرفر (زي `medaya-frontend`) — مفيش حاجة جديدة تتظبط في Traefik نفسه.

---

## 0) متطلبات قبل ما تبدأ
- Traefik شغّال بالفعل على السيرفر وعلى شبكة `traefik_public` (نفس اللي شغّالة عليه مشاريع تانية).
- DNS: A records لـ `smile.alisoliman.net` و `backend-smile.alisoliman.net` موجّهة لـ IP السيرفر.
- الصور بتتخزن في MongoDB تلقائياً (مفيش حاجة تظبطها).

---

## 1) جيب المشروع
```bash
cd /var/www
git clone https://github.com/Amr-Khaled233/SmileMakerStore.git
cd SmileMakerStore
```

## 2) اعمل ملف الإعدادات `.env`
```bash
cp .env.example .env
nano .env
```
املأ القيم دي بس (الباقي سيبه زي ما هو):
```
JWT_SECRET=<شغّل: openssl rand -hex 32 وحط الناتج>
MANAGER_PASSWORD=<باسورد قوي للوحة التحكم>
FRONTEND_URL=https://smile.alisoliman.net
```
> ملاحظة 1: `MONGODB_URI` مش محتاج تغيّره — docker-compose بيوصّل التطبيق بقاعدة البيانات تلقائياً.
> ملاحظة 2: الصور بتتخزن في MongoDB، فسيب سطور `CLOUDINARY_*` متعلّمة كتعليق (#) أو فاضية.
> ملاحظة 3: الدومينات (`smile.alisoliman.net` و `backend-smile.alisoliman.net`) متظبطة بالفعل في `docker-compose.yml` — مفيش حاجة تعدّلها هناك.

## 3) شغّل التطبيق
```bash
docker compose up -d --build
docker compose ps           # تتأكد إن frontend و backend و mongo شغّالين
docker compose logs -f backend
```
خلاص — Traefik هيكتشف الكونتينرز تلقائياً ويعمل لهم HTTPS. افتح
`https://smile.alisoliman.net` ولوحة التحكم على `https://smile.alisoliman.net/dashboard`.

> لو الموقع مش ظاهر، شوف لوج Traefik نفسه (`docker logs <traefik-container>`)
> اتأكد إن الـ router ظاهر في الـ dashboard بتاعته.

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
- **CORS**: الـ backend بيقبل بس الدومينات المكتوبة في `FRONTEND_URL`.
- **MongoDB مقفولة**: مش متاحة من برّه — الـ backend بس اللي بيوصلها عبر شبكة Docker الداخلية.
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
وباقي خطوات الدومين والـ HTTPS زي ما هي (لكن من غير Traefik هتحتاج nginx/certbot يدوي).
