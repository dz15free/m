/**
 * إضافة مذكرات رُفعت إلى مجلد المكتبة على Drive (أكتوبر 2026) إلى أسابيع كانت فارغة، دون المساس بالحصص الموجودة:
 * الحصص القديمة تحتفظ بترتيبها (فمعرّفاتها في القاعدة ثابتة)، والجديدة تأخذ ترتيبًا بعدها، وأسبوعها من رأس المذكرة
 * (الأسبوع المكتوب فيها) أو، حين لا يُكتب، من تسلسل الدروس قبل أول درس موجود. صفحات المذكرات صور الملفات الأصلية،
 * وتُعلن مصادرها («sources») فيحمّلها seed.mjs من Drive تلقائيًا.
 *
 *   node scripts/curriculum/add-drive-memos.mjs        (يعيد كتابة content/curriculum/*.json المعنية؛ إعادة التشغيل آمنة)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { driveFile, pdfPages } from "../lib/drive-sources.mjs";

const MARK = "drive-2026-10";
/** «مذكرات جميع المواد — سنة رابعة»: مصدر صفحات حصص الرابعة الموجودة */
const MAIN_4AP = "17V3WR7qHTQlmVVj5c4Ga-sSQerxNQ8Vj";

const MAT = {
  math: "كتاب الرياضيات، دفتر الأنشطة، أدوات الهندسة، اللوحة",
  islamic: "كتاب التلميذ، المصحف المدرسي، وسائط سمعية",
  science: "كتاب التلميذ، وسائل التجربة، صور وسندات",
  history: "كتاب التاريخ والجغرافيا والتربية المدنية، خط الزمن، سندات",
  geography: "كتاب التاريخ والجغرافيا والتربية المدنية، الخرائط، صور",
  art: "أوراق، مقص، غراء، ألوان، خامات متنوعة",
  music: "مسجل صوتي، تسجيلات موسيقية، كلمات النشيد",
};
const TOOLS = "أدوات ومفاهيم المادة";

/* الحصص الجديدة: [الأسبوع، الميدان، الموضوع، الهدف، ملف Drive، الحصة]. المصدر: مذكرات منشورة (موقع المنارة التعليمي)،
   والأسابيع من رؤوسها (الرياضيات، الإسلامية، الجغرافيا، الفنية والموسيقية) أو من تسلسل الدروس (العلمية، التاريخ). */
const ADD = {
  "4AP_math": {
    main: MAIN_4AP,
    lessons: [
      [2, "الأعداد والحساب", "الأعداد الأصغر من 100000 (1)", "قراءة وكتابة وتسمية وتفكيك الأعداد الأصغر من 100000.", "1aTxYEQvg6nv65vE-77XFaMiWX1n4c7JR"],
      [2, "الأعداد والحساب", "الجمع والطرح", "جمع أو طرح عددين (حساب أفقي).", "1Efp4IQcpG05qN0qJ3qee3GtnhR2VSLq9"],
      [2, "الأعداد والحساب", "مشكلات جمعية (1)", "تمييز مشكلات جمعية وطرحية وتحديد خطوات حل مشكل رياضياتي.", "1q5S8pyAj2yysUpkUtKQuPIVwwmbRJD8L"],
      [3, "تنظيم المعطيات", "جداول ومخططات", "تنظيم معلومات عددية في جدول أو مخطط بسيط، وتمثيل معطيات بمخطط وقراءتها.", "1iGtT7uVjvIp6uj0eW5EEyXAC5WPGnlQ9"],
      [3, "الفضاء والهندسة", "التنقل على مرصوفة", "وصف موقع أو تنقل في الفضاء أو على تمثيل (مخطط، مرصوفة، توقع مسار تنقل).", "1_wLPGvsO8GEkPxM3fLxX5iIWfoY89TYt"],
      [4, "الأعداد والحساب", "آلية الجمع", "يجري عمليات جمع على الأعداد الطبيعية.", "1kBdziRwQ_bZ5rkSWMFDgkvzf3LLDpAZ_"],
      [4, "الأعداد والحساب", "آلية الطرح", "يجري عمليات طرح على الأعداد الطبيعية.", "1qyR6hc2Q9gOgI4e2BTSBnzatw9XhVApH"],
      [4, "الأعداد والحساب", "الأعداد الأصغر من 100000 (2)", "مقارنة وترتيب وحصر الأعداد الأصغر من 100000.", "1yjlW_sImHmlA4MAwOxMtLDoFeBKIPvax"],
      [5, "كل الميادين", "أُجنّد معارفي 1", "يسترجع معلومات سابقة ويوظفها، وينجز فرديًا (إدماج جزئي).", "1e9ueFansjhVzivllZPmKOm9BCZmVf9jc"],
      [5, "كل الميادين", "الحصيلة 1", "يسترجع معلومات سابقة ويوظفها في وضعيات تقويمية.", "1_xwxGo2M4ofhaxV7RPHWFoQQluieIure"],
    ],
  },
  "4AP_islamic": {
    main: MAIN_4AP,
    lessons: [
      [2, "القرآن الكريم والحديث الشريف", "الوضعية الأم — سورة العلق", "يتلو سورة العلق تلاوة سليمة ويتعرّف على معانيها.", "1RqmhNPloCoSo6riFVNiezK1mjVOLKPi5"],
      [3, "القرآن الكريم والحديث الشريف", "طلب العلم", "يحفظ الحديث ويستظهره بشكل سليم، ويستدل به في المواقف المناسبة ويذكر فضل العلم.", "1bjrIDGwUgI836Eh1c7ur8_68lo753c3p"],
      [4, "تهذيب السلوك", "الإخلاص", "يبرز قيمة الإخلاص ويستدل بالنصوص الشرعية في معالجة مواقف من محيطه.", "1_wnWcoQRXAw84GWN5x3Gh5iczZox4_kc"],
      [5, "مبادئ في العقيدة الإسلامية والعبادات", "الإيمان بالكتب السماوية", "يعرض أركان العقيدة متكاملة، ويسمي الكتب السماوية والرسل الذين أنزلت عليهم.", "12Y_uV0P7fa2ryYDuuKAcYeVrRxf4Mw7I"],
    ],
  },
  "4AP_science": {
    main: MAIN_4AP,
    lessons: [
      [2, "الإنسان والصحة", "مسلك الهواء في الجهاز التنفسي", "يحدد الأعضاء المتدخلة في عملية التنفس ويصف مسار الهواء في الجهاز التنفسي.", "1waC3C8p7UcJJYc_nHT7Ndng4V5fWP8et"],
      [3, "الإنسان والصحة", "التنفس وتغير تركيب الهواء", "يربط بين عملية التنفس وتغير تركيب الهواء، ويقارن بين هواء الشهيق وهواء الزفير.", "1t2uNt5ebELKkwN6xhTbjfwZTjntp7ZYr"],
      [4, "الإنسان والصحة", "القواعد الصحية للتنفس", "يذكر قواعد للمحافظة على صحة التنفس ويسمي أعراضًا ناتجة عن عدم الالتزام بها.", "1kiC7zx6bzrCv7b_9HL59Yb3CuI-sbVo7"],
      [5, "الإنسان والصحة", "الهضم", "يسمي أقسام الأنبوب الهضمي ويتابع مسار اللقمة الغذائية فيه اعتمادًا على رسم.", "1kMDcLwPul7Z_FMDMakJpyXc9WUKjjZ7H"],
    ],
  },
  "4AP_history": {
    main: MAIN_4AP,
    lessons: [
      [2, TOOLS, "الوضعية الأم والتاريخ الميلادي", "يعرّف التقويم الميلادي ويستعمله في التأريخ للأحداث.", "1hl1c6Rhc1rkE8Udu8HANSfEJvzNdG3M0"],
      [3, TOOLS, "التاريخ الهجري", "يعرّف التقويم الهجري ويميزه عن التقويم الميلادي.", "15sz0okBZcPC6ioWH-MXdNAuf7oR4WKmR"],
      [4, TOOLS, "التاريخ المعلمي الشخصي", "يعرّف التاريخ المعلمي ويقدم أمثلة عن التاريخ الشخصي.", "1C0MUh_v3nZ_oFsg3WbnoZR2G6xBGmo-k", "الحصة 1"],
      [5, TOOLS, "التاريخ المعلمي الاجتماعي", "يميز بين التاريخ المعلمي الشخصي والاجتماعي ويقدم أمثلة عنهما.", "1C0MUh_v3nZ_oFsg3WbnoZR2G6xBGmo-k", "الحصة 2"],
    ],
  },
  "4AP_geography": {
    main: MAIN_4AP,
    lessons: [
      [2, TOOLS, "شكل الأرض", "يتعرف على شكل الأرض وخطوطها.", "1ZylpHdOKCNk3ti5RzkLmYI6GybDYOk9s", "الحصة 1"],
      [3, TOOLS, "شكل الأرض (تتمة)", "يوظف خريطة العالم للتعرف على شكل الأرض وخطوطها.", "1ZylpHdOKCNk3ti5RzkLmYI6GybDYOk9s", "الحصة 2"],
      [4, TOOLS, "الخريطة", "يذكر أهمية الخريطة ومجالات استعمالها.", "1uq-BzIXvuEoJWISMS_WZvOS313sXT11Y"],
      [5, TOOLS, "توزيع الماء واليابسة على سطح الأرض", "يتعرف على نسبة توزيع الماء واليابسة ويسمي القارات والمحيطات.", "1SSsyis7QP-juLoeEd3cLuDusyKgVzbDM"],
    ],
  },
  // مذكرات مصوّرة (صورة لكل حصة)، والأسبوع مكتوب في رأس كل صورة
  "4AP_art": {
    main: MAIN_4AP,
    images: true,
    lessons: [
      [4, "الرسم والتلوين", "الأشكال المتداخلة", "يعرف أنواع التراكيب في الأشكال المتداخلة وينجز أعمالًا فنية باستعمال التداخل.", "1T_MsSE8WLrtmv9vZBJORJAB-3GEK6ySx"],
      [6, "الرسم والتلوين", "الأشكال المتداخلة (2)", "ينجز أعمالًا فنية باستعمال الأشكال المتداخلة.", "17VZdoFTes6GzzvDGHGJH1z_Six6umllE"],
      [8, "الرسم والتلوين", "تقنية الألوان الترابية", "يتعرف على تقنيات الألوان الترابية ويوظفها، ويتذوق جمال الأعمال الفنية.", "1rtxaP_QZWMvrMlctSSaTUv3P8RiPoGO0"],
      [10, "الرسم والتلوين", "الألوان الترابية: تقنية التنقيط", "يوظف تقنية التنقيط بالألوان الترابية.", "1rA9J_S5SXW1RnI5pWeh_1caCiT3WEW9n"],
      [13, "الرسم والتلوين", "الألوان الترابية: تقنية اللطخ", "يوظف تقنية اللطخ بالألوان الترابية.", "1e1O0mvWSkj9rvMMF9rXllKUpY-dY8lzz"],
      [16, "فن الخامات والتصميم", "تصميم مجسمات فنية", "ينجز عملًا فنيًا تشكيليًا باستخدام الخامات والمواد المسترجعة من البيئة.", "10idbwLFCYPyoLDsjgpUWFOAda9VirnrD"],
    ],
  },
  "4AP_music": {
    main: MAIN_4AP,
    images: true,
    lessons: [
      [2, "التذوق الموسيقي والاستماع", "الفرقة الموسيقية وتشكيلها", "يتعرف على الفرقة الموسيقية وتشكيلها.", "1PhQ0G5tUupVKpcvTp7iaibpAFLcvc2nU"],
      [5, "التذوق الموسيقي والاستماع", "النشيد الوطني: المقطع الرابع", "يتعرف على المقطع الرابع من النشيد الوطني ويحفظه ويستظهره.", "1zPFejau8olT-J4ywgsUL2bJBkg-tHbQ4"],
      [7, "التذوق الموسيقي والاستماع", "النشيد الوطني: المقطع الرابع", "يحفظ المقطع الرابع من النشيد الوطني ويستظهره.", "1EwNCT_kmarEpl8uTiXU1A9Artv4OY2Xv"],
      [9, "التذوق الموسيقي والاستماع", "النشيد الوطني: المقطع الرابع", "يستظهر المقطع الرابع من النشيد الوطني أداءً سليمًا.", "1JZ7TTPlVx6WnT_kN38lLCOYNLnDOjabW"],
      [11, "التذوق الموسيقي والاستماع", "الفرقة الموسيقية العالمية (أنشودة «صباح الخير مدرستي»)", "يتعرف على الفرقة الموسيقية العالمية وتشكيلها، ويحفظ أنشودة «صباح الخير مدرستي».", "1DIRNyX30dUyq7S46o31phqqLFC-DCD7a"],
      [17, "التذوق الموسيقي والاستماع", "القصة الموسيقية (أنشودة «الأم الحنون»)", "يتعرف على مكونات القصة الموسيقية ويؤدي الأنشودة منسجمًا في مجموعة.", "1DlbWFfVM_wA-0Uv9NvqONYfL0W66JZzS"],
    ],
  },
  // التاريخ في الخامسة: يمتد كل موضوع من المخطط على أسابيع؛ الدروس المفصّلة تملأ أسابيعه الفارغة،
  // ومذكرات المواضيع الموجودة تُلحق بها (attach: ترتيب الحصة الموجودة)
  "5AP_history": {
    lessons: [
      [3, TOOLS, "المعالم التاريخية: المسكوكات والمخطوطات", "يتعرف على المسكوكات والمخطوطات معالمَ تاريخية.", "1u9__XLn44eORl-PXg9Kmf0zWfcrfCUgp"],
      [4, TOOLS, "المعالم التاريخية: الشخصيات التاريخية", "يتعرف على الشخصيات التاريخية معالمَ تاريخية.", "1yGG2pEkLmqb6URT8MK-jGmcP-U0uRKt-"],
      [5, TOOLS, null, null, "1sP2kRglWdHe7cWkla2yPO1UDcNKRerbr", null, 2],
      [6, TOOLS, "المراحل التاريخية: العصر الوسيط", "يحدد مرحلة العصر الوسيط ويذكر أهم مميزاتها.", "1lyCXxbI6V6xjyXhA40wls4PUpuz4ia2P"],
      [7, TOOLS, "المراحل التاريخية: العصر الحديث", "يحدد مرحلة العصر الحديث ويذكر أهم مميزاتها.", "1OnnsK_2BfPRtdbSRQcK7OsnauwTSPTqW"],
      [17, TOOLS, "نماذج عن الاستعمار الحديث", "يتعرف على نماذج من الاستعمار الحديث في بلاد المغرب وإفريقيا.", "1e4KcnpF8fII7ZVMZs9dso5xHugJkZ5c_"],
      [26, TOOLS, null, null, "1Z7wkge6Da4otEJ2SggPclsMCjeg8t-f_", null, 12],
      [27, TOOLS, "مقاومة المقراني", "يتعرف على مقاومة المقراني ويحدد زمانها ومكانها.", "1_f-2y2QHdGp2Wdbc1WP0zU1uvGKxO011"],
      [28, TOOLS, null, null, "13odYjSWnMCa8DwWNSAl1hbovs2Woez09", null, 13],
      [29, TOOLS, null, null, "1to5u4Yuj2nbEhAbggbvMa0fs-2v10vl6", null, 14],
      [30, TOOLS, null, null, "1LZo7xVXxHcdRbNPEMr854a2KJ6_f9Mh-", null, 15],
    ],
  },
};

/** أرقام مقاطع العربية التي تبدأ أسبوعًا (مؤكَّدة من رؤوس «مذكرات جميع المواد — سنة رابعة»، الصفحات 32، 82، 186، 242، 307، 357). */
const AR_4AP_SEGMENT_STARTS = { 6: 2, 9: 3, 16: 5, 20: 6, 24: 7, 27: 8 };

const path = (id) => new URL(`../../content/curriculum/${id}.json`, import.meta.url);
const read = (id) => JSON.parse(readFileSync(path(id), "utf8"));
const write = (id, data) => writeFileSync(path(id), JSON.stringify(data, null, 1) + "\n");

/** مقطع الأسبوع حسب المخطط السنوي (آخر مقطع بدأ قبله للأسابيع خارج المخطط). */
function segmentOfWeek(plan, week) {
  let seg = 1;
  for (const [n, s] of Object.entries(plan.segments)) if (Math.min(...s.weeks) <= week) seg = Math.max(seg, Number(n));
  return seg;
}

for (const [id, spec] of Object.entries(ADD)) {
  const data = read(id);
  const plan = JSON.parse(readFileSync(new URL(`../../content/curriculum/plans/${data.level}.json`, import.meta.url), "utf8"));
  const subject = data.subject;
  const kept = data.lessons.filter((l) => l.added !== MARK);
  // إعادة التشغيل: نُزيل ما أُلحق سابقًا بالحصص الموجودة
  for (const l of kept) if (l.attached === MARK) {
    l.pages = [];
    delete l.attached;
  }
  let next = Math.max(...kept.map((l) => l.order)) + 1;

  // ترتيب ملفات الوثيقة الإضافية بأول ظهور، وصفحات كل ملف فيها
  const key = spec.images ? "c" : "b";
  const files = [...new Set(spec.lessons.map((l) => l[4]))];
  const pagesOf = new Map();
  let offset = 0;
  for (const f of files) {
    const n = spec.images ? 1 : pdfPages(await driveFile(f));
    if (!n) throw new Error(`no pages: ${f}`);
    pagesOf.set(f, Array.from({ length: Math.min(n, 6) }, (_, i) => `${key}:${offset + i + 1}`));
    offset += n;
  }

  const added = [];
  for (const [week, domain, topic, objective, file, session, attachTo] of spec.lessons) {
    if (attachTo) {
      const target = kept.find((l) => l.order === attachTo);
      if (!target || target.unit !== week) throw new Error(`${id}: attach ${attachTo} ≠ week ${week}`);
      target.pages = pagesOf.get(file);
      target.attached = MARK;
      continue;
    }
    const seg = segmentOfWeek(plan, week);
    added.push({
      order: next++,
      unitKind: "week",
      activity: kept[0].activity,
      body: "",
      sample: false,
      segment: seg,
      unit: week,
      session: session ?? kept[0].session ?? kept[0].activity,
      domain,
      topic,
      materials: MAT[subject] ?? kept[0].materials,
      objectives: [objective],
      pages: pagesOf.get(file),
      segmentTitle: `المقطع ${seg}: ${data.segments[seg] ?? plan.segments[seg]?.title ?? ""}`,
      added: MARK,
    });
  }
  data.lessons = [...kept, ...added];
  data.sources = {
    ...(spec.main ? { main: { pdf: [spec.main] } } : {}),
    [key]: spec.images ? { images: files } : { pdf: files },
  };
  write(id, data);
  console.log(`✓ ${id}: +${added.length} حصة، ${spec.lessons.filter((l) => l[6]).length} مذكرة أُلحقت بحصص موجودة`);
}

// العربية في الرابعة: أسبوع بداية كل مقطع كان يحمل رقم المقطع السابق
{
  const data = read("4AP_ar");
  let fixed = 0;
  for (const l of data.lessons) {
    const seg = AR_4AP_SEGMENT_STARTS[l.unit];
    if (l.unitKind === "week" && seg && l.segment !== seg) {
      l.segment = seg;
      l.segmentTitle = `المقطع ${seg}: ${data.segments[seg]}`;
      fixed++;
    }
  }
  data.sources = { main: { pdf: [MAIN_4AP] } };
  write("4AP_ar", data);
  console.log(`✓ 4AP_ar: صُحّح مقطع ${fixed} حصة`);
}
