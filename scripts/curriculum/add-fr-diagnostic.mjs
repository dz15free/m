/**
 * يضيف بطاقات «التقويم التشخيصي» (إعداد REZAK Djillali Abdelkrim، منشورة للعموم) إلى منهاج الفرنسية
 * في الأسبوعين 1 و2، مقطعًا «0». تُشغَّل بعد build-fr.mjs / build-fr-4ap.mjs، وصفحاتها «b:N» تُنشر بـ:
 *   seed.mjs <level>_fr --pdf=<fiches> --pdf-b=<diagnostic.pdf>
 * (ملف الخامسة Word؛ يُحوَّل PDF أولًا — مثلًا بـ mammoth ثم الطباعة من المتصفح.)
 *
 *   node scripts/curriculum/add-fr-diagnostic.mjs <4AP|5AP> <diagnostic.pdf>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { composanteFor, composanteIn } from "./fr-composantes.mjs";

const [level, pdf] = process.argv.slice(2);
const file = new URL(`../../content/curriculum/${level}_fr.json`, import.meta.url);
const data = JSON.parse(readFileSync(file, "utf8"));
const squash = (s) => s.replace(/\s+/g, " ").trim();
const n = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);

const fiches = [];
for (let p = 1; p <= n; p++) {
  const t = squash(execFileSync("pdftotext", ["-f", String(p), "-l", String(p), pdf, "-"]).toString());
  for (const m of t.matchAll(/Activité\s*:\s*(.+?)\s+Niveau\s*:.*?Thème\s*:\s*(.+?)\s+Durée\s*:\s*(\d+\s*mn|\d+\s*min)\s*(.*?)(?=Activité\s*:|$)/g)) {
    const rest = m[4];
    const theme = squash(m[2] + " " + (/^(.*?)\s*Matériel/.exec(rest)?.[1] ?? "")); // الموضوع قد ينقسم حول «Durée»
    fiches.push({
      page: p,
      activity: squash(m[1]),
      theme,
      duration: squash(m[3]),
      materials: squash(/Matériel didactique\s*:\s*(.+?)\s*Compétence/.exec(rest)?.[1] ?? "Tableau, ardoise"),
      composante: composanteIn(rest),
      objective: squash(/Objectif d[’']apprentissage\s*:\s*(.+?)\s*Déroulement/.exec(rest)?.[1] ?? ""),
    });
  }
}
if (!fiches.length) throw new Error("aucune fiche trouvée");
fiches.forEach((f, i) => {
  const next = fiches[i + 1]?.page ?? n + 1;
  f.pages = Array.from({ length: Math.max(1, next - f.page) }, (_, k) => `b:${f.page + k}`);
});

const title = "Évaluation diagnostique";
const diag = fiches.map((f, i) => ({
  segment: 0,
  segmentTitle: `${title} (fiches : REZAK Djillali Abdelkrim)`,
  unitKind: "week",
  unit: i < Math.ceil(fiches.length / 2) ? 1 : 2,
  session: `${f.activity} (${f.duration})`,
  activity: "Français",
  domain: f.composante || composanteFor(f.activity, level) || f.activity,
  topic: `${f.activity} : ${f.theme} — ${title}`,
  materials: f.materials,
  objectives: f.objective ? [f.objective] : [],
  body: "",
  pages: f.pages,
  sample: true,
}));
const rest = data.lessons.filter((l) => l.segment !== 0);
data.lessons = [...diag, ...rest].map((l, i) => ({ ...l, order: i + 1 }));
data.segments = { 0: `${title}`, ...Object.fromEntries(Object.entries(data.segments).filter(([k]) => k !== "0")) };
writeFileSync(file, JSON.stringify(data, null, 1));
console.log(level, "diagnostic:", diag.length, "fiches —", diag.map((d) => `${d.unit}:${d.domain}`).join(" | "));
