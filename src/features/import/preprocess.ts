import { removeTableRules, type Gray } from "./rules-removal.ts";

/* معالجة الصورة الرمادية قبل التعرّف — دوال نقية (تعمل في المتصفح وفي الاختبارات):
   1) تصحيح الإضاءة: قسمة كل بكسل على خلفيته المحلية (ظلّ اليد، ضوء النافذة)
   2) تمديد التباين بين 2% و98%
   3) إزالة خطوط الجدول (أكبر مُفسد لقراءة القوائم) */

export type { Gray };

export function rgbaToGray(rgba: Uint8ClampedArray, width: number, height: number): Gray {
  const data = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] = (rgba[i * 4]! * 299 + rgba[i * 4 + 1]! * 587 + rgba[i * 4 + 2]! * 114) / 1000;
  }
  return { data, width, height };
}

export function grayToRgba(gray: Gray, rgba: Uint8ClampedArray) {
  for (let i = 0; i < gray.data.length; i++) {
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = gray.data[i]!;
    rgba[i * 4 + 3] = 255;
  }
}

export function preprocess(gray: Gray): { rulesRemoved: number } {
  normalizeIllumination(gray);
  stretchContrast(gray);
  return { rulesRemoved: removeTableRules(gray) };
}

/** الخلفية = الحد الأعلى المحلي (الورق أفتح من الحبر) ثم تنعيم، على نسخة مصغّرة 1/8. */
export function normalizeIllumination(gray: Gray) {
  const { data, width, height } = gray;
  const f = 8;
  const sw = Math.max(1, Math.ceil(width / f));
  const sh = Math.max(1, Math.ceil(height / f));

  // كل خلية 8×8 ⇐ أفتح قيمة فيها (تقدير لون الورق دون الحبر)
  const small = new Float32Array(sw * sh);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = Math.floor(y / f) * sw + Math.floor(x / f);
      const v = data[y * width + x]!;
      if (v > small[i]!) small[i] = v;
    }
  }
  // توسيع (أقصى ضمن نافذة) ليبتلع الحروف السميكة، ثم متوسط لتنعيم الانتقالات
  const bg = boxMean(boxMax(small, sw, sh, 2), sw, sh, 4);

  for (let y = 0; y < height; y++) {
    const sy = Math.min(sh - 1, Math.floor(y / f));
    for (let x = 0; x < width; x++) {
      const b = Math.max(1, bg[sy * sw + Math.min(sw - 1, Math.floor(x / f))]!);
      data[y * width + x] = Math.min(255, (data[y * width + x]! / b) * 255);
    }
  }
}

export function stretchContrast(gray: Gray) {
  const { data } = gray;
  const hist = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) hist[data[i]!]!++;
  const pick = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) if ((acc += hist[v]!) >= data.length * q) return v;
    return 255;
  };
  // الطرف الداكن لا يتجاوز 100: في صفحة قليلة الحبر تكون النسبة 1% ورقًا لا حبرًا،
  // ولولا هذا الحد لصار الورق أسود. والطرف الفاتح: أغلب البكسلات ورق ⇐ أبيض ناصع.
  const lo = Math.min(pick(0.01), 100);
  const hi = Math.max(lo + 80, pick(0.6));
  for (let i = 0; i < data.length; i++) data[i] = ((data[i]! - lo) / (hi - lo)) * 255;
}

function boxMax(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w && src[yy * w + xx]! > m) m = src[yy * w + xx]!;
        }
      out[y * w + x] = m;
    }
  return out;
}

function boxMean(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy >= 0 && yy < h && xx >= 0 && xx < w) {
            s += src[yy * w + xx]!;
            n++;
          }
        }
      out[y * w + x] = s / n;
    }
  return out;
}
