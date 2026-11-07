/**
 * نماذج مذكرات لكاتب المذكرات بالذكاء الاصطناعي: مذكرة أستاذ مُنسّقة واحدة لكل مادة (وأخرى للمرحلة عند الحاجة)،
 * بلا أشكال ولا صور، ومختصرة الحجم؛ تُعطى للنموذج مثالًا على الأسلوب والبنية. تُكتب في
 * src/features/ai-memo/examples.gen.json — يُعاد تشغيله بعد تغيير content/memos.
 *
 *   node scripts/curriculum/ai-examples.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const DIR = new URL("../../content/memos/", import.meta.url);
const OUT = new URL("../../src/features/ai-memo/examples.gen.json", import.meta.url);
const MAX = 5000; // أقصى طول للمثال (حروف JSON)

const clean = (s) =>
  (s ?? "")
    .replace(/\[\[(?:fig|img)[^\]]*\]\]\n?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** المرشّح: مذكرة بلا صور، مقبولة الطول، وأغنى ما يكون (عدد الصفوف). */
function pick(memos) {
  const ok = Object.values(memos)
    .filter((m) => !m.imgs && !JSON.stringify(m).includes("[[fig"))
    .map((m) => ({ head: m.head, pre: clean(m.pre), cols: m.cols, rows: m.rows.map((r) => r.map(clean)), after: clean(m.after) }))
    .filter((m) => m.rows.length >= 3)
    .map((m) => ({ m, n: JSON.stringify(m).length }))
    .filter(({ n }) => n >= 1500 && n <= MAX);
  ok.sort((a, b) => b.m.rows.length - a.m.rows.length || b.n - a.n);
  return ok[0]?.m ?? null;
}

const out = {};
for (const f of readdirSync(DIR).filter((f) => /^[\w]+\.json$/.test(f)).sort()) {
  const id = f.slice(0, -5); // 2AM_math
  const [level, subject] = id.split("_");
  const stage = level.endsWith("AM") ? "middle" : "primary";
  const key = `${stage}:${subject}`;
  if (out[key]) continue;
  const m = pick(JSON.parse(readFileSync(new URL(f, DIR), "utf8")));
  if (m) out[key] = { from: id, memo: m };
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(Object.entries(out).map(([k, v]) => `${k} ← ${v.from}`).join("\n"));
