"use client";

import { groupFromTitle, smartTable } from "./grid";
import { piecesFromTextContent, type TextItemLike } from "./pdf-text";
import { pasteToTable } from "./paste";
import type { Table } from "./table";

/* قراءة المصادر في المتصفح. المكتبات الثقيلة تُحمَّل عند الحاجة فقط (dynamic import)،
   ولا يُرفع أي ملف أو صورة إلى أي خادم: كل المعالجة على جهاز الأستاذ. */

export type SheetTable = { name: string; table: Table };

export class UnsupportedFileError extends Error {}

// ── Excel / CSV ───────────────────────────────────────────────

export async function readSpreadsheet(file: File): Promise<SheetTable[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt") || file.type === "text/csv") {
    return [{ name: file.name, table: pasteToTable(await file.text()) }];
  }
  if (name.endsWith(".xls") && !name.endsWith(".xlsx")) {
    // صيغة Excel 97-2003 القديمة: غير مدعومة هنا؛ الواجهة تقترح الحفظ بصيغة xlsx أو النسخ واللصق
    throw new UnsupportedFileError("xls");
  }
  const { default: readExcel } = await import("read-excel-file/browser");
  const sheets = await readExcel(file);
  return sheets
    .map((s) => ({
      name: s.sheet,
      table: s.data.map((row) => row.map((v) => ({ text: v === null || v === undefined ? "" : String(v) }))),
    }))
    .filter((s) => s.table.some((r) => r.some((c) => c.text.trim())));
}

// ── PDF ───────────────────────────────────────────────────────

/** صفحة مقروءة: جدولها، والقسم إن ذكره عنوانها (القوائم الرسمية: صفحة لكل قسم). */
export type PdfPage = { table: Table; group?: string };

export type PdfResult =
  /** PDF نصّي؛ render يرسم الصفحات صورًا إن تبيّن أن النص مشوّه (ترميز خط خاص) */
  | { kind: "text"; pages: PdfPage[]; render: () => Promise<HTMLCanvasElement[]> }
  /** PDF ممسوح (صور بلا نص): صفحات جاهزة لـ OCR */
  | { kind: "scanned"; pages: HTMLCanvasElement[] };

export async function readPdf(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // عنوان بإصدار: لا يبقى في أي هاتف عامل قديم (كاش المتصفح أو عامل الخدمة) لا يطابق المكتبة
  pdfjs.GlobalWorkerOptions.workerSrc = `/vendor/pdf/pdf.worker.min.mjs?v=${pdfjs.version}-actualtext1`;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const pages: PdfPage[] = [];
  let chars = 0;
  for (let n = 1; n <= doc.numPages; n++) {
    onProgress?.(n, doc.numPages);
    const page = await doc.getPage(n);
    const { height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent({ includeMarkedContent: true });
    const pieces = piecesFromTextContent(content.items as TextItemLike[], height);
    chars += pieces.reduce((n, p) => n + p.text.trim().length, 0);
    const grid = smartTable(pieces);
    pages.push({ table: grid.table, group: groupFromTitle(grid.title) });
  }

  // صفحات بدقة كافية للتعرّف (الرسم يستعمل أشكال الحروف، فيبقى صحيحًا حتى لو كان النص المخزّن مشوّهًا)
  const render = async () => {
    const canvases: HTMLCanvasElement[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(3, 2200 / Math.max(base.width, base.height)) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
    }
    return canvases;
  };

  if (chars >= 20) return { kind: "text", pages, render };
  // لا نص تقريبًا ⇒ صفحات ممسوحة
  return { kind: "scanned", pages: await render() };
}
