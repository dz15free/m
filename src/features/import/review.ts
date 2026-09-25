import { nameKey, similarity } from "../../shared/text/names.ts";
import type { Gender, Student } from "../students/roster.ts";
import { splitFullName, type NameOrder } from "./split-name.ts";
import type { Candidate } from "./table.ts";
import { letterCounts } from "./text.ts";

/* تحويل المرشّحين إلى صفوف مراجعة: حالة كل صف (🟢🟡🔴) وسببها،
   وكشف التكرار داخل القائمة ومع تلاميذ القسم الحاليين. */

export type RowStatus = "ok" | "check" | "bad";
export type Reason =
  | "lowConfidence"
  | "veryLowConfidence"
  | "missingFirst"
  | "missingLast"
  | "strangeChars"
  | "mixedScripts"
  | "shortWord"
  | "tooLong"
  | "duplicate"
  | "existsInClass";

export type ReviewRow = {
  key: string;
  last: string;
  first: string;
  gender: Gender | null;
  raw: string;
  /** الاسم الكامل الأصلي إن قُسّم آليًا */
  full?: string;
  status: RowStatus;
  reasons: Reason[];
  include: boolean;
  group?: string;
};

let seq = 0;
const nextKey = () => `r${++seq}`;

export function assess(c: Pick<Candidate, "last" | "first" | "conf" | "cleaned">): { status: RowStatus; reasons: Reason[] } {
  const reasons: Reason[] = [];
  const full = `${c.last} ${c.first}`.trim();
  const words = full.split(/\s+/).filter(Boolean);
  const { arabic, latin } = letterCounts(full);

  if (typeof c.conf === "number") {
    if (c.conf < 45) reasons.push("veryLowConfidence");
    else if (c.conf < 75) reasons.push("lowConfidence");
  }
  if (!c.last) reasons.push("missingLast");
  if (!c.first) reasons.push("missingFirst");
  if (c.cleaned) reasons.push("strangeChars");
  if (arabic > 0 && latin > 0) reasons.push("mixedScripts");
  if (words.some((w) => w.length === 1)) reasons.push("shortWord");
  if (words.length > 6 || full.length > 60) reasons.push("tooLong");

  const bad = reasons.includes("veryLowConfidence") || arabic + latin < 3;
  return { status: bad ? "bad" : reasons.length ? "check" : "ok", reasons };
}

export function toReviewRows(candidates: Candidate[], existing: Student[]): ReviewRow[] {
  const existingKeys = existing.map((s) => nameKey(`${s.last} ${s.first}`));
  const seen: string[] = [];

  return candidates.map((c) => {
    const { status, reasons } = assess(c);
    const key = nameKey(`${c.last} ${c.first}`);
    let include = true;

    // موجود في القسم: لا يُستورد افتراضيًا
    if (existingKeys.some((k) => k === key || similarity(k, key) >= 0.92)) {
      reasons.push("existsInClass");
      include = false;
    } else if (seen.includes(key)) {
      // تكرار حرفي (مثلًا نفس السطر في صفحتين): لا يُستورد مرتين
      reasons.push("duplicate");
      include = false;
    } else if (seen.some((k) => similarity(k, key) >= 0.9)) {
      reasons.push("duplicate");
    }
    seen.push(key);

    // «موجود في القسم» ليس مشكلة قراءة: يُستبعد من الاستيراد دون أن يُعدّ «يحتاج مراجعة»
    const flagged = reasons.includes("duplicate");
    return {
      key: nextKey(),
      last: c.last,
      first: c.first,
      gender: c.gender,
      raw: c.raw,
      full: c.full,
      status: flagged && status === "ok" ? "check" : status,
      reasons,
      // الصفوف غير المقروءة (🔴) لا تُستورد حتى يصحّحها الأستاذ
      include: include && status !== "bad",
      group: c.group,
    };
  });
}

/** إعادة التقييم بعد تعديل الأستاذ لصف: التعديل اليدوي يعني أنه راجعه. */
export function editRow(row: ReviewRow, patch: Partial<Pick<ReviewRow, "last" | "first" | "gender">>): ReviewRow {
  const next = { ...row, ...patch, full: undefined };
  const { status, reasons } = assess({ last: next.last.trim(), first: next.first.trim(), cleaned: false });
  return { ...next, status: status === "bad" ? "bad" : "ok", reasons: status === "ok" ? [] : reasons, include: status !== "bad" };
}

/** تطبيق ترتيب آخر على كل الصفوف: ما قُسّم آليًا يُعاد تقسيمه من نصّه الأصلي
 *  (فتبقى الأسماء المركّبة سليمة)، وما جاء من عمودين يُبدَّل. */
export function reorderAll(rows: ReviewRow[], order: NameOrder): ReviewRow[] {
  return rows.map((r) =>
    r.full ? { ...r, ...splitFullName(r.full, order) } : { ...r, last: r.first, first: r.last },
  );
}

export function summary(rows: ReviewRow[]) {
  return {
    total: rows.length,
    ok: rows.filter((r) => r.status === "ok").length,
    check: rows.filter((r) => r.status === "check").length,
    bad: rows.filter((r) => r.status === "bad").length,
    included: rows.filter((r) => r.include).length,
  };
}
