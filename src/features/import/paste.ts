import type { Table } from "./table.ts";
import { cleanCell } from "./text.ts";

/* تحويل نص ملصوق إلى جدول:
   - نسخ من Excel/Word جدول ⇐ أعمدة مفصولة بـ Tab.
   - CSV ⇐ فاصلة منقوطة أو فاصلة (إن كانت منتظمة في كل الأسطر).
   - أي شيء آخر (WhatsApp، رسالة، PDF) ⇐ عمود واحد، سطر لكل تلميذ.
   وإن لُصق كل شيء في سطر واحد مفصول بفواصل «،» نقسمه. */

export function pasteToTable(text: string): Table {
  let lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => cleanCell(l));

  // سطر واحد يحوي عدة أسماء مفصولة بفواصل عربية أو لاتينية
  if (lines.length === 1 && /[،,;]/.test(lines[0]!)) {
    lines = lines[0]!.split(/[،,;]/).filter((l) => cleanCell(l));
    return lines.map((l) => [{ text: l }]);
  }

  const sep = detectSeparator(lines);
  return lines.map((line) => (sep ? line.split(sep) : [line]).map((text) => ({ text })));
}

function detectSeparator(lines: string[]): string | null {
  if (lines.some((l) => l.includes("\t"))) return "\t";
  for (const sep of [";", ","]) {
    const counts = lines.map((l) => l.split(sep).length - 1);
    // فاصل حقيقي: موجود في أغلب الأسطر وبعدد ثابت تقريبًا
    const withSep = counts.filter((c) => c > 0);
    if (withSep.length >= Math.max(2, lines.length * 0.8) && new Set(withSep).size <= 2) return sep;
  }
  return null;
}
