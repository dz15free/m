/**
 * مذكرات أساتذة منشورة للعموم (نموذج «المحور / الميدان / الموضوع / الحصة / اسبوع / المقطع»)،
 * مع ذكر المؤلف في المصدر. تُستخرج رؤوس الحصص من النص، والسير الكامل صور الصفحات الأصلية.
 *
 *   node scripts/curriculum/build-teacher-memos.mjs science <pdf> > content/curriculum/1AP_science.json
 *   node scripts/curriculum/build-teacher-memos.mjs civic <pdf>   > content/curriculum/1AP_civic.json
 *   node scripts/curriculum/build-teacher-memos.mjs pe <pdf>      > content/curriculum/1AP_pe.json
 *   node scripts/curriculum/build-teacher-memos.mjs math <pdf> 2AP > content/curriculum/2AP_math.json
 *
 * المستوى اختياري (1AP افتراضيًا). حين تخلو المذكرات من رقم الأسبوع، يُحسب من أول أسبوع للمقطع
 * في المخطط السنوي لبناء التعلمات لذلك المستوى، وكل موضوع جديد داخل المقطع أسبوعٌ موالٍ.
 */
import { existsSync, readFileSync } from "node:fs";
import { openPdf, pagePieces, toLines } from "./pdf-lines.mjs";

const [kind, file, level = "1AP"] = process.argv.slice(2);
const YEAR = { "1AP": "الأولى", "2AP": "الثانية", "3AP": "الثالثة", "4AP": "الرابعة", "5AP": "الخامسة" }[level];
const BAK = "الأستاذ بن عبد القادر عبد الصمد";
const META = {
  science: { subject: "science", activity: "تربية علمية", name: "التربية العلمية والتكنولوجية", author: BAK },
  civic: { subject: "civic", activity: "تربية مدنية", name: "التربية المدنية", author: BAK },
  islamic: { subject: "islamic", activity: "تربية إسلامية", name: "التربية الإسلامية", author: BAK },
  math: { subject: "math", activity: "رياضيات", name: "الرياضيات", author: BAK },
  pe: { subject: "pe", activity: "تربية بدنية", name: "التربية البدنية", author: "مذكرات منشورة (education-onec-dz)" },
}[kind];
if (META) META.title = `${META.name} — السنة ${YEAR} ابتدائي`;
// أول أسبوع لكل مقطع حسب المخطط السنوي لبناء التعلمات (0 = مرحلة تثبيت المكتسبات)
/** مطابقة موضوع مذكرة بمواضيع المخطط السنوي (كلمات مشتركة، دون «ال» والهمزات والتشكيل). */
const norm = (t) =>
  t
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[()\-–:،.]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^(و|ف)?ال(?=..)/, ""))
    .filter((w) => w.length >= 2 || /\d/.test(w));
const score = (a, b) => {
  const A = norm(a);
  const B = new Set(norm(b));
  if (!A.length || !B.size) return 0;
  return A.filter((w) => B.has(w)).length / Math.max(1, Math.min(A.length, B.size));
};
const planPath = new URL(`../../content/curriculum/plans/${level}.json`, import.meta.url);
const PLAN = existsSync(planPath) ? JSON.parse(readFileSync(planPath, "utf8"))[kind] ?? null : null;
const SEG_START = { "2AP": { 0: 1, 1: 3, 2: 6, 3: 10, 4: 14, 5: 18, 6: 21, 7: 26, 8: 28 } }[level];
if (!META || !file) {
  console.error("usage: build-teacher-memos.mjs science|civic|pe <pdf>");
  process.exit(1);
}

const clean = (s) => s.replace(/[\u064B-\u0652\u0640]/g, "").replace(/\s+/g, " ").trim();
const field = (text, name, stops) => {
  const m = new RegExp(`${name}\\s*:?\\s*:?\\s*(.+?)\\s*(?:${stops.join("|")}|$)`).exec(text);
  return m ? m[1].replace(/^[:\s]+/, "").trim() : "";
};

const doc = await openPdf(file);
const pages = [];
for (let n = 1; n <= doc.numPages; n++) pages.push({ n, text: toLines(await pagePieces(doc, n)).map((l) => clean(l.text)).join("\n") });

const lessons = [];
if (kind === "pe") {
  // صفحة لكل حصة: الكفاءة المركبة + اللعبة
  for (const p of pages) {
    const comp = field(p.text, "الكفاءة المركبة", ["\\n"]);
    if (!comp) continue;
    const games = [...p.text.matchAll(/اللعبة\s*:\s*([^\n.]+)/g)].map((m) => m[1].trim());
    lessons.push({
      page: p.n,
      segment: 1,
      domain: field(p.text, "الميدان", ["عدد الحصص", "\\n"]) || "الوضعيات والتنقلات",
      topic: `${comp.replace(/\.$/, "")}${games.length ? ` — ${[...new Set(games)].join("، ")}` : ""}`,
      objectives: [comp.replace(/\.?$/, "."), field(p.text, "الكفاءة الختامية", ["\\n"])].filter(Boolean),
      week: 0,
      pages: [p.n],
    });
  }
  lessons.forEach((l, i) => (l.week = 2 + i));
} else {
  for (const p of pages) {
    const isHeader = /الميدان/.test(p.text) && /الموضوع/.test(p.text);
    const indicator = field(p.text, "مؤشر الكفاءة", ["المقطع", "المراحل", "\\n"]).replace(/^[:\s]+/, "").trim();
    let topic = isHeader ? field(p.text, "الموضوع", ["اكتشف", "الحصة", "الميدان", "اتمرن", "\\n"]).replace(/^:+/, "").trim() : "";
    if (isHeader && (!topic || /^الحصة/.test(topic))) topic = indicator.split(/[-،.]/)[0].trim().slice(0, 80);
    if (!topic) {
      // صفحة تكملة: تُضاف إلى الحصة السابقة
      if (lessons.length && p.text.length > 40) lessons[lessons.length - 1].pages.push(p.n);
      continue;
    }
    const week = Number(/اسبوع\s*(\d+)/.exec(p.text)?.[1] ?? 0);
    const axisText = field(p.text, "المحور", ["السنة", "\\n"]);
    const seg = /استعد/.test(axisText) ? 0 : Number(/المقطع\s*(\d+)/.exec(p.text)?.[1] ?? 0);
    const sessionNo = Number(/الحصة\s*(\d)/.exec(p.text)?.[1] ?? 1);
    lessons.push({
      page: p.n,
      segment: seg,
      axis: axisText,
      sessionNo,
      domain: field(p.text, "الميدان", ["الموضوع", "الحصة", "\\n"]),
      topic,
      objectives: [field(p.text, "مؤشر الكفاءة", ["المقطع", "المراحل", "\\n"]), field(p.text, "الكفاء[ةة]? الختامية", ["اسبوع", "مذكرة", "\\n"])]
        .map((o) => o.replace(/^[:\s]+/, "").replace(/\s*المقطع\s*\d*$/, "").replace(/^[-\s]+|[-\s]+$/g, "").trim())
        .filter((o) => o.length > 6 && !/^(المقطع|اسبوع)/.test(o)),
      week,
      pages: [p.n],
    });
  }
  // أسابيع ومقاطع ناقصة: تُكمَّل من الحصة السابقة (أو تتابعًا)
  // الحصة الثانية من نفس الدرس: عنوانها كثيرًا ما يُستخرج جملةً من الصفحة، فيُورث من الحصة الأولى
  lessons.forEach((l, i) => {
    const prev = lessons[i - 1];
    if (prev && l.sessionNo > 1 && (/^ي /.test(l.topic) || /ينجز ويحل|الاستظهار السليم|يستثمر/.test(l.topic))) l.topic = prev.topic;
  });
  if (PLAN) {
    // الأسبوع من المخطط السنوي: أول أسبوع (لا يسبق أسبوع الحصة السابقة) يتضمن موضوعًا مطابقًا
    let w = PLAN[0][0];
    for (const l of lessons) {
      let best = null;
      for (const [week, topics] of PLAN) {
        if (week < w) continue;
        const sc = Math.max(...topics.map((t) => score(l.topic, t)));
        if (sc >= 0.75) {
          best = week;
          break;
        }
      }
      if (best !== null) w = best;
      l.week = w;
    }
  } else if (SEG_START) {
    // الأسبوع من بداية المقطع؛ كل موضوع جديد (الحصة 1) أسبوع موالٍ داخل المقطع
    let seg = -1;
    let wk = 0;
    for (const l of lessons) {
      if (l.segment < seg) l.segment = seg;
      if (l.segment !== seg) {
        seg = l.segment;
        wk = SEG_START[seg] ?? wk + 1;
      } else if (l.sessionNo === 1) wk += 1;
      const next = SEG_START[seg + 1] ?? 32;
      l.week = Math.min(wk, next - 1);
    }
  }
  lessons.forEach((l, i) => {
    const prev = lessons[i - 1];
    // المقطع لا يعود إلى الوراء ولا يقفز أكثر من مقطع واحد (أخطاء كتابة في المذكرات)
    if (!l.segment || (prev && (l.segment < prev.segment || l.segment > prev.segment + 1))) l.segment = prev?.segment || 1;
    if (!l.week) l.week = prev ? prev.week + 1 : 2;
  });
}

// التربية المدنية: رؤوس نص الوثيقة متداخلة بين الصفحات، فالحصص مضبوطة يدويًا من صورها،
// والأسبوع أول أسبوع من المقطع الموافق للمحور في المخطط السنوي للسنة الأولى.
if (kind === "civic" && level === "1AP") {
  const L = [
    [1, 3, "الحياة الاجتماعية", "التحية وردها", "يحيّي ويرد التحية حسب الوضعيات.", [1]],
    [2, 5, "الحياة المدنية", "بطاقتي المدرسية", "يتعرف على بطاقته المدرسية وما يُكتب عليها من معلومات.", [2]],
    [3, 9, "الحياة الجماعية", "أحترم الكبير", "يعبّر عن احترامه للكبار ويتأدب معهم.", [3]],
    [4, 13, "الحياة الجماعية", "أعطف على الصغار (الحصة 1: ألاحظ وأعبّر)", "يبدي سلوكًا إيجابيًا نحو من هم أصغر منه.", [4]],
    [4, 14, "الحياة الجماعية", "أعطف على الصغار (الحصة 2: أستنتج)", "يبادر إلى تقديم المساعدة للمحتاج ويعطف على من هم أصغر منه.", [5]],
    [4, 15, "الحياة الجماعية", "أعطف على الصغار (الحصة 3: أحفظ)", "يحفظ الخلاصة ويعطف على من هم أصغر منه.", [6]],
    [5, 17, "الحياة الديمقراطية والمؤسسات", "العلم الوطني", "يتعرف على العلم الوطني رمزًا من رموز الدولة ويحترمه.", [7]],
    [6, 20, "الحياة الديمقراطية والمؤسسات", "العملة الوطنية", "يتعرف على العملة الوطنية رمزًا من رموز الدولة الجزائرية.", [8]],
    [7, 25, "الحياة المدنية", "وثائق هويتي", "يتعرف على الوثائق الشخصية وما يُكتب عليها وكيف يحافظ عليها.", [9]],
    [8, 28, "الحياة الديمقراطية والمؤسسات", "النشيد الوطني", "يتعرف على النشيد الوطني ومؤلفه ويحفظ مقطعه الأول.", [10, 11]],
  ];
  lessons.length = 0;
  for (const [segment, week, domain, topic, obj, pgs] of L) lessons.push({ page: pgs[0], segment, domain, topic, objectives: [obj], week, pages: pgs });
}

const segs = [...new Set(lessons.map((l) => l.segment))].sort((a, b) => a - b);
const ORD = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن"];
process.stdout.write(
  JSON.stringify(
    {
      id: `${level}_${META.subject}`,
      level,
      subject: META.subject,
      title: META.title,
      source: { ar: `مذكرات منشورة للعموم — ${META.author}`, fr: `Fiches partagées publiquement — ${META.author}` },
      weekMode: "absolute",
      segments: Object.fromEntries(segs.map((n) => [n, kind === "pe" ? "الحصص" : n === 0 ? "تثبيت المكتسبات" : `المقطع ${ORD[n] ?? n}`])),
      lessons: lessons.map((l, i) => ({
        order: i + 1,
        segment: l.segment,
        segmentTitle: kind === "pe" ? "الحصص" : `${l.segment === 0 ? "تثبيت المكتسبات" : `المقطع ${ORD[l.segment] ?? l.segment}`}${l.axis ? ` — ${l.axis}` : ""}`,
        unitKind: "week",
        unit: l.week,
        session: l.sessionNo ? `الحصة ${l.sessionNo}${l.axis ? ` — ${l.axis}` : ""}` : l.axis || META.activity,
        activity: META.activity,
        domain: l.domain,
        topic: l.topic,
        materials: { science: "كتاب التلميذ، دفتر الأنشطة، وسائل التجربة", math: "كتاب التلميذ، دفتر الأنشطة، اللوحة، أوراق عمل", islamic: "كتاب التلميذ، المصحف المدرسي، وسائط سمعية" }[kind] ?? "كتاب التلميذ، صور ومشاهد",
        objectives: l.objectives,
        body: "",
        pages: l.pages.slice(0, 4),
        sample: i < 2,
      })),
    },
    null,
    1,
  ),
);
