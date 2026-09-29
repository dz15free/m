/**
 * الرياضيات — السنة الأولى (وثيقة «مخططات حصص التعلم»، 70 بطاقة).
 * رؤوس البطاقات نُقلت يدويًا من صور الصفحات (math-1ap-rows.txt):
 *   صفحة البداية | رقم البطاقة | المقطع | الوحدة | الموضوع | الوسائل | الأهداف (مفصولة بـ ;)
 * الأسبوع من المخطط السنوي لبناء التعلمات للسنة الأولى، والأستاذ يختار غيرها من الدفتر عند الحاجة.
 * السير الكامل صور الصفحات الأصلية.
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
// الأسبوع من «المخطط السنوي لبناء التعلمات — سنة أولى» (بطاقة ← أسبوع)
const WEEK = {
  3: 2, 4: 2, 6: 2, 7: 3, 10: 3, 11: 4, 12: 4, 14: 4, 15: 5, 17: 5, 21: 5, 18: 6, 19: 6, 22: 6,
  24: 7, 25: 7, 27: 7, 28: 9, 29: 9, 31: 9, 33: 10, 41: 10, 42: 11, 44: 11,
  45: 13, 47: 13, 48: 13, 49: 14, 51: 14, 52: 14, 53: 15, 55: 15, 56: 15,
  62: 17, 63: 17, 64: 17, 66: 17, 67: 18, 69: 18, 70: 18, 72: 19, 73: 19, 75: 19,
  83: 20, 85: 20, 86: 20, 88: 21, 90: 21, 91: 22, 92: 22, 94: 22, 94.5: 22,
  101: 26, 102: 26, 104: 26, 105: 27, 106: 27, 108: 27, 109: 28, 111: 28, 112: 28,
  114: 29, 115: 29, 117: 29, 118: 30, 120: 30, 121: 30, 124: 30, 125: 31, 127: 31,
};
const weekOf = (card) => {
  if (!(card in WEEK)) throw new Error(`بطاقة بلا أسبوع: ${card}`);
  return WEEK[card];
};
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
