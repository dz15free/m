"use client";

import type { Piece } from "./layout";
import { groupFromTitle, pickReading, smartTable, type GridResult } from "./grid";
import type { OcrCanvas } from "./image";
import { detectHeader } from "./table";
import type { Table } from "./table";

/* OCR محلي بـ Tesseract (WASM) داخل Web Worker: لا تُرسل الصورة إلى أي خادم.
   الملفات (العامل، النواة، نماذج اللغة) تُخدم من /vendor/tesseract وتُكاش في المتصفح. */

export type OcrLang = "ara" | "fra" | "ara+fra";
type TesseractWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;
type PsmEnum = (typeof import("tesseract.js"))["PSM"];

/** أعمدة تُعاد قراءتها خلية خلية في الجداول المصوّرة */
const KEY_FIELDS = new Set(["last", "first", "full", "gender"]);

export class OcrEngine {
  private worker: TesseractWorker | null = null;
  private lang: OcrLang | null = null;
  private progress: (p: number) => void = () => {};
  private psm: PsmEnum | null = null;

  async init(lang: OcrLang, onProgress?: (p: number) => void) {
    this.progress = onProgress ?? (() => {});
    if (this.worker && this.lang === lang) return;
    await this.terminate();

    const { createWorker, OEM, PSM } = await import("tesseract.js");
    this.worker = await createWorker(lang.split("+"), OEM.LSTM_ONLY, {
      workerPath: "/vendor/tesseract/worker.min.js",
      corePath: "/vendor/tesseract/core",
      langPath: "/vendor/tesseract/lang",
      gzip: true,
      logger: (m) => {
        if (m.status === "recognizing text") this.progress(m.progress);
      },
    });
    this.psm = PSM;
    await this.worker.setParameters({
      // كتلة نصية واحدة: الأنسب للقوائم (أسطر متتالية)؛ الجداول المرسومة تُقرأ «متفرّقة» (انظر recognize)
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    this.lang = lang;
  }

  /** يتعرّف على صفحة ويعيدها جدولًا (أسطر × خلايا) مع ثقة كل خلية.
   *  جدول بخطوط مرسومة (قوائم الرقمنة المصوّرة): قراءة «متفرّقة» للصفحة، ثم بناء الشبكة من الخطوط،
   *  ثم إعادة قراءة خلايا الاسم واللقب والجنس منفردة (أدق بكثير، وتلتقط الأسماء على سطرين). */
  async recognize(canvas: OcrCanvas, opts: { refine?: "students" | "all" } = {}): Promise<{ table: Table; group?: string; confidence: number }> {
    if (!this.worker || !this.psm) throw new Error("OCR not initialised");
    const rules = canvas.rules;
    const ruled = !!rules && rules.h.length >= 3 && rules.v.length >= 2;
    await this.worker.setParameters({ tessedit_pageseg_mode: ruled ? this.psm.SPARSE_TEXT : this.psm.SINGLE_BLOCK });
    const { data } = await this.worker.recognize(canvas, {}, { blocks: true, text: false });
    const pieces: Piece[] = [];
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          for (const word of line.words) {
            if (!word.text.trim()) continue;
            pieces.push({
              text: word.text,
              conf: word.confidence,
              box: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 },
            });
          }
        }
      }
    }
    const grid = smartTable(pieces, ruled ? rules : undefined);
    if (grid.cells) await this.refineCells(canvas, grid, opts.refine ?? "students");
    return { table: grid.table, group: groupFromTitle(grid.title), confidence: data.confidence };
  }

  /** إعادة قراءة الخلايا المهمّة منفردة: قصّ بهامش أبيض، أبيض/أسود (يمحو بقايا الأطر الفاتحة)، كتلة واحدة. */
  private async refineCells(canvas: OcrCanvas, grid: GridResult, refine: "students" | "all") {
    const width = Math.max(0, ...grid.table.map((r) => r.length));
    const columns = detectHeader(grid.table)?.columns ?? [];
    // جداول التوقيت: كل الخلايا (المواد والأوقات)؛ قوائم التلاميذ: الاسم واللقب والجنس فقط
    const targets = refine === "all" ? Array.from({ length: width }, (_, c) => c) : columns.flatMap((f, c) => (KEY_FIELDS.has(f) ? [c] : []));
    if (!targets.length || !this.worker || !this.psm) return;
    await this.worker.setParameters({ tessedit_pageseg_mode: this.psm.SINGLE_BLOCK });
    const crop = document.createElement("canvas");
    const ctx = crop.getContext("2d", { willReadFrequently: true })!;
    const margin = 16;
    for (let r = refine === "all" ? 0 : 1; r < grid.table.length; r++) {
      for (const c of targets) {
        const b = grid.cells![r]?.[c];
        if (!b) continue;
        // أوسع قليلًا من الخلية: النص العربي ملاصق لحدّها الأيمن (والحدّ نفسه مُحي)
        const x0 = Math.max(0, Math.round(b.x0) - 4);
        const y0 = Math.max(0, Math.round(b.y0) - 2);
        const w = Math.min(canvas.width - x0, Math.round(b.x1 - b.x0) + 8);
        const h = Math.min(canvas.height - y0, Math.round(b.y1 - b.y0) + 4);
        if (w < 8 || h < 8) continue;
        crop.width = w + 2 * margin;
        crop.height = h + 2 * margin;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, crop.width, crop.height);
        ctx.drawImage(canvas, x0, y0, w, h, margin, margin, w, h);
        const img = ctx.getImageData(0, 0, crop.width, crop.height);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = img.data[i]! < 180 ? 0 : 255;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
        const { data } = await this.worker.recognize(crop);
        const row = grid.table[r]!;
        row[c] = pickReading(row[c] ?? { text: "" }, { text: data.text, conf: data.confidence });
      }
    }
    crop.width = crop.height = 0;
  }

  async terminate() {
    await this.worker?.terminate();
    this.worker = null;
    this.lang = null;
  }
}
