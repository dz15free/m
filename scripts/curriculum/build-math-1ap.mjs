/**
 * الرياضيات — السنة الأولى (وثيقة «مخططات حصص التعلم»، 70 بطاقة).
 * رؤوس البطاقات نُقلت يدويًا من صور الصفحات (math-1ap-rows.txt):
 *   صفحة البداية | رقم البطاقة | المقطع | الوحدة | الموضوع | الوسائل | الأهداف (مفصولة بـ ;)
 * الوثيقة لا تحدد الأسبوع: يُقدَّر من رقم البطاقة (نحو 4–5 بطاقات في الأسبوع على 31 أسبوعًا)،
 * والأستاذ يختار غيرها من الدفتر عند الحاجة. السير الكامل صور الصفحات الأصلية.
 *
 *   node scripts/curriculum/build-math-1ap.mjs > content/curriculum/1AP_math.json
 */
import { readFileSync } from "node:fs";

const rows = readFileSync(new URL("./math-1ap-rows.txt", import.meta.url), "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [page, card, , unit, topic, materials, objectives] = line.split("|");
    return { page: Number(page), card: Number(card), unit, topic, materials, objectives: objectives.split(";").map((s) => s.trim()).filter(Boolean) };
  })
  .sort((a, b) => a.card - b.card);

// المقاطع حسب مجالات البطاقات (ترقيم الوثيقة للمقطع غير منتظم في بعض البطاقات)
const segOf = (card) => (card <= 35 ? 1 : card <= 60 ? 2 : card <= 84 ? 3 : card <= 100 ? 4 : 5);
const weekOf = (card) => Math.min(31, Math.floor((card - 1) / 4.45) + 1);
const DOMAIN = (unit) =>
  /الفضاء|الاستقامية/.test(unit) ? "الفضاء والهندسة" : /المقادير/.test(unit) ? "المقادير والقياس" : /تنظيم المعطيات/.test(unit) ? "تنظيم المعطيات" : "الأعداد والحساب";

const starts = rows.map((r) => r.page).sort((a, b) => a - b);
const pagesFor = (p) => {
  const next = starts.find((s) => s > p) ?? p + 4;
  const out = [];
  for (let x = p; x < next && out.length < 5; x++) out.push(x);
  return out;
};

const lessons = rows.map((r, i) => ({
  order: i + 1,
  segment: segOf(r.card),
  segmentTitle: `المقطع ${["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس"][segOf(r.card)]}`,
  unitKind: "week",
  unit: weekOf(r.card),
  session: `البطاقة ${Math.floor(r.card)} — ${r.unit}`,
  activity: "رياضيات",
  domain: DOMAIN(r.unit),
  topic: r.topic,
  materials: r.materials,
  objectives: r.objectives,
  body: "",
  pages: pagesFor(r.page),
  sample: i < 3,
}));

process.stdout.write(
  JSON.stringify(
    {
      id: "1AP_math",
      level: "1AP",
      subject: "math",
      title: "الرياضيات — السنة الأولى ابتدائي",
      source: { ar: "وزارة التربية الوطنية — مخططات حصص التعلم في الرياضيات", fr: "Ministère de l'Éducation nationale" },
      weekMode: "absolute",
      segments: { 1: "المقطع الأول", 2: "المقطع الثاني", 3: "المقطع الثالث", 4: "المقطع الرابع", 5: "المقطع الخامس" },
      lessons,
    },
    null,
    1,
  ),
);
