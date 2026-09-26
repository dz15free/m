"use client";

import type { Piece } from "./layout";
import { piecesToTable } from "./layout";
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

export type PdfResult =
  /** PDF نصّي؛ render يرسم الصفحات صورًا إن تبيّن أن النص مشوّه (ترميز خط خاص) */
  | { kind: "text"; pages: Table[]; render: () => Promise<HTMLCanvasElement[]> }
  /** PDF ممسوح (صور بلا نص): صفحات جاهزة لـ OCR */
  | { kind: "scanned"; pages: HTMLCanvasElement[] };

export async function readPdf(file: File, onProgress?: (page: number, total: number) => void): Promise<PdfResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const pages: Table[] = [];
  let chars = 0;
  for (let n = 1; n <= doc.numPages; n++) {
    onProgress?.(n, doc.numPages);
    const page = await doc.getPage(n);
    const { height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const pieces: Piece[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const [, , , scaleY, x, y] = item.transform as number[];
      const h = Math.abs(scaleY ?? item.height) || item.height || 10;
      // إحداثيات PDF من الأسفل؛ نقلبها لتكون من الأعلى كالصور
      const top = height - (y ?? 0) - h;
      pieces.push({ text: item.str, box: { x0: x ?? 0, x1: (x ?? 0) + item.width, y0: top, y1: top + h } });
      chars += item.str.trim().length;
    }
    pages.push(piecesToTable(pieces));
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
