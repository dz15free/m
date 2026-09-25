/* تنظيف النصوص القادمة من مصادر «متّسخة»: OCR، PDF، Excel، WhatsApp.
   دوال نقية مختبرة، مستقلة عن الواجهة. */

/** أرقام عربية مشرقية (٠-٩) وفارسية (۰-۹) → لاتينية. */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** علامات الاتجاه والمحارف الخفية التي تلصقها PDF وWord وWhatsApp. */
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿­]/g;
const TATWEEL = /ـ/g;
const ARABIC_LETTER = /[ء-يٱ-ۓۺ-ۿ]/;
const ARABIC_LETTERS_G = /[ء-يٱ-ۓۺ-ۿ]/g;
const LATIN_LETTERS_G = /[A-Za-zÀ-ÖØ-öø-ÿ]/g;

/** تنظيف خلية: محارف خفية، تطويل، أرقام، مسافات، وأشكال العرض (Presentation Forms) إلى حروف عادية. */
export function cleanCell(text: string): string {
  return normalizeDigits(
    text
      .normalize("NFKC") // يحوّل أشكال العرض العربية (ﺑ ﻦ) الناتجة عن بعض ملفات PDF إلى حروف عادية
      .replace(INVISIBLE, "")
      .replace(TATWEEL, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function hasArabic(text: string): boolean {
  return ARABIC_LETTER.test(text);
}

export function letterCounts(text: string): { arabic: number; latin: number } {
  // NFKC: أشكال العرض العربية (U+FE70–FEFF) التي تكتبها بعض ملفات PDF تُعدّ حروفًا عربية
  const t = text.normalize("NFKC");
  return {
    arabic: t.match(ARABIC_LETTERS_G)?.length ?? 0,
    latin: t.match(LATIN_LETTERS_G)?.length ?? 0,
  };
}

/** اتجاه السطر حسب غالبية الحروف. */
export function isRtl(text: string): boolean {
  const { arabic, latin } = letterCounts(text);
  return arabic > 0 && arabic >= latin;
}

/** نسبة المحارف التي هي حروف (عربية أو لاتينية) إلى غير المسافات. */
export function letterRatio(text: string): number {
  const compact = text.replace(/\s/g, "");
  if (!compact) return 0;
  const { arabic, latin } = letterCounts(compact);
  return (arabic + latin) / compact.length;
}

/* بادئات الأسطر في القوائم الملصوقة: ترقيم (1- ، 1. ، (1) ، ١) ، 01)، نقاط، وأطر WhatsApp. */
const WHATSAPP_PREFIX = /^\[?\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AaPp][Mm]|ص|م)?\]?\s*(?:-\s*)?[^:]{1,40}:\s*/;
const NUMBERING = /^\s*[([]?\s*\d{1,3}\s*[)\].\-–—:/]?\s+/;
const BULLET = /^\s*[•●○◦▪▫■□★☆✓✔\-–—*·>»]+\s*/;
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

export function stripLinePrefix(line: string): string {
  let out = normalizeDigits(line).replace(EMOJI, "");
  out = out.replace(WHATSAPP_PREFIX, "");
  // قد يجتمع نقطة وترقيم: "• 12- بن عمر"
  for (let i = 0; i < 2; i++) out = out.replace(BULLET, "").replace(NUMBERING, "");
  return out.trim();
}

/** يبقي الحروف والمسافات والفواصل المسموحة في الأسماء (الشرطة، الفاصلة العليا). */
export function keepNameChars(text: string): string {
  return text
    .replace(/[^\p{L}\p{M}\s'’\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
