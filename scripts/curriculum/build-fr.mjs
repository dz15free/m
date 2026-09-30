/**
 * الفرنسية — السنتان الثالثة والخامسة، من بطاقات منشورة للعموم:
 *   5AP: «Fiches pédagogiques 5ème A.P» (ملف لكل مشروع؛ بطاقة في كل صفحة: Activité / Durée / Objectif d'apprentissage)
 *        وفق «Progression annuelle 5ème A.P» (4 مشاريع × مقطعان)؛
 *   3AP: «Fiches pédagogiques — 3ème et 4ème AP» (لكل مقطع جدول وبطاقات «Fiche : …»؛ نأخذ قسم السنة الثالثة).
 * الأسابيع تقديرية: المقاطع موزّعة بالتساوي على أسابيع التعلّم (خارج أسابيع التقويم)، والبطاقات على أسابيع مقطعها.
 *
 *   node scripts/curriculum/build-fr.mjs 5AP <out-dir> <merged.pdf> <projet1.pdf> <projet2.pdf> …
 *   node scripts/curriculum/build-fr.mjs 3AP <out-dir> <fiches_3AP_4AP.pdf>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [level, outDir, ...pdfs] = process.argv.slice(2);
const squash = (s) => s.replace(/\s+/g, " ").trim();
const pagesOf = (f) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())[1]);
const textOf = (f, n) => squash(execFileSync("pdftotext", ["-f", String(n), "-l", String(n), f, "-"]).toString());

// أسابيع التعلّم (خارج التقويم التشخيصي والفصلي)
const WEEKS = {
  "3AP": [3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 20, 21, 22, 25, 26, 27, 28, 29],
  "5AP": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31],
}[level];

const fiches = []; // { projet, projetTitle, seq, seqTitle, activity, duration, objectives, materials, page }
if (level === "5AP") {
  // الملف الأول: الدمج (لـ seed.mjs --pdf)، والبقية: ملفات المشاريع بالترتيب
  const [merged, ...files] = pdfs;
  execFileSync("pdfunite", [...files, merged]);
  let offset = 0;
  for (const f of files) {
    const n = pagesOf(f);
    for (let p = 1; p <= n; p++) {
      const t = textOf(f, p);
      const head = /Projet\s*(\d)\s*:\s*(.+?)\s*—\s*Séquence\s*(\d)\s*:\s*(.+?)\s*(?:FICHE|Tâche|Activité|Evaluation|$)/.exec(t);
      const act = /Activité\s*:\s*(.+?)\.?\s+Durée\s*:\s*([^A-Z]*?mn)/.exec(t);
      if (!head || !act) continue; // غلاف المشروع أو المقطع
      const obj = /Objectif[s]?\s*d[’']apprentissage\s*:\s*(.+?)\s*(?:Matériel|Support|Déroulement|$)/.exec(t)?.[1];
      const mat = /Matériel\s*(?:didactique)?\s*:\s*(.+?)\s*(?:Déroulement|Etapes|Étapes|Phases|Moments|$)/.exec(t)?.[1];
      const theme = /Thème\s*:\s*(.+?)\s*(?:Acte|Compétence)/.exec(t)?.[1];
      fiches.push({
        projet: Number(head[1]),
        projetTitle: head[2],
        seq: Number(head[3]),
        seqTitle: head[4].replace(/\s*(?:Tâche|Evaluation).*$/, ""),
        activity: act[1].replace(/^./, (c) => c.toUpperCase()),
        duration: squash(act[2]),
        theme,
        objectives: obj ? [obj.slice(0, 300)] : [],
        materials: mat ? mat.slice(0, 200) : "Manuel scolaire, tableau",
        page: offset + p,
      });
    }
    offset += n;
  }
} else {
  const [f] = pdfs;
  const n = pagesOf(f);
  let projet = 0, projetTitle = "", seq = 0, seqTitle = "", overview = "";
  for (let p = 1; p <= n; p++) {
    const t = textOf(f, p);
    if (/^4ème AP Projet/.test(t) || (p > 2 && /4ème AP\s+Projet 1/.test(t))) break; // قسم السنة الرابعة
    const pm = /Projet\s*(\d)\s*:\s*(.+?)\s+Tâche finale/.exec(t);
    if (pm) [projet, projetTitle] = [Number(pm[1]), pm[2]];
    const sm = /Séquence\s*(\d)\s*:\s*«\s*(.+?)\s*»/.exec(t);
    if (sm) {
      [seq, seqTitle] = [Number(sm[1]), sm[2]];
      overview = /Points de langue \(lexique, grammaire, conjugaison, orthographe\)\s*(.+?)\s*P\.\s*\d/.exec(t)?.[1] ?? "";
    }
    // «Fiche : X Niveau : 3ème AP Projet : Projet N Séquence k Objectif d'apprentissage : … Support / matériel : …»
    for (const m of t.matchAll(/Fiche\s*:\s*(.+?)\s+Niveau\s*:\s*3ème AP\s+Projet\s*:\s*Projet\s*(\d)\s+Séquence\s*(\d)\s+Objectif d'apprentissage\s*:\s*(.+?)\s+Support\s*\/\s*matériel\s*:\s*(.+?)\s+Déroulement/g)) {
      fiches.push({
        projet: Number(m[2]),
        projetTitle,
        seq: Number(m[3]),
        seqTitle,
        activity: m[1],
        duration: "",
        theme: /Points de langue/.test(m[1]) ? overview : undefined,
        objectives: [m[4]],
        materials: m[5],
        page: p,
      });
    }
  }
}

const keys = [...new Set(fiches.map((f) => `${f.projet}:${f.seq}`))];
const lessons = [];
keys.forEach((key, s) => {
  const list = fiches.filter((f) => `${f.projet}:${f.seq}` === key);
  const from = Math.floor((s * WEEKS.length) / keys.length);
  const to = Math.floor(((s + 1) * WEEKS.length) / keys.length);
  const weeks = WEEKS.slice(from, Math.max(to, from + 1));
  list.forEach((f, i) => {
    lessons.push({
      order: lessons.length + 1,
      segment: s + 1,
      unitKind: "week",
      unit: weeks[Math.min(weeks.length - 1, Math.floor((i * weeks.length) / list.length))],
      session: `${f.activity}${f.duration ? ` (${f.duration})` : ""}`,
      activity: "Français",
      domain: f.activity,
      topic: `${f.activity}${f.theme ? ` : ${f.theme}` : ""} — ${f.seqTitle}`,
      materials: f.materials,
      objectives: f.objectives,
      body: "",
      pages: [f.page],
      sample: s === 0,
    });
  });
});
const segments = Object.fromEntries(
  keys.map((key, s) => {
    const f = fiches.find((x) => `${x.projet}:${x.seq}` === key);
    return [s + 1, `Projet ${f.projet} : ${f.projetTitle} — Séquence ${f.seq} : ${f.seqTitle}`];
  }),
);
for (const l of lessons) l.segmentTitle = segments[l.segment];
const YEAR = { "3AP": "3e", "5AP": "5e" }[level];
const out = {
  id: `${level}_fr`,
  level,
  subject: "fr",
  title: `Langue française — ${YEAR} année primaire`,
  source: {
    ar: `بطاقات حصص منشورة للعموم (${level === "5AP" ? "وفق التدرّج السنوي للسنة الخامسة" : "وفق التدرّج السنوي والكتاب المدرسي"})؛ الأسابيع تقديرية`,
    fr: `Fiches pédagogiques partagées publiquement (${level === "5AP" ? "selon la progression annuelle 5e AP" : "selon la progression annuelle et le manuel"}) ; semaines estimées`,
  },
  weekMode: "absolute",
  segments,
  lessons,
};
writeFileSync(join(outDir, `${level}_fr.json`), JSON.stringify(out, null, 1));
console.log(level, "fr:", lessons.length, "séances,", keys.length, "séquences");
for (const [n, t] of Object.entries(segments)) console.log(" ", n, t, "→", [...new Set(lessons.filter((l) => l.segment === Number(n)).map((l) => l.unit))].join(","));
