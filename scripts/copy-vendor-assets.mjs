/**
 * ينسخ محرّكات المتصفح الثقيلة إلى public/vendor لتُخدَم من دومين المنصة نفسه
 * (بلا CDN خارجي: خصوصية، وعمل دون إنترنت بعد أول تحميل عبر Service Worker):
 * - Tesseract (OCR): العامل + النواة WASM + نماذج العربية والفرنسية
 * - pdf.js: عامل قراءة PDF
 * يعمل تلقائيًا قبل dev وbuild. الملفات الناتجة غير مرفوعة إلى git.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";

const out = "public/vendor";
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "tesseract/worker.min.js"],
  // نواة LSTM فقط (أخفّ وأدق للعربية)، بثلاث نسخ يختار المتصفح أنسبها
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract/core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract/core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/ara/4.0.0_best_int/ara.traineddata.gz", "tesseract/lang/ara.traineddata.gz"],
  ["node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz", "tesseract/lang/fra.traineddata.gz"],
];

for (const [from, to] of files) {
  const dest = `${out}/${to}`;
  await mkdir(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  await copyFile(from, dest);
}
/* عامل pdf.js مع تعديل صغير: تمرير ActualText للمقاطع المعلَّمة إلى استخراج النص.
   Chrome (Skia) يطبع العربية بخطوط Type3 خرائطها (ToUnicode) خاطئة، ويضع الحرف الصحيح
   لكل رسم في /ActualText — pdf.js يتجاهله فتخرج الأسماء مشوّهة. نفشل البناء إن لم يُطبَّق التعديل
   (تغيّر pdf.js) بدل شحن عامل يعيد المشكلة بصمت. */
const worker = await readFile("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", "utf8");
const pattern = /(const (\w+)=(\w+)\[1\]instanceof Dict\?\3\[1\]\.get\("MCID"\):null;\w+\.items\.push\(\{type:"beginMarkedContentProps",id:.{0,160}?,tag:\3\[0\]instanceof Name\?\3\[0\]\.name:null)\}\)/;
if (!pattern.test(worker) || !worker.includes("function stringToPDFString(")) {
  throw new Error("pdf.js worker patch (ActualText) no longer applies — update scripts/copy-vendor-assets.mjs");
}
const patched = worker.replace(
  pattern,
  (_, head, _id, args) =>
    `${head},actualText:(()=>{const a=${args}[1]instanceof Dict?${args}[1].get("ActualText"):null;return typeof a==="string"?stringToPDFString(a):null})()})`,
);
await mkdir(`${out}/pdf`, { recursive: true });
await writeFile(`${out}/pdf/pdf.worker.min.mjs`, patched);

console.log(`✓ ${files.length + 1} vendor assets → ${out} (pdf.js worker patched for ActualText)`);
