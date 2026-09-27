/**
 * مذكرات اللغة العربية — السنة الأولى ابتدائي (وثيقة الوزارة «مخططات حصص التعلّم»).
 * يقرأ أسطر الصفحات (من pdf-lines.mjs) ويُخرج درسًا لكل حصة:
 *   المقطع، الحصة، الأسبوع/اليوم، الموضوع، الوسائل، الأهداف التعلّمية، الميدان — ونصّ السير إن كان سليمًا.
 *
 *   node scripts/curriculum/pdf-lines.mjs ar1.pdf > ar1.json   (مصفوفة {n, lines})
 *   node scripts/curriculum/parse-ar-1ap.mjs ar1.json > content/curriculum/1AP_ar.json
 *
 * بعض صفحات الوثيقة مكتوبة بخط يفقد ترميزه عند الاستخراج (أحرف مستبدلة): العنوان والأهداف سليمة غالبًا،
 * والسير يُترك فارغًا (bodyQuality = "garbled") حتى يُستخرج بالتعرّف الضوئي أو يُراجع يدويًا.
 */
import { existsSync, readFileSync } from "node:fs";

const SEGMENTS = {
  1: "عائلتي",
  2: "العائلة والمدرسة",
  3: "الحي والقرية",
  4: "الرياضة والتسلية",
  5: "البيئة والطبيعة",
  6: "التغذية والصحة",
  7: "التواصل",
  8: "الموروث الحضاري",
};
const ORDINAL = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];

/** حذف التشكيل والتطويل وتوحيد المسافات (النص المعروض يبقى بلا تشكيل: أنظف في الدفتر). */
export const clean = (s) =>
  s
    .replace(/[ً-ْٰـ]/g, "")
    .replace(/[-]/g, " ▪ ")
    .replace(/الفترةالتمهيدية/g, "الفترة التمهيدية")
    .replace(/يقر أ /g, "يقرأ ")
    .replace(/\s+([،.:؛)])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

// كلمات تفقد حرفًا في بعض الصفحات (خط بلا ترميز كامل)
const FIXES = [
  [/ف م /g, "فهم "],
  [/التع ير/g, "التعبير"],
  [/تط يقات/g, "تطبيقات"],
  [/الأس وع/g, "الأسبوع"],
  [/أنش \)/g, "أنشد)"],
  [/\( لعاب/g, "(ألعاب"],
  [/التعبيرالشفوي/g, "التعبير الشفوي"],
  [/التعبيرالكتابي/g, "التعبير الكتابي"],
  [/المنطوقوالتعبير/g, "المنطوق والتعبير"],
  [/إنتاجكتابي/g, "إنتاج كتابي"],
  [/أنجزمشروعي/g, "أنجز مشروعي"],
  [/دراسةالصيغة/g, "دراسة الصيغة"],
  [/الحرفالث/g, "الحرف الث"],
  [/المكتوب\(/g, "المكتوب ("],
  [/كتاباللغة/g, "كتاب اللغة"],
  [/اللغةالعربية/g, "اللغة العربية"],
  [/(دفتر|كراس)(الأنشطة|النشاطات|النشاط)/g, "$1 $2"],
  [/كراش/g, "كراس"],
  [/سن ات/g, "سندات"],
  [/سندات?(سمعية)/g, (m) => m.replace("سمعية", " سمعية")],
  [/سمعيةبصرية/g, "سمعية بصرية"],
  [/(معينات|وسائل)سمعية/g, "$1 سمعية"],
  [/مشاهدأو/g, "مشاهد أو"],
  [/أووسائل/g, "أو وسائل"],
  [/سندمسموع/g, "سند مسموع"],
  [/بطاقاتو /g, "بطاقات و"],
  [/أستعملال/g, "أستعمل ال"],
  [/ماأعجبالحاسوب/g, "ما أعجب الحاسوب"],
  [/الصيغة:\(/g, "الصيغة: ("],
  [/الصيغتين:(?=\S)/g, "الصيغتين: "],
  [/لا،لن/g, "لا، لن"],
  [/\s*\+\s*/g, " + "],
];
const fix = (s) => FIXES.reduce((acc, [re, to]) => acc.replace(re, to), s);

const HEADER = /^(?:\S{0,2}\s)?ا?لمقطع\s*0?(\d{1,2})\s+(.+?)\s+الحص[ةط]\s+(.+?)\s+(الأسبوع|اليوم)\s*0?(\d{1,2})?/;
const TOPIC = /^الموضوع\s+(.+?)\s+الوسائل والمعينات\s*(.*)$/;
const OBJ_START = /^(الهدف التعلمي|الأهداف التعلمية)\s*:?\s*(.*)$/;
const OBJ_END = /^(الممارسات|النشاط|أولا|ثانيا|ثالثا|الحصة|المهمات|التدريب|ملاحظة)/;

/** الميدان الرسمي من نوع الحصة (لعمود «الميدان» في الدفتر اليومي). */
export function domainOf(session) {
  if (/المنطوق/.test(session)) return "فهم المنطوق";
  if (/الشفوي/.test(session)) return "التعبير الشفوي";
  if (/الكتابي|الإنتاج الكتابي/.test(session)) return "التعبير الكتابي";
  if (/مشروع/.test(session)) return "المشروع";
  if (/المحفوظات/.test(session)) return "فهم المكتوب";
  return "فهم المكتوب";
}

/** نوع الحصة بصيغة موحّدة (اسم قصير ثابت يُعرض في عمود «النشاط»). */
export function activityOf(session) {
  const s = session;
  if (/الفترة التمهيدية/.test(s)) return "الفترة التمهيدية";
  if (/المنطوق/.test(s)) return "فهم المنطوق والتعبير الشفوي";
  if (/دراسة الصيغة/.test(s)) return "التعبير الشفوي (دراسة الصيغة)";
  if (/وضعية الإنتاج الشفوي/.test(s)) return "وضعية الإنتاج الشفوي";
  if (/الإنتاج الشفوي/.test(s)) return "التعبير الشفوي (الإنتاج الشفوي)";
  if (/القراءة الإجمالية/.test(s)) return "فهم المكتوب (القراءة الإجمالية)";
  if (/المحفوظات/.test(s)) return "المحفوظات";
  if (/قراءة وكتابة\s*1/.test(s)) return "فهم المكتوب (قراءة وكتابة 1)";
  if (/قراءة وكتابة\s*2/.test(s)) return "فهم المكتوب (قراءة وكتابة 2)";
  if (/قراءة وكتابة/.test(s)) return "فهم المكتوب (قراءة وكتابة)";
  if (/قراءة (ال)?نصوص/.test(s)) return "فهم المكتوب (قراءة النصوص)";
  if (/تثبيت/.test(s)) return "تطبيقات (تثبيت الحرف)";
  if (/تطبيقات/.test(s)) return "فهم المكتوب (تطبيقات)";
  if (/إدماج/.test(s)) return "إدماج (ألعاب قرائية)";
  if (/وضعية الإنتاج الكتابي/.test(s)) return "وضعية الإنتاج الكتابي";
  if (/الكتابي/.test(s)) return "التعبير الكتابي (إنتاج كتابي)";
  if (/مشروع/.test(s)) return "أنجز مشروعي";
  return s;
}

/** نسبة الكلمات «المشوّهة» (خط فقد ترميزه: «دل» بدل «ال»، «ال شةط» بدل «النشاط»…). */
export function garbledRatio(text) {
  const words = text.split(/\s+/).filter((w) => /[؀-ۿ]/.test(w));
  if (!words.length) return 0;
  const bad = words.filter((w) => /^دل[؀-ۿ]{2,}/.test(w) || /^(شةط|الحصط|ااا+)/.test(w) || /أا|[ء-ي]أ[ء-ي].*[ء-ي]أ[ء-ي]/.test(w) || /[ء-ي]ة[ء-ي]/.test(w)).length;
  // حروف ساقطة تقطّع الكلمات: كثرة «كلمات» من حرف أو حرفين (غير حروف المعاني الشائعة)
  const short = words.filter(
    (w) => w.replace(/[^ء-ي]/g, "").length <= 2 && !/^[(]?(و|أو|في|من|عن|أن|إن|ما|لا|لم|لن|هو|هي|ثم|مع|قد|كل|أي|يا|به|له|بل|هل|[ء-ي])[)،.]?$/.test(w),
  ).length;
  return Math.max(bad / words.length, short / words.length > 0.12 ? short / words.length : 0);
}

/** أسطر الهامش الجانبي للوثيقة (اسم المقطع وترتيبه) تتسرّب إلى النص: تُحذف. */
function isMargin(line, segTitle) {
  const l = clean(line);
  if (l.length <= 2 || /^[-–•\s]+$/.test(l)) return true;
  if (/^\d+$/.test(l)) return true;
  if (/^اللغة العربية\. مخططات/.test(l)) return true;
  if (new RegExp(`^(المقطع)?\\s*(${ORDINAL.join("|")})?\\s*[-–]?$`).test(l)) return true;
  const bare = (x) => x.replace(/[\s-–]/g, "");
  return bare(l) === bare(segTitle) || bare(l).startsWith("المقطع") && bare(l).length < 16;
}
const stripMarginTail = (l) =>
  l
    .replace(/\s+المقطع(\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن))?\s*[-–]?$/, "")
    .replace(/([؟?.!:])\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن)$/, "$1")
    .replace(/\s+[-–]$/, "")
    .trim();

const PLACEHOLDER = "(النص كاملًا في كتاب المتعلم)";

export function parse(pages) {
  const lessons = [];
  let current = null;
  let seg = 1;
  for (const page of pages) {
    const lines = page.lines.map((l) => fix(clean(l)));
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const h = i < 5 ? HEADER.exec(line) : null;
      if (h) {
        let n = Number(h[1]);
        // أخطاء الترقيم في الوثيقة (مقطع 50، أو مقطع سابق وسط لاحق): المقاطع لا تعود إلى الوراء
        if (!(n >= seg && n <= 8)) n = seg;
        seg = n;
        const session = h[3].replace(/\s*[-–]\s*الحصة.*$/, "").trim();
        const partsMatch = /الحصة\s*\(?(\d)\)?\s*(?:و|-)\s*\(?(\d)\)?/.exec(h[3]);
        current = {
          page: page.n,
          segment: seg,
          segmentTitle: SEGMENTS[seg],
          session: h[3],
          activity: activityOf(session),
          domain: seg === 1 ? "الفترة التمهيدية" : domainOf(session),
          unitKind: h[4] === "اليوم" ? "day" : "week",
          unit: Number(h[5] ?? 0),
          sessionsInSeries: partsMatch ? `${partsMatch[1]}-${partsMatch[2]}` : "",
          topic: "",
          materials: "",
          objectives: [],
          _groups: [],
          body: [],
        };
        lessons.push(current);
        continue;
      }
      if (!current) continue;
      const tp = TOPIC.exec(line);
      if (tp && !current.topic) {
        current.topic = tp[1].replace(/\s*\(\s*(\d)\s*\)/, " ($1)").trim();
        current.materials = tp[2].trim();
        continue;
      }
      const ob = OBJ_START.exec(line);
      if (ob) {
        current._inObj = true;
        current._groups.push(current.objectives.length);
        if (ob[2]) current.objectives.push(ob[2]);
        continue;
      }
      if (current._inObj) {
        if (OBJ_END.test(line)) current._inObj = false;
        else if (!isMargin(line, current.segmentTitle)) {
          const text = stripMarginTail(line);
          const parts = text.split(/\s*▪\s*/);
          if (!/^[▪•]/.test(text) && current.objectives.length) current.objectives[current.objectives.length - 1] += ` ${parts.shift()}`;
          current.objectives.push(...parts.map((p) => p.replace(/^[•]\s*/, "")));
          continue;
        }
      }
      if (!isMargin(line, current.segmentTitle)) current.body.push(stripMarginTail(line));
    }
  }

  // الأهداف: جمل منفصلة (قد تأتي في سطر واحد مفصولة بـ «.»)
  return lessons.map((l, index) => {
    const norm = (list) =>
      list
        .flatMap((o) => o.split(/(?<=\.)\s+(?=ي)/))
        .map((o) => o.replace(/^[-–]\s*/, "").replace(/\s+/g, " ").trim())
        .filter((o) => o.length > 6);
    const objectives = norm(l.objectives);
    // أهداف كل نشاط على حدة (أيام الفترة التمهيدية: أسمع وأتحدث / أشاهد وأقرأ / أخطط وأكتب)
    const objectiveParts = l._groups.map((start, i) => norm(l.objectives.slice(start, l._groups[i + 1]))).filter((g) => g.length);
    // أسطر مشوّهة (نص مشكول فقد ترميزه): تُستبدل بإحالة واحدة بدل عرض نص مكسور
    const kept = [];
    for (const line of l.body) {
      const broken = line.split(/\s+/).length >= 3 && garbledRatio(line) > 0.25;
      if (!broken) kept.push(line);
      else if (kept[kept.length - 1] !== PLACEHOLDER) kept.push(PLACEHOLDER);
    }
    const body = kept.join("\n");
    const ratio = garbledRatio(body);
    const { _inObj, _groups, body: _b, ...rest } = l;
    const headerOk = !!l.topic && objectives.length > 0 && garbledRatio(`${l.topic} ${objectives.join(" ")}`) < 0.06;
    return {
      ...rest,
      needsReview: !headerOk,
      order: index + 1,
      objectives,
      ...(objectiveParts.length > 1 ? { objectiveParts } : {}),
      body: ratio < 0.04 ? body : "",
      bodyQuality: ratio < 0.04 ? "ok" : "garbled",
    };
  });
}

/** المخطط المرحلي للفترة التمهيدية (ص 4): 20 يومًا × (نص، صيغ، جمل، أشكال). */
export function preparatoryPlan(pages) {
  const page = pages.find((p) => p.lines.some((l) => /المقطع01 الأيام|الأيّام النصّ/.test(l)));
  if (!page) return [];
  const days = [];
  for (const raw of page.lines) {
    const l = clean(raw);
    const m = /اليوم (\d{2})\s+(.*)$/.exec(l);
    if (m) days.push({ day: Number(m[1]), text: m[2] });
  }
  return days;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pages = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const fixesPath = new URL("./fixes-1AP_ar.json", import.meta.url);
  const fixes = existsSync(fixesPath) ? JSON.parse(readFileSync(fixesPath, "utf8")) : {};
  const lessons = parse(pages).map((l) => {
    const f = fixes[String(l.page)];
    if (!f) return l;
    const merged = { ...l, ...f, segmentTitle: SEGMENTS[f.segment ?? l.segment] };
    if (f.objectives && !f.objectiveParts) delete merged.objectiveParts;
    return { ...merged, needsReview: false, reviewed: true };
  });
  const out = {
    id: "1AP_ar",
    level: "1AP",
    subject: "ar",
    title: "اللغة العربية — السنة الأولى ابتدائي",
    source: { ar: "وزارة التربية الوطنية — مخططات حصص التعلّم", fr: "Ministère de l'Éducation nationale" },
    segments: SEGMENTS,
    preparatory: preparatoryPlan(pages),
    lessons,
  };
  process.stdout.write(JSON.stringify(out, null, 1));
}
