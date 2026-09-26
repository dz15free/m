import type { Piece } from "./layout.ts";

export type TextItemLike =
  | { str: string; transform: number[]; width: number; height: number }
  | { type: "beginMarkedContent" | "beginMarkedContentProps" | "endMarkedContent"; actualText?: string | null };

/** عناصر نص pdf.js ⇒ قطع بإحداثيات (من الأعلى). المقاطع المعلَّمة بـ ActualText (كما يكتبها Chrome
 *  للعربية) تُستبدل بنصّها الصحيح: قطعة واحدة بمستطيل يجمع رسومها. عامل pdf.js معدَّل ليمرّر ActualText
 *  (scripts/copy-vendor-assets.mjs). */
export function piecesFromTextContent(items: TextItemLike[], pageHeight: number): Piece[] {
  const pieces: Piece[] = [];
  const spans: { text: string | null; box: Piece["box"] | null }[] = [];
  const boxOf = (it: { transform: number[]; width: number; height: number }) => {
    const [, , , scaleY, x = 0, y = 0] = it.transform;
    const h = Math.abs(scaleY ?? it.height) || it.height || 10;
    // إحداثيات PDF من الأسفل؛ نقلبها لتكون من الأعلى كالصور
    const top = pageHeight - y - h;
    return { x0: x, x1: x + it.width, y0: top, y1: top + h };
  };
  for (const it of items) {
    if ("type" in it) {
      if (it.type === "endMarkedContent") {
        const span = spans.pop();
        if (span?.text && span.box) pieces.push({ text: span.text, box: span.box });
      } else {
        const text = it.actualText?.trim() ? it.actualText : null;
        spans.push({ text, box: null });
      }
      continue;
    }
    if (!it.str.trim()) continue;
    // داخل مقطع ActualText (الأعمق): نجمع المستطيل فقط، والنص من ActualText
    const owner = [...spans].reverse().find((s) => s.text !== null);
    const box = boxOf(it);
    if (owner) {
      owner.box = owner.box
        ? { x0: Math.min(owner.box.x0, box.x0), x1: Math.max(owner.box.x1, box.x1), y0: Math.min(owner.box.y0, box.y0), y1: Math.max(owner.box.y1, box.y1) }
        : box;
      continue;
    }
    pieces.push({ text: fixLigatures(it.str), box });
  }
  return pieces;
}

/** رسم «لإ/لأ/لآ» المركّب يُقلب ترتيبه في بعض الملفات: «اإلعادة» ⇐ «الإعادة»، «األمين» ⇐ «الأمين».
 *  التسلسل «ا» ثم همزة على ألف ثم «ل» مستحيل في العربية، فالتصحيح آمن. */
export function fixLigatures(text: string): string {
  return text.replace(/ا([إأآ])ل/g, "ال$1");
}
