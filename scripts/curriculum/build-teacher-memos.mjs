/**
 * مذكرات أساتذة منشورة للعموم (نموذج «المحور / الميدان / الموضوع / الحصة / اسبوع / المقطع»)،
 * مع ذكر المؤلف في المصدر. تُستخرج رؤوس الحصص من النص، والسير الكامل صور الصفحات الأصلية.
 *
 *   node scripts/curriculum/build-teacher-memos.mjs science <pdf> > content/curriculum/1AP_science.json
 *   node scripts/curriculum/build-teacher-memos.mjs civic <pdf>   > content/curriculum/1AP_civic.json
 *   node scripts/curriculum/build-teacher-memos.mjs pe <pdf>      > content/curriculum/1AP_pe.json
 */
import { openPdf, pagePieces, toLines } from "./pdf-lines.mjs";

const [kind, file] = process.argv.slice(2);
const META = {
  science: { subject: "science", activity: "تربية علمية", title: "التربية العلمية والتكنولوجية — السنة الأولى ابتدائي", author: "الأستاذ بن عبد القادر عبد الصمد" },
  civic: { subject: "civic", activity: "تربية مدنية", title: "التربية المدنية — السنة الأولى ابتدائي", author: "الأستاذ بن عبد القادر عبد الصمد" },
  pe: { subject: "pe", activity: "تربية بدنية", title: "التربية البدنية — السنة الأولى ابتدائي", author: "مذكرات منشورة (education-onec-dz)" },
}[kind];
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
    const topic = isHeader ? field(p.text, "الموضوع", ["اكتشف", "الحصة", "الميدان", "\\n"]).replace(/^:+/, "").trim() : "";
    if (!topic) {
      // صفحة تكملة: تُضاف إلى الحصة السابقة
      if (lessons.length && p.text.length > 40) lessons[lessons.length - 1].pages.push(p.n);
      continue;
    }
    const week = Number(/اسبوع\s*(\d+)/.exec(p.text)?.[1] ?? 0);
    const seg = Number(/المقطع\s*(\d+)/.exec(p.text)?.[1] ?? 0);
    lessons.push({
      page: p.n,
      segment: seg,
      axis: field(p.text, "المحور", ["السنة", "\\n"]),
      domain: field(p.text, "الميدان", ["الموضوع", "الحصة", "\\n"]),
      topic,
      objectives: [field(p.text, "مؤشر الكفاءة", ["المقطع", "المراحل", "\\n"]), field(p.text, "الكفاء[ةة]? الختامية", ["اسبوع", "مذكرة", "\\n"])]
        .map((o) => o.replace(/^[:\s]+/, "").replace(/\s*المقطع\s*\d*$/, "").trim())
        .filter((o) => o.length > 6 && !/^المقطع/.test(o)),
      week,
      pages: [p.n],
    });
  }
  // أسابيع ومقاطع ناقصة: تُكمَّل من الحصة السابقة (أو تتابعًا)
  lessons.forEach((l, i) => {
    const prev = lessons[i - 1];
    // المقطع لا يعود إلى الوراء ولا يقفز أكثر من مقطع واحد (أخطاء كتابة في المذكرات)
    if (!l.segment || (prev && (l.segment < prev.segment || l.segment > prev.segment + 1))) l.segment = prev?.segment || 1;
    if (!l.week) l.week = prev ? prev.week + 1 : 2;
  });
}

// التربية المدنية: رؤوس نص الوثيقة متداخلة بين الصفحات، فالحصص مضبوطة يدويًا من صورها،
// والأسبوع أول أسبوع من المقطع الموافق للمحور في المخطط السنوي للسنة الأولى.
if (kind === "civic") {
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
      id: `1AP_${META.subject}`,
      level: "1AP",
      subject: META.subject,
      title: META.title,
      source: { ar: `مذكرات منشورة للعموم — ${META.author}`, fr: `Fiches partagées publiquement — ${META.author}` },
      weekMode: "absolute",
      segments: Object.fromEntries(segs.map((n) => [n, kind === "pe" ? "الحصص" : `المقطع ${ORD[n] ?? n}`])),
      lessons: lessons.map((l, i) => ({
        order: i + 1,
        segment: l.segment,
        segmentTitle: kind === "pe" ? "الحصص" : `المقطع ${ORD[l.segment] ?? l.segment}${l.axis ? ` — ${l.axis}` : ""}`,
        unitKind: "week",
        unit: l.week,
        session: l.axis || META.activity,
        activity: META.activity,
        domain: l.domain,
        topic: l.topic,
        materials: kind === "science" ? "كتاب التلميذ، دفتر الأنشطة، وسائل التجربة" : "كتاب التلميذ، صور ومشاهد",
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
