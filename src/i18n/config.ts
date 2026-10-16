export const locales = ["ar", "fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** اسم الكوكي الذي يحفظ لغة الواجهة (بلا بادئة في الروابط). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr",
};

export const localeLabel: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English",
};

/** للشاشات الضيقة (ثلاث لغات لا تتسع بأسمائها الكاملة بجانب الشعار). */
export const localeShort: Record<Locale, string> = {
  ar: "ع",
  fr: "FR",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
