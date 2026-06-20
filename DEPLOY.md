# دليل النشر على VPS (Traefik + Frontend/Backend منفصلين)

التطبيق دلوقتي 3 كونتينرز منفصلة: `frontend` (الواجهة الثابتة عبر nginx)،
`backend` (الـ API)، و `mongo` (قاعدة البيانات). الـ **Traefik** اللي شغّال
على السيرفر بالفعل (بيدير مواقع تانية) هو اللي بيستقبل الزوار، يعمل HTTPS،
ويوجّه الطلبات لكل كونتينر حسب الدومين.

```
المتصفح ── HTTPS ──> Traefik (موجود على السيرفر) ──> frontend (Docker)
                                               └────> backend  (Docker) ──> mongo (Docker)
```

- `yourdomain.com` (و `www`) → كونتينر `frontend`
- `api.yourdomain.com` → كونتينر `backend`

---

## 0) متطلبات قبل ما تبدأ
- VPS فيه **Traefik شغّال بالفعل** كـ reverse proxy مشترك (لو لسه مش متأكد، شوف خطوة 1).
- دومين موجّه لـ IP السيرفر: A record لـ `yourdomain.com`، `www`، و `api.yourdomain.com`.
- الصور بتتخزن في MongoDB تلقائياً (مفيش حاجة تظبطها).

---

## 1) اتأكد من شبكة Traefik
Traefik بيوجّه بس للكونتينرات اللي على نفس الـ Docker network بتاعته. شوف اسمها:
```bash
docker network ls
```
دور على شبكة الـ Traefik (غالباً اسمها زي `traefik-public` أو `traefik_default`).
لو الاسم مختلف عن `traefik-public`، عدّل `docker-compose.yml`:
```yaml
networks:
  traefik-public:
    external: true
    name: <الاسم-الحقيقي-بتاع-شبكة-Traefik>
```
وكمان اتأكد إن الـ certresolver في الـ labels (`letsencrypt`) مطابق لاسم الـ resolver
المُعرّف في إعدادات Traefik بتاعتك.

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
املأ القيم دي بس (الباقي سيبه زي ما هو):
```
JWT_SECRET=<شغّل: openssl rand -hex 32 وحط الناتج>
MANAGER_PASSWORD=<باسورد قوي للوحة التحكم>
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```
> ملاحظة 1: `MONGODB_URI` مش محتاج تغيّره — docker-compose بيوصّل التطبيق بقاعدة البيانات تلقائياً.
> ملاحظة 2: الصور بتتخزن في MongoDB، فسيب سطور `CLOUDINARY_*` متعلّمة كتعليق (#) أو فاضية.

## 4) عدّل الدومينات في `docker-compose.yml`
استبدل `yourdomain.com` و `api.yourdomain.com` في labels بتاعة `frontend` و `backend`
بالدومين الحقيقي بتاعك (4 مواضع: 2 في كل service — الـ `rule` والـ `VITE_API_BASE`).

## 5) شغّل التطبيق
```bash
docker compose up -d --build
docker compose ps           # تتأكد إن frontend و backend و mongo شغّالين
docker compose logs -f backend
```
خلاص — Traefik هيكتشف الكونتينرز تلقائياً ويعمل لهم HTTPS. افتح
`https://yourdomain.com` ولوحة التحكم على `https://yourdomain.com/dashboard`.

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
