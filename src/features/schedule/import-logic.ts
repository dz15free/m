import { nameKey, similarity } from "../../shared/text/names.ts";
import { fromMinutes, toMinutes, type Slot } from "./logic.ts";

/* استيراد جدول التوقيت من جدول مقروء (Excel، PDF، صورة): دوال نقية مختبرة.
   الجداول الجزائرية: أيام في الأسطر وحصص (أوقات) في الأعمدة — أو العكس.
   الخلية تحمل المادة («قراءة»، «رياضيات») و/أو القسم («1م2»، «3AP-01»). */

export type Cell = { text: string };
export type Grid = Cell[][];

export type ImportClass = { id: string; level: string; section: string; displayName: string; subjectIds: string[] };
export type ImportSubject = { id: string; label: { ar: string; fr: string } };

export type DraftSlot = Omit<Slot, "id"> & {
  key: string;
  raw: string;
  /** جزء من خانة قُسّمت حسب المدد المكتوبة («(1سا)»، «(30)»): لا يُدمج مع جاره */
  split?: boolean;
  /** ok: القسم والمادة معروفان؛ check: ينقص أحدهما (يختاره الأستاذ) */
  status: "ok" | "check";
  include: boolean;
};

export type ParseOutcome =
  | { ok: true; slots: DraftSlot[]; orientation: "daysInRows" | "daysInColumns" }
  | { ok: false; reason: "noDays" | "noTimes" | "empty" };

// ── الأيام ────────────────────────────────────────────────

const DAY_WORDS: [number, RegExp][] = [
  [0, /^(ال)?احد$|^dimanche$|^dim\.?$|^sunday$/],
  [1, /^(ال)?(ا|إ)?ثنين$|^(ال)?اثنين$|^lundi$|^lun\.?$|^monday$/],
  [2, /^(ال)?ثلاثاء?$|^mardi$|^mar\.?$|^tuesday$/],
  [3, /^(ال)?اربعاء?$|^mercredi$|^mer\.?$|^wednesday$/],
  [4, /^(ال)?خميس$|^jeudi$|^jeu\.?$|^thursday$/],
  [5, /^(ال)?جمعه$|^vendredi$|^ven\.?$|^friday$/],
  [6, /^(ال)?سبت$|^samedi$|^sam\.?$|^saturday$/],
];

/** يوم الأسبوع من نص خلية («الأحد»، «Lundi»، «يوم الثلاثاء») أو null. */
export function parseDay(text: string): number | null {
  const words = nameKey(text).split(" ").filter(Boolean);
  if (!words.length || words.length > 3) return null;
  for (const w of words) {
    const k = w.replace(/^يوم/, "");
    for (const [d, re] of DAY_WORDS) if (re.test(k)) return d;
  }
  return null;
}

// ── الأوقات ───────────────────────────────────────────────

const clampHour = (h: number) => (h >= 1 && h <= 6 ? h + 12 : h); // «1-2» بعد الظهر = 13-14

function toHM(h: string, m?: string): number | null {
  const hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (!Number.isFinite(hh) || hh > 23 || mm > 59) return null;
  return clampHour(hh) * 60 + mm;
}

const TIME = String.raw`(\d{1,2})(?:\s*(?::|\.|h|H|سا|س)\s*(\d{2})?)?`;
const RANGE = new RegExp(`${TIME}\\s*(?:-|–|—|/|à|a|الى|إلى|الي|to)\\s*${TIME}`);

/** مجال زمني من نص خلية: «08:00 - 09:00»، «8h-9h»، «من 8 إلى 9»، «8سا00-9سا00». */
export function parseTimeRange(text: string): { start: string; end: string } | null {
  const t = text.normalize("NFKC").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/من/g, " ");
  const m = RANGE.exec(t);
  if (!m) return null;
  let a = toHM(m[1]!, m[2]);
  let b = toHM(m[3]!, m[4]);
  if (a === null || b === null) return null;
  // «11-12» صباحًا يبقى كما هو؛ «12-1» ⇒ 12:00-13:00
  if (b <= a && b + 12 * 60 > a) b += 12 * 60;
  if (b <= a || b - a > 5 * 60 || a < 6 * 60) return null;
  if (a >= 24 * 60) a -= 12 * 60;
  return { start: fromMinutes(a), end: fromMinutes(b) };
}

/** وقت منفرد («08:00»، «8h»، أو قيمة Excel كتاريخ) ⇒ دقائق. */
export function parseSingleTime(text: string): number | null {
  const t = text.normalize("NFKC");
  if (RANGE.test(t)) return null;
  const m = /(?:^|\D)(\d{1,2})\s*(?::|\.|h|H|سا)\s*(\d{2})?(?:\D|$)/.exec(t) ?? /^\s*(\d{1,2})\s*$/.exec(t);
  if (!m) return null;
  const v = toHM(m[1]!, m[2]);
  return v !== null && v >= 6 * 60 && v <= 20 * 60 ? v : null;
}

// ── المواد والأقسام ───────────────────────────────────────

/** كلمات مفتاحية لكل مادة (بعد التوحيد)، منها مكوّنات العربية والرياضيات في الابتدائي. */
const SUBJECT_KEYS: Record<string, string[]> = {
  ar: ["عربيه", "قراءه", "تعبير", "كتابه", "املاء", "محفوظات", "خط", "نحو", "صرف", "قواعد", "مطالعه", "فهم المنطوق", "انتاج", "ادب", "نصوص", "langue arabe", "arabe"],
  math: ["رياضيات", "حساب", "هندسه", "قياس", "mathematiques", "maths", "math"],
  islamic: ["اسلاميه", "دينيه", "قران", "علوم اسلاميه", "islamique"],
  science: ["علميه", "تكنولوجيه", "علوم الطبيعه", "طبيعه والحياه", "sciences naturelles", "svt", "scientifique"],
  physics: ["فيزياء", "فيزيائيه", "physique", "physiques"],
  civic: ["مدنيه", "civique"],
  history: ["تاريخ", "histoire"],
  geography: ["جغرافيا", "geographie"],
  histgeo: ["تاريخ", "جغرافيا", "histoire", "geographie"],
  fr: ["فرنسيه", "francais", "lecture", "dictee", "expression", "production ecrite", "grammaire", "conjugaison", "orthographe"],
  en: ["انجليزيه", "انكليزيه", "انقليزيه", "anglais", "english"],
  tamazight: ["امازيغيه", "tamazight"],
  art: ["تشكيليه", "رسم", "فنيه", "dessin", "arts plastiques"],
  music: ["موسيقيه", "موسيقي", "musique"],
  pe: ["بدنيه", "رياضه", "eps", "sport", "education physique"],
  philosophy: ["فلسفه", "philosophie"],
  economics: ["اقتصاد", "مناجمنت", "economie"],
  accounting: ["محاسب", "تسيير", "comptab"],
  law: ["قانون", "droit"],
  engineering: ["هندسه مدنيه", "هندسه ميكانيكيه", "هندسه كهربائيه", "هندسه الطرائق", "genie"],
  informatics: ["اعلام الي", "معلوماتيه", "informatique"],
  german: ["المانيه", "allemand"],
  spanish: ["اسبانيه", "espagnol"],
  italian: ["ايطاليه", "italien"],
};

const words = (t: string) => ` ${nameKey(t).replace(/(^| )ال(?=\S{2})/g, "$1")} `;

/** المادة من نص خلية ضمن مواد الأستاذ (null إن لم تُعرف أو التبست). */
export function matchSubject(text: string, subjects: ImportSubject[]): string | null {
  const t = words(text);
  let best: { id: string; score: number } | null = null;
  for (const s of subjects) {
    const keys = [...(SUBJECT_KEYS[s.id] ?? []), s.label.ar, s.label.fr].map((k) => words(k).trim()).filter(Boolean);
    let score = 0;
    for (const k of keys) if (t.includes(` ${k} `) || (k.length >= 5 && t.includes(k))) score = Math.max(score, k.length);
    // «رياضه» (بدنية) لا تُحسب إن كانت الكلمة «رياضيات»
    if (s.id === "pe" && /رياضيات/.test(t)) score = 0;
    if (score && (!best || score > best.score)) best = { id: s.id, score };
  }
  if (best) return best.id;
  // تسامح مع أخطاء التعرّف: كلمة قريبة جدًا من كلمة مفتاحية («رياضيت»، «فرنسيه»)
  const textWords = t.trim().split(" ").filter((w) => w.length >= 4);
  let fuzzy: { id: string; sim: number } | null = null;
  for (const s of subjects) {
    if (s.id === "pe" && /رياضي/.test(t)) continue;
    const keys = [...(SUBJECT_KEYS[s.id] ?? []), s.label.ar, s.label.fr].flatMap((k) => words(k).trim().split(" ")).filter((k) => k.length >= 4);
    for (const w of textWords) for (const k of keys) {
      const sim = similarity(w, k);
      if (sim >= 0.8 && (!fuzzy || sim > fuzzy.sim)) fuzzy = { id: s.id, sim };
    }
  }
  return fuzzy?.id ?? null;
}

const STAGE_OF_LEVEL: Record<string, [string, string[]]> = {
  AP: ["AP", ["ا", "ابتدائي", "ap"]],
  AM: ["AM", ["م", "متوسط", "am"]],
  AS: ["AS", ["ث", "ثانوي", "as"]],
};

/** القسم من نص خلية: «3AP-01»، «1م2»، «1 م 2»، «3 متوسط 2»، «2AS1». */
export function matchClass(text: string, classes: ImportClass[]): string | null {
  const t = nameKey(text).replace(/\s+/g, " ");
  const compact = t.replace(/[\s-]/g, "");
  const hits = classes.filter((c) => {
    const n = c.level.match(/^\d/)?.[0] ?? "";
    const stage = STAGE_OF_LEVEL[c.level.slice(1)]?.[1] ?? [];
    const sec = String(Number.parseInt(c.section, 10));
    if (compact.includes(nameKey(c.displayName).replace(/[\s-]/g, ""))) return true;
    // التحضيري: «تحضيري»، «تحضيري 2»، «التحضيري-01»
    if (c.level === "PRE") return new RegExp(`تحضيري(?:ه|ة)?(?:\\s*-?\\s*0?${sec}(?!\\d)|(?![\\s-]*\\d))`).test(t);
    return stage.some((st) => {
      const re = new RegExp(`(^|[^\\d])${n}\\s*-?\\s*${st}\\s*-?\\s*0?${sec}(?!\\d)`);
      return re.test(t);
    });
  });
  return hits.length === 1 ? hits[0]!.id : null;
}

const EMPTY = /^(|-+|—|–|x|\/|راحه|فراغ|استراحه|pause|recreation|libre)$/;

// ── المدد داخل الخانة ─────────────────────────────────────

const toLatinDigits = (t: string) => t.normalize("NFKC").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));
// «(1سا)»، «(1 سا 30)»، «(30)»، «(30 د)»، «(45mn)»، وبلا أقواس مع الوحدة: «1سا»، «30د»
const DURATION = /\(\s*(\d{1,3})\s*(سا(?:عة|عات)?|س|h|د(?:قيقة|قائق)?|mn|min)?\s*(\d{1,2})?\s*(?:د|mn|min)?\s*\)?(?=\s|$|[^\d])|(?<![\d\p{L}])(\d{1,2})\s*(سا(?:عة|عات)?|د(?:قيقة|قائق)?)(?:\s*و?\s*(\d{1,2})\s*د)?(?!\p{L})/gu;

function durationOf(n: string, unit: string | undefined, extra: string | undefined): number {
  const v = Number(n);
  if (unit && /^(سا|س|h)/.test(unit)) return v * 60 + Number(extra ?? 0);
  if (unit) return v;
  return v <= 4 ? v * 60 : v; // «(1)» ساعة، «(30)» دقيقة
}

/** أجزاء خانة حسب المدد المكتوبة: «قراءة (1سا) تربية إسلامية (30)» ⇒ [قراءة 60، تربية إسلامية 30]. */
export function splitByDurations(text: string): { text: string; minutes: number | null }[] {
  const t = toLatinDigits(text);
  const out: { text: string; minutes: number | null }[] = [];
  let last = 0;
  for (const m of t.matchAll(DURATION)) {
    if (m[0].startsWith("(") && !m[0].trimEnd().endsWith(")") && m[2] === undefined) continue; // «(1» ناقصة بلا وحدة: ليست مدة
    const minutes = m[1] !== undefined ? durationOf(m[1], m[2], m[3]) : durationOf(m[4]!, m[5], m[6]);
    if (minutes < 10 || minutes > 240) continue;
    const piece = t.slice(last, m.index).replace(/^[\s/|+\-–—،,]+|[\s/|+\-–—،,]+$/g, "");
    last = m.index! + m[0].length;
    const prev = out.at(-1);
    // مدة في خانة وحدها بعد اسم المادة: تعود إليه
    if (!/\p{L}/u.test(piece)) {
      if (prev && prev.minutes === null) prev.minutes = minutes;
      continue;
    }
    out.push({ text: piece, minutes });
  }
  const tail = t.slice(last).replace(/^[\s/|+\-–—،,]+|[\s/|+\-–—،,]+$/g, "");
  if (/\p{L}/u.test(tail)) out.push({ text: tail, minutes: null });
  return out;
}

/** توزيع خانة زمنية على أجزائها: المدد المكتوبة كما هي، والباقي بالتساوي على ما لا مدة له؛ الأخير ينتهي بنهاية الخانة. */
export function allocate(start: string, end: string, parts: { minutes: number | null }[]): { start: string; end: string }[] {
  const a = toMinutes(start);
  const b = toMinutes(end);
  const known = parts.reduce((n, p) => n + (p.minutes ?? 0), 0);
  const unknown = parts.filter((p) => p.minutes === null).length;
  const share = unknown ? Math.max(0, Math.round((b - a - known) / unknown / 5) * 5) : 0;
  let t = a;
  return parts.map((p, i) => {
    const s = Math.min(t, b);
    const e = i === parts.length - 1 && (p.minutes === null || t + p.minutes > b || unknown === 0 && known >= b - a) ? b : Math.min(b, t + (p.minutes ?? share));
    t = e;
    return { start: fromMinutes(s), end: fromMinutes(e) };
  });
}

// ── التحليل ───────────────────────────────────────────────

export function parseTimetable(grid: Grid, ctx: { classes: ImportClass[]; subjects: ImportSubject[] }): ParseOutcome {
  const rows = grid.map((r) => r.map((c) => c.text.replace(/\s+/g, " ").trim()));
  if (!rows.some((r) => r.some(Boolean))) return { ok: false, reason: "empty" };
  const width = Math.max(...rows.map((r) => r.length));
  const at = (r: number, c: number) => rows[r]?.[c] ?? "";

  // اتجاه الأيام: عمود أو سطر فيه ثلاثة أيام على الأقل
  const colDays = Array.from({ length: width }, (_, c) => rows.filter((_, r) => parseDay(at(r, c)) !== null).length);
  const rowDays = rows.map((r) => r.filter((x) => parseDay(x) !== null).length);
  const bestCol = colDays.indexOf(Math.max(...colDays));
  const bestRow = rowDays.indexOf(Math.max(...rowDays));
  let orientation: "daysInRows" | "daysInColumns";
  if ((colDays[bestCol] ?? 0) >= 3 && (colDays[bestCol] ?? 0) >= (rowDays[bestRow] ?? 0)) orientation = "daysInRows";
  else if ((rowDays[bestRow] ?? 0) >= 3) orientation = "daysInColumns";
  else return { ok: false, reason: "noDays" };

  // نوحّد: «أسطر الأيام» × «أعمدة الأوقات»
  const T = orientation === "daysInRows" ? rows.map((r) => Array.from({ length: width }, (_, c) => r[c] ?? "")) : Array.from({ length: width }, (_, c) => rows.map((r) => r[c] ?? ""));
  const dayIndex = orientation === "daysInRows" ? bestCol : bestRow;

  // صف الأوقات: أكثر صف فيه مجالات زمنية (أو أوقات منفردة)
  const timesOf = (r: number) => T[r]!.map((x, c) => (c === dayIndex ? null : parseTimeRange(x)));
  let timeRow = -1;
  let timeCount = 0;
  for (let r = 0; r < T.length; r++) {
    if (parseDay(T[r]![dayIndex] ?? "") !== null) continue;
    const n = timesOf(r).filter(Boolean).length;
    if (n > timeCount) [timeRow, timeCount] = [r, n];
  }
  let columnTimes: ({ start: string; end: string } | null)[];
  if (timeCount >= 2) {
    columnTimes = timesOf(timeRow);
  } else {
    // أوقات منفردة («8:00»، «9:00»…) ⇒ النهاية = بداية التالي
    let best = -1;
    let bestN = 0;
    for (let r = 0; r < T.length; r++) {
      const n = T[r]!.filter((x, c) => c !== dayIndex && parseSingleTime(x) !== null).length;
      if (n > bestN) [best, bestN] = [r, n];
    }
    if (bestN < 2) return { ok: false, reason: "noTimes" };
    timeRow = best;
    const starts = T[best]!.map((x, c) => (c === dayIndex ? null : parseSingleTime(x)));
    const ordered = starts.map((v, c) => ({ v, c })).filter((x): x is { v: number; c: number } => x.v !== null);
    const step = ordered.length > 1 ? ordered[1]!.v - ordered[0]!.v : 60;
    columnTimes = starts.map((v, c) => {
      if (v === null) return null;
      const next = ordered.find((o) => o.c !== c && o.v > v)?.v;
      const end = next && next - v <= 3 * 60 ? next : v + (step > 0 && step <= 180 ? step : 60);
      return { start: fromMinutes(v), end: fromMinutes(end) };
    });
  }

  // عنوان وقت مدموج على عدة أعمدة (خانة الفترة مقسومة لمادتين): العمود بلا عنوان يتبع العمود الموقوت قبله
  const blockOf: number[] = columnTimes.map((_, c) => c);
  for (let c = 1; c < columnTimes.length; c++) {
    if (columnTimes[c] || c === dayIndex || (T[timeRow]![c] ?? "").trim()) continue;
    const owner = blockOf[c - 1]!;
    if (columnTimes[owner] && owner !== dayIndex) blockOf[c] = owner;
  }

  const singleClass = ctx.classes.length === 1 ? ctx.classes[0]! : null;
  const out: DraftSlot[] = [];
  let seq = 0;
  let lastDay: number | null = null;
  for (let r = 0; r < T.length; r++) {
    if (r === timeRow) continue;
    const dayText = T[r]![dayIndex] ?? "";
    const parsed = parseDay(dayText);
    // سطر بلا يوم تحت يوم (الفترة المسائية في سطر ثانٍ): يرث اليوم السابق
    const day = parsed ?? (dayText ? null : lastDay);
    if (parsed !== null) lastDay = parsed;
    if (day === null) continue;
    // خانات الفترات: نص كل أعمدتها بالترتيب
    const blocks = new Map<number, string[]>();
    T[r]!.forEach((raw, c) => {
      const b = blockOf[c]!;
      if (!columnTimes[b] || c === dayIndex) return;
      const text = raw.trim();
      if (!text || EMPTY.test(nameKey(text))) return;
      blocks.set(b, [...(blocks.get(b) ?? []), text]);
    });
    for (const [b, texts] of blocks) {
      const time = columnTimes[b]!;
      const whole = texts.join(" ");
      const pieces = texts.flatMap((x) => {
        const p = splitByDurations(x);
        return p.length ? p : [{ text: x, minutes: null }];
      });
      const split = pieces.length > 1 || pieces.some((p) => p.minutes !== null);
      const times = split ? allocate(time.start, time.end, pieces) : [time];
      pieces.forEach((piece, i) => {
        const text = split ? piece.text : whole;
        if (EMPTY.test(nameKey(text))) return;
        const classId = matchClass(text, ctx.classes) ?? matchClass(whole, ctx.classes) ?? singleClass?.id ?? "";
        const cls = ctx.classes.find((k) => k.id === classId);
        const pool = cls ? ctx.subjects.filter((s) => cls.subjectIds.includes(s.id)) : ctx.subjects;
        let subjectId = matchSubject(text, pool) ?? "";
        // أستاذ مادة واحدة: الخلية تذكر القسم فقط
        if (!subjectId && cls && cls.subjectIds.length === 1) subjectId = cls.subjectIds[0]!;
        const { start, end } = times[i]!;
        if (toMinutes(end) <= toMinutes(start)) return;
        out.push({
          key: `s${++seq}`,
          day,
          start,
          end,
          classId,
          subjectId,
          raw: split ? piece.text : whole,
          ...(split ? { split: true, label: piece.text.slice(0, 60) } : {}),
          status: classId && subjectId ? "ok" : "check",
          include: true,
        });
      });
    }
  }
  if (!out.length) return { ok: false, reason: "empty" };
  return { ok: true, slots: mergeContiguous(out), orientation };
}

/** حصتان متتاليتان لنفس القسم والمادة في اليوم نفسه ⇒ حصة واحدة (حصة مزدوجة). */
export function mergeContiguous(slots: DraftSlot[]): DraftSlot[] {
  const sorted = [...slots].sort((a, b) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start));
  const out: DraftSlot[] = [];
  for (const s of sorted) {
    const prev = out.at(-1);
    if (prev && !prev.split && !s.split && prev.day === s.day && prev.end === s.start && prev.classId === s.classId && prev.subjectId === s.subjectId && prev.classId && prev.subjectId) {
      prev.end = s.end;
      continue;
    }
    out.push({ ...s });
  }
  return out;
}
