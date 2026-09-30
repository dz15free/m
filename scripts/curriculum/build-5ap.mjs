/**
 * السنة الخامسة: الملخّصات من «المخطط السنوي لبناء التعلمات — السنة الخامسة» (content/curriculum/plans/5AP.json)،
 * والسير الكامل صفحات مذكرات منشورة للعموم تُعرض صورًا:
 *   - العربية: مذكرات أسبوعية لكل مقطع (مخططات حصص التعلّم الوزارية إن وُجدت، وإلا مذكرات «ج2») تُدمج في ملف واحد؛
 *   - الرياضيات: ملف مذكرات (مذكرة في كل صفحة) يُربط بمواضيع المخطط بالكلمات المفتاحية؛
 *   - التربية الإسلامية: مذكرات مفردة تُدمج في ملف واحد.
 *
 *   node scripts/curriculum/build-5ap.mjs <ar-dir> <math.pdf> <islamic-dir> <out-dir> <work-dir>
 *   ← يكتب content/curriculum/5AP_*.json و<work-dir>/5AP_ar.pdf و<work-dir>/5AP_islamic.pdf (لـ seed.mjs --pdf)
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [arDir, mathPdf, islamicDir, outDir, workDir] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(new URL("../../content/curriculum/plans/5AP.json", import.meta.url), "utf8"));
const pagesOf = (f) => Number(/Pages:\s+(\d+)/.exec(execFileSync("pdfinfo", [f]).toString())[1]);
const textOf = (f, n) => execFileSync("pdftotext", ["-f", String(n), "-l", String(n), f, "-"], { stdio: ["ignore", "pipe", "ignore"] }).toString().normalize("NFKC");
const MAX_PAGES = 24;
/** pdfunite يرفض الملفات المقيّدة (قيود التعديل فقط، دون كلمة مرور فتح) — تُعاد كتابتها نسخةً للعرض */
let copies = 0;
const mergeable = (f) => {
  if (!/Encrypted:\s+yes/.test(execFileSync("pdfinfo", [f]).toString())) return f;
  const out = join(workDir, `copy-${++copies}.pdf`);
  execFileSync("pdftocairo", ["-pdf", f, out]);
  return out;
};

// ── العربية: ملف لكل (مقطع، أسبوع) ──
const arFiles = new Map(); // "seg:week" → file
for (const f of readdirSync(arDir).filter((x) => x.endsWith(".pdf")).sort()) {
  const m = /المقطع (\d+) الاسبوع (\d+)/.exec(f);
  if (!m || /\(1\)/.test(f)) continue; // نسخ مكرّرة
  const key = `${Number(m[1])}:${Number(m[2])}`;
  const ministry = /وزارية/.test(f);
  const prev = arFiles.get(key);
  if (prev && (/وزارية/.test(prev[0]) || !ministry)) {
    if (!/وزارية/.test(prev[0]) && !ministry) prev.push(f); // جزءان للأسبوع نفسه (إدماج المقطع الأول)
    continue;
  }
  arFiles.set(key, [f]);
}
const arPdfs = [];
const arPages = {}; // "seg:week" → [pages in merged pdf]
let offset = 0;
for (const [key, files] of [...arFiles].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))) {
  for (const f of files) {
    const path = join(arDir, f);
    const n = pagesOf(path);
    // صفحة الغلاف (الملفات الوزارية دائمًا، وغيرها إن قلّ نص صفحتها الأولى)
    const skipCover = /وزارية/.test(f) || textOf(path, 1).replace(/\s+/g, "").length < 1800;
    for (let p = skipCover ? 2 : 1; p <= n; p++) (arPages[key] ??= []).push(offset + p);
    arPdfs.push(mergeable(path));
    offset += n;
  }
}
execFileSync("pdfunite", [...arPdfs, join(workDir, "5AP_ar.pdf")]);

// ── الإسلامية: مذكرات مفردة ──
const islamicFiles = readdirSync(islamicDir).filter((x) => x.endsWith(".pdf")).sort();
execFileSync("pdfunite", [...islamicFiles.map((f) => mergeable(join(islamicDir, f))), join(workDir, "5AP_islamic.pdf")]);
const islamicPage = (topic) => {
  const i = islamicFiles.findIndex((f) => topic.includes(f.replace(/\.pdf$/, "").replace(/الايمان باليوم الاخر/, "الإيمان باليوم الآخر")));
  return i < 0 ? [] : [i + 1];
};

// ── الرياضيات: موضوع كل مذكرة ──
const mathTopics = [];
for (let n = 1; n <= pagesOf(mathPdf); n++) {
  const t = textOf(mathPdf, n).replace(/[‎‏‪-‮]/g, "").replace(/\s+/g, " ").replace(/ی/g, "ي");
  mathTopics.push({ n, topic: /الموضوع\s*:\s*([^:]*?)\s*(?:الكفاءة|$)/.exec(t)?.[1] ?? "" });
}
const MATH_KEYS = [
  [/الأعداد إلى|الأعداد الكبيرة|قيمة الرقم|عدّ كميات/, /^الأعداد( الكبيرة)?$/],
  [/جمع/, /جمع/],
  [/طرح/, /طرح/],
  [/الأطوال|الاستقامية/, /الأطوال/],
  [/المثلثات|الرباعيات|الأشكال الهندسية|إنشاء أشكال/, /المضلعات|المثلثات/],
  [/الضرب|ضرب/, /^الضرب/],
  [/مستقيمات/, /المستقيم/],
  [/الحاسبة/, /الآلة/],
  [/زوايا/, /الزوايا/],
  [/نقل شكل/, /نقل الأشكال/],
  [/الدائرة/, /الدائرة/],
  [/الكسور/, /الكسور/],
  [/المجسمات/, /المجسمات|الهندسة الفضائية/],
  [/الأعداد العشرية|عدد عشري|أعداد عشرية/, /الأعداد العشرية/],
  [/سعات/, /السعات/],
  [/القسمة|قسمة/, /القسمة|قسمة/],
  [/مساحات|مساحة/, /المساحات/],
  [/مدد/, /المدد/],
  [/كتل/, /الأوزان/],
  [/التناسبية|النسبة المئوية|المقياس|السرعة/, /التناسبية/],
  [/تمثيلات بيانية|معلومات/, /الجداول/],
];
const used = new Map();
const mathPages = (topic) => {
  const k = MATH_KEYS.find(([re]) => re.test(topic));
  if (!k) return [];
  const pool = mathTopics.filter((m) => k[1].test(m.topic)).map((m) => m.n);
  if (!pool.length) return [];
  const i = used.get(k) ?? 0;
  used.set(k, i + 1);
  return [pool[Math.min(i, pool.length - 1)]];
};

const segOfWeek = (w) => Number(Object.entries(plan.segments).find(([, s]) => w <= Math.max(...s.weeks, s.integration))?.[0] ?? 8);
const SOURCE = {
  ar: "المخطط السنوي لبناء التعلمات — السنة الخامسة؛ ومذكرات منشورة للعموم (مخططات حصص التعلّم، مذكرات الأساتذة)",
  fr: "Planification annuelle — 5e année ; fiches partagées publiquement",
};
const segTitle = (n) => `المقطع ${n}: ${plan.segments[n].title}`;

function write(subject, name, activity, lessons) {
  const out = {
    id: `5AP_${subject}`,
    level: "5AP",
    subject,
    title: `${name} — السنة الخامسة ابتدائي`,
    source: SOURCE,
    weekMode: "absolute",
    segments: Object.fromEntries(Object.entries(plan.segments).map(([n, s]) => [n, s.title])),
    lessons: lessons.map((l, i) => ({ order: i + 1, unitKind: "week", activity, body: "", sample: l.unit <= 3, ...l, segmentTitle: segTitle(l.segment) })),
  };
  writeFileSync(join(outDir, `5AP_${subject}.json`), JSON.stringify(out, null, 1));
  console.log(subject, out.lessons.length, "حصة،", out.lessons.filter((l) => l.pages.length).length, "بصفحات");
}

// ── العربية ──
{
  const L = [];
  const materials = "كتاب اللغة العربية، دفتر الأنشطة، دليل الأستاذ (النص المنطوق)، السبورة";
  for (const [sn, S] of Object.entries(plan.segments)) {
    const segment = Number(sn);
    S.weeks.forEach((w, k) => {
      const a = plan.ar[w];
      const base = { segment, unit: w, materials, pages: (arPages[`${segment}:${k + 1}`] ?? []).slice(0, MAX_PAGES) };
      const style = S.style[k] ?? S.style.join("، ");
      const rows = [
        ["فهم المنطوق والتعبير الشفوي", "فهم المنطوق", `النص المنطوق للأسبوع ${k + 1} (${S.title})`, ["يفهم النص المنطوق ويتفاعل معه.", "يعبّر شفويًا عن مضمونه بلغة سليمة."]],
        ["التعبير الشفوي (الأساليب والصيغ)", "التعبير الشفوي", style, [`يوظّف (${style}) في وضعيات تواصلية دالة.`]],
        ["فهم المكتوب (قراءة: أداء وفهم)", "فهم المكتوب", a.read, [`يقرأ النص «${a.read}» قراءة سليمة معبّرة ويفهم معانيه.`]],
        ["قواعد نحوية", "فهم المكتوب", a.grammar, [`يتعرّف على ${a.grammar} ويوظّفه في جمل من إنشائه.`]],
        ["صرف وإملاء", "فهم المكتوب", a.morph, [`يتحكّم في ${a.morph} ويوظّفه في كتاباته.`]],
        ["المحفوظات", "فهم المكتوب", S.poem, [`يحفظ «${S.poem}» ويؤديه أداءً معبّرًا.`]],
        ["التعبير الكتابي", "التعبير الكتابي", S.writing, [`${S.writing}.`]],
        ["المشروع", "التعبير الكتابي", S.project, [`يُنجز مشروع المقطع: ${S.project}.`]],
      ];
      for (const [session, domain, topic, objectives] of rows) L.push({ ...base, session, domain, topic, objectives });
    });
    // أسبوع الإدماج والتقويم والمعالجة
    const intPages = (arPages[`${segment}:${S.weeks.length + 1}`] ?? []).slice(0, MAX_PAGES);
    L.push({
      segment,
      unit: S.integration,
      materials,
      pages: intPages,
      session: "إدماج، تقويم ومعالجة",
      domain: "كل الميادين",
      topic: `إدماج المقطع ${segment}: ${S.title}`,
      objectives: ["يجنّد موارد المقطع لحل وضعية إدماجية.", "يقوّم تعلماته ويعالج نقائصه."],
    });
  }
  L.sort((x, y) => x.unit - y.unit);
  write("ar", "اللغة العربية", "لغة عربية", L);
}

// ── المواد الأخرى: (الأسبوع، الموضوع) ──
const SIMPLE = {
  math: ["الرياضيات", "رياضيات", "كتاب الرياضيات، دفتر الأنشطة، أدوات الهندسة، اللوحة", (t) => [`يتحكّم في: ${t}.`, "يحل مشكلات بتجنيد مكتسباته."], mathPages],
  islamic: ["التربية الإسلامية", "تربية إسلامية", "كتاب التلميذ، المصحف المدرسي، وسائط سمعية", (t) => [`يتعرّف على «${t}» ويعمل بمقتضاه.`], islamicPage],
  science: ["التربية العلمية والتكنولوجية", "تربية علمية", "كتاب التلميذ، وسائل التجربة، صور وسندات", (t) => [`يتعرّف على ${t} بمسعى تجريبي ويوظّف ذلك في حياته.`]],
  history: ["التاريخ", "تاريخ", "كتاب التاريخ والجغرافيا والتربية المدنية، خط الزمن، سندات", (t) => [`يتعرّف على ${t} اعتمادًا على السندات التاريخية.`]],
  geography: ["الجغرافيا", "جغرافيا", "كتاب التاريخ والجغرافيا والتربية المدنية، الخرائط، صور", (t) => [`يتعرّف على ${t} مستعملًا الخريطة والسندات.`]],
  civic: ["التربية المدنية", "تربية مدنية", "كتاب التاريخ والجغرافيا والتربية المدنية، صور ووضعيات", (t) => [`يتعرّف على «${t}» ويتبنّى سلوكًا مدنيًا مناسبًا.`]],
  music: ["التربية الموسيقية", "تربية موسيقية", "مسجل صوتي، تسجيلات موسيقية، كلمات النشيد", (t) => [`يتعرّف على ${t} بالاستماع والأداء.`]],
  art: ["التربية التشكيلية", "تربية تشكيلية", "أوراق، ألوان، أدوات الرسم والخط، خامات متنوعة", (t) => [`يوظّف ${t} في إنجاز عمل فني.`]],
};
const DOMAIN = {
  math: (t) => (/مستقيمات|الاستقامية|زوايا|التناظر|أشكال|شكل|المثلثات|الرباعيات|الدائرة|المجسمات|مرصوفة|تصميم/.test(t) ? "الفضاء والهندسة" : /الأطوال|قياس|محيط|مساحة|مدد|سعات|كتل/.test(t) ? "المقادير والقياس" : /التناسبية|النسبة|المقياس|السرعة|معلومات|تمثيلات/.test(t) ? "تنظيم المعطيات" : /أجند|الحصيلة|منهجية|الوضعية/.test(t) ? "كل الميادين" : "الأعداد والحساب"),
  islamic: (t) => (/سورة/.test(t) ? "القرآن الكريم والحديث الشريف" : /الهجرة|المؤاخاة|عثمان|علي|فتح|تعايش|حجة|ذات النطاقين|سليمان/.test(t) ? "مبادئ أولية في السيرة النبوية والقصص" : /الإيمان|صفات الله|الحج|التيمّم|صلاة/.test(t) ? "مبادئ في العقيدة الإسلامية والعبادات" : /الوضعية|الإدماج/.test(t) ? "كل الميادين" : "تهذيب السلوك"),
  science: (t) => (/الهواء|الغازات|غازات|الكهرب|التكنولوجي/.test(t) ? "المادة وعالم الأشياء" : /العضل|الجهد/.test(t) ? "الإنسان والصحة" : /الأرض|الشمس|الفصول|الطقس/.test(t) ? "المعلمة في الفضاء والزمن" : /تقويم|تعلّم|أوظّف/.test(t) ? "كل الميادين" : "الإنسان والمحيط"),
  history: (t) => (/المعالم|المراحل/.test(t) ? "أدوات ومفاهيم المادة" : /الاستعمار|الغزو|المقاومات|النضال|الثورة/.test(t) ? "التاريخ الوطني" : "كل الميادين"),
  geography: (t) => (/الموقع|الأقاليم/.test(t) ? "أدوات ومفاهيم المادة" : /التصحّر|الغابات|الاستغلال/.test(t) ? "السكان والبيئة" : /التنمية/.test(t) ? "السكان والتنمية" : "كل الميادين"),
  civic: (t) => (/مؤسس|البريد|الإعلام|الاتصال|الإدارة|الحالة المدنية/.test(t) ? "الحياة الجماعية" : /الانتخاب|المجلس|الشرطة|الدرك|الحماية المدنية/.test(t) ? "الحياة الديمقراطية والمؤسسات" : /المواطنة|المسؤولية|مشاركتي|حقوق/.test(t) ? "الحياة المدنية" : "كل الميادين"),
  music: () => "التذوق الموسيقي والاستماع / الأغنية التربوية والنشيد",
  art: (t) => (/الخط/.test(t) ? "الخط العربي" : /الألوان/.test(t) ? "الرسم والتلوين" : "فن التصميم والزخرفة"),
};
for (const [subject, [name, activity, materials, obj, pagesFn]] of Object.entries(SIMPLE)) {
  const L = plan[subject].map(([w, t]) => ({
    segment: segOfWeek(w),
    unit: w,
    session: activity,
    domain: DOMAIN[subject](t),
    topic: t,
    materials,
    objectives: obj(t),
    pages: pagesFn ? pagesFn(t) : [],
  }));
  write(subject, name, activity, L);
}
console.error(JSON.stringify(Object.fromEntries(Object.entries(arPages).map(([k, v]) => [k, v.length]))));
