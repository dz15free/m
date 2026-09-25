import { test } from "node:test";
import assert from "node:assert/strict";
import { removeTableRules } from "./rules-removal.ts";
import { preprocess } from "./preprocess.ts";

/** صفحة بيضاء 400×300 عليها إطار جدول مائل قليلًا و«حرف» صغير. */
function page() {
  const width = 400, height = 300;
  const data = new Uint8ClampedArray(width * height).fill(255);
  const set = (x: number, y: number, v = 20) => {
    if (x >= 0 && y >= 0 && x < width && y < height) data[Math.round(y) * width + Math.round(x)] = v;
  };
  for (let x = 20; x < 380; x++) {
    set(x, 50 + x * 0.02); set(x, 51 + x * 0.02, 120); // خط أفقي مائل بحافة رمادية
    set(x, 250 + x * 0.02);
  }
  for (let y = 50; y < 258; y++) set(200, y);           // خط عمودي
  for (let y = 120; y < 135; y++) for (let x = 100; x < 110; x++) set(x, y); // «حرف» 10×15
  return { data, width, height };
}

test("إزالة خطوط الجدول مع الإبقاء على الحروف", () => {
  const img = page();
  const removed = removeTableRules(img);
  assert.ok(removed > 900, `removed=${removed}`);
  // لا يبقى حبر على الخطوط
  for (let x = 25; x < 375; x += 10) assert.equal(img.data[Math.round(50 + x * 0.02) * 400 + x], 255);
  // الحرف سليم
  assert.equal(img.data[127 * 400 + 105], 20);
});

test("تصحيح الإضاءة: ظلّ متدرّج يصبح ورقًا أبيض والحبر يبقى داكنًا", () => {
  // بمقاس واقعي نسبيًا: خط الحرف أقصر بكثير من أي خط جدول
  const width = 800, height = 600;
  const data = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data[y * width + x] = 250 - x * 0.12; // ظلّ
  for (let y = 300; y < 320; y++) for (let x = 700; x < 706; x++) data[y * width + x] = 60; // حبر في منطقة الظلّ
  const img = { data, width, height };
  preprocess(img);
  assert.ok(img.data[100 * width + 780]! > 230, "الورق المظلّل صار أبيض");
  assert.ok(img.data[310 * width + 703]! < 100, "الحبر بقي داكنًا");
});
