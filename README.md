# مساعد الأستاذ — P

مكتب الأستاذ الرقمي · `prof.baczone.app`

> «أدخل بياناتك مرة... ودع المنصة تقوم بالباقي.»

وثيقة المنتج والمعمارية: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## الحزمة

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · next-intl (عربي RTL / فرنسي LTR) · Firebase (Auth + Firestore) · Cloudflare Workers عبر OpenNext.

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local   # املأ قيم Firebase عند الوصول إلى Phase 2
npm run dev                  # http://localhost:3000
```

| الأمر | الوظيفة |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | أنواع المسارات + TypeScript |
| `npm run build` | بناء Next.js |
| `npm run test:unit` | اختبارات المنطق (Node test runner) |
| `npm run test:rules` | اختبارات قواعد Firestore على المحاكي (تتطلب Java) |
| `npm run vendor` | نسخ محرّكات OCR وPDF إلى `public/vendor` (تلقائي قبل dev/build) |
| `npm run brand` | إعادة توليد أصول الشعار من `brand/logo-full.webp` |
| `npm run preview` | بناء Cloudflare وتشغيله محليًا |
| `npm run deploy` | النشر على Cloudflare Workers |

## النشر (Cloudflare)

1. `npx wrangler login` بحساب Cloudflare الذي يحمل `baczone.app`.
2. `npm run deploy` — يُنشئ Worker باسم `prof-baczone`.
3. من لوحة Cloudflare: Workers ← `prof-baczone` ← Settings ← Domains ← إضافة `prof.baczone.app`.
4. متغيّرات البناء العامة (`NEXT_PUBLIC_*`) تُضبط في بيئة البناء، والأسرار كـ Worker secrets:
   ```bash
   npx wrangler secret put CHARGILY_SECRET_KEY
   ```
   **لا يُكتب أي سرّ في ملف داخل المستودع.**

## Firebase

- المشروع: `prof-baczone` (إعداد عام في `.env.production` / `.env.development` — قيم عامّة بطبيعتها).
- القواعد والفهارس: `firebase/` — النشر: `npx firebase login` ثم `npx firebase deploy --only firestore`.
- التطوير على المحاكيات: `npx firebase emulators:start --only auth,firestore` مع `NEXT_PUBLIC_FIREBASE_EMULATORS=true` في `.env.local`.
- رفع المستويات والمواد (taxonomy) إلى القاعدة لتصبح قابلة للتعديل:
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-taxonomy.mjs
  ```
  قبل ذلك يستعمل التطبيق القيم الافتراضية في `src/shared/taxonomy/defaults.json`.
- منح دور أدمن:
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/set-role.mjs you@example.com admin
  ```

## الهيكل

```
brand/            الشعار الأصلي (مصدر أصول الهوية)
docs/             المعمارية والقرارات
scripts/          أدوات (توليد أصول الشعار...)
src/app/          الصفحات: الرئيسية، (auth)، app/ (مساحة الأستاذ)، api/ لاحقًا
src/components/   brand/ · layout/ (الشريط السفلي، الجانبي، الرأس) · ui/
src/features/     منطق كل ميزة معزولًا (من Phase 2)
src/i18n/         الإعداد، الرسائل ar/fr، التواريخ بأسماء الأشهر الجزائرية
src/lib/          firebase/ (المتصفح) · server/ (الخادم فقط) · utils/
```

## المراحل

- [x] Phase 1 — الأساس: المشروع، الهوية، نظام التصميم، i18n، هيكل التطبيق، PWA manifest، CI، إعداد Cloudflare
- [x] Phase 2 — المصادقة: Google + بريد، تأكيد البريد، الاستعادة، حراسة المسارات، الأدوار، قواعد Firestore + اختبارات
- [x] Phase 3 — معالج البداية (طريقة التدريس، الملف المهني، المؤسسة، السنة الدراسية) + صفحة الإعدادات
- [x] Phase 4–5 — الأقسام والإسنادات: إنشاء جماعي حسب المستويات والأفواج، المواد لكل قسم، النسخ، الأرشفة، الحذف
- [x] Phase 6 — التلاميذ: إضافة سريعة بلوحة المفاتيح، تعديل، حذف ونقل وتحديد الجنس جماعيًا، ترتيب أبجدي، بحث، كشف التكرار، تصدير CSV
- [x] Phase 7 — الاستيراد الذكي: لصق، Excel (عدة أوراق)، PDF نصّي، صور وPDF ممسوح بـ OCR محلي (عربي/فرنسي، عدة صفحات)، مراجعة موحّدة 🟢🟡🔴
- [x] Phase 8 — الحضور والغياب: «الجميع حاضر» + الاستثناءات، حفظ تلقائي يعمل دون إنترنت، نصف يوم أو مادة، إحصائيات القسم والتلميذ والشهر
- [x] Phase 9 — جدول التوقيت: محرّر أسبوعي (نسخ يوم، تنبيه التداخل)، حصص افتراضية حسب الرزنامة، «اليوم» الديناميكي، زرّ «الحصة» يفتح الحصة الجارية
- [ ] Phase 10–16 — انظر `docs/ARCHITECTURE.md` §39
