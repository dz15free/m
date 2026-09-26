"use client";

import { grayToRgba, preprocess, rgbaToGray, type RuleLines } from "./preprocess";

/* تجهيز صورة القائمة قبل التعرّف (كله في المتصفح):
   - تدوير حسب EXIF (صور الهاتف) + تدوير يدوي بمضاعفات 90°
   - تحجيم إلى ~2400 بكسل للبعد الأطول: أدق للتعرّف وآمن لذاكرة الهواتف
   - تصحيح الإضاءة، تمديد التباين، وإزالة خطوط الجدول (preprocess.ts) */

const TARGET = 2400;

export async function loadImage(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

/** لوحة جاهزة للتعرّف، مع خطوط الجدول المكتشفة (بإحداثياتها بعد التقويم) لإعادة بناء الخلايا. */
export type OcrCanvas = HTMLCanvasElement & { rules?: RuleLines };

export function prepareForOcr(source: CanvasImageSource & { width: number; height: number }, rotation = 0): OcrCanvas {
  const scale = Math.min(3, TARGET / Math.max(source.width, source.height));
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const swap = rotation % 180 !== 0;

  const canvas = document.createElement("canvas");
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = rgbaToGray(image.data, canvas.width, canvas.height);
  const { rules } = preprocess(gray);
  grayToRgba(gray, image.data);
  ctx.putImageData(image, 0, 0);
  return Object.assign(canvas, { rules });
}

/** صورة مصغّرة للمعاينة في الواجهة. */
export function thumbnail(source: CanvasImageSource & { width: number; height: number }, rotation: number, max = 240): string {
  const scale = max / Math.max(source.width, source.height);
  const w = source.width * scale;
  const h = source.height * scale;
  const swap = rotation % 180 !== 0;
  const c = document.createElement("canvas");
  c.width = swap ? h : w;
  c.height = swap ? w : h;
  const ctx = c.getContext("2d")!;
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2, w, h);
  return c.toDataURL("image/jpeg", 0.7);
}
