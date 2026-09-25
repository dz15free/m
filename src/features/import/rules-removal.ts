/* إزالة خطوط الجداول (الأطر) قبل التعرّف.
   القوائم الإدارية جداول بخطوط سوداء، ومحرّك التعرّف يقرأ الخطوط كحروف فيفسد
   الأسطر كلها. نكتشف الامتدادات الداكنة الطويلة أفقيًا وعموديًا (أطول بكثير
   من أي حرف) ونبيّضها. نتسامح مع ميلان خفيف للصورة بدمج بضعة أسطر متجاورة
   قبل القياس، فالخط المائل يصبح «درجات» متصلة. دالة نقية على مصفوفة رمادية. */

export type Gray = { data: Uint8ClampedArray; width: number; height: number };

export function removeTableRules(img: Gray, opts: { dark?: number; minRatio?: number; slack?: number } = {}): number {
  const { data, width, height } = img;
  // عتبة متساهلة: الخطوط بعد التحسين رمادية ناعمة الحواف. الأمان يأتي من شرط الطول،
  // فلا حرف يصنع امتدادًا متصلًا بطول مئات البكسلات.
  const dark = opts.dark ?? 190;
  const slack = opts.slack ?? Math.max(1, Math.round(Math.min(width, height) / 600)); // تسامح الميلان (بكسل)
  const minH = Math.round(width * (opts.minRatio ?? 0.12)); // خط أفقي أطول من ~12% من العرض
  const minV = Math.round(height * (opts.minRatio ?? 0.12) * 0.6);

  const ink = new Uint8Array(width * height);
  for (let i = 0; i < ink.length; i++) ink[i] = data[i]! < dark ? 1 : 0;

  const mask = new Uint8Array(width * height);

  // أفقي: البكسل «داكن» إن كان أي بكسل ضمن ±slack عموديًا داكنًا
  for (let y = 0; y < height; y++) {
    let start = -1;
    for (let x = 0; x <= width; x++) {
      let on = false;
      if (x < width) {
        for (let dy = -slack; dy <= slack && !on; dy++) {
          const yy = y + dy;
          if (yy >= 0 && yy < height && ink[yy * width + x]) on = true;
        }
      }
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        if (x - start >= minH) for (let xx = start; xx < x; xx++) if (ink[y * width + xx]) mask[y * width + xx] = 1;
        start = -1;
      }
    }
  }

  // عمودي بالطريقة نفسها
  for (let x = 0; x < width; x++) {
    let start = -1;
    for (let y = 0; y <= height; y++) {
      let on = false;
      if (y < height) {
        for (let dx = -slack; dx <= slack && !on; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < width && ink[y * width + xx]) on = true;
        }
      }
      if (on && start < 0) start = y;
      if (!on && start >= 0) {
        if (y - start >= minV) for (let yy = start; yy < y; yy++) if (ink[yy * width + x]) mask[yy * width + x] = 1;
        start = -1;
      }
    }
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
