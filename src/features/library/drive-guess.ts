/* تصنيف تلقائي لملف جديد في مجلد المكتبة على Drive، من اسمه ومساره: الطور، العنوان، المستوى، المادة، النوع، اللغة.
   الأدمن يستطيع تعديل أي شيء بعد الاستيراد من محرّر المحتوى. */
import type { ContentDoc, ContentFile, ContentType } from "./logic";

export type DriveStage = ContentDoc["stage"];

export type DriveListing = { id: string; name: string; path: string; mime: string; size: number };

const LEVELS: [string, RegExp][] = [
  ["PRE", /تحضيري|التحضيرية|pr[ée]paratoire|pr[ée]scolaire/i],
  ["1AP", /س\s*1(?!\d)|سنة\s*ال?[اأ]ولى|السنة\s*ال?[اأ]ولى|(?<![A-Za-z0-9])1\s*A\.?P(?![A-Za-z])|1(?:ère|re)\s*(?:année|AP)|(?<![A-Za-z0-9])1PS(?![A-Za-z])/i],
  ["2AP", /س\s*2(?!\d)|سنة\s*(?:ال)?ثاني|السنة\s*الثاني|ثاتية|(?<![A-Za-z0-9])2\s*A\.?P(?![A-Za-z])|2e\s*(?:année|AP)|(?<![A-Za-z0-9])2PS(?![A-Za-z])/i],
  ["3AP", /س\s*3(?!\d)|سنة\s*(?:ال)?ثالث|السنة\s*الثالث|(?<![A-Za-z0-9])3\s*A\.?P(?![A-Za-z])|3e\s*(?:année|AP)|(?<![A-Za-z0-9])3PS(?![A-Za-z])/i],
  ["4AP", /س\s*4(?!\d)|سنة\s*(?:ال)?رابع|السنة\s*الرابع|(?<![A-Za-z0-9])4\s*A\.?P(?![A-Za-z])|4e\s*(?:année|AP)|(?<![A-Za-z0-9])4PS(?![A-Za-z])/i],
  ["5AP", /س\s*5(?!\d)|سنة\s*(?:ال)?خامس|السنة\s*الخامس|(?<![A-Za-z0-9])5\s*A\.?P(?![A-Za-z])|5e\s*(?:année|AP)|(?<![A-Za-z0-9])5PS(?![A-Za-z])/i],
];
// الترتيب: رقم بالحروف اللاتينية (1AM)، ثم «الأولى متوسط»/«1 متوسط»/«1م»، ثم ما يُفهم من «السنة الأولى» في مسار طور معروف
const ORD = ["[اأ]ولى|[اأ]ول", "ثاني[ةه]?", "ثالث[ةه]?", "رابع[ةه]?"];
const stageLevels = (prefix: "AM" | "AS", n: number, word: RegExp, short: string): [string, RegExp][] =>
  Array.from({ length: n }, (_, i) => [
    `${i + 1}${prefix}`,
    new RegExp(
      `(?<![A-Za-z0-9])${i + 1}\\s*${prefix[0]}\\.?${prefix[1]}(?![A-Za-z])|(?<![\\d])${i + 1}\\s*(?:${word.source})|(?:ال)?(?:${ORD[i]})\\s*(?:${word.source})|(?<![\\d])${i + 1}\\s*${short}(?![؀-ۿ])|${i + 1}(?:ère|re|e|ème)\\s*(?:année\\s*)?(?:${prefix === "AM" ? "moyenne|AM" : "secondaire|AS"})|س\\s*${i + 1}(?!\\d)|(?:ال)?سن[ةه]\\s*(?:ال)?(?:${ORD[i]})`,
      "i",
    ),
  ]);
const MIDDLE_LEVELS = stageLevels("AM", 4, /متوسط|moyen(?:ne)?/, "م");
const SECONDARY_LEVELS = stageLevels("AS", 3, /ثانوي|secondaire/, "ث");

const MIDDLE_HINT = /متوسط|المتوسط|(?<![A-Za-z0-9])[1-4]\s*A\.?M(?![A-Za-z])|moyen|\bCEM\b|\bBEM\b|شهادة التعليم المتوسط/i;
const SECONDARY_HINT = /ثانوي|الثانوي|(?<![A-Za-z0-9])[1-3]\s*A\.?S(?![A-Za-z])|lyc[ée]e|secondaire|بكالوريا|باكالوريا|\bBAC\b/i;

/** الطور من المسار والاسم؛ ما لا يدل على متوسط ولا ثانوي يُعدّ ابتدائيًا (معظم المجلد). */
export function guessStage(f: Pick<DriveListing, "name" | "path">): DriveStage {
  const hay = `${f.path} ${f.name}`;
  if (SECONDARY_HINT.test(hay)) return "secondary";
  if (MIDDLE_HINT.test(hay)) return "middle";
  return "primary";
}

// مواد المتوسط والثانوي (معرّفات taxonomy)؛ الفيزياء قبل «العلوم» و«التاريخ والجغرافيا» مادة واحدة
const UPPER_SUBJECTS: [string, RegExp][] = [
  ["en", /انجليزي|إنجليزي|english/i],
  ["fr", /فرنسي|fran[cç]ais|fiche|projet|s[ée]quence/i],
  ["german", /[اأ]لماني|allemand|deutsch/i],
  ["spanish", /[اإ]سباني|espagnol|español/i],
  ["italian", /[اإ]يطالي|italien/i],
  ["philosophy", /فلسف|philosoph/i],
  ["accounting", /محاسب|تسيير محاسبي|comptab/i],
  ["economics", /اقتصاد|مناجمنت|management|[ée]conomie/i],
  ["law", /قانون|droit/i],
  ["engineering", /هندسة (?:مدنية|كهربائية|ميكانيكية|الطرائق)|تكنولوجيا \(?هندسة|g[ée]nie/i],
  ["physics", /فيزياء|فيزيائي|physique/i],
  ["science", /علوم الطبيعة|طبيعية|SVT|sciences naturelles/i],
  ["informatics", /[اإ]علام آلي|معلوماتي|informatique/i],
  ["islamic", /[اإ]سلامي|شريعة/],
  ["civic", /مدني/],
  ["histgeo", /تاريخ|جغراف|histoire|g[ée]ographie/i],
  ["art", /تشكيل|فني/],
  ["music", /موسيق/],
  ["pe", /بدني|رياضة بدنية/],
  ["tamazight", /[اأ]مازيغ|tamazight/i],
  ["math", /رياضيات|math/i],
  ["ar", /عربي|لغة ع|[اأ]دب/],
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

/** التصنيف داخل طور معيّن (الطور المقترح من guessStage، أو الذي اختاره الأدمن). */
export function guessMeta(f: DriveListing, stage: DriveStage = guessStage(f)) {
  const hay = `${f.path} ${f.name}`;
  const levels = stage === "middle" ? MIDDLE_LEVELS : stage === "secondary" ? SECONDARY_LEVELS : LEVELS;
  const level = levels.find(([, re]) => re.test(hay))?.[0] ?? "";
  // ملف ابتدائي بلا تاريخ/جغرافيا منفصلين في الأطوار الأعلى، والعكس
  const subject = (stage === "primary" ? SUBJECTS : UPPER_SUBJECTS).find(([, re]) => re.test(hay))?.[0] ?? "";
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

export function driveToContentDoc(f: DriveListing, file: ContentFile, stage: DriveStage = guessStage(f)): ContentDoc {
  const g = guessMeta(f, stage);
  const free = ["textbook", "poster", "progression"].includes(g.type);
  return {
    title: g.language === "ar" ? { ar: g.title, fr: "" } : { ar: g.title, fr: g.title },
    stage,
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
