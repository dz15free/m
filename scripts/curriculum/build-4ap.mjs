/**
 * السنة الرابعة: الملخّصات من content/curriculum/plans/4AP.json (عناوين مستخرجة من رؤوس المذكرات)،
 * والسير الكامل صفحات ملف «مذكرات جميع المواد — سنة رابعة» (منشور للعموم). نصّ الملف سليم،
 * فتُصنَّف كل صفحة حسب المادة من رأسها، ويُعرف الأسبوع من بداية حزمة العربية («bundles» في المخطط).
 *
 *   node scripts/curriculum/build-4ap.mjs <memos.pdf> <out-dir>
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const [pdf, outDir] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(new URL("../../content/curriculum/plans/4AP.json", import.meta.url), "utf8"));
const nPages = Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [pdf]).toString())[1]);

// خطوط الملف تُخرج «لا» المركّبة مقلوبة («األسبوع») — يكفي تصحيح بدايات الكلمات لأغراض التصنيف
const clean = (s) =>
  s
    .replace(/[‎‏‪-‮-ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s(«])([وبفلك]?)ا([اأإآ])ل/g, "$1$2ال$3");

const HEAD_SUBJECT = [
  ["music", /تربية موسيقية|الموسيقية/],
  ["art", /تربية تشكيلية|تربية فنية/],
  ["pe", /تربية بدنية/],
  ["math", /رياضيات/],
  ["science", /تربية علمية/],
  ["civic", /تربية مدنية/],
  ["geography", /جغرافيا/],
  ["history", /تاريخ/],
  ["islamic", /تربية ا?إ?سالمية|تربية اسالمية|العلم و حسن الخلق|القرآن الكريم|العقيدة|تهذيب السلوك|السيرة|العبادات/],
];
const AR_HEAD = /عنوان المقطع|المقطع التعليمي|المقطع التعلمي|المقطع\s*:\s*[^\d\s]|فهم المنطوق|فهم المكتوب|محفوظات|النص المنطوق/;
const AR_ANY = /فهم المنطوق|فهم المكتوب|تعبير|محفوظات|قراءة|إدماج|ادماج|مطالعة/;

function classify(t) {
  const h = t.slice(0, 260);
  if (t.length < 40 && /dzexams/.test(t)) return "skip";
  if (/قصة بيتر/.test(h)) return "cont";
  const inHead = HEAD_SUBJECT.find(([, re]) => re.test(h))?.[0];
  if (inHead && !(inHead === "islamic" && AR_HEAD.test(h) && !/العلم و حسن الخلق|تربية/.test(h))) return inHead;
  if (AR_HEAD.test(h) || (AR_ANY.test(h) && !/رياضيات|تربية/.test(t.slice(0, 900)))) return "ar";
  // رؤوس جدولية: أقرب اسم نشاط في الصفحة
  let best = null;
  for (const [k, re] of HEAD_SUBJECT.slice(0, 8)) {
    const m = re.exec(t);
    if (m && (!best || m.index < best[1])) best = [k, m.index];
  }
  return best && best[1] < 900 ? best[0] : "cont";
}

const bundles = new Map(plan.bundles.map(([p, w]) => [p, w]));
const pagesBy = {}; // subject → week → [pages]
let week = 0;
let prev = "ar";
for (let n = 1; n <= nPages; n++) {
  if (bundles.has(n)) week = bundles.get(n);
  const t = clean(execFileSync("pdftotext", ["-f", String(n), "-l", String(n), pdf, "-"]).toString());
  let s = classify(t);
  if (s === "skip") continue;
  if (s === "cont") s = prev;
  prev = s;
  if (!week) continue;
  ((pagesBy[s] ??= {})[week] ??= []).push(n);
}

const segOfWeek = (w) => {
  for (const [n, s] of Object.entries(plan.segments)) if (w <= Math.max(...s.weeks) + 1) return Number(n);
  return 8;
};
const SOURCE = {
  ar: "مذكرات منشورة للعموم (ملف «مذكرات جميع المواد — سنة رابعة»)؛ العناوين والأسابيع مستخرجة منها",
  fr: "Fiches partagées publiquement (4e année, toutes matières)",
};
const segTitle = (n) => `المقطع ${n}: ${plan.segments[n].title}`;
const pagesFor = (subject, w) => (pagesBy[subject]?.[w] ?? []).slice(0, 16);

function write(subject, name, activity, lessons) {
  const out = {
    id: `4AP_${subject}`,
    level: "4AP",
    subject,
    title: `${name} — السنة الرابعة ابتدائي`,
    source: SOURCE,
    weekMode: "absolute",
    segments: Object.fromEntries(Object.entries(plan.segments).map(([n, s]) => [n, s.title])),
    lessons: lessons.map((l, i) => ({ order: i + 1, unitKind: "week", activity, body: "", sample: l.unit <= 3, ...l, segmentTitle: segTitle(l.segment) })),
  };
  writeFileSync(join(outDir, `4AP_${subject}.json`), JSON.stringify(out, null, 1));
  console.log(subject, out.lessons.length, "حصة،", out.lessons.filter((l) => l.pages.length).length, "بصفحات");
}

// ── العربية: حصص الأسبوع كما في المذكرات ──
{
  const L = [];
  for (const [wk, a] of Object.entries(plan.ar)) {
    const w = Number(wk);
    const segment = segOfWeek(w);
    const base = { segment, unit: w, pages: pagesFor("ar", w), materials: "كتاب اللغة العربية، دفتر الأنشطة، دليل الأستاذ (النص المنطوق)، السبورة" };
    const rows = a.integration
      ? [
          ["فهم المنطوق والتعبير الشفوي (إدماج)", "فهم المنطوق", a.text, ["يسترجع نصوص المقطع المنطوقة ويوظّف مكتسباته في وضعيات تواصلية."]],
          ["فهم المكتوب (إدماج)", "فهم المكتوب", a.read, ["يقرأ نصوص المقطع قراءة سليمة ويجنّد موارده في وضعية إدماجية."]],
          a.poem && ["المحفوظات", "فهم المكتوب", a.poem, [`يستظهر «${a.poem}» ويؤديه أداءً معبّرًا.`]],
          ["الإدماج والتعبير الكتابي", "التعبير الكتابي", a.writing, ["يحل الوضعية الإدماجية ويصحّح أخطاءه."]],
        ]
      : [
          a.text && ["فهم المنطوق", "فهم المنطوق", a.text, [`يفهم النص المنطوق «${a.text}» ويتفاعل معه.`, "يحدّد موضوع الوصف وعناصره."]],
          a.style && ["التعبير الشفوي (أستعمل الصيغ)", "التعبير الشفوي", a.style, [`يوظّف (${a.style}) في وضعيات تواصلية دالة.`]],
          a.oral && ["التعبير الشفوي (إنتاج شفوي)", "التعبير الشفوي", a.oral, [`ينتج شفويًا نصًا وصفيًا حول: ${a.oral}.`]],
          ["فهم المكتوب (قراءة: أداء وفهم)", "فهم المكتوب", a.read, [`يقرأ النص «${a.read}» قراءة سليمة معبّرة ويفهم معانيه.`]],
          a.grammar && ["قراءة وتراكيب نحوية", "فهم المكتوب", a.grammar, [`يتعرّف على ${a.grammar} ويوظّفه في جمل من إنشائه.`]],
          a.morph && ["قراءة وصيغ صرفية / ظواهر إملائية", "فهم المكتوب", a.morph, [`يتحكّم في ${a.morph} ويوظّفه في كتاباته.`]],
          a.poem && ["المحفوظات", "فهم المكتوب", a.poem, [`يحفظ «${a.poem}» ويؤديه أداءً معبّرًا.`]],
          ["مطالعة وإنتاج كتابي", "التعبير الكتابي", a.writing, [`${a.writing}.`]],
        ];
    for (const r of rows.filter(Boolean)) {
      const [session, domain, topic, objectives] = r;
      L.push({ ...base, session, domain, topic, objectives });
    }
  }
  write("ar", "اللغة العربية", "لغة عربية", L);
}

// ── المواد الأخرى: (الأسبوع، الموضوع) ──
const SIMPLE = {
  math: ["الرياضيات", "رياضيات", "كتاب الرياضيات، دفتر الأنشطة، أدوات الهندسة، اللوحة", (t) => [`يتحكّم في: ${t}.`, "يحل مشكلات بتجنيد مكتسباته."]],
  islamic: ["التربية الإسلامية", "تربية إسلامية", "كتاب التلميذ، المصحف المدرسي، وسائط سمعية", (t) => [`يتعرّف على «${t}» ويعمل بمقتضاه.`]],
  science: ["التربية العلمية والتكنولوجية", "تربية علمية", "كتاب التلميذ، وسائل التجربة، صور وسندات", (t) => [`يتعرّف على ${t} بمسعى تجريبي ويوظّف ذلك في حياته.`]],
  history: ["التاريخ", "تاريخ", "كتاب التاريخ والجغرافيا والتربية المدنية، خط الزمن، سندات", (t) => [`يتعرّف على ${t} اعتمادًا على السندات التاريخية.`]],
  geography: ["الجغرافيا", "جغرافيا", "كتاب التاريخ والجغرافيا والتربية المدنية، الخرائط، صور", (t) => [`يتعرّف على ${t} مستعملًا الخريطة والسندات.`]],
  civic: ["التربية المدنية", "تربية مدنية", "كتاب التاريخ والجغرافيا والتربية المدنية، صور ووضعيات", (t) => [`يتعرّف على «${t}» ويتبنّى سلوكًا مدنيًا مناسبًا.`]],
  pe: ["التربية البدنية", "تربية بدنية", "الساحة، أقماع، كرات، صفارة", (t) => [`ينجز: ${t} مع احترام قواعد الأمن والتوازن.`]],
  music: ["التربية الموسيقية", "تربية موسيقية", "مسجل صوتي، تسجيلات موسيقية، كلمات النشيد", (t) => [`يتعرّف على ${t} بالاستماع والأداء.`]],
  art: ["التربية التشكيلية", "تربية تشكيلية", "أوراق، مقص، غراء، ألوان، خامات متنوعة", (t) => [`يوظّف ${t} في إنجاز عمل فني.`]],
};
const DOMAIN = {
  math: (t) => (/المستقيمات|منتصف|الزوايا|التناظر|أشكال|المجسمات/.test(t) ? "الفضاء والهندسة" : /قياس|المحيط|المساحة|المدد/.test(t) ? "المقادير والقياس" : /التناسبية|تناسبية|جدول/.test(t) ? "تنظيم المعطيات" : /أجند|الحصيلة|منهجية/.test(t) ? "كل الميادين" : "الأعداد والحساب"),
  islamic: (t) => (/سورة|مثل الجليس/.test(t) ? "القرآن الكريم والحديث الشريف" : /إسلام|دعوة|قريش|يونس/.test(t) ? "مبادئ أولية في السيرة النبوية والقصص" : /الزكاة|الإيمان/.test(t) ? "مبادئ في العقيدة الإسلامية والعبادات" : /أدمج/.test(t) ? "كل الميادين" : "تهذيب السلوك"),
  science: (t) => (/الهضم|الدم|الإسعافات/.test(t) ? "الإنسان والصحة" : /الإنتاش|النبات|الماء في الطبيعة|دورة الماء|الأواني|خزان/.test(t) ? "الإنسان والمحيط" : /الجهات|الأفق/.test(t) ? "المعلمة في الفضاء والزمن" : /تقويمية/.test(t) ? "كل الميادين" : "المادة وعالم الأشياء"),
  history: (t) => (/المعلمي|المراحل التاريخية|التقويم التاريخي/.test(t) ? "أدوات ومفاهيم المادة" : "التاريخ العام"),
  geography: (t) => (/موقع|الانتماء|الخريطة/.test(t) ? "أدوات ومفاهيم المادة" : /المحميات|المخاطر/.test(t) ? "السكان والبيئة" : "السكان والتنمية"),
  civic: (t) => (/تراث|التويزة|اليونسكو|أثري|المحميات/.test(t) ? "الحياة الجماعية" : /تنظيف|أقوّم/.test(t) ? "الحياة الديمقراطية والمؤسسات" : "الحياة المدنية"),
  pe: (t) => (/الجري/.test(t) ? "الوضعيات والتنقلات" : /الوثب|الرمي حسب الموقف \(/.test(t) ? "الحركات القاعدية" : "الهيكلة والبناء"),
  music: () => "التذوق الموسيقي والاستماع / الأغنية التربوية والنشيد",
  art: () => "فن التصميم",
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
    pages: pagesFor(subject, w),
  }));
  write(subject, name, activity, L);
}

const summary = Object.fromEntries(Object.entries(pagesBy).map(([s, ws]) => [s, Object.fromEntries(Object.entries(ws).map(([w, p]) => [w, p.length]))]));
console.error(JSON.stringify(summary));
