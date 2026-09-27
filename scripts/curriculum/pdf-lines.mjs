/* يستخرج أسطر صفحات PDF بمحرّكنا (pdf.js المعدَّل + ActualText + تصحيح «لإ») — للتحليل والاستخراج.
   node scripts/curriculum/pdf-lines.mjs file.pdf 10 12  */
import { getDocument, GlobalWorkerOptions } from "../../node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* عامل خاص بالاستخراج: فوق تعديل ActualText، نعكس نص الرسم المركّب العربي («لا»، «لم»، «لإ»)
   قبل أن يقلب pdf.js السطر كاملًا (RTL)، فيعود ترتيبه صحيحًا («المقطع» لا «املقطع»).
   ملفات Word الوزارية تحتاجه؛ لا نطبّقه في التطبيق حتى لا نمسّ ما يعمل. */
const base = readFileSync(new URL("../../public/vendor/pdf/pdf.worker.min.mjs", import.meta.url), "utf8");
const lig = base.replace(
  /(\w+)\|\|(\w+)\.str\.push\((\w+)\);/,
  (_, m, d, g) => `${m}||${d}.str.push(${g}.length>1&&/[؀-ۿ]/.test(${g})?[...${g}].reverse().join(""):${g});`,
);
if (lig === base) throw new Error("ligature patch did not apply");
const workerPath = join(tmpdir(), "pdf.worker.curriculum.mjs");
writeFileSync(workerPath, lig);
GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

export async function openPdf(file) {
  return getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0 }).promise;
}

/** قطع الصفحة: { text, x0, x1, y0, y1 } (y من الأعلى) مع احترام ActualText. */
export async function pagePieces(doc, n) {
  const page = await doc.getPage(n);
  const { height } = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent({ includeMarkedContent: true });
  const out = [];
  const spans = [];
  for (const it of tc.items) {
    if (it.type) {
      if (it.type === "endMarkedContent") {
        const s = spans.pop();
        if (s?.text && s.box) out.push({ text: s.text, ...s.box });
      } else spans.push({ text: it.actualText?.trim() ? it.actualText : null, box: null });
      continue;
    }
    if (!it.str.trim()) continue;
    const [, , , sy, x, y] = it.transform;
    const h = Math.abs(sy) || it.height || 10;
    const box = { x0: x, x1: x + it.width, y0: height - y - h, y1: height - y };
    const owner = [...spans].reverse().find((s) => s.text !== null);
    if (owner) {
      owner.box = owner.box ? { x0: Math.min(owner.box.x0, box.x0), x1: Math.max(owner.box.x1, box.x1), y0: Math.min(owner.box.y0, box.y0), y1: Math.max(owner.box.y1, box.y1) } : box;
      continue;
    }
    out.push({ text: it.str.replace(/ا([إأآ])ل/g, "ال$1"), ...box });
  }
  return out;
}

/** تجميع بسيط في أسطر (من الأعلى) وترتيب من اليمين. */
export function toLines(pieces) {
  const sorted = [...pieces].sort((a, b) => a.y0 + a.y1 - b.y0 - b.y1);
  const lines = [];
  for (const p of sorted) {
    const h = p.y1 - p.y0;
    const l = lines.find((l) => Math.min(l.y1, p.y1) - Math.max(l.y0, p.y0) > 0.5 * Math.min(h, l.y1 - l.y0));
    if (l) { l.items.push(p); l.y0 = Math.min(l.y0, p.y0); l.y1 = Math.max(l.y1, p.y1); } else lines.push({ y0: p.y0, y1: p.y1, items: [p] });
  }
  return lines.sort((a, b) => a.y0 - b.y0).map((l) => {
    const items = l.items.sort((a, b) => b.x1 - a.x1);
    let s = "";
    let prev = null;
    for (const it of items) {
      const gap = prev ? prev.x0 - it.x1 : 0;
      s += prev ? (gap > 0.15 * (it.y1 - it.y0) ? " " : "") + it.text : it.text;
      prev = it;
    }
    return { y: l.y0, x0: Math.min(...l.items.map((i) => i.x0)), x1: Math.max(...l.items.map((i) => i.x1)), text: s.replace(/\s+/g, " ").trim(), items };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, from, to] = process.argv.slice(2);
  const doc = await openPdf(file);
  for (let n = Number(from); n <= Number(to ?? from); n++) {
    console.log(`===== page ${n}`);
    for (const l of toLines(await pagePieces(doc, n))) console.log(l.text);
  }
}
