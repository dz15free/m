/**
 * يولّد كل أصول الهوية من الشعار الأصلي `brand/logo-full.webp` دون أي تعديل
 * على التصميم: قصّ فقط، وتغيير مقاس، وخلفية بيضاء حيث تشترطها المنصّات
 * (أيقونات PWA وApple). شغّله بعد أي تحديث للشعار: `npm run brand`.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const SRC = "brand/logo-full.webp";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/* حدود أجزاء الشعار داخل المصدر (1254×1254، خلفية شفّافة)،
   مقيسة من قناة الشفافية: الأيقونة، ثم الاسم، ثم الشعار النصّي. */
const PARTS = {
  mark: { left: 319, top: 100, width: 687, height: 730 },
  wordmark: { left: 122, top: 861, width: 1021, height: 162 },
  full: { left: 120, top: 100, width: 1023, height: 1017 },
};

const crop = (part) => sharp(SRC).extract(PARTS[part]);

/** يضع الأيقونة وسط مربّع بهامش نسبي (padding من 0 إلى 0.5). */
async function squareMark(size, padding, background) {
  const inner = Math.round(size * (1 - padding * 2));
  const mark = await crop("mark")
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9, palette: true });
}

await mkdir("public/brand", { recursive: true });
await mkdir("public/icons", { recursive: true });

await Promise.all([
  // للواجهة: شفّافة، وبدقّة تكفي الشاشات عالية الكثافة
  crop("full").resize({ width: 720 }).webp({ quality: 82 }).toFile("public/brand/logo.webp"),
  crop("mark").resize({ height: 256 }).webp({ quality: 92 }).toFile("public/brand/mark.webp"),
  crop("wordmark").resize({ width: 640 }).webp({ quality: 92 }).toFile("public/brand/wordmark.webp"),

  // أيقونات PWA — `maskable` تحتاج منطقة آمنة (~80%) فالهامش أكبر
  squareMark(192, 0.1, WHITE).then((i) => i.toFile("public/icons/icon-192.png")),
  squareMark(512, 0.1, WHITE).then((i) => i.toFile("public/icons/icon-512.png")),
  squareMark(512, 0.2, WHITE).then((i) => i.toFile("public/icons/maskable-512.png")),

  // اصطلاحات ملفات Next.js: favicon وأيقونة Apple
  squareMark(96, 0.04, CLEAR).then((i) => i.toFile("src/app/icon.png")),
  squareMark(180, 0.12, WHITE).then((i) => i.toFile("src/app/apple-icon.png")),

  // صورة المشاركة (Open Graph)
  crop("full")
    .resize({ height: 540 })
    .toBuffer()
    .then((logo) =>
      sharp({ create: { width: 1200, height: 630, channels: 4, background: WHITE } })
        .composite([{ input: logo, gravity: "center" }])
        .png()
        .toFile("src/app/opengraph-image.png"),
    ),
]);

console.log("✓ brand assets generated");
