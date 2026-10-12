/**
 * يضمّن أشكال مذكرات مصدرها الويب (ليس في Drive فلا يقتطعها النشر): كل «[[fig w:N x y w h]]» في content/memos/<id>.json
 * يُقتطع من الملفات المحلية (موصولة بترتيبها) صورةَ JPEG ويصير «[[img k]]» مع الصورة في memo.imgs. إعادة التشغيل آمنة.
 *
 *   node scripts/curriculum/memo-embed.mjs <curriculumId> --files <a.pdf,b.pdf>
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , id, ...rest] = process.argv;
const files = rest.includes("--files") ? rest[rest.indexOf("--files") + 1].split(",") : [];
if (!id || !files.length) throw new Error("usage: memo-embed.mjs <curriculumId> --files <a.pdf,b.pdf>");
const path = new URL(`../../content/memos/${id}.json`, import.meta.url);
const memos = JSON.parse(readFileSync(path, "utf8"));
const counts = files.map((f) => Number(execFileSync("pdfinfo", [f]).toString().match(/Pages:\s+(\d+)/)[1]));
const work = mkdtempSync(join(tmpdir(), "embed-"));

function locate(ref) {
  let n = Number(ref.split(":")[1]);
  for (let i = 0; i < files.length; i++) {
    if (n <= counts[i]) return [files[i], n];
    n -= counts[i];
  }
  throw new Error(`page ${ref} out of range`);
}

function crop(ref, [x, y, w, h]) {
  const [file, n] = locate(ref);
  const info = execFileSync("pdfinfo", ["-f", String(n), "-l", String(n), file]).toString();
  const [, pw, ph] = info.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/);
  // 150 نقطة في البوصة، وعرض 900px على الأكثر
  const dpi = Math.min(150, 900 / ((w * Number(pw)) / 72));
  const W = (Number(pw) / 72) * dpi;
  const H = (Number(ph) / 72) * dpi;
  const out = join(work, "f");
  execFileSync("pdftoppm", ["-r", String(dpi), "-f", String(n), "-l", String(n), "-singlefile", "-jpeg", "-jpegopt", "quality=75", "-x", String(Math.round(x * W)), "-y", String(Math.round(y * H)), "-W", String(Math.round(w * W)), "-H", String(Math.round(h * H)), file, out]);
  return readFileSync(`${out}.jpg`).toString("base64");
}

const FIG = /\[\[fig\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\]\]/g;
let total = 0;
for (const memo of Object.values(memos)) {
  const imgs = memo.imgs ?? [];
  const swap = (s) =>
    s?.replace(FIG, (_, ref, x, y, w, h) => {
      imgs.push(crop(ref, [x, y, w, h].map(Number)));
      total++;
      return `[[img ${imgs.length - 1}]]`;
    });
  memo.pre = swap(memo.pre);
  memo.rows = memo.rows.map((r) => r.map((c) => swap(c)));
  memo.after = swap(memo.after);
  for (const k of ["pre", "after"]) if (memo[k] === undefined) delete memo[k];
  if (imgs.length) memo.imgs = imgs;
}
writeFileSync(path, JSON.stringify(memos, null, 1) + "\n");
rmSync(work, { recursive: true, force: true });
console.log(`${id}: ${total} شكلًا ضُمّن`);
