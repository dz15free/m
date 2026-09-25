import { hasArabic } from "./text.ts";

/* تقسيم «الاسم الكامل» إلى لقب واسم.
   القوائم الإدارية الجزائرية تكتب غالبًا «اللقب ثم الاسم»: «بن عمر ياسين»،
   والفرنسية «NOM Prénom» باللقب بحروف كبيرة. الصعوبة في الألقاب والأسماء
   المركّبة، فنعرف أشهر بادئاتها. عند الشك يستطيع الأستاذ عكس الترتيب بنقرة. */

export type NameOrder = "lastFirst" | "firstLast";
export type SplitName = { last: string; first: string };

/** بادئات تلتصق بالكلمة التالية في اللقب: «بن عمر»، «آيت علي»، «عبد الله». */
const LAST_PREFIXES = new Set([
  "بن", "ابن", "بنت", "ايت", "آيت", "أيت", "اولاد", "أولاد", "ولد", "سي", "بو", "ابو", "أبو", "عبد", "ال", "آل",
  "ben", "bent", "ait", "aït", "ould", "si", "bou", "abou", "abd", "el", "al", "de", "da", "le", "la",
]);

/** بادئات الأسماء المركّبة: «عبد الرحمن»، «أم الخير»، «نور الهدى». */
const FIRST_PREFIXES = new Set(["عبد", "ابو", "أبو", "ام", "أم", "abd", "abdel", "abou", "oum"]);

const lower = (w: string) => w.toLocaleLowerCase("fr");
const isLastPrefix = (w: string) => LAST_PREFIXES.has(lower(w));
/** كلمة تبدأ بـ«ال» (أو el-/al-) تكمل الاسم السابق: «نور الهدى»، «محمد الأمين»، «نصر الدين». */
const isDefiniteTail = (w: string) => /^(ال|el[-\s]?|al[-\s]?)/i.test(w) && w.length > 2;

/** كلمة لاتينية بحروف كبيرة كليًا (لقب في القوائم الفرنسية). */
const isUpperLatin = (w: string) => /^[A-ZÀ-ÖØ-Þ'’-]{2,}$/.test(w);

/** يأخذ لقبًا من بداية الكلمات مع دمج البادئات، ويترك كلمة واحدة على الأقل للاسم. */
function takeLast(words: string[]): number {
  let n = 1;
  while (n < words.length - 1 && isLastPrefix(words[n - 1]!)) n++;
  return n;
}

/** يأخذ اسمًا من بداية الكلمات مع دمج المركّب، ويترك كلمة واحدة على الأقل للّقب. */
function takeFirst(words: string[]): number {
  let n = 1;
  while (n < words.length - 1 && (FIRST_PREFIXES.has(lower(words[n - 1]!)) || isDefiniteTail(words[n]!))) n++;
  return n;
}

export function splitFullName(full: string, order: NameOrder = "lastFirst"): SplitName {
  const words = full.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { last: "", first: "" };
  if (words.length === 1) return { last: words[0]!, first: "" };

  // القوائم اللاتينية: الكلمات الكبيرة كليًا هي اللقب أينما كانت
  if (!hasArabic(full)) {
    const upper = words.filter(isUpperLatin);
    if (upper.length > 0 && upper.length < words.length) {
      return {
        last: upper.join(" "),
        first: words.filter((w) => !isUpperLatin(w)).join(" "),
      };
    }
  }

  if (order === "lastFirst") {
    const n = takeLast(words);
    return { last: words.slice(0, n).join(" "), first: words.slice(n).join(" ") };
  }
  const n = takeFirst(words);
  return { first: words.slice(0, n).join(" "), last: words.slice(n).join(" ") };
}
