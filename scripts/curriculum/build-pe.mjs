/**
 * التربية البدنية (1AP–5AP) من مذكرات «وضعيات وتنقلات سنة N» في مجلد «تربية بدنية» على درايف:
 * لكل مستوى جدول توزيع الحصص (نوع الحصة، المركبات، الهدف، المحتوى، المعارف المجنّدة، الوضعية المشكلة)
 * ثم مذكرة كاملة لكل حصة (الميدان، الكفاءة الختامية، الهدف التعلّمي، الوسائل، المراحل الثلاث بزمنها وتوجيهاتها).
 * ميدان «الوضعيات والتنقلات»: 20 حصة للسنوات 1–3 و10 حصص للسنتين 4–5.
 * الأسابيع تقديرية: حصة في الأسبوع من الأسبوع الثاني.
 *
 *   node scripts/curriculum/build-pe.mjs <dir فيها y1.docx … y5.docx> <out-dir>
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { docxLines } from "./docx-lines.mjs";

const [dir, outDir] = process.argv.slice(2);
const FIRST_WEEK = 2;
const YEAR = ["", "السنة الأولى", "السنة الثانية", "السنة الثالثة", "السنة الرابعة", "السنة الخامسة"];
const squash = (s) => s.replace(/\s+/g, " ").trim();
const clean = (s) => squash((s ?? "").replace(/\s*¶\s*/g, " "));
const lines = (s) => (s ?? "").split(/\s*¶\s*/).map(squash).filter(Boolean);

for (const n of [1, 2, 3, 4, 5]) {
  const level = `${n}AP`;
  const rows = docxLines(join(dir, `y${n}.docx`));
  // جدول التوزيع: «رقم | نوع | مركبات | هدف | محتوى | معارف | وضعية مشكلة | توجيهات»
  const plan = new Map();
  for (const r of rows) {
    const c = r.split(" | ");
    if (/^\d+$/.test(c[0]?.trim() ?? "") && c.length >= 7) plan.set(Number(c[0]), { type: clean(c[1]), parts: clean(c[2]), content: clean(c[4]), knowledge: clean(c[5]), situation: clean(c[6]) });
  }
  const memos = [];
  let cur = null;
  for (const raw of rows) {
    const line = clean(raw.split(" | ")[0]);
    const head = /^[^\p{L}]*(?:ال)?مذكرة رقم\s*(\d+)\s*:\s*(.+)$/u.exec(line);
    if (head) {
      cur = { no: Number(head[1]), heading: squash(head[2]), stages: [] };
      memos.push(cur);
      continue;
    }
    if (!cur) continue;
    const cells = raw.split(" | ");
    for (const cell of cells) {
      const t = clean(cell);
      let m;
      if ((m = /^الميدان\s*:\s*(.+)$/.exec(t))) cur.domain = m[1];
      else if ((m = /^الكفاءة الختامية\s*:\s*(.+)$/.exec(t))) cur.competence = m[1];
      else if ((m = /^الهدف التعلّ?مي\s*:\s*(.+)$/.exec(t))) cur.objective = m[1];
      else if ((m = /^الوسائل التعليمية\s*:\s*(.+)$/.exec(t))) cur.materials = m[1];
    }
    if (/^المرحلة\s/.test(clean(cells[0])) && cells.length >= 4) {
      cur.stages.push({ name: clean(cells[0]), learn: lines(cells[1]), task: lines(cells[2]), time: clean(cells[3]), hints: lines(cells[4]) });
    }
  }
  if (!memos.length) throw new Error(`${level}: لا مذكرات`);
  const domain = memos.find((m) => m.domain)?.domain ?? "الوضعيات والتنقلات";
  const lessons = memos
    .sort((a, b) => a.no - b.no)
    .map((m, i) => {
      const p = plan.get(m.no) ?? {};
      const title = /\(([^)]+)\)/.exec(m.heading)?.[1] ?? m.heading.replace(/^(تعليمية|تعلمية)\s*\d+\s*/, "");
      const type = squash(m.heading.replace(/\s*\([^)]*\)\s*/, " ")) || p.type || "";
      const minutes = m.stages.reduce((s, x) => s + (Number(/\d+/.exec(x.time)?.[0]) || 0), 0);
      const body = [
        `الميدان: ${m.domain ?? domain}`,
        m.competence && `الكفاءة الختامية: ${m.competence}`,
        p.parts && `مركبات الكفاءة: ${p.parts}`,
        `الهدف التعلّمي: ${m.objective ?? ""}`,
        p.content && `محتوى التعلّم: ${p.content}`,
        p.knowledge && `المعارف المجنّدة: ${p.knowledge}`,
        m.materials && `الوسائل: ${m.materials}`,
        "",
        ...m.stages.flatMap((s) => [
          `▪ ${s.name}${s.time ? ` (${s.time})` : ""}`,
          ...s.learn.map((x) => `   ${x}`),
          ...s.task.map((x) => `   ${x}`),
          ...s.hints.map((x) => `   ${x}`),
        ]),
      ]
        .filter((x) => x !== false && x !== undefined && x !== null)
        .join("\n");
      return {
        order: i + 1,
        segment: 1,
        segmentTitle: domain,
        unitKind: "week",
        unit: FIRST_WEEK + i,
        session: `الحصة ${m.no} — ${type}${minutes ? ` (${minutes} د)` : ""}`,
        activity: "تربية بدنية",
        domain: m.domain ?? domain,
        topic: title,
        materials: (m.materials ?? "صافرة، أقماع، طباشير").slice(0, 300),
        objectives: [m.objective, p.situation && `الوضعية المشكلة: ${p.situation}`].filter(Boolean),
        body,
        pages: [],
        sample: i < 2,
      };
    });
  const out = {
    id: `${level}_pe`,
    level,
    subject: "pe",
    title: `التربية البدنية — ${YEAR[n]} ابتدائي`,
    source: {
      ar: `مذكرات التربية البدنية «وضعيات وتنقلات — ${YEAR[n]}» (توزيع الحصص + مذكرة كل حصة)؛ الأسابيع تقديرية (حصة أسبوعيًا)`,
      fr: `Fiches d'éducation physique « postures et déplacements » — ${n}e AP ; semaines estimées (1 séance/semaine)`,
    },
    weekMode: "absolute",
    segments: { 1: domain },
    lessons,
  };
  writeFileSync(join(outDir, `${level}_pe.json`), JSON.stringify(out, null, 1));
  console.log(level, lessons.length, "حصة؛", domain, "؛ بلا هدف:", lessons.filter((l) => !l.objectives[0]).length, "؛ بلا مراحل:", lessons.filter((l) => !/▪/.test(l.body)).length);
}
