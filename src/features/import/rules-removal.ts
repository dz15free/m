/* إزالة خطوط الجداول (الأطر) قبل التعرّف.
   القوائم الإدارية جداول بخطوط سوداء، ومحرّك التعرّف يقرأ الخطوط كحروف فيفسد
   الأسطر كلها. نكتشف الامتدادات الداكنة الطويلة أفقيًا وعموديًا (أطول بكثير
   من أي حرف) ونبيّضها. نتسامح مع ميلان خفيف للصورة بدمج بضعة أسطر متجاورة
   قبل القياس، فالخط المائل يصبح «درجات» متصلة. دالة نقية على مصفوفة رمادية. */

export type Gray = { data: Uint8ClampedArray; width: number; height: number };
/** خطوط الجدول المكتشفة: أفقية (pos = y) وعمودية (pos = x)، بامتدادها [a, b]. */
export type RuleLine = { pos: number; a: number; b: number };
export type RuleLines = { h: RuleLine[]; v: RuleLine[] };

export function removeTableRules(
  img: Gray,
  opts: { dark?: number; minRatio?: number; slack?: number; bridge?: number } = {},
  found?: RuleLines,
): number {
  const { data, width, height } = img;
  // عتبة متساهلة: الخطوط بعد التحسين رمادية ناعمة الحواف. الأمان يأتي من شرط الطول،
  // فلا حرف يصنع امتدادًا متصلًا بطول مئات البكسلات.
  const dark = opts.dark ?? 215;
  const slack = opts.slack ?? Math.max(1, Math.round(Math.min(width, height) / 600)); // تسامح الميلان (بكسل)
  const minH = Math.round(width * (opts.minRatio ?? 0.12)); // خط أفقي أطول من ~12% من العرض
  const minV = Math.round(height * (opts.minRatio ?? 0.12) * 0.6);

  const ink = new Uint8Array(width * height);
  for (let i = 0; i < ink.length; i++) ink[i] = data[i]! < dark ? 1 : 0;

  const mask = new Uint8Array(width * height);

  // الخطوط تُرسم أحيانًا خلية خلية (قوائم الرقمنة): امتدادات قصيرة بفجوات صغيرة عند الزوايا.
  // نصل الفجوات الصغيرة، ونشترط أن يكون الامتداد حبرًا شبه متصل (≥ 90%) ليبقى النص سليمًا:
  // خط قاعدة الكلمات العربية تقطعه فراغات الكلمات والحروف المنفصلة.
  const bridge = opts.bridge ?? Math.max(3, Math.round(Math.max(width, height) / 400));
  // الخط رفيع: سماكة الحبر عموديًا عليه صغيرة في أغلب نقاطه؛ أسفل سلسلة أرقام أو قاعدة كلمات سميك
  const maxThick = Math.max(6, Math.round(Math.max(width, height) / 300));
  const thickAt = (x: number, y: number, horizontal: boolean) => {
    let n = 1;
    for (let d = 1; d <= maxThick + 1; d++) {
      const xx = horizontal ? x : x - d, yy = horizontal ? y - d : y;
      if (xx < 0 || yy < 0 || !ink[yy * width + xx]) break;
      n++;
    }
    for (let d = 1; d <= maxThick + 1; d++) {
      const xx = horizontal ? x : x + d, yy = horizontal ? y + d : y;
      if (xx >= width || yy >= height || !ink[yy * width + xx]) break;
      n++;
    }
    return n;
  };
  const scan = (
    count: number,
    len: number,
    minLen: number,
    at: (i: number, k: number) => boolean,
    mark: (i: number, k: number) => void,
    thin: (i: number, k: number) => boolean,
    record?: RuleLine[],
  ) => {
    for (let i = 0; i < count; i++) {
      let start = -1;
      let lastOn = -1;
      let on = 0;
      const close = () => {
        const length = lastOn - start + 1;
        if (start >= 0 && length >= minLen && on / length >= 0.9) {
          let samples = 0;
          let thinCount = 0;
          for (let k = start; k <= lastOn; k += 3) {
            samples++;
            if (thin(i, k)) thinCount++;
          }
          if (thinCount >= 0.75 * samples) {
            for (let k = start; k <= lastOn; k++) mark(i, k);
            record?.push({ pos: i, a: start, b: lastOn });
          }
        }
        start = -1;
        on = 0;
      };
      for (let k = 0; k < len; k++) {
        if (!at(i, k)) {
          if (start >= 0 && k - lastOn > bridge) close();
          continue;
        }
        if (start < 0) start = k;
        lastOn = k;
        on++;
      }
      close();
    }
  };
  // أفقي: البكسل «داكن» إن كان أي بكسل ضمن ±slack عموديًا داكنًا (تسامح الميلان)
  scan(
    height,
    width,
    minH,
    (y, x) => {
      for (let dy = -slack; dy <= slack; dy++) {
        const yy = y + dy;
        if (yy >= 0 && yy < height && ink[yy * width + x]) return true;
      }
      return false;
    },
    (y, x) => {
      if (ink[y * width + x]) mask[y * width + x] = 1;
    },
    (y, x) => !ink[y * width + x] || thickAt(x, y, true) <= maxThick,
    found?.h,
  );
  // عمودي بالطريقة نفسها
  scan(
    width,
    height,
    minV,
    (x, y) => {
      for (let dx = -slack; dx <= slack; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < width && ink[y * width + xx]) return true;
      }
      return false;
    },
    (x, y) => {
      if (ink[y * width + x]) mask[y * width + x] = 1;
    },
    (x, y) => !ink[y * width + x] || thickAt(x, y, false) <= maxThick,
    found?.v,
  );
  if (found) {
    found.h = clusterLines(found.h, maxThick + 2);
    found.v = clusterLines(found.v, maxThick + 2);
  }

  // تبييض الخط مع هامش بكسل واحد حوله (الحواف المنعَّمة) دون المساس بما هو أبعد
  let removed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < height && xx >= 0 && xx < width && data[yy * width + xx]! < 235) {
            data[yy * width + xx] = 255;
            removed++;
          }
        }
      }
    }
  }
  return removed;
}

/** يدمج امتدادات الأسطر المتجاورة (سماكة الخط، الخطوط المزدوجة) في خط واحد. */
function clusterLines(segs: RuleLine[], tol: number): RuleLine[] {
  const sorted = [...segs].sort((p, q) => p.pos - q.pos || p.a - q.a);
  const out: (RuleLine & { n: number; sum: number })[] = [];
  for (const s of sorted) {
    const hit = out.find((o) => s.pos - o.pos <= tol && s.a <= o.b && s.b >= o.a);
    if (hit) {
      hit.a = Math.min(hit.a, s.a);
      hit.b = Math.max(hit.b, s.b);
      hit.sum += s.pos;
      hit.n++;
      hit.pos = s.pos; // آخر موضع لمقارنة الامتداد التالي
    } else out.push({ ...s, n: 1, sum: s.pos });
  }
  return out.map((o) => ({ pos: o.sum / o.n, a: o.a, b: o.b }));
}
