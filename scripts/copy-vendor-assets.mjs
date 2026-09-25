/**
 * ينسخ محرّكات المتصفح الثقيلة إلى public/vendor لتُخدَم من دومين المنصة نفسه
 * (بلا CDN خارجي: خصوصية، وعمل دون إنترنت بعد أول تحميل عبر Service Worker):
 * - Tesseract (OCR): العامل + النواة WASM + نماذج العربية والفرنسية
 * - pdf.js: عامل قراءة PDF
 * يعمل تلقائيًا قبل dev وbuild. الملفات الناتجة غير مرفوعة إلى git.
 */
import { copyFile, mkdir } from "node:fs/promises";

const out = "public/vendor";
const files = [
  ["node_modules/tesseract.js/dist/worker.min.js", "tesseract/worker.min.js"],
  // نواة LSTM فقط (أخفّ وأدق للعربية)، بثلاث نسخ يختار المتصفح أنسبها
  ["node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract/core/tesseract-core-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract/core/tesseract-core-simd-lstm.wasm.js"],
  ["node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js", "tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js"],
  ["node_modules/@tesseract.js-data/ara/4.0.0_best_int/ara.traineddata.gz", "tesseract/lang/ara.traineddata.gz"],
  ["node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz", "tesseract/lang/fra.traineddata.gz"],
  ["node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "pdf/pdf.worker.min.mjs"],
];

for (const [from, to] of files) {
  const dest = `${out}/${to}`;
  await mkdir(dest.slice(0, dest.lastIndexOf("/")), { recursive: true });
  await copyFile(from, dest);
}
console.log(`✓ ${files.length} vendor assets → ${out}`);
