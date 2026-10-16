import type { Locale } from "./config.ts";

/* نصوص البيانات (المواد، المستويات، العطل، العروض، الإعلانات…) محفوظة بالعربية والفرنسية، والإنجليزية اختيارية:
   الواجهة الإنجليزية تأخذ الإنجليزية إن وُجدت، وإلا الفرنسية (حروف لاتينية)، وإلا العربية. */
export type L10n = { ar: string; fr: string; en?: string };

/** غياب النص (لا مادة/مستوى بهذا المعرّف) يُرجع undefined ليعمل البديل `?? id`. */
export function pick(v: Partial<L10n>, locale: Locale): string;
export function pick(v: Partial<L10n> | undefined | null, locale: Locale): string | undefined;
export function pick(v: Partial<L10n> | undefined | null, locale: Locale): string | undefined {
  if (!v) return undefined;
  if (locale === "ar") return v.ar || v.fr || v.en || "";
  if (locale === "en") return v.en || v.fr || v.ar || "";
  return v.fr || v.ar || v.en || "";
}

/** لغة Intl لتنسيق الأرقام والتواريخ (بأرقام لاتينية دائمًا). */
export const intlLocale = (locale: Locale): string => (locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-GB");

/** لغة البيانات المخزّنة بالعربية والفرنسية فقط (ملف الأستاذ، الإشعارات): الإنجليزية تأخذ الفرنسية. */
export const storedLocale = (locale: Locale): "ar" | "fr" => (locale === "ar" ? "ar" : "fr");
