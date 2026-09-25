/**
 * إعداد الخطط ومدة التجربة (مرة واحدة، ثم تُعدَّل من لوحة الأدمن لاحقًا):
 *   plans/free     — الخطة المجانية (حد الأقسام)
 *   plans/premium  — Premium (السعر والمدة يُمرَّران هنا، لا يُكتبان في الكود)
 *   config/app     — مدة التجربة والخطة التي تُجرَّب
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-billing.mjs \
 *     --trial-days=7 --premium-price=<السعر بالدينار> --premium-days=365
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/seed-billing.mjs --premium-price=1000
 *
 * بدون --premium-price تُنشأ خطة Premium غير مفعّلة للبيع (التجربة تعمل).
 */
import { putDoc } from "./lib/firestore.mjs";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
const num = (name, fallback) => {
  const v = Number(arg(name, fallback));
  if (!Number.isFinite(v) || v < 0) throw new Error(`--${name} must be a number`);
  return v;
};

const price = arg("premium-price", null);
const features = ["content.premium", "docs.advanced", "stats.advanced", "export.excel"];

await putDoc("plans/free", {
  name: { ar: "مجاني", fr: "Gratuit" },
  description: { ar: "كل أدوات القسم اليومية، مجانًا للأبد.", fr: "Tous les outils du quotidien, gratuits pour toujours." },
  priceDzd: 0,
  durationDays: 0,
  limits: { maxClasses: num("free-classes", 2) },
  features: [],
  contentAccess: "free",
  trialEligible: false,
  active: true,
  order: 0,
});
console.log("✓ plans/free");

await putDoc("plans/premium", {
  name: { ar: "Premium", fr: "Premium" },
  description: {
    ar: "أقسام أكثر، ومحتوى المكتبة كاملًا، وكل الميزات المتقدمة.",
    fr: "Plus de classes, toute la bibliothèque et toutes les fonctions avancées.",
  },
  priceDzd: price === null ? 0 : num("premium-price"),
  durationDays: num("premium-days", 365),
  limits: { maxClasses: num("premium-classes", 30) },
  features,
  contentAccess: "premium",
  trialEligible: true,
  active: price !== null,
  order: 1,
});
console.log(`✓ plans/premium${price === null ? " (غير مفعّلة للبيع: مرّر --premium-price)" : ""}`);

await putDoc("config/app", { trialDays: num("trial-days", 7), trialPlanId: "premium" });
console.log("✓ config/app");
