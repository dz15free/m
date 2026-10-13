/* مذكرة مُنسّقة بقالب المنصة: محتوى المذكرة الأصلية كما هو (حقول الرأس وأعمدة جدول السير بتسمياتها)، والشكل للمنصة.
   النص بترميز خفيف يكتبه المُفرِّغ ويُعرض في MemoSheet:
     سطر «## عنوان» عنوان فرعي · «- » عنصر قائمة · «> » وضعية (إطار) · «! » حوصلة/تعريف (إطار) · «|أ|ب|» جدول
     (سطر «|---|» بعد الأول يجعله رأسًا) · «[[fig b:12 x y w h]]» شكل مقتطع من صفحة المصدر (نِسَب 0–1 من عرضها وطولها)
     يصير بعد النشر «[[img n]]» · داخل السطر: **غامق** و==إجابة== و$رياضيات$ (من اليسار؛ فيها \frac{a}{b} و\sqrt{x}
     و^{x} و_{x}). */

export type Memo = {
  /** حقول البطاقة بترتيبها وتسمياتها في المذكرة: [التسمية، القيمة] */
  head: [string, string][];
  /** ما قبل الجدول (الإشكالية، الوضعية الانطلاقية…) */
  pre?: string;
  /** عناوين أعمدة جدول السير كما في المذكرة، وصفوفه (خلية لكل عمود) */
  cols: string[];
  rows: string[][];
  /** ما بعد الجدول (التعليمات، الواجب…) */
  after?: string;
  /** صاحب المذكرة الأصلية (يُذكر في التذييل) */
  author?: string;
  /** مذكرة من إعداد المنصة نفسها (لا مذكرة أستاذ مُنسّقة) */
  own?: boolean;
  /** صور الأشكال المقتطعة (JPEG base64) — تُملأ عند النشر */
  imgs?: string[];
};

export type MathNode =
  | { t: "text"; v: string }
  | { t: "frac"; n: MathNode[]; d: MathNode[] }
  | { t: "sqrt"; c: MathNode[] }
  | { t: "sup"; c: MathNode[] }
  | { t: "sub"; c: MathNode[] };

export type Inline =
  | { t: "text"; v: string }
  | { t: "b"; c: Inline[] }
  | { t: "hl"; c: Inline[] }
  | { t: "math"; c: MathNode[] };

export type Block =
  | { t: "p"; c: Inline[] }
  | { t: "h"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "box"; kind: "sit" | "key"; c: Block[] }
  | { t: "table"; head?: Inline[][]; rows: Inline[][][] }
  | { t: "fig"; ref: string; box: [number, number, number, number] }
  | { t: "img"; n: number }
  | { t: "gap" };

/** مجموعة {…} تبدأ عند from (بعد القوس): المحتوى وموضع ما بعد القوس المُغلِق. */
function group(s: string, from: number): [string, number] {
  let depth = 1;
  for (let i = from; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return [s.slice(from, i), i + 1];
  }
  return [s.slice(from), s.length];
}

export function parseMath(s: string): MathNode[] {
  const out: MathNode[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  // وسيط: {…} أو حرف واحد
  const arg = (i: number): [string, number] => (s[i] === "{" ? group(s, i + 1) : [s[i] ?? "", i + 1]);
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("\\frac", i)) {
      flush();
      const [n, j] = arg(i + 5);
      const [d, k] = arg(j);
      out.push({ t: "frac", n: parseMath(n), d: parseMath(d) });
      i = k;
    } else if (s.startsWith("\\sqrt", i)) {
      flush();
      const [c, j] = arg(i + 5);
      out.push({ t: "sqrt", c: parseMath(c) });
      i = j;
    } else if ((s[i] === "^" || s[i] === "_") && i + 1 < s.length) {
      flush();
      const [c, j] = arg(i + 1);
      out.push({ t: s[i] === "^" ? "sup" : "sub", c: parseMath(c) });
      i = j;
    } else text += s[i++];
  }
  flush();
  return out;
}

const INLINE = /\*\*(.+?)\*\*|==(.+?)==|\$(.+?)\$/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    if (m.index > last) out.push({ t: "text", v: s.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "b", c: parseInline(m[1]) });
    else if (m[2] !== undefined) out.push({ t: "hl", c: parseInline(m[2]) });
    else out.push({ t: "math", c: parseMath(m[3]!) });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out;
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => parseInline(c.trim()));

const FIG = /^\[\[fig\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\]\]$/;
const IMG = /^\[\[img\s+(\d+)\]\]$/;

export function parseBlocks(src: string | undefined): Block[] {
  const lines = (src ?? "").replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let i = 0;
  // سطور متتالية تبدأ بالبادئة نفسها
  const run = (prefix: string) => {
    const got: string[] = [];
    while (i < lines.length && lines[i]!.trimStart().startsWith(prefix)) got.push(lines[i++]!.trimStart().slice(prefix.length));
    return got;
  };
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line) {
      if (out.length && out.at(-1)!.t !== "gap") out.push({ t: "gap" });
      i++;
    } else if (line.startsWith("## ")) {
      out.push({ t: "h", c: parseInline(line.slice(3)) });
      i++;
    } else if (line.startsWith("- ")) {
      out.push({ t: "ul", items: run("- ").map(parseInline) });
    } else if (line.startsWith(">")) {
      out.push({ t: "box", kind: "sit", c: parseBlocks(run(">").map((l) => l.replace(/^ /, "")).join("\n")) });
    } else if (line.startsWith("!")) {
      out.push({ t: "box", kind: "key", c: parseBlocks(run("!").map((l) => l.replace(/^ /, "")).join("\n")) });
    } else if (line.startsWith("|")) {
      const rows = run("|").map((l) => "|" + l);
      const sep = rows.findIndex((r) => /^\|[\s|:-]+\|?$/.test(r.trim()));
      if (sep === 1) out.push({ t: "table", head: cells(rows[0]!), rows: rows.slice(2).map(cells) });
      else out.push({ t: "table", rows: rows.filter((r) => !/^\|[\s|:-]+\|?$/.test(r.trim())).map(cells) });
    } else if (FIG.test(line)) {
      const m = line.match(FIG)!;
      out.push({ t: "fig", ref: m[1]!, box: [Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])] });
      i++;
    } else if (IMG.test(line)) {
      out.push({ t: "img", n: Number(line.match(IMG)![1]) });
      i++;
    } else {
      out.push({ t: "p", c: parseInline(line) });
      i++;
    }
  }
  while (out.at(-1)?.t === "gap") out.pop();
  return out;
}

/** كل الأشكال المطلوب اقتطاعها في مذكرة، بترتيب ظهورها. */
export function memoFigures(memo: Memo): { ref: string; box: [number, number, number, number] }[] {
  const all = [memo.pre, ...memo.rows.flat(), memo.after].join("\n");
  return [...all.matchAll(new RegExp(FIG.source.slice(1, -1), "gm"))].map((m) => ({
    ref: m[1]!,
    box: [Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5])],
  }));
}

/** يستبدل الأشكال بمراجع صورها (بترتيب memoFigures). */
export function withImages(memo: Memo, imgs: string[]): Memo {
  let n = 0;
  const swap = (s?: string) => s?.replace(new RegExp(FIG.source.slice(1, -1), "gm"), () => `[[img ${n++}]]`);
  return { ...memo, pre: swap(memo.pre), rows: memo.rows.map((r) => r.map((c) => swap(c)!)), after: swap(memo.after), imgs };
}

/** نص مجرّد (للبحث وتقدير عرض الأعمدة). */
export function plainText(src: string | undefined): string {
  return (src ?? "")
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/\*\*|==|\$/g, "")
    .replace(/^\s*(##|-|>|!)\s?/gm, "");
}

/** عروض الأعمدة النسبية: حسب طول نص كل عمود، بحدّ أدنى للأعمدة القصيرة (المراحل، المدة). */
export function columnWidths(memo: Memo): number[] {
  const len = memo.cols.map((c, j) => Math.max(c.length, ...memo.rows.map((r) => Math.max(...plainText(r[j]).split("\n").map((l) => l.length)))));
  const w = len.map((n) => Math.sqrt(Math.max(4, n)));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => Math.max(7, Math.round((x / total) * 100)));
}

/** صيغة التخزين في Firestore (لا يقبل مصفوفات متداخلة): الحقول كائنات، والصفوف كائنات خلايا. */
export type StoredMemo = Omit<Memo, "head" | "rows"> & { head: { l: string; v: string }[]; rows: { c: string[] }[] };

export function memoToDoc(memo: Memo): StoredMemo {
  // Firestore يرفض الحقول undefined (pre/after الغائبة)
  const doc = { ...memo, head: memo.head.map(([l, v]) => ({ l, v })), rows: memo.rows.map((c) => ({ c })) };
  return Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== undefined)) as StoredMemo;
}

export function memoFromDoc(doc: StoredMemo): Memo {
  return { ...doc, head: doc.head.map(({ l, v }) => [l, v]), rows: doc.rows.map(({ c }) => c) };
}
