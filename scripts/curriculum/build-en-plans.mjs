/**
 * الإنجليزية (3AP، 4AP، 5AP) من مذكرات الحصص (Lesson Plans) في مجلد English على درايف — لا من المخطط السنوي:
 *   3PS: «My first English class» + «3PS_SequenceN_…_Lesson_Plans.docx» (6 مقاطع)؛
 *   4PS: «4PS_SequenceN_…_Lesson_Plans.docx» (5 مقاطع، التقويم التشخيصي في أول المقطع 1)؛
 *   5PS: «English_5PS_Lesson_Plans_2026-2027.docx» (التشخيص + 5 مقاطع × قسمان).
 * لكل حصة: الميدان، الهدف، البنى، المعجم، الوسائل، والسير مرحلة مرحلة (نصًّا).
 * الأسابيع تقديرية: حصتان أسبوعيًا، كل فصل من أول أسبوع فيه، وأسبوع «Pause» (تقويم ومعالجة) في آخره.
 *
 *   node scripts/curriculum/build-en-plans.mjs <docx-dir> <out-dir>
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { docxLines } from "./docx-lines.mjs";

const [dir, outDir] = process.argv.slice(2);
const TERM_STARTS = [2, 16, 24];
const PER_WEEK = 2;
const squash = (s) => s.replace(/\s+/g, " ").trim();
const clean = (s) => squash(s.replace(/\s*¶\s*/g, " / "));

// ── 3PS / 4PS: رأس الحصة «Teacher: … Session: n Page: … / Domain … / Learning objectives …» ثم جدول المراحل ──
function parseSessionPlans(lines, seqN) {
  const lessons = [];
  let cur = null;
  for (const raw of lines) {
    const line = squash(raw);
    if (/Session:/.test(line) && /Learning objectives/.test(line)) {
      const get = (re) => clean(re.exec(line)?.[1] ?? "").replace(/^\/$/, "");
      const seq = get(/Sequence:?\s*\(([^)]*)\)/);
      cur = {
        seqTitle: squash(seq.replace(/^\d+\s*[–-]\s*/, "").replace(/\s*[–-]?\s*page.*$/i, "")),
        session: get(/Session:\s*([\d/]+)/),
        page: get(/(?:Book page|Page):\s*(\d+)/),
        domain: get(/Domain:\s*(.+?)\s*[¶/]\s*Learning objectives/).replace(/\s*-\s*Both$/, ""),
        objective: get(/Learning objectives:\s*(.+?)\s*¶\s*Target Structures/) || get(/Learning objectives:\s*(.+?)\s*¶\s*Lexis/),
        structures: get(/Target Structures:\s*(.*?)\s*¶\s*Lexis:/),
        lexis: get(/Lexis:\s*(.*?)\s*¶\s*Materials:/),
        materials: get(/Materials:\s*(.*?)\s*(?:¶|$)/),
        steps: [],
        seqN,
      };
      lessons.push(cur);
    } else if (cur && line.includes(" | ") && !/^Time \| Stage/.test(line)) {
      const [time, stage, proc, inter] = raw.split(" | ").map(squash);
      if (proc) cur.steps.push({ stage: stage.replace(/:$/, ""), time, proc, inter });
    }
  }
  return lessons;
}

// ── 5PS: «Lesson n: Type - Title» ثم جدول المفاتيح ثم جدول المراحل ──
function parse5PS(lines) {
  const lessons = [];
  let seqN = 0;
  let seqTitle = "Back to School — Diagnostic Assessment";
  let section = "";
  let cur = null;
  for (const raw of lines) {
    const line = squash(raw);
    let m;
    if ((m = /^Sequence (\d+) - (.+)$/.exec(line))) [seqN, seqTitle] = [Number(m[1]), m[2]];
    else if (/^Section /.test(line)) section = line.replace(/\s*\(book.*$/, "");
    else if ((m = /^Lesson (\d+): (.+?) - (.+)$/.exec(line))) {
      cur = { seqN, seqTitle, section, type: m[2], title: m[3], steps: [], domain: m[2] };
      lessons.push(cur);
    } else if (cur && line.includes(" | ")) {
      const [k, v, inter] = raw.split(" | ").map(squash);
      if (/^Communicative objective/.test(k)) cur.objective = clean(v);
      else if (/^Lexis/.test(k)) cur.lexis = clean(v);
      else if (/^Grammar/.test(k)) cur.structures = clean(v);
      else if (/^Textbook activities/.test(k)) cur.activities = clean(v);
      else if (/^Level\s*[¶/]\s*Duration/.test(k)) cur.materials = squash(/Teaching aids:\s*(.*)$/.exec(line)?.[1] ?? "");
      else if (/^Sequence\s*[¶/]\s*Section/.test(k)) cur.page = /p\.(\d+)/.exec(v)?.[1] ?? "";
      else if (/[¶/]\s*\d+\s*mn$/.test(k) && v) {
        const [stage, time] = k.split(/\s*[¶/]\s*/);
        cur.steps.push({ stage, time: time.replace(/\s*mn$/, " min"), proc: v, inter });
      }
    }
  }
  return lessons;
}

const bodyOf = (l) =>
  [
    l.domain && `Domain: ${l.domain}`,
    l.objective && `Objective: ${l.objective}`,
    l.structures && `Target structures: ${l.structures}`,
    l.lexis && `Lexis: ${l.lexis}`,
    l.activities && `Textbook activities: ${l.activities}`,
    l.materials && `Materials: ${l.materials}`,
    "",
    ...l.steps.map((s) => `▪ ${s.stage}${s.time ? ` (${s.time})` : ""}: ${s.proc.replace(/\s*¶\s*/g, "\n   ")}${s.inter ? `\n   [${s.inter.replace(/\s*¶\s*/g, " / ")}]` : ""}`),
  ]
    .filter((x) => x !== false && x !== undefined && x !== null)
    .join("\n")
    .replace(/\s*¶\s*/g, " / ");

/** عنوان قصير من الهدف: «…will be able to greet people and …» ⇒ «Greet people and …». */
const gist = (obj) => {
  const s = squash((obj ?? "").replace(/^.*?will be able to\s*/i, "")).replace(/\.$/, "");
  return (s.charAt(0).toUpperCase() + s.slice(1)).slice(0, 110);
};

const LEVELS = {
  "3AP": {
    year: "السنة الثالثة",
    files: (fs) => [fs.find((f) => /first English class/i.test(f)), ...[1, 2, 3, 4, 5, 6].map((n) => fs.find((f) => new RegExp(`^3PS_Sequence${n}_.*Lesson_Plans\\.docx$`).test(f)))],
    terms: [[0, 1, 2], [3, 4], [5, 6]],
  },
  "4AP": {
    year: "السنة الرابعة",
    files: (fs) => [null, ...[1, 2, 3, 4, 5].map((n) => fs.find((f) => new RegExp(`^4PS_Sequence${n}_.*Lesson_Plans\\.docx$`).test(f)))],
    terms: [[1, 2], [3, 4], [5]],
  },
  "5AP": { year: "السنة الخامسة", file: (fs) => fs.find((f) => /5PS_Lesson_Plans/i.test(f)), terms: [[0, 1, 2], [3, 4], [5]] },
};

const all = readdirSync(dir).filter((f) => f.endsWith(".docx"));
for (const [level, L] of Object.entries(LEVELS)) {
  let parsed;
  if (L.file) parsed = parse5PS(docxLines(join(dir, L.file(all))));
  else
    parsed = L.files(all).flatMap((f, n) => {
      if (!f) return [];
      const ls = parseSessionPlans(docxLines(join(dir, f)), n);
      if (n === 0) ls.forEach((l) => (l.seqTitle = "My first English class"));
      return ls;
    });
  if (!parsed.length) throw new Error(`${level}: لا حصص`);

  // الأسابيع: حصتان أسبوعيًا، الفصل من أول أسابيعه (أو بعد سابقه إن تجاوزه)، وأسبوع «Pause» بعد كل فصل
  const lessons = [];
  let slot = 0; // بالحصص من بداية السنة
  L.terms.forEach((seqs, t) => {
    slot = Math.max(slot, (TERM_STARTS[t] - 1) * PER_WEEK);
    for (const l of parsed.filter((x) => seqs.includes(x.seqN))) {
      const segTitle = l.seqN === 0 ? (level === "3AP" ? "My first English class" : "Back to School — Diagnostic Assessment") : `Sequence ${l.seqN}: ${l.seqTitle}`;
      const head = level === "5AP" ? l.type : l.domain || "Oral";
      const title = level === "5AP" ? l.title : gist(l.objective);
      lessons.push({
        order: lessons.length + 1,
        segment: l.seqN,
        segmentTitle: segTitle,
        unitKind: "week",
        unit: Math.floor(slot / PER_WEEK) + 1,
        session: level === "5AP" ? `${l.section ? `${l.section} — ` : ""}${l.type} (45 mn)` : `Session ${l.session}${l.page ? ` — p. ${l.page}` : ""} (45 mn)`,
        activity: "English",
        domain: l.domain || "",
        topic: `${head} — ${title}`,
        materials: (l.materials || "Textbook, flashcards, board").slice(0, 300),
        objectives: [l.objective, l.structures && `Target structures: ${l.structures}`, l.lexis && `Lexis: ${l.lexis}`].filter(Boolean),
        body: bodyOf(l),
        pages: [],
        sample: l.seqN <= 1,
      });
      slot++;
    }
    slot = Math.ceil(slot / PER_WEEK) * PER_WEEK + PER_WEEK; // أسبوع التقويم والمعالجة
  });
  const segments = Object.fromEntries([...new Map(lessons.map((l) => [l.segment, l.segmentTitle]))]);
  const out = {
    id: `${level}_en`,
    level,
    subject: "en",
    title: `اللغة الإنجليزية — ${L.year} ابتدائي`,
    source: {
      ar: "مذكرات حصص اللغة الإنجليزية (Lesson Plans 2026/2027) وفق التوزيع السنوي؛ الأسابيع تقديرية (حصتان أسبوعيًا)",
      fr: "Lesson plans d'anglais 2026/2027 selon la progression annuelle ; semaines estimées (2 séances/semaine)",
    },
    weekMode: "absolute",
    segments,
    lessons,
  };
  writeFileSync(join(outDir, `${level}_en.json`), JSON.stringify(out, null, 1));
  console.log(level, lessons.length, "حصة؛", Object.keys(segments).length, "مقاطع؛ الأسابيع", lessons[0].unit, "→", lessons.at(-1).unit);
}
