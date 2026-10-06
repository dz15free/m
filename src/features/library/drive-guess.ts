/* تصنيف تلقائي لملف جديد في مجلد المكتبة على Drive، من اسمه ومساره: العنوان، المستوى، المادة، النوع، اللغة.
   الأدمن يستطيع تعديل أي شيء بعد الاستيراد من محرّر المحتوى. */
import type { ContentDoc, ContentFile, ContentType } from "./logic";

export type DriveListing = { id: string; name: string; path: string; mime: string; size: number };

const LEVELS: [string, RegExp][] = [
  ["PRE", /تحضيري|التحضيرية|pr[ée]paratoire|pr[ée]scolaire/i],
  ["1AP", /س\s*1(?!\d)|سنة\s*ال?[اأ]ولى|السنة\s*ال?[اأ]ولى|(?<![A-Za-z0-9])1\s*A\.?P(?![A-Za-z])|1(?:ère|re)\s*(?:année|AP)|(?<![A-Za-z0-9])1PS(?![A-Za-z])/i],
  ["2AP", /س\s*2(?!\d)|سنة\s*(?:ال)?ثاني|السنة\s*الثاني|ثاتية|(?<![A-Za-z0-9])2\s*A\.?P(?![A-Za-z])|2e\s*(?:année|AP)|(?<![A-Za-z0-9])2PS(?![A-Za-z])/i],
  ["3AP", /س\s*3(?!\d)|سنة\s*(?:ال)?ثالث|السنة\s*الثالث|(?<![A-Za-z0-9])3\s*A\.?P(?![A-Za-z])|3e\s*(?:année|AP)|(?<![A-Za-z0-9])3PS(?![A-Za-z])/i],
  ["4AP", /س\s*4(?!\d)|سنة\s*(?:ال)?رابع|السنة\s*الرابع|(?<![A-Za-z0-9])4\s*A\.?P(?![A-Za-z])|4e\s*(?:année|AP)|(?<![A-Za-z0-9])4PS(?![A-Za-z])/i],
  ["5AP", /س\s*5(?!\d)|سنة\s*(?:ال)?خامس|السنة\s*الخامس|(?<![A-Za-z0-9])5\s*A\.?P(?![A-Za-z])|5e\s*(?:année|AP)|(?<![A-Za-z0-9])5PS(?![A-Za-z])/i],
];
const SUBJECTS: [string, RegExp][] = [
  // الإنجليزية أولًا: دروسها تحمل «Sequence» أيضًا (3PS_Sequence1_… Lesson Plans)
  ["en", /انجليزي|إنجليزي|english|(?<![A-Za-z])\dPS(?![A-Za-z])|\bPS\b|allotment|lesson ?plans?/i],
  ["fr", /فرنسي|fran[cç]ais|fiche|progression|projet|s[ée]quence/i],
  ["islamic", /[اإ]سلامي/],
  ["civic", /مدني/],
  ["science", /علمي|تكنولوج/],
  ["history", /تاريخ/],
  ["geography", /جغراف/],
  ["art", /تشكيل/],
  ["music", /موسيق/],
  ["pe", /بدني|رياضة بدنية/],
  ["tamazight", /[اأ]مازيغ|tamazight/i],
  ["math", /رياضيات|math/i],
  ["ar", /عربي|لغة ع/],
];
const TYPES: [ContentType, RegExp][] = [
  ["textbook", /الكتاب المدرسي|كتابي في|كراس النشاطات|دفتر الأنشطة|manuel|textbook/i],
  ["guide", /دليل|منهاج|مناهج|الوثيقة المرافقة|guide/i],
  ["progression", /مخطط|تدرج|التدرّج|توزيع|progression|planning|planification|allotment/i],
  ["poster", /معلق|affiche|poster|mural/i],
  ["evaluation", /تقويم|اختبار|فرض|[ée]valuation|examen/i],
  ["exercise", /تمارين|تمرين|أنشطة|exercice|worksheet/i],
  ["template", /نموذج|دفتر|template/i],
];

export function cleanTitle(name: string): string {
  return name
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/موقع\s*(راية|المنارة)\s*التعليم[ي]?\d*/g, "")
    .replace(/\(\d+\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function guessMeta(f: DriveListing) {
  const hay = `${f.path} ${f.name}`;
  const level = LEVELS.find(([, re]) => re.test(hay))?.[0] ?? "";
  const subject = SUBJECTS.find(([, re]) => re.test(hay))?.[0] ?? "";
  const type: ContentType = f.mime.startsWith("image/")
    ? TYPES.find(([, re]) => re.test(hay))?.[0] ?? "image"
    : f.mime.startsWith("video/")
      ? "video"
      : f.mime.startsWith("audio/")
        ? "audio"
        : (TYPES.find(([, re]) => re.test(hay))?.[0] ?? "fiche");
  const latin = !/[؀-ۿ]/.test(f.name);
  const language: "ar" | "fr" | "en" = subject === "en" ? "en" : subject === "fr" || (latin && /français|fiche|projet/i.test(hay)) ? "fr" : "ar";
  const title = cleanTitle(f.name) || f.name;
  return { title, level, subject, type, language };
}

/** معرّف ثابت للمحتوى المستورد من ملف Drive ⇐ لا يُستورد الملف مرتين. */
export const driveContentId = (driveId: string) => `drv-${driveId}`;

export function driveToContentDoc(f: DriveListing, file: ContentFile): ContentDoc {
  const g = guessMeta(f);
  const free = ["textbook", "poster", "progression"].includes(g.type);
  return {
    title: g.language === "ar" ? { ar: g.title, fr: "" } : { ar: g.title, fr: g.title },
    stage: "primary",
    level: g.level,
    subject: g.subject,
    language: g.language,
    type: g.type,
    term: 0,
    unit: "",
    tags: [],
    excerpt: "",
    access: free ? "free" : "premium",
    author: "",
    license: "public",
    files: [file],
    previewKey: "",
    status: "published",
    publishedAt: null,
  };
}
