/**
 * مناهج التعليم المتوسط (1AM–4AM) من مذكرات مجلد «التعليم المتوسط» على Drive.
 *
 * المدخل: scripts/curriculum/middle/<LEVEL>_<subject>.json — مواصفة لكل (مستوى، مادة): ملفات المصدر بترتيبها
 * (ومعدد صفحاتها)، والمقاطع، والحصص: الميدان، الموضوع، الأهداف، الصفحات (داخل ملفها)، المدة.
 * المخرج: content/curriculum/<LEVEL>_<subject>.json بنفس صيغة الابتدائي (weekMode "absolute"، مصدر «b» = الملفات
 * موصولة بترتيبها، فصفحة n من الملف i تصير b:(إزاحة i + n)).
 *
 * الأسابيع: لا مخطط سنوي رسمي 2026-2027 للمتوسط بين أيدينا، فتُوزَّع الحصص بالتناسب على أسابيع التعلم في رزنامة
 * السنة (بعد أسبوع التقويم التشخيصي، دون أسابيع الاختبارات والمعالجة بعدها)، مع احترام أسبوع مكتوب في المذكرة إن وُجد.
 * يُذكر ذلك في «source» (الأسابيع تقديرية) ويعدّلها الأستاذ في توزيعه.
 *
 *   node scripts/curriculum/build-middle.mjs     (إعادة التشغيل آمنة)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { officialCalendar, examsForLevel } from "../../src/shared/dz/school-calendar.ts";
import { defaultStart, schoolWeekOf } from "../../src/features/planning/logic.ts";

const DIR = new URL("./middle/", import.meta.url);
const OUT = new URL("../../content/curriculum/", import.meta.url);
const YEAR = "2026-2027";
const LEVELS = { "1AM": "السنة الأولى متوسط", "2AM": "السنة الثانية متوسط", "3AM": "السنة الثالثة متوسط", "4AM": "السنة الرابعة متوسط" };
const SUBJECTS = {
  ar: ["اللغة العربية", "لغة عربية", "أدوات المادة: الكتاب المدرسي، السبورة، سندات"],
  fr: ["Langue française", "Français", "Manuel, tableau, supports"],
  en: ["English", "English", "Textbook, board, flashcards, audio"],
  math: ["الرياضيات", "رياضيات", "الكتاب المدرسي، أدوات الهندسة، الآلة الحاسبة"],
  science: ["علوم الطبيعة والحياة", "علوم الطبيعة والحياة", "الكتاب المدرسي، وسائل التجربة، صور ووثائق"],
  physics: ["العلوم الفيزيائية والتكنولوجيا", "علوم فيزيائية", "الكتاب المدرسي، الوسائل المخبرية"],
  islamic: ["التربية الإسلامية", "تربية إسلامية", "الكتاب المدرسي، المصحف"],
  civic: ["التربية المدنية", "تربية مدنية", "الكتاب المدرسي، سندات"],
  histgeo: ["التاريخ والجغرافيا", "تاريخ وجغرافيا", "الكتاب المدرسي، الخرائط، السندات"],
  informatics: ["الإعلام الآلي", "إعلام آلي", "الحاسوب، الكتاب المدرسي"],
  music: ["التربية الموسيقية", "تربية موسيقية", "آلات موسيقية، تسجيلات صوتية"],
  art: ["التربية التشكيلية", "تربية تشكيلية", "أدوات الرسم والتلوين"],
};
const KIND_LABEL = { situation: "وضعية", integration: "إدماج", evaluation: "تقويم", remediation: "معالجة", project: "مشروع" };

/** أسابيع السنة الدراسية لمستوى: رقمها، وهل هي أسبوع اختبارات، وأسبوع المعالجة بعده. */
function yearPlan(level) {
  const cal = officialCalendar(YEAR);
  const start = defaultStart(2026);
  const days = [0, 1, 2, 3, 4];
  const exams = examsForLevel(cal.exams, level);
  const weekOf = (d) => schoolWeekOf(d, start, days, cal.holidays);
  // كل أسبوع فيه يوم اختبار (الفصل الثاني يمتد على أسبوعين)، والمعالجة في الأسبوع الذي يليه
  const examWeeks = new Map(exams.flatMap((e) => e.days.map((d) => [weekOf(d), e.term])));
  const last = Math.max(...examWeeks.keys());
  const remediation = new Map(
    exams.map((e) => [Math.max(...e.days.map(weekOf)) + 1, e.term]).filter(([w]) => w < last),
  );
  const teaching = [];
  for (let w = 2; w < last; w++) if (!examWeeks.has(w) && !remediation.has(w)) teaching.push(w);
  return { teaching, examWeeks, remediation, last };
}

function build(spec) {
  const { id, level, subject } = spec;
  const [name, activity, materials] = SUBJECTS[subject];
  const lang = spec.language ?? "ar";
  const plan = yearPlan(level);
  // إزاحات الصفحات: الملفات موصولة بترتيبها
  const offsets = [];
  let acc = 0;
  for (const n of spec.filePages) {
    offsets.push(acc);
    acc += n;
  }

  const real = spec.lessons.filter((l) => (l.pages ?? []).length || l.topic);
  const weight = (l) => Math.max(1, Math.min(4, Number(l.hours) || 1));
  const total = real.reduce((n, l) => n + weight(l), 0);
  let done = 0;
  const T = plan.teaching.length;
  const lessons = [];
  const segTitle = (n) => spec.segments[String(n)] ?? "";
  let order = 0;
  // أسبوع الانطلاق: التقويم التشخيصي
  lessons.push({
    order: ++order, unitKind: "week", unit: 1, segment: real[0]?.segment ?? 1, segmentTitle: segTitle(real[0]?.segment ?? 1),
    activity, session: activity, domain: lang === "fr" ? "Évaluation diagnostique" : lang === "en" ? "Diagnostic assessment" : "التقويم التشخيصي",
    topic: lang === "fr" ? "Évaluation diagnostique" : lang === "en" ? "Diagnostic assessment" : "التقويم التشخيصي",
    materials, objectives: [], body: "", sample: false,
  });
  let samples = 0;
  for (const l of real) {
    const at = Math.min(T - 1, Math.floor((done / total) * T));
    done += weight(l);
    const week = Number.isInteger(l.week) && l.week >= 2 && l.week < plan.last ? l.week : plan.teaching[at];
    const pages = (l.pages ?? []).map((p) => `b:${offsets[l.file ?? 0] + p}`);
    const sample = pages.length > 0 && l.kind === "lesson" && samples < 2;
    if (sample) samples++;
    const kind = KIND_LABEL[l.kind];
    lessons.push({
      order: ++order, unitKind: "week", unit: week, segment: l.segment, segmentTitle: segTitle(l.segment),
      activity, session: activity, domain: l.domain || (kind ?? ""), topic: l.topic, materials,
      objectives: (l.objectives ?? []).filter(Boolean).slice(0, 3), body: "", sample, ...(pages.length ? { pages } : {}),
    });
  }
  // المعالجة بعد كل فترة اختبارات
  for (const [w, term] of plan.remediation) {
    const seg = [...lessons].reverse().find((l) => l.unit < w)?.segment ?? 1;
    lessons.push({
      order: ++order, unitKind: "week", unit: w, segment: seg, segmentTitle: segTitle(seg), activity, session: activity,
      domain: lang === "fr" ? "Remédiation" : lang === "en" ? "Remedial work" : "المعالجة البيداغوجية",
      topic: lang === "fr" ? `Correction de l'examen du trimestre ${term} et remédiation` : lang === "en" ? `Term ${term} exam correction and remedial work` : `تصحيح اختبار الفصل ${term} والمعالجة البيداغوجية`,
      materials, objectives: [], body: "", sample: false,
    });
  }
  // الرابعة متوسط: بعد اختبارات الفصل الثالث مراجعة تحضيرًا لشهادة التعليم المتوسط
  if (level === "4AM")
    for (const w of [plan.last + 1, plan.last + 2]) {
      const seg = lessons.at(-1)?.segment ?? 1;
      lessons.push({
        order: ++order, unitKind: "week", unit: w, segment: seg, segmentTitle: segTitle(seg), activity, session: activity,
        domain: lang === "fr" ? "Révision" : lang === "en" ? "Revision" : "المراجعة",
        topic: lang === "fr" ? "Révision générale pour le BEM" : lang === "en" ? "General revision for the BEM exam" : "مراجعة عامة تحضيرًا لامتحان شهادة التعليم المتوسط",
        materials, objectives: [], body: "", sample: false,
      });
    }
  lessons.sort((a, b) => a.unit - b.unit || a.order - b.order);
  lessons.forEach((l, i) => (l.order = i + 1));
  return {
    id, level, subject,
    title: `${name} — ${LEVELS[level]}`,
    source: {
      ar: `مذكرات أساتذة منشورة للعموم (مناهج الجيل الثاني) من مجلد «التعليم المتوسط»؛ الأسابيع تقديرية موزّعة على رزنامة ${YEAR} في غياب المخطط السنوي الرسمي`,
      fr: `Fiches d'enseignants partagées publiquement (programmes de 2e génération) ; semaines estimées sur le calendrier ${YEAR}`,
    },
    weekMode: "absolute",
    segments: spec.segments,
    sources: { b: { pdf: spec.files } },
    lessons,
  };
}

const only = process.argv.slice(2);
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const spec = JSON.parse(readFileSync(new URL(f, DIR), "utf8"));
  if (only.length && !only.includes(spec.id)) continue;
  const out = build(spec);
  writeFileSync(new URL(`${spec.id}.json`, OUT), JSON.stringify(out, null, 1) + "\n");
  const weeks = new Set(out.lessons.map((l) => l.unit));
  console.log(`${spec.id}: ${out.lessons.length} حصة، ${Object.keys(out.segments).length} مقطع، ${weeks.size} أسبوعًا`);
}
