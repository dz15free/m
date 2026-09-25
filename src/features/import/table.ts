import { nameKey } from "../../shared/text/names.ts";
import type { Gender } from "../students/roster.ts";
import { splitFullName, type NameOrder } from "./split-name.ts";
import { cleanCell, keepNameChars, letterRatio, stripLinePrefix } from "./text.ts";

/* المحرّك المشترك لكل مصادر الاستيراد: لصق، Excel، PDF، OCR.
   كل مصدر يحوّل ما قرأه إلى جدول (صفوف × خلايا بترتيب القراءة)، وهنا:
   اكتشاف صف العناوين ← تصنيف الأعمدة ← استخراج اللقب والاسم والجنس. */

export type Cell = { text: string; conf?: number }; // conf: ثقة OCR من 0 إلى 100
export type Table = Cell[][];

export type Field = "number" | "last" | "first" | "full" | "gender" | "birth" | "id" | "ignore";

export type Candidate = {
  last: string;
  first: string;
  gender: Gender | null;
  /** النص الأصلي للصف كما قُرئ */
  raw: string;
  /** أقل ثقة OCR في خلايا الاسم (إن وُجدت) */
  conf?: number;
  /** الاسم الكامل بترتيبه الأصلي إن قُسّم آليًا (لإعادة التقسيم عند عكس الترتيب) */
  full?: string;
  /** أُزيلت محارف غريبة (أرقام، رموز) من الاسم */
  cleaned: boolean;
  /** اسم القسم/الورقة إن احتوى الملف أكثر من قسم */
  group?: string;
};

export type ParseResult = { candidates: Candidate[]; columns: Field[]; headerRow: number; groups: string[] };

// ── العناوين ────────────────────────────────────────────────

/* أسطر العناوين الإدارية أعلى القوائم — كلمات لا تظهر في أسماء التلاميذ. */
const TITLE = /(قائمه|كشف|الجمهوريه|وزاره|مديريه|المؤسسه|ابتدائيه|متوسطه|ثانويه|السنه الدراسيه|الموسم الدراسي|liste|republique|ministere|direction|etablissement|ecole|annee scolaire)/;

function classifyHeader(text: string): Field | null {
  const k = nameKey(text);
  // عنوان العمود تسمية قصيرة؛ الجُمل الطويلة وعناوين القوائم ليست عناوين أعمدة
  if (!k || k.split(" ").length > 5 || TITLE.test(k)) return null;
  const has = (...words: string[]) => words.some((w) => k.includes(w));

  if (has("تسجيل", "تعريف", "matricule", "identifiant", "inscription")) return "id";
  if (has("ميلاد", "naissance") || /\bne le\b/.test(k)) return "birth";
  if (has("جنس", "sexe", "genre")) return "gender";
  const lastWord = has("لقب", "nom de famille") || /(^|\s)nom(\s|$)/.test(k);
  const firstWord = has("اسم", "prenom");
  if ((has("لقب") && has("اسم")) || (/(^|\s)noms?(\s|$)/.test(k) && has("prenom"))) return "full";
  if (has("تلميذ", "التلاميذ", "eleve", "nom complet", "الاسم الكامل")) return "full";
  if (lastWord && !has("prenom")) return "last";
  if (firstWord) return "first";
  if (/^(رقم|الرقم|ر ت|رت|ت|ع|n|no|nr|num|numero|#)$/.test(k)) return "number";
  return null;
}

/** صف العناوين: أول صف (من أوائل الجدول) فيه عنوان اسم معروف. */
export function detectHeader(table: Table): { row: number; columns: Field[] } | null {
  const limit = Math.min(table.length, 12);
  for (let r = 0; r < limit; r++) {
    const fields = table[r]!.map((c) => classifyHeader(c.text));
    const named = fields.filter((f) => f === "last" || f === "first" || f === "full").length;
    const known = fields.filter(Boolean).length;
    if (named >= 1 && (known >= 2 || fields.length === 1 || fields.includes("full"))) {
      let columns = fields.map((f) => f ?? "ignore");
      // «الاسم» وحده دون عمود «اللقب» = الاسم الكامل
      if (!columns.includes("last") && !columns.includes("full")) {
        columns = columns.map((f) => (f === "first" ? "full" : f));
      }
      return { row: r, columns };
    }
  }
  return null;
}

// ── التصنيف بالمحتوى (دون عناوين) ─────────────────────────────

const DATE = /^\d{1,2}\s*[/.\-]\s*\d{1,2}\s*[/.\-]\s*\d{2,4}$|^\d{4}\s*[/.\-]\s*\d{1,2}\s*[/.\-]\s*\d{1,2}$/;
const GENDER_VALUES: Record<string, Gender> = {
  ذكر: "M", ذ: "M", m: "M", masculin: "M", garcon: "M", g: "M", h: "M", homme: "M",
  انثي: "F", انثى: "F", ا: "F", f: "F", feminin: "F", fille: "F",
};

export function parseGender(text: string): Gender | null {
  const k = nameKey(text).replace(/\s/g, "");
  return GENDER_VALUES[k] ?? null;
}

export function classifyByContent(table: Table, fromRow: number): Field[] {
  const rows = table.slice(fromRow);
  const width = Math.max(0, ...rows.map((r) => r.length));
  const stats = Array.from({ length: width }, (_, c) => {
    const values = rows.map((r) => cleanCell(r[c]?.text ?? "")).filter(Boolean);
    const ratio = (pred: (v: string) => boolean) => (values.length ? values.filter(pred).length / values.length : 0);
    return {
      filled: values.length / Math.max(rows.length, 1),
      number: ratio((v) => /^\d{1,3}$/.test(v)),
      date: ratio((v) => DATE.test(v)),
      id: ratio((v) => /^\d{6,}$/.test(v.replace(/\s/g, ""))),
      gender: ratio((v) => parseGender(v) !== null),
      letters: values.length ? values.reduce((s, v) => s + letterRatio(v), 0) / values.length : 0,
    };
  });

  const columns: Field[] = stats.map((s) => {
    if (s.filled < 0.3) return "ignore";
    if (s.gender > 0.7) return "gender";
    if (s.date > 0.5) return "birth";
    if (s.id > 0.5) return "id";
    if (s.number > 0.7) return "number";
    return s.letters > 0.6 ? "full" : "ignore";
  });

  // عمودان نصيان أو أكثر: الأول لقب والثاني اسم (بترتيب القراءة)، والباقي (مكان الميلاد…) يُهمل
  const textCols = columns.flatMap((f, i) => (f === "full" ? [i] : []));
  if (textCols.length >= 2) {
    textCols.forEach((c, i) => (columns[c] = i === 0 ? "last" : i === 1 ? "first" : "ignore"));
  }
  return columns;
}

// ── الاستخراج ─────────────────────────────────────────────────

const FOOTER = /(المجموع|مجموع|عدد التلاميذ|العدد الاجمالي|المدير|مدير المدرسه|الاستاذ|التوقيع|الختم|ملاحظه|total|effectif|directeur|signature|cachet)/;
const GROUP_LINE = /^(القسم|الفوج|القسم الدراسي|classe|groupe)\s*[:：\-]?\s*(.{1,30})$/;

function nameText(cell: Cell | undefined): { text: string; cleaned: boolean } {
  // الترقيم في بداية الخلية («1- ») ليس «محارف غريبة»، فيُزال قبل المقارنة
  const original = stripLinePrefix(cleanCell(cell?.text ?? ""));
  const text = keepNameChars(original);
  // «تنظيف» كبير = الخلية كانت تحوي أرقامًا أو رموزًا
  const cleaned = original.replace(/\s/g, "").length - text.replace(/\s/g, "").length > 1;
  return { text, cleaned };
}

export function parseTable(
  table: Table,
  opts: { order?: NameOrder; columns?: Field[]; group?: string } = {},
): ParseResult {
  const order = opts.order ?? "lastFirst";
  const header = opts.columns ? null : detectHeader(table);
  const headerRow = header?.row ?? -1;
  const columns = opts.columns ?? header?.columns ?? classifyByContent(table, 0);
  const col = (f: Field) => columns.indexOf(f);
  const [iLast, iFirst, iFull, iGender] = [col("last"), col("first"), col("full"), col("gender")];

  const candidates: Candidate[] = [];
  const groups: string[] = opts.group ? [opts.group] : [];
  let group = opts.group;

  for (let r = headerRow + 1; r < table.length; r++) {
    const row = table[r]!;
    const rawText = row.map((c) => cleanCell(c.text)).filter(Boolean).join(" | ");
    if (!rawText) continue;

    // سطر عنوان قسم داخل القائمة: «القسم: 3 ابتدائي 2»
    const groupMatch = GROUP_LINE.exec(nameKey(rawText).length < 40 ? cleanCell(rawText) : "");
    if (groupMatch && row.filter((c) => cleanCell(c.text)).length <= 2) {
      group = cleanCell(rawText);
      if (!groups.includes(group)) groups.push(group);
      continue;
    }
    // عناوين مكرّرة في كل صفحة، وأسطر المجاميع والتواقيع
    if (detectHeader([row])) continue;
    if (FOOTER.test(nameKey(rawText)) && rawText.length < 60) continue;
    if (TITLE.test(nameKey(rawText))) continue;

    let last = "";
    let first = "";
    let full: string | undefined;
    let cleaned = false;
    const nameCells: (Cell | undefined)[] = [];

    if (iLast >= 0 || iFirst >= 0) {
      const a = nameText(row[iLast]);
      const b = nameText(row[iFirst]);
      last = a.text;
      first = b.text;
      cleaned = a.cleaned || b.cleaned;
      nameCells.push(row[iLast], row[iFirst]);
      // اللقب والاسم في خلية واحدة رغم وجود عمودين
      if (last && !first && iFirst < 0) {
        full = last;
        ({ last, first } = splitFullName(full, order));
      }
    } else {
      const index = iFull >= 0 ? iFull : row.findIndex((c) => letterRatio(c.text) > 0.6);
      const cell = nameText(row[index]);
      full = cell.text;
      ({ last, first } = splitFullName(full, order));
      cleaned = cell.cleaned;
      nameCells.push(row[index]);
    }

    if ((last + first).replace(/\s/g, "").length < 2) continue;

    const confs = nameCells.map((c) => c?.conf).filter((c): c is number => typeof c === "number");
    candidates.push({
      last,
      first,
      gender: iGender >= 0 ? parseGender(row[iGender]?.text ?? "") : null,
      raw: rawText,
      full,
      conf: confs.length ? Math.min(...confs) : undefined,
      cleaned,
      group,
    });
  }

  return { candidates, columns, headerRow, groups };
}
