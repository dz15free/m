import type { Cell, Table } from "./table.ts";
import { isRtl } from "./text.ts";

/* تحويل «نصوص بإحداثيات» إلى جدول: كلمات OCR أو مقاطع نص PDF.
   1) تجميع العناصر في أسطر حسب المحور العمودي.
   2) ترتيب كل سطر بترتيب القراءة: من اليمين لليسار للعربية.
   3) تقسيم السطر إلى خلايا عند الفجوات الأفقية الكبيرة (أعمدة الجدول). */

export type Box = { x0: number; y0: number; x1: number; y1: number };
export type Piece = { text: string; box: Box; conf?: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};

/** يجمع القطع في أسطر: قطعتان في سطر واحد إن تداخل مداهما العمودي بما يكفي. */
export function groupLines(pieces: Piece[]): Piece[][] {
  const sorted = [...pieces].filter((p) => p.text.trim()).sort((a, b) => a.box.y0 + a.box.y1 - (b.box.y0 + b.box.y1));
  const lines: { pieces: Piece[]; y0: number; y1: number }[] = [];
  for (const p of sorted) {
    const h = p.box.y1 - p.box.y0;
    const line = lines.find((l) => {
      const overlap = Math.min(l.y1, p.box.y1) - Math.max(l.y0, p.box.y0);
      return overlap > 0.5 * Math.min(h, l.y1 - l.y0);
    });
    if (line) {
      line.pieces.push(p);
      line.y0 = Math.min(line.y0, p.box.y0);
      line.y1 = Math.max(line.y1, p.box.y1);
    } else {
      lines.push({ pieces: [p], y0: p.box.y0, y1: p.box.y1 });
    }
  }
  // ترتيب الأسطر بمنتصفها الوسيط لا بأعلى قطعة: مربّع واحد طويل (خط جدول قرأه OCR) لا يقلب الترتيب
  const mid = (l: { pieces: Piece[] }) => median(l.pieces.map((p) => (p.box.y0 + p.box.y1) / 2));
  return lines.sort((a, b) => mid(a) - mid(b)).map((l) => l.pieces);
}

/**
 * يحوّل سطرًا إلى خلايا.
 * @param cellGap فجوة (بمضاعفات ارتفاع السطر) تفصل بين عمودين
 * @param wordGap فجوة أصغر منها تعني «نفس الكلمة» (مقاطع PDF المقطّعة)
 */
export function lineToCells(line: Piece[], cellGap = 1.2, wordGap = 0.12): Cell[] {
  const rtl = isRtl(line.map((p) => p.text).join(" "));
  const ordered = [...line].sort((a, b) => (rtl ? b.box.x1 - a.box.x1 : a.box.x0 - b.box.x0));
  const height = median(ordered.map((p) => p.box.y1 - p.box.y0)) || 1;

  const cells: { parts: string[]; confs: number[] }[] = [];
  let prev: Piece | null = null;
  for (const p of ordered) {
    // المسافة الأفقية بين نهاية السابق وبداية الحالي بترتيب القراءة
    const gap = prev ? (rtl ? prev.box.x0 - p.box.x1 : p.box.x0 - prev.box.x1) : Infinity;
    if (!prev || gap > cellGap * height) {
      cells.push({ parts: [p.text], confs: p.conf === undefined ? [] : [p.conf] });
    } else {
      const cell = cells[cells.length - 1]!;
      if (gap > wordGap * height) cell.parts.push(p.text);
      else cell.parts[cell.parts.length - 1] += p.text;
      if (p.conf !== undefined) cell.confs.push(p.conf);
    }
    prev = p;
  }
  return cells.map((c) => ({
    text: c.parts.join(" ").replace(/\s+/g, " ").trim(),
    conf: c.confs.length ? c.confs.reduce((a, b) => a + b, 0) / c.confs.length : undefined,
  }));
}

export function piecesToTable(pieces: Piece[], opts?: { cellGap?: number; wordGap?: number }): Table {
  return groupLines(pieces).map((line) => lineToCells(line, opts?.cellGap, opts?.wordGap));
}
