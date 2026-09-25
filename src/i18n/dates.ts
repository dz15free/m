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

const HIJRI_MONTHS = [
  "محرّم", "صفر", "ربيع الأول", "ربيع الثاني", "جمادى الأولى", "جمادى الثانية",
  "رجب", "شعبان", "رمضان", "شوّال", "ذو القعدة", "ذو الحجة",
] as const;

/** التاريخ الهجري التقريبي (تقويم أم القرى) لخانة «الموافق لـ» في الدفاتر:
    قد يختلف بيوم عن الإعلان الرسمي في الجزائر حسب رؤية الهلال. */
export function formatHijri(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      timeZone: TZ,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(new Date(`${iso}T12:00:00Z`));
    const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)?.value ?? "", 10);
    const [day, month, year] = [get("day"), get("month"), get("year")];
    if (!day || !month || !year) return "";
    return `${day} ${HIJRI_MONTHS[month - 1]} ${year} هـ`;
  } catch {
    return "";
  }
}
