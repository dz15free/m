/**
 * الفرنسية — السنة الرابعة: «Progression annuelle de la 4ème A.P (2026/2027)» + «Fiches pédagogiques — progression complète»
 * (بطاقات منشورة، إعداد Mostafa Ami). كل صفحة بطاقة حصة: Projet / Séquence / Activité / Séance k/n / Objectifs.
 * ترتيب التدرّج: تتمة برنامج السنة الثالثة (المشروع 3 المقطع 3 + المشروع 4)، ثم المشروع 1 والمقطع 1 من المشروع 2.
 * توزيع الأسابيع وفق «الملحق 2» الوزاري (Le nouveau déroulement séquentiel de la 4e A.P).
 *
 * البطاقات الكاملة لكل مشروع («fiches_4AP_Projet1_complet»، «…Projet2_complet»: بطاقة لكل نشاط مع مدتها، أهدافها،
 * مكوّن الكفاءة والسير) تحلّ محل بطاقات المقاطع نفسها في الملف الأول؛ صفحاتها «c:N» و«d:N»… بترتيب تمريرها.
 *
 *   node scripts/curriculum/build-fr-4ap.mjs <fiches.pdf> <out-dir> [projet1_complet.pdf projet2_complet.pdf …]
 *   seed.mjs 4AP_fr --pdf=<fiches.pdf> --pdf-b=<diagnostic> --pdf-c=<projet1_complet.pdf> --pdf-d=<projet2_complet.pdf>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { composanteFor } from "./fr-composantes.mjs";

const [pdf, outDir, ...complets] = process.argv.slice(2);
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

// البطاقات الكاملة: «<Activité> — Durée : N mn» ثم «4ème AP — Projet p : … — Séquence s : …» ثم جدول الحقول
const FIELD = String.raw`(?=Acte\(s\) de parole|Thème|Compétences? visée|Composante de la compétence|Compétences transversales|Valeurs mises|Objectif|Matériel didactique|Déroulement|$)`;
const field = (t, label) => squash(new RegExp(`${label}\\s*:?\\s*(.*?)\\s*${FIELD}`).exec(t)?.[1] ?? "");
const complete = [];
// أخطاء نسخ في البطاقات الأصلية (هدف بطاقة أخرى منسوخ كما هو)
const FIXES = {
  "1:3:Orthographe": { objectives: ["Reconnaître et former le pluriel des noms en « s »"] },
  "2:1:Tâche 1": { objectives: ["Amener l’apprenant à dessiner et écrire une carte de vœux", "Impliquer l’élève dans la réalisation de la tâche"] },
};
complets.forEach((file, k) => {
  const key = String.fromCharCode(99 + k); // c, d, …
  const n = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [file]).toString())[1]);
  for (let p = 1; p <= n; p++) {
    const t = squash(execFileSync("pdftotext", ["-f", String(p), "-l", String(p), file, "-"]).toString());
    const head = /^(.+?)\s+—\s+Durée\s*:\s*(\d+)\s*mn\s+4ème AP\s+—\s+Projet\s*(\d)\s*:\s*(.+?)\s+—\s+Séquence\s*(\d)\s*:\s*(.+?)\s+Acte/.exec(t);
    if (!head) continue; // غلاف أو فهرس
    const act = head[1].replace(/^Grammaire(\d)/, "Grammaire $1").replace(/\s*:$/, "");
    complete.push({
      page: `${key}:${p}`,
      projet: Number(head[3]),
      projetTitle: head[4],
      seq: Number(head[5]),
      seqTitle: head[6],
      act,
      dur: `${head[2]} mn`,
      composante: field(t, "Composante de la compétence"),
      theme: field(t, "Thème"),
      acte: field(t, "Acte\\(s\\) de parole").replace(/\s*Compétences? visée.*$/, "").replace(/\.$/, ""),
      objectives: field(t, "Objectif(?:\\(s\\)|s)?\\s*(?:d.apprentissage|à atteindre)").split(/\s+-\s*(?=[A-ZÉ])|\s*\.\s+(?=[A-ZÉ])/).map((o) => squash(o).replace(/^-\s*/, "")).filter(Boolean),
      support: field(t, "Matériel didactique"),
    });
    const f = complete.at(-1);
    Object.assign(f, FIXES[`${f.projet}:${f.seq}:${f.act}`] ?? {});
    f.composante = f.composante.replace("Dire pour d’approprier", "Dire pour s’approprier");
    f.theme = f.theme.replace("[■]", "[ɛ]");
  }
});

// الملحق (2) — «Le nouveau déroulement séquentiel de la 4e A.P» (2026/2027):
//   تتمة برنامج 3AP: المقطع = 6 ساعات (3 أسابيع بحصتين)؛ برنامج 4AP: المقطع = 8 ساعات (4 أسابيع) بهذا الترتيب:
//   أ1 تفاوض/شفوي/قراءة 1/معجم — أ2 قراءة 2/قواعد/قراءة منهجية — أ3 طلاقة/تصريف/إملاء/صوتيات — أ4 إنتاج/تقويم.
// الأسابيع من الثالث (بعد التشخيص)، خارج أسبوعي التقويم 12 و17 (كبقية مواد 4AP): 28 أسبوعًا = 56 ساعة.
const WEEKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const WEEK_OF_ACTIVITY = [
  [0, /Acte|Lecture compréhension|Lexique/],
  [1, /Grammaire|Lecture systématique/],
  [2, /Conjugaison|Orthographe|Phonétique|Dictée/],
  [3, /Production/],
];
const seqKeys = [...new Set(fiches.map((f) => `${f.projet}:${f.seq}`))];
// أسبوع كل نشاط من البطاقات الكاملة في المقطع (4 أسابيع، ترتيب الملحق 2)
const WEEK_OF_COMPLETE = [
  [0, /Présentation|Oral compréhension|Oral production 1|Compréhension de l.écrit 1|Vocabulaire/],
  [1, /Compréhension de l.écrit 2|Grammaire|Lecture systématique 1/],
  [2, /Lecture systématique 2|Conjugaison|Orthographe|Dictée/],
  [3, /Oral production 2|Préparation|Production écrite|Compte rendu|Comptine|Tâche|Evaluation/],
];
const PART = (f) => (fiches.indexOf(f) < fiches.findIndex((x) => x.projet === 1) ? "Suite du programme de la 3e A.P" : "Programme de la 4e A.P");
const lessons = [];
let cursor = 0;
seqKeys.forEach((key, s) => {
  const old = fiches.filter((f) => `${f.projet}:${f.seq}` === key);
  const len = PART(old[0]).startsWith("Suite") ? 3 : 4;
  const full = len === 4 ? complete.filter((f) => `${f.projet}:${f.seq}` === key) : [];
  if (full.length) {
    const weeks = WEEKS.slice(cursor, cursor + len);
    cursor += len;
    for (const f of full) {
      const w = WEEK_OF_COMPLETE.find(([, re]) => re.test(f.act))?.[0];
      if (w === undefined) throw new Error(`${f.page}: نشاط بلا أسبوع «${f.act}»`);
      lessons.push({
        order: lessons.length + 1,
        segment: s + 1,
        unitKind: "week",
        unit: weeks[w],
        session: `${f.act} (${f.dur})`,
        activity: "Français",
        domain: f.composante || composanteFor(f.act, "4AP") || f.act,
        // الشفهي بلا «Thème»: موضوعه فعل الكلام («Oral production 1 : Saluer / prendre congé»)
        topic: `${f.act}${f.theme ? ` : ${f.theme}` : /^Oral/.test(f.act) && f.acte ? ` : ${f.acte}` : ""} — ${old[0].seqTitle}`,
        materials: f.support || "Manuel scolaire, tableau",
        objectives: f.objectives,
        body: "",
        pages: [f.page],
        sample: s === 0,
      });
    }
    return;
  }
  const list = old;
  const weeks = WEEKS.slice(cursor, cursor + len);
  cursor += len;
  list.forEach((f, i) => {
    const byAct = len === 4 ? WEEK_OF_ACTIVITY.find(([, re]) => re.test(f.act))?.[0] : undefined;
    lessons.push({
      order: lessons.length + 1,
      segment: s + 1,
      unitKind: "week",
      unit: weeks[byAct ?? Math.min(len - 1, Math.floor((i * len) / list.length))],
      session: `Séance ${f.seance}${f.dur ? ` (${f.dur})` : ""}`,
      activity: "Français",
      domain: composanteFor(f.act, PART(f).startsWith("Suite") ? "3AP" : "4AP") || f.act,
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
