/* توحيد الأسماء للمقارنة والبحث (لا للعرض): الأستاذ يكتب «أية» والقائمة
   الرسمية «آية»، أو «بن عمر» و«بنعمر». الأصل المكتوب يُحفظ كما هو. */

const DIACRITICS = /[ً-ٰٟـ]/g; // التشكيل والشدّة والتطويل

export function normalizeArabic(text: string): string {
  return text
    .normalize("NFKC")
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");
}

/** مفتاح مقارنة: عربي موحّد + لاتيني بلا نبرات + أحرف صغيرة + بلا مسافات زائدة. */
export function nameKey(text: string): string {
  return normalizeArabic(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** تنظيف ما يكتبه المستخدم: مسافات مضاعفة وأطراف. */
export function cleanName(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** تشابه نصّين بين 0 و1 (Levenshtein نسبي) — لكشف التكرار المحتمل. */
export function similarity(a: string, b: string): number {
  const x = nameKey(a);
  const y = nameKey(b);
  if (x === y) return 1;
  if (!x.length || !y.length) return 0;
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[y.length]! / Math.max(x.length, y.length);
}
