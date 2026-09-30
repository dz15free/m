/**
 * الإنجليزية (3AP، 4AP، 5AP) من content/curriculum/plans/en.json — منقول من «Annual allotment & Sequence repartition»
 * (منشور للعموم): مقاطع ← قسمان ← حصص بعناوين الجذاذات (rubrics).
 * الأسابيع تقديرية: حصتان في الأسبوع، وكل فصل يبدأ من أول أسبوع فيه.
 *
 *   node scripts/curriculum/build-en.mjs <out-dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [outDir] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(new URL("../../content/curriculum/plans/en.json", import.meta.url), "utf8"));
const YEAR = { "3AP": "السنة الثالثة", "4AP": "السنة الرابعة", "5AP": "السنة الخامسة" };
const SESSIONS_PER_WEEK = 2;

for (const level of ["3AP", "4AP", "5AP"]) {
  const L = plan[level];
  const lessons = [];
  for (const term of [1, 2, 3]) {
    let slot = 0;
    const weekOf = () => plan.termStarts[term - 1] + Math.floor(slot / SESSIONS_PER_WEEK);
    for (const seq of L.sequences.filter((s) => s.term === term)) {
      seq.sections.forEach((sec, k) => {
        const rubrics = k === seq.sections.length - 1 && L.rubricsLast ? L.rubricsLast : L.rubrics;
        rubrics.forEach((r, i) => {
          lessons.push({
            order: lessons.length + 1,
            segment: seq.n,
            segmentTitle: `Sequence ${seq.n}: ${seq.title}`,
            unitKind: "week",
            unit: weekOf(),
            session: `Section ${k + 1} (${sec.title}) — Session ${i + 1}`,
            activity: "English",
            domain: r.join(" / "),
            topic: `${sec.title} — ${r.join(" / ")}`,
            materials: "Pupil's book, flashcards, audio/songs, board",
            objectives: [...sec.objectives, `Lexis: ${sec.lexis}`, `Grammar: ${sec.grammar}`, `Phonics: ${sec.phonics}`],
            body: "",
            pages: [],
            sample: seq.n === 1,
          });
          slot++;
        });
      });
    }
  }
  const out = {
    id: `${level}_en`,
    level,
    subject: "en",
    title: `اللغة الإنجليزية — ${YEAR[level]} ابتدائي`,
    source: {
      ar: "التوزيع السنوي وتوزيع حصص المقاطع (Annual allotment & Sequence repartition) — منشور للعموم؛ الأسابيع تقديرية (حصتان أسبوعيًا)",
      fr: "Annual allotment & sequence repartition (partagé publiquement) ; semaines estimées (2 séances/semaine)",
    },
    weekMode: "absolute",
    segments: Object.fromEntries(L.sequences.map((s) => [s.n, `Sequence ${s.n}: ${s.title}`])),
    lessons,
  };
  writeFileSync(join(outDir, `${level}_en.json`), JSON.stringify(out, null, 1));
  console.log(level, lessons.length, "حصة، الأسابيع", [...new Set(lessons.map((l) => l.unit))].join(","));
}
