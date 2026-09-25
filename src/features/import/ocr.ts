"use client";

import type { Piece } from "./layout";
import { piecesToTable } from "./layout";
import type { Table } from "./table";

/* OCR محلي بـ Tesseract (WASM) داخل Web Worker: لا تُرسل الصورة إلى أي خادم.
   الملفات (العامل، النواة، نماذج اللغة) تُخدم من /vendor/tesseract وتُكاش في المتصفح. */

export type OcrLang = "ara" | "fra" | "ara+fra";
type TesseractWorker = Awaited<ReturnType<(typeof import("tesseract.js"))["createWorker"]>>;

export class OcrEngine {
  private worker: TesseractWorker | null = null;
  private lang: OcrLang | null = null;
  private progress: (p: number) => void = () => {};

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
    await this.worker.setParameters({
      // كتلة نصية واحدة: الأنسب للقوائم والجداول (أسطر متتالية)
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });
    this.lang = lang;
  }

  /** يتعرّف على صفحة ويعيدها جدولًا (أسطر × خلايا) مع ثقة كل خلية. */
  async recognize(canvas: HTMLCanvasElement): Promise<{ table: Table; confidence: number }> {
    if (!this.worker) throw new Error("OCR not initialised");
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
    return { table: piecesToTable(pieces), confidence: data.confidence };
  }

  async terminate() {
    await this.worker?.terminate();
    this.worker = null;
    this.lang = null;
  }
}
