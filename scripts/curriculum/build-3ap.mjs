/**
 * السنة الثالثة: الملخّصات من «المخطط السنوي لبناء التعلمات — سنة ثالثة» (content/curriculum/plans/3AP.json)،
 * والسير الكامل صفحات ملف «جميع مذكرات السنة الثالثة جميع المواد» (منشور للعموم). خطوط ذلك الملف معطوبة
 * الترميز، فيُتعرَّف على رأس كل صفحة ضوئيًا (ocr-headers.mjs) لمعرفة المادة والأسبوع:
 *   - رؤوس مذكرات العربية تحمل «المقطع N … الأسبوع k» ← أسبوع السنة من المخطط؛
 *   - المواد الأخرى تأتي بعد عربية الأسبوع نفسه، وتُعرف من «الميدان».
 *
 *   node scripts/curriculum/build-3ap.mjs <ocr.json> <out-dir>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [ocrPath, outDir] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(new URL("../../content/curriculum/plans/3AP.json", import.meta.url), "utf8"));
const ocr = JSON.parse(readFileSync(ocrPath, "utf8"));

const SEG_NAMES = [
  [1, /الإنسانية|الانسانية/],
  [2, /الاجتماعية/],
  [3, /الهوية/],
  [4, /الطبيعة|البيئة/],
  [5, /الرياضة|الصحة/],
  [6, /الثقافية/],
  [7, /الابتكار|الإبداع/],
  [8, /الأسفار|الاسفار|الرحلات/],
];
const SUBJECT = [
  ["math", /الأعداد والحساب|الاعداد والحساب|الفضاء والهندسة|المقادير والقياس|تنظيم المعطيات|الحساب والهندسة|الأعداد والعمليات/],
  ["islamic", /العقيدة|العبادات|القرآن الكريم|الحديث النبوي|السيرة|تهذيب السلوك|الأخلاق والآداب/],
  ["science", /الإنسان والمحيط|الانسان والمحيط|الإنسان والصحة|الانسان والصحة|المادة وعالم|المعلمة في الفضاء|التحكم في|الأشياء/],
  ["history", /تاريخ/],
  ["geography", /جغرافيا|جغرافية/],
  ["civic", /الحياة المدنية|الحياة الجماعية|الديمقراطية/],
  ["ar", /فهم المنطوق|تعبير شفوي|إنتاج شفوي|انتاج شفوي|فهم المكتوب|التعبير الكتابي|التعبير الشفهي|محفوظات|ميدان فهم/],
];

// أسبوع السنة ← (المقطع، أسبوع المقطع)
const schoolWeek = (seg, k) => {
  const weeks = plan.segments[seg]?.weeks ?? [];
  return weeks[Math.min(k, weeks.length) - 1] ?? weeks[weeks.length - 1];
};

let seg = 1;
let week = 2;
let subject = "ar";
let prev = "ar";
const pagesBy = {}; // subject → week → [pages]
const nextWeek = (sg, w) => {
  const ws = plan.segments[sg]?.weeks ?? [];
  return ws.find((x) => x > w) ?? w;
};
for (const { n, text } of ocr) {
  const t = text;
  const s = SUBJECT.find(([, re]) => re.test(t))?.[0];
  if (s) subject = s;
  const hasSeg = /المقطع/.test(t);
  // اسم المقطع أوثق من رقمه (أرقام المقاطع والأسابيع في المذكرات تخطئ أحيانًا)
  const segNum = hasSeg ? SEG_NAMES.find(([, re]) => re.test(t))?.[0] || Number(/المقطع\s*(?:التعليمي)?\s*:?\s*(\d)/.exec(t)?.[1] ?? 0) : 0;
  if (segNum === seg + 1 && (subject === "ar" || !/الميدان/.test(t))) {
    // بداية مقطع جديد (غلاف المقطع أو أول مذكرة عربية فيه)
    seg = segNum;
    week = plan.segments[seg].weeks[0];
    subject = "ar";
  } else if (subject === "ar") {
    if (prev !== "ar" && /فهم المنطوق|لوحة الق|فهم | لمنطوق/.test(t)) week = nextWeek(seg, week); // دورة عربية جديدة
    const k = hasSeg ? Number(/الأسب\S*\s*:?\s*(\d)/.exec(t)?.[1] ?? 0) : 0;
    if (k && segNum === seg) week = Math.max(week, schoolWeek(seg, k) ?? week);
  }
  prev = subject;
  if (n === 1) continue;
  ((pagesBy[subject] ??= {})[week] ??= []).push(n);
}

const segOfWeek = (w) => {
  for (const [n, s] of Object.entries(plan.segments)) if (w <= Math.max(...s.weeks) + 1) return Number(n);
  return 8;
};
const SOURCE = { ar: "المخطط السنوي لبناء التعلمات — سنة ثالثة؛ ومذكرات منشورة للعموم (ملف جميع المواد)", fr: "Planification annuelle — 3e année ; fiches partagées publiquement" };
const segTitle = (n) => `المقطع ${n}: ${plan.segments[n].title}`;

function write(subject, name, activity, lessons) {
  const out = {
    id: `3AP_${subject}`,
    level: "3AP",
    subject,
    title: `${name} — السنة الثالثة ابتدائي`,
    source: SOURCE,
    weekMode: "absolute",
    segments: Object.fromEntries(Object.entries(plan.segments).map(([n, s]) => [n, s.title])),
    lessons: lessons.map((l, i) => ({ order: i + 1, unitKind: "week", activity, body: "", sample: l.unit <= 2, ...l, segmentTitle: segTitle(l.segment) })),
  };
  writeFileSync(join(outDir, `3AP_${subject}.json`), JSON.stringify(out, null, 1));
  console.log(subject, out.lessons.length, "حصة،", out.lessons.filter((l) => l.pages.length).length, "بصفحات");
}
const pagesFor = (subject, w) => (pagesBy[subject]?.[w] ?? []).slice(0, 16);

// ── العربية: 8 حصص أسبوعية من المخطط ──
{
  const L = [];
  for (const [wk, a] of Object.entries(plan.ar)) {
    const w = Number(wk);
    const segment = segOfWeek(w);
    const S = plan.segments[segment];
    const base = { segment, unit: w, pages: pagesFor("ar", w), materials: "كتاب اللغة العربية، دفتر الأنشطة، السبورة" };
    const rows = [
      ["فهم المنطوق والتعبير الشفوي", "فهم المنطوق", a.text, [`يفهم النص المنطوق «${a.text}» ويتفاعل معه.`, "يعبّر شفويًا عن مضمونه بلغة سليمة."]],
      ["التعبير الشفوي (الأساليب والصيغ)", "التعبير الشفوي", `${a.text} — ${S.style}`, [`يوظّف (${S.style}) في وضعيات تواصلية دالة.`]],
      ["فهم المكتوب (قراءة: أداء وفهم)", "فهم المكتوب", a.text, [`يقرأ النص «${a.text}» قراءة سليمة معبّرة ويفهم معانيه.`]],
      ["قواعد نحوية", "فهم المكتوب", a.grammar, [`يتعرّف على ${a.grammar} ويوظّفه في جمل من إنشائه.`]],
      ["صرف وإملاء", "فهم المكتوب", a.morph, [`يتحكّم في ${a.morph} ويوظّفه في كتاباته.`]],
      ["المحفوظات", "فهم المكتوب", a.poem, [`يحفظ «${a.poem}» ويؤديه أداءً معبّرًا.`]],
      ["التعبير الكتابي", "التعبير الكتابي", a.writing, [`${a.writing}.`]],
      ["المشروع", "التعبير الكتابي", S.project, [`يُنجز مشروع المقطع: ${S.project}.`]],
    ];
    for (const [session, domain, topic, objectives] of rows) L.push({ ...base, session, domain, topic, objectives });
  }
  write("ar", "اللغة العربية", "لغة عربية", L);
}

// ── المواد ذات القوائم (الأسبوع، الموضوع) ──
const SIMPLE = {
  islamic: ["التربية الإسلامية", "تربية إسلامية", "كتاب التلميذ، المصحف المدرسي، وسائط سمعية", (t) => [`يتعرّف على «${t}» ويستظهر ما يلزم منه ويعمل به.`]],
  math: ["الرياضيات", "رياضيات", "كتاب التلميذ، دفتر الأنشطة، اللوحة، أوراق عمل", (t) => [`يتحكّم في: ${t}.`, "يحل مشكلات بتجنيد مكتسباته."]],
  science: ["التربية العلمية والتكنولوجية", "تربية علمية", "كتاب التلميذ، دفتر الأنشطة، وسائل التجربة", (t) => [`يتعرّف على ${t} ويوظّف ذلك في وضعيات من محيطه.`]],
  history: ["التاريخ", "تاريخ", "كتاب التاريخ والجغرافيا، خط الزمن، صور ووثائق", (t) => [`يتعرّف على ${t} ويوظّف أدوات المادة (الزمن والوثيقة).`]],
  art: ["التربية التشكيلية", "تربية تشكيلية", "خامات الرسم والتلوين، أوراق، أدوات", (t) => [`يوظّف ${t} في إنجاز عمل فني تشكيلي.`]],
  music: ["التربية الموسيقية", "تربية موسيقية", "القرص المضغوط التعليمي، مسجل صوتي، كلمات النشيد", (t) => [`يتعرّف على ${t} بالاستماع والأداء.`]],
};
const DOMAIN = {
  islamic: (t) => (/سورة/.test(t) ? "القرآن الكريم والحديث الشريف" : /النبي|آدم|نوح/.test(t) ? "السيرة النبوية وقصص الأنبياء" : /الإيمان|أركان|الصلاة|الصلوات|الوضوء|النداء|صلاة/.test(t) ? "مبادئ أولية في العقيدة والعبادات" : "تهذيب السلوك"),
  math: (t) => (/مرصوفة|تناظر|زاوية|منتصف|الاستقامية|المجسمات|المكعب|الدائرة|الأشكال/.test(t) ? "الفضاء والهندسة" : /قياس|الأطوال|كتل|السعات|مدد/.test(t) ? "المقادير والقياس" : /تمثيلات|منهجية/.test(t) ? "تنظيم المعطيات" : "الأعداد والحساب"),
  science: (t) => (/الأغذية|التغذية|القلب|النبض|العضلي/.test(t) ? "الإنسان والصحة" : /الحيوان|النبات|الماء|النفايات|المياه/.test(t) ? "الإنسان والمحيط" : /الليل|الأرض|الرزنامة/.test(t) ? "المعلمة في الفضاء والزمن" : "المادة وعالم الأشياء"),
  history: () => "أدوات ومفاهيم المادة",
  art: (t) => (/الألوان/.test(t) ? "الرسم والتلوين" : "فن التصميم والزخرفة"),
  music: () => "التذوق الموسيقي والاستماع / الأغنية التربوية والنشيد",
};
for (const [subject, [name, activity, materials, obj]] of Object.entries(SIMPLE)) {
  const L = plan[subject].map(([w, t]) => ({
    segment: segOfWeek(w),
    unit: w,
    session: activity,
    domain: DOMAIN[subject](t),
    topic: t,
    materials,
    objectives: obj(t),
    pages: ["art", "music"].includes(subject) ? [] : pagesFor(subject, w),
  }));
  write(subject, name, activity, L);
}

// توزيع الصفحات للمراجعة
const summary = Object.fromEntries(Object.entries(pagesBy).map(([s, ws]) => [s, Object.fromEntries(Object.entries(ws).map(([w, p]) => [w, p.length]))]));
console.error(JSON.stringify(summary));
