/**
 * التعرّف الضوئي على رأس كل صفحة (للوثائق ذات الخطوط المعطوبة الترميز): يُصيَّر الشريط العلوي
 * من الصفحة ثم يُقرأ بـ tesseract (العربية). المخرجات JSON: [{ n, text }].
 *
 *   node scripts/curriculum/ocr-headers.mjs <pdf> <out.json> [fraction=0.22]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWorker } from "tesseract.js";

const [pdf, out, frac = "0.22"] = process.argv.slice(2);
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);
const dir = mkdtempSync(join(tmpdir(), "ocrh-"));
const done = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : [];
const worker = await createWorker("ara", 1, { langPath: new URL("../../public/vendor/tesseract/lang", import.meta.url).pathname, gzip: true, cachePath: dir });
for (let n = done.length + 1; n <= pages; n++) {
  const base = join(dir, `p${n}`);
  // -H/-W: أعلى الصفحة فقط (بالبكسل بعد تحديد الدقة)
  execFileSync("pdftoppm", ["-f", String(n), "-l", String(n), "-r", "150", "-gray", "-png", "-singlefile", "-y", "0", "-H", String(Math.round(1754 * Number(frac))), "-W", "1240", pdf, base]);
  const { data } = await worker.recognize(`${base}.png`);
  done.push({ n, text: data.text.replace(/\s+/g, " ").trim() });
  if (n % 10 === 0) {
    writeFileSync(out, JSON.stringify(done));
    console.log(n);
  }
}
writeFileSync(out, JSON.stringify(done));
await worker.terminate();
console.log("done", done.length);
