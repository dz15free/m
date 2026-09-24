export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

/** اسم الكوكي الذي يحفظ لغة الواجهة (بلا بادئة في الروابط). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeDir: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
};

export const localeLabel: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
