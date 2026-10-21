/**
 * معاينة المذكرات المُنسّقة (content/memos/<id>.json) بقالب المنصة: نفس مكوّن MemoSheet، مطبوعًا PDF بـ Chromium.
 * الأشكال تُقتطع من ملفات المصدر المحلية (pdftoppm)؛ في المنصة يقتطعها النشر من Drive.
 *
 *   node scripts/curriculum/memo-preview.mjs <curriculumId> <out.pdf> --src <dir of source PDFs named by Drive id> [--only b:12,b:30] [--png <prefix>]
 *   مصدر من الويب («w»): --files <a.pdf,b.pdf> (الملفات المحلية بترتيبها) بدل --src
 *   ملف مذكرات آخر (جزء من منهاج Drive): --memos <path>
 *   جزء قيد الإعداد: --part <k> يقرأ scripts/curriculum/middle/parts/<id>.<k>.json وcontent/memos/parts/<id>.<k>.json
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = new URL("../../", import.meta.url);
const [, , id, out, ...rest] = process.argv;
const opt = (k) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : undefined);
if (!id || !out) throw new Error("usage: memo-preview.mjs <curriculumId> <out.pdf> --src <dir>");
const srcDir = opt("--src");
const only = opt("--only")?.split(",");

const part = opt("--part");
const pageCount = (f) => Number(execFileSync("pdfinfo", [f]).toString().match(/Pages:\s+(\d+)/)[1]);
let cur, memos;
if (part) {
  // منهاج مؤقت من جزء المواصفة: صفحات «w» بإزاحات الملفات
  const spec = JSON.parse(readFileSync(new URL(`scripts/curriculum/middle/parts/${id}.${part}.json`, ROOT), "utf8"));
  const offs = [];
  let acc = 0;
  for (const f of opt("--files").split(",")) {
    offs.push(acc);
    acc += pageCount(f);
  }
  const [level, subject] = id.split("_");
  cur = { level, subject, lessons: spec.lessons.map((l, i) => ({ ...l, unit: i + 1, pages: l.pages.map((p) => `w:${offs[l.file ?? 0] + p}`) })) };
  memos = JSON.parse(readFileSync(new URL(`content/memos/parts/${id}.${part}.json`, ROOT), "utf8"));
} else {
  cur = JSON.parse(readFileSync(new URL(`content/curriculum/${id}.json`, ROOT), "utf8"));
  memos = JSON.parse(readFileSync(opt("--memos") ?? new URL(`content/memos/${id}.json`, ROOT), "utf8"));
}
// داخل المستودع ليجد react من node_modules (الحزمة تتركه خارجها)
mkdirSync(new URL("node_modules/.cache/", ROOT), { recursive: true });
const work = mkdtempSync(new URL("node_modules/.cache/memo-", ROOT).pathname);

// إزاحات الصفحات في المصدر (ملفاته موصولة بترتيبها)
const files = opt("--files")?.split(",") ?? (cur.sources?.b?.pdf ?? []).map((f) => join(srcDir ?? ".", f));
const counts = files.map((f) => (existsSync(f) ? pageCount(f) : 0));
function locate(ref) {
  let n = Number(ref.split(":")[1]);
  for (let i = 0; i < files.length; i++) {
    if (n <= counts[i]) return [files[i], n];
    n -= counts[i];
  }
  throw new Error(`page ${ref} out of range`);
}
const figs = {};
let k = 0;
function figSrc(ref, [x, y, w, h]) {
  const key = `${ref} ${x} ${y} ${w} ${h}`;
  if (figs[key]) return figs[key];
  const [file, n] = locate(ref);
  const base = join(work, `fig${k++}`);
  const dpi = 150;
  // حجم الصفحة بالنقاط ← بكسلات
  const info = execFileSync("pdfinfo", ["-f", String(n), "-l", String(n), file]).toString();
  const [, pw, ph] = info.match(/Page\s+\d+\s+size:\s+([\d.]+)\s+x\s+([\d.]+)/);
  const W = (Number(pw) / 72) * dpi;
  const H = (Number(ph) / 72) * dpi;
  execFileSync("pdftoppm", ["-r", String(dpi), "-f", String(n), "-l", String(n), "-singlefile", "-jpeg", "-x", String(Math.round(x * W)), "-y", String(Math.round(y * H)), "-W", String(Math.round(w * W)), "-H", String(Math.round(h * H)), file, base]);
  return (figs[key] = pathToFileURL(`${base}.jpg`).href);
}

// الحزمة: MemoSheet مُصيَّرًا نصًا ثابتًا
const entry = join(work, "entry.tsx");
writeFileSync(
  entry,
  `import { renderToStaticMarkup } from "react-dom/server";
   import { MemoSheet } from ${JSON.stringify(new URL("src/features/lessons/memo-sheet.tsx", ROOT).pathname)};
   export const render = (props) => renderToStaticMarkup(<MemoSheet {...props} />);`,
);
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outdir: work, jsx: "automatic", loader: { ".module.css": "local-css" }, packages: "external", logLevel: "error" });
const { render } = await import(pathToFileURL(join(work, "entry.js")).href);
const css = readFileSync(join(work, "entry.css"), "utf8");

const SUBJ = { ar: "لغة عربية", fr: "Français", en: "English", math: "رياضيات", science: "علوم الطبيعة والحياة", physics: "علوم فيزيائية", islamic: "تربية إسلامية", civic: "تربية مدنية", histgeo: "تاريخ وجغرافيا", informatics: "إعلام آلي", music: "تربية موسيقية", art: "تربية تشكيلية" };
const lang = cur.subject === "fr" ? "fr" : cur.subject === "en" ? "en" : "ar";
const level = cur.level.replace("AM", lang === "ar" ? " متوسط" : "AM");
const sheets = [];
const seen = new Map();
for (const l of cur.lessons) {
  // مثل memoKeys: الدرس الثاني الذي يبدأ في الصفحة نفسها مفتاحه «b:12~2»
  const first = String(l.pages?.[0] ?? "");
  const n = (seen.get(first) ?? 0) + 1;
  seen.set(first, n);
  const key = n === 1 ? first : `${first}~${n}`;
  const memo = memos[key];
  if (!memo || (only && !only.includes(key))) continue;
  const meta = lang === "ar" ? `المقطع ${l.segment} · الأسبوع ${l.unit}` : lang === "fr" ? `Projet/Séq. ${l.segment} · Semaine ${l.unit}` : `Sequence ${l.segment} · Week ${l.unit}`;
  const html = render({ memo, lang, title: l.topic, tag: `${SUBJ[cur.subject]} · ${level}`, meta, figSrc, assets: { logo: pathToFileURL(new URL("public/brand/logo-360.webp", ROOT).pathname).href, mark: pathToFileURL(new URL("public/brand/mark-128.webp", ROOT).pathname).href } });
  sheets.push(`<section class="pg">${html}</section>`);
}
if (!sheets.length) throw new Error("no memos to preview");
const font = (p) => `<link rel="stylesheet" href="${pathToFileURL(new URL(`node_modules/${p}`, ROOT).pathname).href}">`;
const page = `<!doctype html><html><head><meta charset="utf-8">
${font("@fontsource/ibm-plex-sans-arabic/400.css")}${font("@fontsource/ibm-plex-sans-arabic/600.css")}${font("@fontsource/ibm-plex-sans-arabic/700.css")}${font("@fontsource-variable/alexandria/index.css")}
<style>:root{--font-sans:"IBM Plex Sans Arabic",sans-serif;--font-display:"Alexandria Variable","IBM Plex Sans Arabic",sans-serif}
@page{size:A4;margin:9mm 10mm}body{margin:0}.pg{break-after:page}.pg:last-child{break-after:auto}
${css}</style></head><body>${sheets.join("")}</body></html>`;
const htmlPath = join(work, "preview.html");
writeFileSync(htmlPath, page);

const { chromium } = await import(process.env.PW_CORE ?? "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await p.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: out, printBackground: true, preferCSSPageSize: true });
const png = opt("--png");
if (png) {
  await p.emulateMedia({ media: "print" });
  await p.screenshot({ path: `${png}.png`, fullPage: true });
}
await browser.close();
console.log(`${sheets.length} مذكرة → ${out}`);
