/* دفتر التنقيط: علامات كل فصل لكل قسم. في الابتدائي تُقوَّم اللغة العربية
   والرياضيات بمركّباتها (كما في كشف النقاط الرسمي) ومعدل المادة هو متوسطها؛
   بقية المواد بعلامة واحدة. العلامات على 10 في الابتدائي، وعلى 20 بعده. */

import type { Stage } from "@/shared/dz/education";

export const TERMS = [1, 2, 3] as const;
export type Term = (typeof TERMS)[number];

export const COMPONENTS: Record<string, readonly string[]> = {
  ar: ["oral", "reading", "writing"],
  math: ["numbers", "measures", "data", "geometry"],
};

export const scaleFor = (stage: Stage) => (stage === "primary" ? 10 : 20);

/** أعمدة الإدخال لمادة: مركّباتها أو عمود واحد باسمها. */
export function columnsOf(subjectId: string, stage: Stage): string[] {
  const comps = stage === "primary" ? COMPONENTS[subjectId] : undefined;
  return comps ? comps.map((c) => `${subjectId}_${c}`) : [subjectId];
}

export type StudentMarks = Record<string, number>;
export type MarksSheet = Record<string, StudentMarks>; // studentId → عمود → علامة

export const gradesDocId = (classId: string, term: Term) => `${classId}__t${term}`;

/** يقبل «7,5» و«7.5»؛ يرفض ما خرج عن السلّم. يُرجع null للخانة الفارغة و NaN للخاطئة. */
export function parseMark(raw: string, scale: number): number | null {
  const v = raw.trim().replace(",", ".");
  if (!v) return null;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(v)) return Number.NaN;
  const n = Number(v);
  return n >= 0 && n <= scale ? n : Number.NaN;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const mean = (xs: number[]) => (xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** معدل المادة: متوسط ما أُدخل من مركّباتها. */
export function subjectAverage(marks: StudentMarks | undefined, subjectId: string, stage: Stage): number | null {
  if (!marks) return null;
  return mean(columnsOf(subjectId, stage).map((c) => marks[c]).filter((x): x is number => typeof x === "number" && Number.isFinite(x)));
}

/** المعدل العام: متوسط معدلات المواد المُقوَّمة (المعاملات 1 إلى أن يحدّدها الأستاذ). */
export function generalAverage(marks: StudentMarks | undefined, subjectIds: string[], stage: Stage): number | null {
  return mean(subjectIds.map((s) => subjectAverage(marks, s, stage)).filter((x): x is number => x !== null));
}

/** الترتيب مع التعادل (1، 2، 2، 4). من لا معدل له لا يُرتَّب. */
export function ranks(averages: Map<string, number | null>): Map<string, number> {
  const scored = [...averages].filter((e): e is [string, number] => e[1] !== null).sort((a, b) => b[1] - a[1]);
  const out = new Map<string, number>();
  scored.forEach(([id, avg], i) => {
    const prev = scored[i - 1];
    out.set(id, prev && prev[1] === avg ? out.get(prev[0])! : i + 1);
  });
  return out;
}

/** المعدل السنوي: متوسط معدلات الفصول المتوفرة. */
export const annualAverage = (terms: (number | null)[]) => mean(terms.filter((x): x is number => x !== null));

/** تنظيف ما يُقرأ من القاعدة: أرقام صالحة فقط. */
export function cleanSheet(raw: unknown, scale: number): MarksSheet {
  const out: MarksSheet = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [sid, cols] of Object.entries(raw as Record<string, unknown>)) {
    if (!cols || typeof cols !== "object") continue;
    const m: StudentMarks = {};
    for (const [c, v] of Object.entries(cols as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= scale) m[c] = v;
    }
    out[sid] = m;
  }
  return out;
}

export const formatMark = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");

/** الفصل الجاري تقريبًا: سبتمبر–ديسمبر، جانفي–مارس، ثم أفريل وما بعده. */
export function termOf(iso: string): Term {
  const m = Number(iso.slice(5, 7));
  return m >= 9 ? 1 : m <= 3 ? 2 : 3;
}
