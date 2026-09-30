/**
 * الفرنسية — السنة الرابعة: «Progression annuelle de la 4ème A.P (2026/2027)» + «Fiches pédagogiques — progression complète»
 * (بطاقات منشورة، إعداد Mostafa Ami). كل صفحة بطاقة حصة: Projet / Séquence / Activité / Séance k/n / Objectifs.
 * ترتيب التدرّج: تتمة برنامج السنة الثالثة (المشروع 3 المقطع 3 + المشروع 4)، ثم المشروع 1 والمقطع 1 من المشروع 2.
 * المقطع = 6 ساعات (3 أسابيع بحصتين)، بعد أسبوعي التقويم التشخيصي، وخارج أسبوعي التقويم 12 و17 (كبقية مواد 4AP).
 *
 *   node scripts/curriculum/build-fr-4ap.mjs <fiches.pdf> <out-dir>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const [pdf, outDir] = process.argv.slice(2);
const nPages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);
const squash = (s) => s.replace(/\s+/g, " ").trim();
const SUPPORT = /^(Manuel|M\.S|Étiquettes|Etiquettes|Calendrier|Cartes|Images|Tableau|Plan|Ardoise|CD|Texte|Affiche|Cahier|Enregistrement|Photos|Fiches?|Dessins|Objets|Livre|Comptine|Support|Imagier|Abécédaire|Feuilles?|Papier|Crayons?|Dictionnaire|Chanson|Gravures?|Vidéo|Matériel)/i;

const fiches = [];
for (let n = 2; n <= nPages; n++) {
  const t = squash(execFileSync("pdftotext", ["-f", String(n), "-l", String(n), pdf, "-"]).toString());
  const projet = /Projet\s*(\d)\s*:\s*(.+?[!?])\s/.exec(t);
  const seq = /Séquence\s*(\d)\s*:\s*(.+?)\s*(?=«|Activité|Enseignant|Établissement|Niveau|Durée|Projet|$)/.exec(t);
  const act = /Activité\s*:\s*(Actes? de parole|Oral production|Points de langue|Phonie \/ Graphie|Activités de lecture|Comptine|Dictée|Lecture compréhension \/ fluence|Lexique|Grammaire|Conjugaison|Orthographe|Lecture systématique|Phonétique articulatoire|Production orale \/ écrite)/.exec(t)?.[1];
  const dur = /Durée\s*:\s*(\d+\s*min)/.exec(t)?.[1] ?? "";
  const seance = /Séance\s*(\d+)\s*\/\s*(\d+)/.exec(t);
  const block = /Objectifs\s+Support\s*\/\s*Matériel\s+(.*?)\s+Étapes/.exec(t)?.[1] ?? "";
  const bullets = block.split("•").map(squash).filter(Boolean);
  const objectives = bullets.filter((b) => !SUPPORT.test(b));
  const support = bullets.filter((b) => SUPPORT.test(b));
  if (!projet || !seq || !act) throw new Error(`page ${n}: en-tête illisible`);
  fiches.push({ page: n, projet: Number(projet[1]), projetTitle: projet[2], seq: Number(seq[1]), seqTitle: seq[2], act, dur, seance: seance ? `${seance[1]}/${seance[2]}` : "", objectives, support });
}

// ترتيب المقاطع كما في الملف (= التدرّج) وأسابيعها
const WEEKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
const seqKeys = [...new Set(fiches.map((f) => `${f.projet}:${f.seq}`))];
const PART = (f) => (fiches.indexOf(f) < fiches.findIndex((x) => x.projet === 1) ? "Suite du programme de la 3e A.P" : "Programme de la 4e A.P");
const lessons = [];
seqKeys.forEach((key, s) => {
  const list = fiches.filter((f) => `${f.projet}:${f.seq}` === key);
  const weeks = WEEKS.slice(s * 3, s * 3 + 3);
  list.forEach((f, i) => {
    lessons.push({
      order: lessons.length + 1,
      segment: s + 1,
      unitKind: "week",
      unit: weeks[Math.min(2, Math.floor((i * 3) / list.length))],
      session: `Séance ${f.seance}${f.dur ? ` (${f.dur})` : ""}`,
      activity: "Français",
      domain: f.act,
      topic: `${f.act} — ${f.seqTitle}`,
      materials: f.support.join(" ; ") || "Manuel scolaire, tableau",
      objectives: f.objectives,
      body: "",
      pages: [f.page],
      sample: s === 0,
    });
  });
});
const segments = Object.fromEntries(
  seqKeys.map((key, s) => {
    const f = fiches.find((x) => `${x.projet}:${x.seq}` === key);
    return [s + 1, `Projet ${f.projet} : ${f.projetTitle} — Séquence ${f.seq} : ${f.seqTitle} (${PART(f)})`];
  }),
);
for (const l of lessons) l.segmentTitle = segments[l.segment];
const out = {
  id: "4AP_fr",
  level: "4AP",
  subject: "fr",
  title: "Langue française — 4e année primaire",
  source: {
    ar: "التدرّج السنوي للغة الفرنسية — السنة الرابعة (2026/2027) وبطاقات حصص منشورة (إعداد Mostafa Ami)",
    fr: "Progression annuelle 4e AP (2026/2027) et fiches pédagogiques partagées (Mostafa Ami)",
  },
  weekMode: "absolute",
  segments,
  lessons,
};
writeFileSync(join(outDir, "4AP_fr.json"), JSON.stringify(out, null, 1));
console.log("fr", lessons.length, "séances,", seqKeys.length, "séquences");
for (const [n, t] of Object.entries(segments)) console.log(n, t, lessons.filter((l) => l.segment === Number(n)).map((l) => l.unit).join(","));
