import { nameKey, similarity } from "../../shared/text/names.ts";
import { groupLines, piecesToTable, type Box, type Piece } from "./layout.ts";
import type { RuleLines } from "./rules-removal.ts";
import type { Table } from "./table.ts";
import { isRtl } from "./text.ts";

/* إعادة بناء جدول من «قطع بإحداثيات» (نص PDF أو كلمات OCR) هندسيًا، كما يراه الأستاذ:
   - الأعمدة: من فجوات تغطية البيانات أفقيًا، وتُسمّى بكلمات صف العناوين (ولو امتدّ على عدة أسطر).
   - الصفوف: من عمود الترتيب (1، 2، 3…)؛ كل كلمة تُلحق بأقرب صف عموديًا، فالخلايا
     ذات الأسطر المتعددة («تسنيم / رحاب»، «2016- / 11-22») تُجمع في صفّها الصحيح.
   بلا صف عناوين أو بلا عمود ترتيب ⇒ null، ويُستعمل التجميع بالأسطر المعتاد. */

type Word = { text: string; box: Box; conf?: number; line: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};
const cx = (b: Box) => (b.x0 + b.x1) / 2;
const cy = (b: Box) => (b.y0 + b.y1) / 2;
const union = (a: Box, b: Box): Box => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) });

/** كلمات عناوين الأعمدة المعروفة (بعد التوحيد ونزع «ال»). */
const HEADER_WORDS = new Set([
  "لقب", "اسم", "جنس", "ترتيب", "تسجيل", "تعريف", "ميلاد", "ازدياد", "رقم", "تاريخ", "مكان", "فوج", "فرعي", "صفه", "ملاحظات",
  "سن", "اعاده", "قسم", "ولي", "عنوان", "تلميذ", "تلاميذ",
  "nom", "noms", "prenom", "prenoms", "sexe", "date", "naissance", "lieu", "matricule", "classe", "numero", "n", "no", "ordre", "age",
]);
const NAME_WORDS = /^(لقب|اسم|تلميذ|nom|noms|prenom|prenoms)$/;
const bare = (w: string) => nameKey(w).replace(/^ال(?=..)/, "");

/** قطع السطر ⇒ كلمات (القطع المتلاصقة حرفًا حرفًا تُدمج). */
function lineWords(line: Piece[], rtl: boolean, index: number): Word[] {
  const ordered = [...line].sort((a, b) => (rtl ? b.box.x1 - a.box.x1 : a.box.x0 - b.box.x0));
  const h = median(ordered.map((p) => p.box.y1 - p.box.y0)) || 1;
  const words: Word[] = [];
  for (const p of ordered) {
    const prev = words.at(-1);
    const gap = prev ? (rtl ? prev.box.x0 - p.box.x1 : p.box.x0 - prev.box.x1) : Infinity;
    // فجوة صغيرة جدًا = نفس الكلمة (قطع PDF حرفًا حرفًا). كلمات OCR (لها ثقة) كلمات أصلًا فلا تُدمج
    if (prev && p.conf === undefined && gap <= 0.15 * h) {
      prev.text += p.text;
      prev.box = union(prev.box, p.box);
      if (p.conf !== undefined) prev.conf = Math.min(prev.conf ?? 100, p.conf);
    } else {
      words.push({ text: p.text, box: { ...p.box }, conf: p.conf, line: index });
    }
  }
  return words.flatMap((w) => {
    // قطعة PDF واحدة قد تحمل عدة كلمات بمسافات: نقسمها بالتناسب
    const parts = w.text.trim().split(/\s+/);
    if (parts.length < 2) return [{ ...w, text: w.text.trim() }];
    const total = parts.reduce((n, t) => n + t.length, 0) + parts.length - 1;
    let offset = 0;
    return parts.map((t) => {
      const width = ((w.box.x1 - w.box.x0) * t.length) / total;
      const x0 = rtl ? w.box.x1 - offset - width : w.box.x0 + offset;
      offset += width + (w.box.x1 - w.box.x0) / total;
      return { ...w, text: t, box: { ...w.box, x0, x1: x0 + width } };
    });
  }).filter((w) => w.text);
}

/** cells: مستطيل كل خلية (بنفس ترتيب الجدول) — لإعادة قراءة الخلايا المهمّة منفردة في الصور */
export type GridResult = { table: Table; title?: string; cells?: Box[][] };

export function reconstructTable(pieces: Piece[]): GridResult | null {
  const lines = groupLines(pieces);
  if (lines.length < 4) return null;
  const rtl = isRtl(pieces.map((p) => p.text).join(" "));
  const lineWordsList = lines.map((l, i) => lineWords(l, rtl, i));
  const lineCenter = (i: number) => median(lineWordsList[i]!.map((w) => cy(w.box)));
  const lineHeight = (i: number) => median(lineWordsList[i]!.map((w) => w.box.y1 - w.box.y0)) || 1;

  // 1) سطر العناوين: ثلاث كلمات عناوين على الأقل، منها كلمة اسم
  const headerIndex = lineWordsList.findIndex((ws) => {
    const keys = ws.map((w) => bare(w.text));
    return keys.filter((k) => HEADER_WORDS.has(k)).length >= 3 && keys.some((k) => NAME_WORDS.test(k));
  });
  if (headerIndex < 0) return null;
  const hc = lineCenter(headerIndex);
  const hh = lineHeight(headerIndex);
  const hasDigits = (i: number) => lineWordsList[i]!.some((w) => /\d/.test(w.text));
  // عناوين على عدة أسطر («رقم / التسجيل»، «تاريخ / الميلاد»): أسطر ملاصقة بلا أرقام
  const band = new Set<number>([headerIndex]);
  for (const dir of [-1, 1]) {
    for (let i = headerIndex + dir; i >= 0 && i < lines.length; i += dir) {
      if (Math.abs(lineCenter(i) - hc) > 1.6 * hh || hasDigits(i)) break;
      band.add(i);
    }
  }
  const headerWords = [...band].flatMap((i) => lineWordsList[i]!);
  const firstData = Math.max(...band) + 1;
  const dataWords = lineWordsList.slice(firstData).flat();
  if (dataWords.length < 4) return null;

  // 2) الأعمدة: مقاطع تغطية البيانات أفقيًا
  const h = median(dataWords.map((w) => w.box.y1 - w.box.y0)) || 1;
  const spans = dataWords.map((w) => [w.box.x0, w.box.x1] as [number, number]).sort((a, b) => a[0] - b[0]);
  const segs: { x0: number; x1: number; labels: Word[] }[] = [];
  for (const [a, b] of spans) {
    const last = segs.at(-1);
    if (last && a <= last.x1 + 0.08 * h) last.x1 = Math.max(last.x1, b);
    else segs.push({ x0: a, x1: b, labels: [] });
  }
  for (const w of headerWords) {
    const c = cx(w.box);
    let best = segs[0]!;
    let dist = Infinity;
    for (const s of segs) {
      const d = c < s.x0 ? s.x0 - c : c > s.x1 ? c - s.x1 : 0;
      if (d < dist) [best, dist] = [s, d];
    }
    best.labels.push(w);
  }
  // مقطع بلا عنوان (فراغ بين كلمات خلية) يُدمج بأقرب جار
  let columns = segs;
  while (columns.some((s) => !s.labels.length) && columns.some((s) => s.labels.length)) {
    const i = columns.findIndex((s) => !s.labels.length);
    const s = columns[i]!;
    const left = columns[i - 1];
    const right = columns[i + 1];
    const gl = left ? s.x0 - left.x1 : Infinity;
    const gr = right ? right.x0 - s.x1 : Infinity;
    const into = gl <= gr ? left! : right!;
    into.x0 = Math.min(into.x0, s.x0);
    into.x1 = Math.max(into.x1, s.x1);
    columns = columns.filter((_, k) => k !== i);
  }
  if (columns.length < 2) return null;
  if (rtl) columns = [...columns].reverse();
  const colOf = (w: Word) => {
    const c = cx(w.box);
    let best = 0;
    let dist = Infinity;
    columns.forEach((s, k) => {
      const d = c < s.x0 ? s.x0 - c : c > s.x1 ? c - s.x1 : 0;
      if (d < dist) [best, dist] = [k, d];
    });
    return best;
  };

  // 3) الصفوف: عمود ترتيب (أعداد صغيرة) يحدد مرساة كل صف
  const byCol = columns.map((_, k) => dataWords.filter((w) => colOf(w) === k));
  const anchorCol = byCol.findIndex((ws) => {
    const nums = ws.filter((w) => /^\d{1,3}$/.test(w.text));
    return nums.length >= 2 && nums.length >= 0.6 * ws.length;
  });
  if (anchorCol < 0) return null;
  const anchors = byCol[anchorCol]!.filter((w) => /^\d{1,3}$/.test(w.text)).map((w) => cy(w.box)).sort((a, b) => a - b);
  const spacing = anchors.length > 1 ? median(anchors.slice(1).map((y, i) => y - anchors[i]!)) : 3 * h;
  const reach = Math.max(0.65 * spacing, 1.2 * h);

  const rows: Word[][] = anchors.map(() => []);
  for (const w of dataWords) {
    const y = cy(w.box);
    let best = -1;
    let dist = Infinity;
    anchors.forEach((a, k) => {
      const d = Math.abs(a - y);
      if (d < dist) [best, dist] = [k, d];
    });
    if (best >= 0 && dist <= reach) rows[best]!.push(w);
  }

  const cellText = (ws: Word[]) =>
    [...ws]
      .sort((a, b) => a.line - b.line || (rtl ? cx(b.box) - cx(a.box) : cx(a.box) - cx(b.box)))
      .map((w) => w.text)
      .join(" ")
      .replace(/(\d)\s*([-/.])\s+(\d)/g, "$1$2$3")
      .replace(/\s+/g, " ")
      .trim();
  const conf = (ws: Word[]) => {
    const cs = ws.map((w) => w.conf).filter((c): c is number => typeof c === "number");
    return cs.length ? Math.min(...cs) : undefined;
  };

  const header = columns.map((s) => ({ text: cellText(s.labels) }));
  const body = rows.map((ws) => columns.map((_, k) => {
    const inCell = ws.filter((w) => colOf(w) === k);
    return { text: cellText(inCell), conf: conf(inCell) };
  }));

  // العنوان (فوق صف العناوين): «قائمة التلاميذ للسنة: خامسة ابتدائي 01 …»
  const title = lineWordsList
    .slice(0, Math.min(...band))
    .map((ws) => cellText(ws))
    .find((t) => /قا[ئي]مه|قائمة|liste/i.test(nameKey(t)) || /قائمة|liste/i.test(t));

  return { table: [header, ...body], title };
}

/** القسم من عنوان القائمة الرسمية: «قائمة التلاميذ للسنة :خامسة ابتدائي 01 للسنة الدراسية …» ⇒ «خامسة ابتدائي 01». */
export function groupFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const m = /(?:للسنة|للقسم|لقسم|القسم|للفوج|الفوج|classe)\s*[:：]?\s*(.+?)\s*(?:للسنة الدراسية|السنة الدراسية|للموسم|année scolaire|annee scolaire|$)/i.exec(title);
  const g = m?.[1]?.replace(/[:：]\s*$/, "").trim();
  return g && g.length <= 40 ? g : undefined;
}

/** جدول من خطوطه المرسومة (صور القوائم): الصفوف بين الخطوط الأفقية والأعمدة بين العمودية.
 *  أدق طريقة للصور: لا تحتاج قراءة أرقام الترتيب، والخلية متعددة الأسطر تبقى في خليتها. */
export function reconstructFromRules(pieces: Piece[], rules: RuleLines): GridResult | null {
  if (rules.h.length < 3 || rules.v.length < 2 || pieces.length < 6) return null;
  const words = groupLines(pieces).flatMap((l, i) => lineWords(l, isRtl(l.map((p) => p.text).join(" ")), i));
  const rtl = isRtl(words.map((w) => w.text).join(" "));
  const h = median(words.map((w) => w.box.y1 - w.box.y0)) || 10;

  // حدود الجدول: أطول الخطوط الأفقية
  const longest = Math.max(...rules.h.map((l) => l.b - l.a));
  const hLines = rules.h.filter((l) => l.b - l.a >= 0.4 * longest).sort((a, b) => a.pos - b.pos);
  if (hLines.length < 3) return null;
  const top = hLines[0]!.pos;
  const bottom = hLines.at(-1)!.pos;
  const left = Math.min(...hLines.map((l) => l.a));
  const right = Math.max(...hLines.map((l) => l.b));
  // الأعمدة: خطوط عمودية داخل الجدول تغطي معًا جزءًا معتبرًا من ارتفاعه (قد تُرسم خلية خلية)
  const vByX: { pos: number; cover: number }[] = [];
  for (const l of rules.v) {
    if (l.pos < left - h || l.pos > right + h || l.b < top || l.a > bottom) continue;
    const hit = vByX.find((c) => Math.abs(c.pos - l.pos) <= h * 0.6);
    if (hit) hit.cover += l.b - l.a;
    else vByX.push({ pos: l.pos, cover: l.b - l.a });
  }
  const xs = vByX.filter((c) => c.cover >= 0.3 * (bottom - top)).map((c) => c.pos).sort((a, b) => a - b);
  if (xs[0] === undefined || xs[0] > left + h) xs.unshift(left);
  if (xs.at(-1)! < right - h) xs.push(right);
  const colBands = xs.slice(1).map((x, i) => [xs[i]!, x] as const).filter(([a, b]) => b - a > 0.8 * h);
  const rowBands = hLines.slice(1).map((l, i) => [hLines[i]!.pos, l.pos] as const).filter(([a, b]) => b - a > 0.8 * h);
  if (colBands.length < 2 || rowBands.length < 2) return null;
  const cols = rtl ? [...colBands].reverse() : colBands;

  const cells = rowBands.map(() => cols.map(() => [] as Word[]));
  const outside: Word[] = [];
  for (const w of words) {
    const x = cx(w.box);
    const y = cy(w.box);
    const r = rowBands.findIndex(([a, b]) => y >= a && y < b);
    const c = cols.findIndex(([a, b]) => x >= a && x < b);
    if (r >= 0 && c >= 0) cells[r]![c]!.push(w);
    else if (y < top) outside.push(w);
  }
  const text = (ws: Word[]) => cellText(ws, rtl);
  const rects = rowBands.map(([y0, y1]) => cols.map(([x0, x1]) => ({ x0, x1, y0, y1 })));
  const kept = cells.map((row, r) => ({ row: row.map((ws) => ({ text: text(ws), conf: minConf(ws) })), rect: rects[r]! })).filter((x) => x.row.some((c) => c.text));
  const rows = kept.map((x) => x.row);
  // صف العناوين: أول صف فيه كلمات عناوين معروفة، وما قبله (إن وُجد) يُهمل
  const headerAt = rows.findIndex((row) => {
    const keys = row.flatMap((c) => c.text.split(" ")).map(bare);
    return keys.filter((k) => HEADER_WORDS.has(k)).length >= 2 && keys.some((k) => NAME_WORDS.test(k));
  });
  const table = headerAt > 0 ? rows.slice(headerAt) : rows;
  const cellRects = (headerAt > 0 ? kept.slice(headerAt) : kept).map((x) => x.rect);
  if (table.length < 2) return null;
  const titleLines = groupLines(outside.map((w) => ({ text: w.text, box: w.box })));
  const title = titleLines.map((l) => text(lineWords(l, rtl, 0))).find((t) => /قا[ئي]مه|قائمة|liste/i.test(t) || /قا[ئي]مه/.test(nameKey(t)));
  return { table, title, cells: cellRects };
}

function cellText(ws: Word[], rtl: boolean): string {
  return [...ws]
    .sort((a, b) => (Math.abs(cy(a.box) - cy(b.box)) > 0.5 * (a.box.y1 - a.box.y0) ? cy(a.box) - cy(b.box) : rtl ? cx(b.box) - cx(a.box) : cx(a.box) - cx(b.box)))
    .map((w) => w.text)
    .join(" ")
    .replace(/(\d)\s*([-/.])\s+(\d)/g, "$1$2$3")
    .replace(/\s+/g, " ")
    .trim();
}
function minConf(ws: Word[]) {
  const cs = ws.map((w) => w.conf).filter((c): c is number => typeof c === "number");
  return cs.length ? Math.min(...cs) : undefined;
}

/** الجدول الأذكى المتاح: خطوط الجدول (صور)، ثم إعادة بناء بالعناوين وأرقام الترتيب، وإلا التجميع بالأسطر. */
export function smartTable(pieces: Piece[], rules?: RuleLines): GridResult {
  return (rules && reconstructFromRules(pieces, rules)) ?? reconstructTable(pieces) ?? { table: piecesToTable(pieces) };
}

/** دمج قراءتين لخلية (الصفحة كاملة ثم الخلية منفردة): قراءة الخلية أولى إن حملت كلمات أكثر
 *  (السطر الثاني من «نور / الهدى» يضيع في قراءة الصفحة) بثقة معقولة، وإلا الأعلى ثقة. */
export function pickReading(cur: { text: string; conf?: number }, cand: { text: string; conf: number }): { text: string; conf?: number } {
  const text = cand.text.replace(/\s+/g, " ").trim();
  if (!text) return cur;
  const letters = (t: string) => nameKey(t).replace(/\s/g, "");
  const a = letters(cur.text);
  const b = letters(text);
  const words = (t: string) => t.split(" ").filter(Boolean).length;
  const curConf = cur.text ? (cur.conf ?? 0) : -1;
  // نفس الحروف: الأوفر مسافات (قراءة الخلية تلصق «نور الهدى» أحيانًا)
  if (a && a === b) return words(text) > words(cur.text) ? { text, conf: Math.max(cand.conf, curConf) } : cur;
  // الخلية أضافت كلمة (سطر ثانٍ) وتحتوي قراءة الصفحة
  if (words(text) > words(cur.text) && cand.conf >= 50 && (!a || b.includes(a))) return { text, conf: cand.conf };
  // اختلاف كبير وقراءة الصفحة واثقة: نبقيها
  if (a && curConf >= 75 && similarity(a, b) < 0.6) return cur;
  if (words(text) > words(cur.text) && cand.conf >= 60) return { text, conf: cand.conf };
  return cand.conf > curConf ? { text, conf: cand.conf } : cur;
}
