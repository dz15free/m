import { test } from "node:test";
import assert from "node:assert/strict";
import { paginate } from "./paginate.ts";
import { jpegPdf } from "./jpeg-pdf.ts";

test("paginate: short document is one page", () => {
  assert.deepEqual(paginate({ total: 300, pageH: 1000, keep: [], forced: [] }), [{ top: 0, bottom: 300 }]);
});

test("paginate: never cuts through a protected line or row", () => {
  // أسطر بارتفاع 30 كل 40px؛ الصفحة 1000 تقع داخل السطر 990–1020
  const keep = Array.from({ length: 60 }, (_, i) => ({ top: i * 40 + 6, bottom: i * 40 + 36 }));
  const pages = paginate({ total: 2400, pageH: 1000, keep, forced: [] });
  for (const p of pages.slice(0, -1)) {
    assert.ok(p.bottom - p.top <= 1000);
    assert.ok(!keep.some((k) => k.top < p.bottom && k.bottom > p.bottom), `cut at ${p.bottom}`);
  }
  assert.equal(pages.at(-1)!.bottom, 2400);
});

test("paginate: honours forced page breaks", () => {
  const pages = paginate({ total: 1500, pageH: 1000, keep: [], forced: [500, 1500] });
  assert.deepEqual(pages.map((p) => [p.top, p.bottom]), [[0, 500], [500, 1500]]);
});

test("paginate: an element taller than a page is split at the page limit", () => {
  const pages = paginate({ total: 2500, pageH: 1000, keep: [{ top: 0, bottom: 2500 }], forced: [] });
  assert.deepEqual(pages.map((p) => p.bottom), [1000, 2000, 2500]);
});

test("jpegPdf: valid structure with one page per image", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const bytes = jpegPdf([{ jpeg, width: 2, height: 3 }, { jpeg, width: 2, height: 3 }], { pageW: 595, pageH: 842, x: 28, y: 28, w: 539, h: 786 }, "الدفتر اليومي");
  const text = new TextDecoder("latin1").decode(bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/Count 2/);
  assert.equal(text.match(/\/Subtype \/Image/g)?.length, 2);
  // جدول المراجع يشير إلى بدايات الكائنات فعلًا
  const xref = Number(/startxref\n(\d+)/.exec(text)![1]);
  assert.ok(text.slice(xref).startsWith("xref"));
  const offsets = [...text.slice(xref).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
  offsets.forEach((o, i) => assert.ok(text.slice(o).startsWith(`${i + 1} 0 obj`)));
});
