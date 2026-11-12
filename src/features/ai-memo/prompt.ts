import { z } from "zod";
import { parseSecondary, STREAMS } from "../../shared/dz/secondary.ts";
import type { Memo } from "../lessons/memo.ts";

/* كاتب المذكرات بالذكاء الاصطناعي: الطلب، التعليمات، ومخطط الإجابة. منطق صرف (بلا شبكة) ليُختبر. */

export const AI_FORMATS = ["official", "detailed", "brief", "remedial"] as const;
export type AiFormat = (typeof AI_FORMATS)[number];

export const aiMemoRequest = z.object({
  level: z.string().regex(/^(?:PRE|[1-5]AP|[1-4]AM|[1-3]AS-[A-Z]{1,2})$/),
  subject: z.string().regex(/^[a-z]{2,16}$/),
  /** حصة من مذكرات المنصة (يُقرأ ملخّصها من الخادم) */
  lessonId: z
    .string()
    .regex(/^(?:PRE|[1-5]AP|[1-4]AM|[1-3]AS-[A-Z]{1,2})_[a-z]{2,16}_\d{3}$/)
    .optional(),
  topic: z.string().trim().min(2).max(200),
  segment: z.string().trim().max(200).optional(),
  domain: z.string().trim().max(200).optional(),
  activity: z.string().trim().max(120).optional(),
  week: z.number().int().min(1).max(40).optional(),
  format: z.enum(AI_FORMATS),
  minutes: z.number().int().min(15).max(120),
  notes: z.string().trim().max(600).optional(),
});
export type AiMemoRequest = z.infer<typeof aiMemoRequest>;

/** ملخّص الحصة من مذكرات المنصة (lessonSummaries) إن وُجد. */
export type LessonContext = { topic?: string; domain?: string; activity?: string; segmentTitle?: string; materials?: string; objectives?: string[] };

export type MemoLanguage = "ar" | "fr" | "en";
export const languageOf = (subject: string): MemoLanguage => (subject === "fr" ? "fr" : subject === "en" ? "en" : "ar");
export const stageOf = (level: string): "preschool" | "primary" | "middle" | "secondary" =>
  level === "PRE" ? "preschool" : level.endsWith("AM") ? "middle" : parseSecondary(level) ? "secondary" : "primary";

const SUBJECTS: Record<string, string> = {
  ar: "اللغة العربية",
  fr: "Langue française",
  en: "English",
  math: "الرياضيات",
  science: "التربية العلمية والتكنولوجية / علوم الطبيعة والحياة",
  physics: "العلوم الفيزيائية والتكنولوجيا",
  islamic: "التربية الإسلامية",
  civic: "التربية المدنية",
  history: "التاريخ",
  geography: "الجغرافيا",
  histgeo: "التاريخ والجغرافيا",
  informatics: "المعلوماتية",
  art: "التربية التشكيلية",
  music: "التربية الموسيقية",
  pe: "التربية البدنية والرياضية",
  tamazight: "اللغة الأمازيغية",
  philosophy: "الفلسفة",
  economics: "الاقتصاد والمناجمنت",
  accounting: "التسيير المحاسبي والمالي",
  law: "القانون",
  engineering: "التكنولوجيا (الهندسة)",
  german: "Deutsch",
  spanish: "Español",
  italian: "Italiano",
};
const LEVELS: Record<string, string> = {
  PRE: "التربية التحضيرية",
  "1AP": "السنة الأولى ابتدائي",
  "2AP": "السنة الثانية ابتدائي",
  "3AP": "السنة الثالثة ابتدائي",
  "4AP": "السنة الرابعة ابتدائي",
  "5AP": "السنة الخامسة ابتدائي",
  "1AM": "السنة الأولى متوسط",
  "2AM": "السنة الثانية متوسط",
  "3AM": "السنة الثالثة متوسط",
  "4AM": "السنة الرابعة متوسط",
};

/** اسم المستوى بالعربية: الثانوي بسنته وشعبته. */
function levelName(level: string): string {
  const s = parseSecondary(level);
  if (!s) return LEVELS[level] ?? level;
  const year = ["الأولى", "الثانية", "الثالثة"][s.year - 1];
  return `السنة ${year} ثانوي — ${STREAMS[s.stream].ar}`;
}

const FORMAT_RULES: Record<AiFormat, string> = {
  official:
    "النموذج الرسمي المعتاد للمرحلة واللغة (انظر «البنية» أدناه)، كاملًا وقابلًا للتنفيذ كما هو في القسم.",
  detailed:
    "النموذج الرسمي مفصّلًا: عمود إضافي للمدة الزمنية لكل مرحلة، مع الأجوبة المنتظرة من المتعلمين بين علامتي ==…==، وتعليمات دقيقة لكل نشاط، وتفريق بيداغوجي (نشاط للمتعثرين ونشاط إثرائي للمتفوقين).",
  brief: "نسخة مختصرة في صفحة واحدة: حقول رأس أساسية فقط، وثلاثة صفوف موجزة (الانطلاق، بناء التعلمات، الاستثمار) بجمل قصيرة.",
  remedial:
    "مذكرة معالجة بيداغوجية لنفس المحتوى: تشخيص الأخطاء الشائعة المتوقعة في هذا الدرس وأسبابها، ثم أنشطة علاجية متدرجة مصنّفة حسب الأفواج (متعثر، متوسط، متمكن)، وتقويم ختامي قصير.",
};

const STRUCTURE: Record<MemoLanguage | "middle-ar" | "preschool", string> = {
  ar: `الابتدائي (بالعربية):
- head: المادة/النشاط، المستوى، المقطع، الأسبوع (إن عُرف)، الميدان، المحتوى المعرفي، مركبات الكفاءة (إن كانت معروفة)، الهدف التعلمي (مؤشر الكفاءة)، الوسائل، المدة.
- cols: ["المراحل", "الوضعيات التعلمية والنشاطات المقترحة", "التقويم"].
- rows بالترتيب: «مرحلة الانطلاق» (وضعية انطلاقية أو تمهيد يثير الاهتمام)، «بناء التعلمات» (أنشطة الاكتشاف والملاحظة والاستنتاج، مع الحوصلة)، «التدريب والاستثمار» (تمارين تطبيقية وتقويم).`,
  "middle-ar": `المتوسط والثانوي (بالعربية):
- head: المادة، المستوى، المقطع التعلمي، الميدان، المورد المعرفي (عنوان الدرس)، الكفاءة الختامية (إن عُرفت)، مركبات الكفاءة، مؤشرات الكفاءة/الأهداف التعلمية، الوسائل، المدة.
- pre: الوضعية الانطلاقية/الإشكالية في إطار «> ».
- cols: ["المراحل", "سير الحصة (نشاط الأستاذ والمتعلم)", "التقويم"].
- rows بالترتيب: «وضعية الانطلاق»، «بناء التعلمات» (أنشطة متدرجة ثم الحوصلة في إطار «! »)، «إعادة الاستثمار».`,
  fr: `Français (rédige en français, de gauche à droite) :
- head : Projet / Séquence, Activité, Niveau, Durée, Composante de la compétence, Objectif d’apprentissage, Supports / Matériel.
- cols : ["Étapes", "Déroulement (activités de l’enseignant et de l’apprenant)", "Évaluation"].
- rows dans l’ordre : « Mise en situation / Éveil de l’intérêt », « Découverte et observation méthodique », « Application / Entraînement », « Évaluation ».`,
  en: `English (write in English, left to right):
- head: Sequence, Lesson, Level, Domain, Learning objective(s), Target structures, Lexis, Materials, Duration.
- cols: ["Stage", "Procedure", "Interaction"] (add "Timing" for the detailed format).
- rows in order: "Warming up", "Presentation", "Practice", "Use / Production".`,
  preschool: `التحضيري (بالعربية):
- head: المجال/النشاط، الكفاءة القاعدية، مؤشر الكفاءة، الوسائل، المدة.
- cols: ["المراحل", "سير النشاط", "التقويم"]، وrows: «الانطلاق»، «سير النشاط» (لعب وتجريب وحركة)، «الاستثمار».`,
};

const MARKUP = `ترميز النص داخل الخلايا وpre وafter:
- سطر «## عنوان» عنوان فرعي · سطر «- » عنصر قائمة · سطر «> » وضعية في إطار · سطر «! » حوصلة/تعريف في إطار.
- جدول: أسطر «|أ|ب|» وسطر «|---|---|» بعد الأول ليصبح رأسًا.
- داخل السطر: **غامق** و==جواب منتظر== و$رياضيات$ (مثل $\\frac{3}{4}$ و$x^{2}$ و$\\sqrt{x}$).
- لا قوائم متداخلة: كل عنصر قائمة سطر يبدأ مباشرة بـ «- » دون مسافات قبله، ولا عنصر فارغًا.
- لا HTML ولا Markdown آخر.`;

/** التعليمات الثابتة (تُخزَّن مؤقتًا): الدور، مبادئ المنهاج، البنية، الترميز. */
export const SYSTEM_PROMPT = `أنت مفتش تربوي وأستاذ خبير في المنظومة التربوية الجزائرية (مناهج الجيل الثاني، المقاربة بالكفاءات)، تكتب مذكرات (بطاقات تربوية) للأساتذة.

مبادئ يجب احترامها:
- التزم بمنهاج الجيل الثاني الجزائري للمستوى والمادة: المصطلحات الرسمية (المقطع، الميدان، الكفاءة الختامية، مركبات الكفاءة، مؤشرات الكفاءة، الوضعية الانطلاقية، الحوصلة، إعادة الاستثمار).
- المتعلم محور النشاط: وضعيات من محيطه الجزائري (أسماء، أماكن، أعياد، عملة الدينار…)، وأسئلة توجيهية متدرجة، وعمل فردي وثنائي وفوجي.
- الدقة العلمية أولًا: لا معلومة خاطئة، ولا أرقام صفحات من الكتاب المدرسي ما لم تُعطَ لك، ولا نصوص منسوبة لمؤلفين حقيقيين. إن احتجت نصًا أو تمرينًا فاكتبه أنت.
- احترم مدة الحصة: محتوى قابل للإنجاز فعلًا في الوقت المحدد.
- لغة المذكرة: العربية الفصحى، إلا مذكرات الفرنسية فبالفرنسية والإنجليزية فبالإنجليزية.
- إن كانت الحصة من مذكرات المنصة فالتزم بموضوعها وأهدافها المعطاة كما هي.

البنية حسب المرحلة واللغة:
${STRUCTURE.ar}

${STRUCTURE["middle-ar"]}

${STRUCTURE.fr}

${STRUCTURE.en}

${STRUCTURE.preschool}

${MARKUP}

المخرَج: JSON فقط حسب المخطط: title (عنوان الحصة)، head (أزواج label/value بالترتيب)، pre (نص قبل الجدول أو "")، cols، rows (كل صف خلية لكل عمود، أول خلية اسم المرحلة)، after (واجب منزلي أو ملاحظات أو "").`;

/** مخطط الإجابة (structured outputs). */
export const MEMO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "head", "pre", "cols", "rows", "after"],
  properties: {
    title: { type: "string" },
    head: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["label", "value"], properties: { label: { type: "string" }, value: { type: "string" } } },
    },
    pre: { type: "string" },
    cols: { type: "array", items: { type: "string" } },
    rows: { type: "array", items: { type: "array", items: { type: "string" } } },
    after: { type: "string" },
  },
} as const;

const aiMemoOutput = z.object({
  title: z.string(),
  head: z.array(z.object({ label: z.string(), value: z.string() })),
  pre: z.string(),
  cols: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string())).min(1),
  after: z.string(),
});

export const AI_AUTHOR = {
  ar: "مذكرة مقترحة بالذكاء الاصطناعي — راجعها قبل استعمالها في القسم",
  fr: "Fiche proposée par l’IA — à relire avant usage en classe",
  en: "AI-drafted lesson plan — review it before using it in class",
} satisfies Record<MemoLanguage, string>;

/** يحوّل JSON النموذج إلى مذكرة المنصة (بعد التحقق، وتسوية عرض الصفوف). */
export function toMemo(json: unknown, lang: MemoLanguage): { title: string; memo: Memo } {
  const o = aiMemoOutput.parse(json);
  const width = o.cols.length;
  const rows = o.rows.map((r) => (r.length >= width ? r.slice(0, width) : [...r, ...Array<string>(width - r.length).fill("")]));
  return {
    title: o.title.trim(),
    memo: {
      head: o.head.filter((h) => h.label.trim() && h.value.trim()).slice(0, 16).map((h) => [h.label.trim(), h.value.trim()] as [string, string]),
      ...(o.pre.trim() ? { pre: o.pre.trim() } : {}),
      cols: o.cols,
      rows,
      ...(o.after.trim() ? { after: o.after.trim() } : {}),
      author: AI_AUTHOR[lang],
      own: true,
    },
  };
}

/** نص الطلب: سياق الحصة والنموذج المطلوب ومثال من مذكرات الأساتذة. */
export function userPrompt(req: AiMemoRequest, ctx: LessonContext | null, example: Memo | null): string {
  const lang = languageOf(req.subject);
  const lines = [
    `المستوى: ${levelName(req.level)} (${req.level})`,
    `المادة: ${SUBJECTS[req.subject] ?? req.subject}`,
    `لغة المذكرة: ${lang === "ar" ? "العربية" : lang === "fr" ? "الفرنسية" : "الإنجليزية"}`,
    `الموضوع/الدرس: ${ctx?.topic || req.topic}`,
  ];
  const seg = ctx?.segmentTitle || req.segment;
  if (seg) lines.push(`المقطع: ${seg}`);
  if (ctx?.domain || req.domain) lines.push(`الميدان: ${ctx?.domain || req.domain}`);
  if (ctx?.activity || req.activity) lines.push(`النشاط: ${ctx?.activity || req.activity}`);
  if (req.week) lines.push(`الأسبوع الدراسي: ${req.week}`);
  if (ctx?.objectives?.length) lines.push(`الأهداف التعلمية المعتمدة في مذكرات المنصة:\n${ctx.objectives.map((o) => `- ${o}`).join("\n")}`);
  if (ctx?.materials) lines.push(`الوسائل في مذكرات المنصة: ${ctx.materials}`);
  lines.push(`مدة الحصة: ${req.minutes} دقيقة`);
  lines.push(`النموذج المطلوب: ${FORMAT_RULES[req.format]}`);
  if (req.notes) lines.push(`ملاحظات الأستاذ (التزم بها ما لم تخالف المنهاج):\n"""\n${req.notes}\n"""`);
  const parts = [lines.join("\n")];
  if (example) {
    parts.push(
      `مثال على أسلوب مذكرة أستاذ من المنصة (لمادة قريبة؛ استلهم البنية والأسلوب فقط ولا تنسخ المحتوى):\n${JSON.stringify(example)}`,
    );
  }
  parts.push("اكتب المذكرة الآن.");
  return parts.join("\n\n");
}

/** المثال الأنسب: نفس المرحلة والمادة، ثم نفس المادة في مرحلة أخرى، ثم مادة بنفس اللغة. */
export function pickExample(examples: Record<string, { memo: Memo }>, level: string, subject: string): Memo | null {
  // الثانوي أقرب إلى مذكرات المتوسط
  const stage = stageOf(level) === "primary" || stageOf(level) === "preschool" ? "primary" : "middle";
  const other = stage === "middle" ? "primary" : "middle";
  const lang = languageOf(subject);
  const sameLang = lang === "ar" ? ["ar", "islamic", "civic"] : [lang];
  for (const key of [`${stage}:${subject}`, `${other}:${subject}`, ...sameLang.flatMap((s) => [`${stage}:${s}`, `${other}:${s}`])]) {
    if (examples[key]) return examples[key].memo;
  }
  return null;
}
