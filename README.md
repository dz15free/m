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
| `npm run build:cf` | بناء نسخة Cloudflare (OpenNext) في `.open-next/` |
| `npm run deploy` | نشر ما بُني بـ `build:cf` على Cloudflare Workers |
| `npm run preview` | بناء Cloudflare وتشغيله محليًا |

## النشر (Cloudflare)

الموقع يعمل على **`https://prof.baczone.app`** وحده، في Worker مستقل اسمه `prof-baczone` (لا علاقة له بـ BacZone ولا بـ `baczone.app`).

**Workers Builds (من GitHub، بلا أوامر محلية):**

| الإعداد | القيمة |
|---|---|
| Branch | الفرع الذي يحمل المشروع (`package.json` في جذره) |
| Root directory | `/` |
| Build command | `npm run build:cf` |
| Deploy command | `npm run deploy` |

- التثبيت يتم تلقائيًا بـ `npm ci` من `package-lock.json` (مع devDependencies التي تضم `@opennextjs/cloudflare` و`wrangler`).
- `prebuild` ينسخ أصول OCR/PDF ويولّد أنواع Cloudflare (`cloudflare-env.d.ts`) قبل `next build`.
- اسم الـ Worker في لوحة Cloudflare يجب أن يطابق `name` في `wrangler.jsonc` (`prof-baczone`).

**قبل أول نشر:** حاوية R2 باسم `prof-baczone-content` (R2 ← Create bucket)، لأن `wrangler.jsonc` يربطها.

**بعد النشر:**
1. الدومين: Workers ← `prof-baczone` ← Settings ← Domains & Routes ← Add ← **Custom domain** ← `prof.baczone.app` (لا Route ولا `*.baczone.app`).
2. Firebase ← Authentication ← Settings ← Authorized domains ← `prof.baczone.app`.
3. الأسرار (Settings ← Variables and Secrets ← نوع Secret)، أو بالأوامر:
   ```bash
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT   # محتوى ملف JSON لحساب الخدمة كاملًا
   npx wrangler secret put CHARGILY_SECRET_KEY
   ```
   **لا يُكتب أي سرّ في ملف داخل المستودع.**

محليًا: `npx wrangler login` ثم `npm run build:cf && npm run deploy`.

## Firebase

- المشروع: `prof-baczone` (إعداد عام في `.env.production` / `.env.development` — قيم عامّة بطبيعتها).
- القواعد والفهارس: `firebase/` — النشر: `npx firebase login` ثم `npx firebase deploy --only firestore`.
- التطوير على المحاكيات: `npx firebase emulators:start --only auth,firestore` مع `NEXT_PUBLIC_FIREBASE_EMULATORS=true` في `.env.local`.
- رفع المستويات والمواد (taxonomy) إلى القاعدة لتصبح قابلة للتعديل:
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-taxonomy.mjs
  ```
  قبل ذلك يستعمل التطبيق القيم الافتراضية في `src/shared/taxonomy/defaults.json`.
- الخطط ومدة التجربة (مرة واحدة؛ السعر يُمرَّر هنا ولا يُكتب في الكود):
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-billing.mjs --trial-days=7 --premium-price=<السعر> --premium-days=365
  ```
- معلومات الدفع اليدوي (تُعرض للأستاذ في صفحة الدفع):
  ```bash
  GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-billing.mjs --premium-price=<السعر> \
    --rip=<20 رقمًا> --holder="<الاسم>" --ccp=<رقم الحساب> --ccp-key=<المفتاح>
  ```
- Chargily: السرّ `CHARGILY_SECRET_KEY` (Worker secret) يحدد الوضع تلقائيًا (`test_sk_…` أو `live_sk_…`). رابط الـ webhook يُرسَل مع كل دفعة: `https://prof.baczone.app/api/webhooks/chargily`.
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
- [x] Phase 10 — دفاتر الأستاذ وفق النموذج الجزائري للابتدائي: الدفتر اليومي، دفتر التحضير (المذكرات)، دفتر التنقيط (مركّبات العربية والرياضيات، المعدلات، الترتيب، المعدل السنوي، كشف النقاط ونتائج الفصل)، دفتر التكوين والندوات، والصفحات الأولى (الغلاف، بطاقة الحالة، قوائم التلاميذ، التوزيع الزمني، الحجم الساعي، العطل) — كلها جاهزة للطباعة A4
- [x] Phase 11 — المكتبة (فهرس بقراءة واحدة، بحث محلي فوري، ملفات R2 محمية بالخادم، Premium، إدارة المحتوى للمحرّرين)، الوثائق الجاهزة (شهادات، غيابات شهرية، استدعاءات، لافتة القسم، بطاقات الطاولة)، التوزيعات السنوية والشهرية و«أين أنا الآن؟»
- [x] Phase 12 — الاشتراك: الخطط وإعداداتها في القاعدة (لا أسعار في الكود)، التجربة المجانية بنقرة بعد المعالج (مرة واحدة، بريد مؤكد)، حدّ الأقسام تفرضه قواعد Firestore، الانتهاء الكسول دون حذف أي بيانات، تنبيه قرب الانتهاء
- [x] Phase 13 — الدفع: Chargily (البطاقة الذهبية/CIB) بطلب يُنشئه الخادم وسعر من القاعدة، webhook موقّع HMAC ومعالَج مرة واحدة ذرّيًا مع التحقق من المبلغ؛ BaridiMob/CCP بإيصال مضغوط ببصمة SHA-256 ومراجعة من الأدمن/المالية مع تنبيهات التكرار؛ إحصائيات الإيرادات الشهرية (Gross/Fees/Net)
- [x] Phase 14 — لوحة الإدارة `/admin` (الرئيسية والإيرادات، الأساتذة وتفعيل Premium يدويًا والأدوار، المحتوى، الخطط والأسعار، الإشعارات، الشريط والتواصل، الرسائل، المدفوعات، سجل العمليات)؛ الإشعارات (عامة وشخصية)؛ التواصل مع الإدارة (زر عائم ومحادثة)؛ تثبيت التطبيق على Android وiPhone؛ الدفع: Chargily أو عبر الإدارة
- [ ] Phase 15–16 — انظر `docs/ARCHITECTURE.md` §39
