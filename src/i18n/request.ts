import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "./config";

/* لغة الواجهة تُقرأ من الكوكي لا من الرابط: الأستاذ يختارها مرة واحدة
   (وتُحفظ لاحقًا في ملفه)، والروابط تبقى قصيرة وثابتة (`/app` لا `/ar/app`). */
export default getRequestConfig(async () => {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(stored) ? stored : defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: "Africa/Algiers",
  };
});
