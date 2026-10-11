"use client";

import { jpegPdf, MM_TO_PT, type PdfPage } from "./jpeg-pdf";
import { paginate, type Span } from "./paginate";
import { snapshotBody } from "./snapshot";

/* «حفظ PDF» دون نافذة الطباعة، يعمل على Android وiPhone والحاسوب:
   1) نضع الصفحة في «وضع الطباعة» (data-printing على <html> يفعّل أصناف print: وقواعد الطباعة) بعرض ورقة الطباعة؛
   2) نأخذ لقطة SVG (foreignObject) بأوراق أنماط المنصة نفسها فيرسمها المتصفح: العربية والخطوط والألوان كما هي؛
   3) نقسّمها صفحات A4 دون قطع سطر أو صف، ونقصّ كل صفحة من الرسم نفسه (صورة لكل صفحة بدقة ~190dpi)؛
   4) نجمع الصور في ملف PDF ونقدّمه للتنزيل. */

const PX_PER_MM = 96 / 25.4;
const SCALE = 2;
const IGNORE = "data-pdf-ignore";

type PageSetup = { widthMm: number; heightMm: number; margin: [number, number, number, number] };

const SIZES: Record<"a4" | "a5" | "letter", [number, number]> = { a4: [210, 297], a5: [148, 210], letter: [215.9, 279.4] };

function toMm(v: string): number | null {
  const m = /^(-?[\d.]+)(mm|cm|in|px|pt)?$/.exec(v.trim());
  if (!m) return null;
  const x = Number(m[1]);
  switch (m[2]) {
    case "cm": return x * 10;
    case "in": return x * 25.4;
    case "px": return x / PX_PER_MM;
    case "pt": return x / MM_TO_PT;
    default: return x;
  }
}

/** إعداد الورقة من قاعدة ‎@page‎ الفعّالة في الصفحة (الحجم والاتجاه والهوامش). */
export function pageSetup(): PageSetup {
  let rule: CSSPageRule | null = null;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) if (r instanceof CSSPageRule) rule = r;
    } catch {
      /* ورقة من نطاق آخر */
    }
  }
  let [w, h] = SIZES.a4;
  let margin: PageSetup["margin"] = [10, 10, 10, 10];
  if (rule) {
    const size = rule.style.getPropertyValue("size").toLowerCase().split(/\s+/).filter(Boolean);
    const named = size.find((s): s is keyof typeof SIZES => s in SIZES);
    if (named) [w, h] = SIZES[named];
    const dims = size.map(toMm).filter((x): x is number => x !== null);
    if (dims.length === 2) [w, h] = dims as [number, number];
    if (size.includes("landscape") && w < h) [w, h] = [h, w];
    if (size.includes("portrait") && w > h) [w, h] = [h, w];
    const side = (p: string) => toMm(rule!.style.getPropertyValue(p) || "") ?? null;
    const all = side("margin");
    margin = [side("margin-top") ?? all ?? 10, side("margin-right") ?? all ?? 10, side("margin-bottom") ?? all ?? 10, side("margin-left") ?? all ?? 10];
  }
  return { widthMm: w, heightMm: h, margin };
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const isSafari = () => /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent) || /iPhone|iPad|iPod/.test(navigator.userAgent);

function visible(el: Element) {
  return !el.closest(`[${IGNORE}]`);
}

/** مواضع القطع الإجبارية، والمجالات المحمية، وارتفاع المحتوى الفعلي — نسبةً إلى أعلى العنصر. */
function measure(root: HTMLElement) {
  const origin = root.getBoundingClientRect().top;
  const keep: Span[] = [];
  const forced: number[] = [];
  let bottom = 0;
  const add = (r: DOMRect, protect: boolean) => {
    if (r.height <= 0 || r.width <= 0) return;
    const s = { top: r.top - origin, bottom: r.bottom - origin };
    if (protect) keep.push(s);
    bottom = Math.max(bottom, s.bottom);
  };

  // أسطر النص: كل سطر وحدة لا تُقطع
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || !node.parentElement || !visible(node.parentElement)) continue;
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) add(r, true);
  }

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height <= 0) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const before = cs.breakBefore + cs.getPropertyValue("page-break-before");
    const after = cs.breakAfter + cs.getPropertyValue("page-break-after");
    if (/page|always|left|right/.test(before)) forced.push(r.top - origin);
    if (/page|always|left|right/.test(after)) forced.push(r.bottom - origin);
    const tag = el.tagName;
    const replaced = tag === "IMG" || tag === "SVG" || tag === "svg" || tag === "CANVAS" || tag === "INPUT" || tag === "VIDEO";
    const avoid = /avoid/.test(cs.breakInside + cs.getPropertyValue("page-break-inside")) || tag === "TR" || el.hasAttribute("data-pdf-keep");
    if (replaced || avoid) add(r, true);
    else if (tag === "TD" || tag === "TH" || tag === "HR" || el.classList.contains("doc-sheet") || parseFloat(cs.borderBottomWidth) > 0 || parseFloat(cs.borderTopWidth) > 0) add(r, false);
  }
  return { keep, forced, total: Math.ceil(bottom) };
}

function svgToImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("svg render failed"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function canvasJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? b.arrayBuffer().then((a) => resolve(new Uint8Array(a)), reject) : reject(new Error("jpeg encode failed"))),
      "image/jpeg",
      0.9,
    ),
  );
}

export type PdfProgress = (done: number, total: number) => void;

/** يبني ملف PDF من الصفحة الحالية كما تُطبع. */
export async function buildPdf({ title, onProgress }: { title: string; onProgress?: PdfProgress }): Promise<Blob> {
  const setup = pageSetup();
  const [mt, mr, mb, ml] = setup.margin;
  const contentW = Math.round((setup.widthMm - ml - mr) * PX_PER_MM);
  const contentH = Math.floor((setup.heightMm - mt - mb) * PX_PER_MM);

  const html = document.documentElement;
  const body = document.body;
  const prev = { width: body.style.width, minWidth: body.style.minWidth };
  html.setAttribute("data-printing", "");
  body.style.width = `${contentW}px`;
  body.style.minWidth = `${contentW}px`;
  try {
    await document.fonts.ready;
    await nextFrame();
    await nextFrame();

    const { keep, forced, total } = measure(body);
    if (!total) throw new Error("empty");
    const slices = paginate({ total, pageH: contentH, keep, forced });
    onProgress?.(0, slices.length);

    const snap = await snapshotBody(contentW, total);

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(contentW * SCALE);
    canvas.height = Math.round(contentH * SCALE);
    const ctx = canvas.getContext("2d")!;
    const pages: PdfPage[] = [];
    for (const [i, s] of slices.entries()) {
      const h = Math.max(1, Math.ceil(s.bottom - s.top));
      const img = await svgToImage(snap.svgFor(s.top, h));
      const draw = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, contentW * SCALE, h * SCALE);
      };
      draw();
      // Safari يفكّ الصور داخل foreignObject متأخرًا: إعادة الرسم بعد لحظة تضمن ظهورها
      if (isSafari()) {
        await sleep(120);
        draw();
      }
      pages.push({ jpeg: await canvasJpeg(canvas), width: canvas.width, height: canvas.height });
      onProgress?.(i + 1, slices.length);
    }

    const bytes = jpegPdf(
      pages,
      { pageW: setup.widthMm * MM_TO_PT, pageH: setup.heightMm * MM_TO_PT, x: ml * MM_TO_PT, y: mt * MM_TO_PT, w: (contentW / PX_PER_MM) * MM_TO_PT, h: (contentH / PX_PER_MM) * MM_TO_PT },
      title,
    );
    return new Blob([bytes], { type: "application/pdf" });
  } finally {
    html.removeAttribute("data-printing");
    body.style.width = prev.width;
    body.style.minWidth = prev.minWidth;
  }
}

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** تسليم الملف: تنزيل مباشر، وفي تطبيق iPhone المثبّت (حيث لا يعمل التنزيل) نافذة المشاركة ← «حفظ في الملفات». */
export async function deliverPdf(blob: Blob, fileName: string) {
  const file = new File([blob], fileName, { type: "application/pdf" });
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (isIOS() && standalone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function pdfFileName(title: string) {
  const clean = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
  return `${clean || "document"}.pdf`;
}
