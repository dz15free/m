import type { Locale } from "./config";

/* أسماء الأشهر كما يستعملها الأستاذ الجزائري. `Intl` بالعربية يعطي
   أسماء المشرق (يناير، فبراير...) أو السريانية، وكلاهما غير مألوف هنا. */
const MONTHS_DZ = [
  "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
  "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;

const WEEKDAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

const TZ = "Africa/Algiers";

/** مكوّنات التاريخ بتوقيت الجزائر، مهما كانت منطقة الخادم أو الجهاز. */
function partsInAlgiers(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), weekday };
}

/** «الخميس 24 سبتمبر 2026» / « jeudi 24 septembre 2026 » — بأرقام لاتينية. */
export function formatLongDate(date: Date, locale: Locale): string {
  if (locale === "fr") {
    return new Intl.DateTimeFormat("fr-DZ", {
      timeZone: TZ,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
  const { year, month, day, weekday } = partsInAlgiers(date);
  return `${WEEKDAYS_AR[weekday]} ${day} ${MONTHS_DZ[month - 1]} ${year}`;
}
