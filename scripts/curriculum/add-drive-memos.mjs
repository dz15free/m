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
  pe: "الساحة، صافرة، أقماع، أطواق، كرات",
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
      // الدرس 06 من نفس السلسلة: لا ملف له في المجلد، فيُدرج عنوانه في أسبوعه (بين الدرسين 05 و07)
      [3, "الفضاء والهندسة", "الاستقامية", "يتعرف على نقط في استقامية ويتحقق منها باستعمال المسطرة.", null],
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
  // المدنية في الرابعة: الأسابيع 2–5 لا مذكرات لها في المجلد؛ عناوينها من فهرس الكتاب المدرسي («التربية المدنية —
  // السنة الرابعة»، الصفحات 7–10) قبل «من تراثنا المادي» (الأسبوع 6)
  "4AP_civic": {
    main: MAIN_4AP,
    lessons: [
      [2, "الحياة الجماعية", "تراثنا الوطني والمحلي (الوضعية الانطلاقية: تراثنا كنز ثمين)", "يتعرف على أشكال التراث الوطني والمحلي ويعتز به.", null],
      [3, "الحياة الجماعية", "المعالم الأثرية في وطني", "يتعرف على أهم المعالم الأثرية في الجزائر ومواقعها.", null],
      [4, "الحياة الجماعية", "من معالمنا الأثرية: حي القصبة العتيق", "يتعرف على حي القصبة العتيق معلمًا أثريًا ويدعو إلى المحافظة عليه.", null],
      [5, "الحياة الجماعية", "أدمج تعلماتي: تراثنا الوطني ومعالمنا الأثرية", "يوظف ما تعلمه عن التراث الوطني والمعالم الأثرية في وضعية إدماجية.", null],
    ],
  },
  // البدنية في الرابعة: ملف «وضعيات وتنقلات» يغطي الأسابيع 2–11؛ ما بعدها مذكرات من «مذكرات جميع المواد — سنة رابعة»
  // (صفحاتها بأرقامها في الملف، والميدان من رأس كل مذكرة)
  "4AP_pe": {
    segments: { 2: "الحركات القاعدية", 3: "الهيكلة والبناء" },
    segmentOf: (domain) => (domain === "الحركات القاعدية" ? 2 : 3),
    lessons: [
      [14, "الحركات القاعدية", "الوثب", "يؤدي حركات منظمة بالوثب حسب الموقف مع احترام قواعد الأمن.", `${MAIN_4AP}@163`],
      [15, "الحركات القاعدية", "الوثب", "يختار حركة الوثب المناسبة (طولًا، عاليًا) وينجزها بتوازن.", `${MAIN_4AP}@178`],
      [19, "الحركات القاعدية", "الوثب: المحافظة على التوازن", "يحافظ على توازنه خلال الوثب والهبوط.", `${MAIN_4AP}@237`],
      [20, "الحركات القاعدية", "الرمي حسب الموقف (بيد واحدة، باليدين)", "يرمي بيد واحدة أو باليدين حسب الموقف.", `${MAIN_4AP}@256`],
      [21, "الحركات القاعدية", "الرمي حسب الموقف", "يرمي بدقة نحو هدف ثابت أو متحرك حسب الموقف.", `${MAIN_4AP}@274`],
      [22, "الحركات القاعدية", "الرمي حسب الموقف", "يربط بين الجري والرمي ويكيّف رميه حسب الموقف.", `${MAIN_4AP}@291`],
      [24, "الهيكلة والبناء", "استغلال فضاء الممارسة حسب الموقف", "يستغل فضاء الممارسة ويتموضع فيه حسب الموقف.", `${MAIN_4AP}@320`],
      [25, "الهيكلة والبناء", "استغلال فضاء الممارسة حسب الموقف", "يتنقل في الفضاء ويحتل المواقع المناسبة مع زملائه.", `${MAIN_4AP}@336`],
      [26, "الهيكلة والبناء", "استغلال فضاء الممارسة حسب الموقف", "ينظم تنقلاته في الفضاء ضمن لعب جماعي.", `${MAIN_4AP}@353`],
      [27, "الهيكلة والبناء", "اللعب الجماعي: الدفاع والهجوم", "يميز بين دوري الهجوم والدفاع ويقوم بهما في لعب جماعي.", `${MAIN_4AP}@370`],
      [28, "الهيكلة والبناء", "اللعب الجماعي: الدفاع والهجوم", "يتعاون مع فريقه في الهجوم والدفاع ويحترم قواعد اللعب.", `${MAIN_4AP}@387`],
    ],
  },
  // الخامسة: مذكرات «موقع المنارة» (ملف لكل درس، صفحة واحدة) تُلحق بالحصص الموجودة ذات العنوان نفسه
  // [الأسبوع، …، الملف، …، ترتيب الحصة]. ملفات Word في المجلد لا تُقرأ في المتصفح فتُترك حتى تُرفع PDF.
  "5AP_islamic": {
    lessons: [
      [7, null, null, null, "1p4PkvNYO6ggzUNt0xiv3X_HGpS9daOSP", null, 6], // من صفات الله العالم
      [7, null, null, null, "1FH3Tcg4-N6UV0nQSkYW7b6BcIgTvYe4T", null, 7], // التيمم
      [9, null, null, null, "1OYHKIG61MIk9LEQkLHxAdMbL_PMEBTOb", null, 8], // الحج
      [10, null, null, null, "1ndZMZZgX4RVbvpkBAkI7V1Eg_5z_lym8", null, 10], // وصايا لقمان
      [11, null, null, null, "1md_p6nwaMbV2_VwSMvXMDedeqvRkPBGD", null, 11], // استثمار الوقت
      [11, null, null, null, "1bTzp6NM45pCdM4SJIhteqSW1yQ7OtZIU", null, 12], // الاجتهاد في العمل
      [12, null, null, null, "1jKzDAwYdEuFjIhe0Q9dTsOyBCsm-exhm", null, 13], // الهجرة النبوية
      [13, null, null, null, "1XR_C0xPCJ4bNU_pJ1Kr0ao1VZj1ZMPKK", null, 14], // المؤاخاة
      [13, null, null, null, "1hWOJzdcBSueYHQxVxDzsWvfFzSvryar1", null, 15], // كرم عثمان
      [16, null, null, null, "16xORWh5gqkCQcWfCPt-U21bJdxU6GeYj", null, 18], // سورة الفجر
      [17, null, null, null, "1Jh9h957qlIUbQ-DcrkK9KpYkFIlqvInz", null, 19], // الحياء
      [17, null, null, null, "1OAirMOW3UxVp0cIHCJDfhDDIwAs5ivQ4", null, 20], // من صفات الله القادر
      [18, null, null, null, "1-22RokAiztKUWAP4VtZRytL2Aw8uAe-V", null, 21], // صلاة المريض
      [19, null, null, null, "1vnzdwczTxtaKYPT_Q8xpgv8seX3j4OLi", null, 22], // من آثار الإيمان
      [19, null, null, null, "1j6hOLe6F_9pV8yFPLlMb58Sl3z9cEzVb", null, 23], // التعاون
      [19, null, null, null, "1b9zxKFrJpS54v9QadxNQV0xd6YnsW0n2", null, 24], // الاستقامة
      [19, null, null, null, "1QRUz8bl0ql23DQL-_ldJqFmNGlgQ2ZqT", null, 25], // حب الأسرة
      [20, null, null, null, "1Z0zxkmq1VREX5iLN4O_2cmhFOUlJcNqc", null, 26], // الصلح
      [21, null, null, null, "1WcdpUd4qNIOC9DGAVixmMyGjWyfbMgC9", null, 27], // تعايش الرسول ﷺ
      [21, null, null, null, "1pqoCbN9NMi6RJgjGBHscILRMPgXG8nkn", null, 28], // فتح مكة
      [24, null, null, null, "1pj-yaTVTQPYFv0B6mtRpq1mL541zoQhu", null, 29], // بطولة علي
      [25, null, null, null, "1OwDYOz42UpjwtEf2KuqSrfZ0mIOiHzow", null, 30], // سورة الغاشية
      [26, null, null, null, "1tksXyOPz3V1pOkrJBIG1VQ34J1zuRjM9", null, 32], // سورة الأعلى
      [27, null, null, null, "1ZULAk3m0IDcq94ojTp7Y2CS9nvSpnhSn", null, 33], // ليس المؤمن بالطعان
      [27, null, null, null, "1mHsGYfAOsfr48cWuenhWSp5qg6U0NGrx", null, 34], // من غشنا فليس منا
      [29, null, null, null, "19NJfUgGCe6EG_d0sqXazj9o0jERu4Mc7", null, 36], // صلاة السفر
      [29, null, null, null, "1gkJnaK4nEuEOlB8kJ0PzBUjJRF435I6X", null, 37], // العناية بالمحيط
      [30, null, null, null, "1i18mFMUfqT6UZ5ANSEWaWghJvRx0lllw", null, 38], // حجة الوداع
      [30, null, null, null, "1FWDz1UGxplgMY--Xhs2YYE2aXIfunj5f", null, 39], // أسماء ذات النطاقين
      [31, null, null, null, "1fGeKY7SFJo9VwT_Qj0eiO4Dz2ntsyzss", null, 40], // قصة سليمان
    ],
  },
  "5AP_civic": {
    lessons: [
      [2, null, null, null, "1cJzUUZDQHSbQCSmzFONE1aB8b64P_zc6", null, 1], // الوضعية الانطلاقية
      [2, null, null, null, "1iuroO6ncAxgdBGC6EyVXFT5J3g2-jMbn", null, 1], // المؤسسات العمومية الخدماتية
      [4, null, null, null, "1f4Z-75zDC2IzDt8j1O_i4iJTqODoVUyc", null, 2], // البريد والمواصلات
      [5, null, null, null, "1zJAFvtNXLqntpOuTVpGTSf5oO7Ej5j4l", null, 3], // وسائل الإعلام
      [6, null, null, null, "165PUQwRHG73k1BRivjvyUO_1-jl4F0xF", null, 4], // وسائل الاتصال
      [7, null, null, null, "1GzvfWmHEnF23tWpdi4Tb8Foa6wjIMOJQ", null, 5], // تعلم الإدماج
    ],
  },
  "5AP_science": {
    lessons: [
      [2, null, null, null, "1U0DuOZiY3P00Fg4WBGZhoKmGPhovGHKL", null, 1], // الوضعية المشكلة الأم
      [2, null, null, null, "12QqvKbbJD8xRKmmFRMeY4AD867y6JMrq", null, 1], // مكونات الهواء ومخاطر بعض الغازات
      [2, null, null, null, "1Izza4FpE-f9pnvZZIQoM0a-mj4QYHgmf", null, 1], // الهواء والاحتراق
      [3, null, null, null, "1vpi_SyvcUF55BdwR-BEY9-AEQ0rMo8aP", null, 2], // غازات أخرى غير الهواء
      [4, null, null, null, "1brvNC7vriAH7DVYigQSLiwm8LP0HRLoh", null, 3], // قواعد الأمن عند التعامل مع الغازات
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
  // إعادة التشغيل: نُزيل ما أُلحق سابقًا بالحصص الموجودة (صفحات مصدرها الرئيسي تبقى)
  for (const l of kept) if (l.attached === MARK) {
    l.pages = (l.pages ?? []).filter((p) => typeof p === "number");
    delete l.attached;
  }
  let next = Math.max(...kept.map((l) => l.order)) + 1;
  if (spec.segments) Object.assign(data.segments, spec.segments);

  // ترتيب ملفات الوثيقة الإضافية بأول ظهور، وصفحات كل ملف فيها.
  // «id@163,164»: صفحات بعينها من ملف كبير؛ null: حصة بلا مذكرة (العنوان فقط، من المخطط أو الكتاب المدرسي)
  const key = spec.images ? "c" : "b";
  const fileOf = (f) => f?.split("@")[0];
  const files = [...new Set(spec.lessons.map((l) => fileOf(l[4])).filter(Boolean))];
  const pagesOf = new Map();
  const offsetOf = new Map();
  let offset = 0;
  for (const f of files) {
    const n = spec.images ? 1 : pdfPages(await driveFile(f));
    if (!n) throw new Error(`no pages: ${f}`);
    pagesOf.set(f, Array.from({ length: Math.min(n, 6) }, (_, i) => `${key}:${offset + i + 1}`));
    offsetOf.set(f, offset);
    offset += n;
  }
  const lessonPages = (f) => {
    if (!f) return [];
    const [id, only] = f.split("@");
    return only ? only.split(",").map((n) => `${key}:${offsetOf.get(id) + Number(n)}`) : pagesOf.get(id);
  };

  const added = [];
  for (const [week, domain, topic, objective, file, session, attachTo] of spec.lessons) {
    if (attachTo) {
      const target = kept.find((l) => l.order === attachTo);
      if (!target || target.unit !== week) throw new Error(`${id}: attach ${attachTo} ≠ week ${week}`);
      target.pages = [...(target.pages ?? []), ...lessonPages(file)];
      target.attached = MARK;
      continue;
    }
    const seg = spec.segmentOf ? spec.segmentOf(domain) : segmentOfWeek(plan, week);
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
      pages: lessonPages(file),
      // مقاطع التربية البدنية ميادينها، وعنوانها اسم الميدان وحده (كبقية حصص الملف)
      segmentTitle: spec.segmentOf ? data.segments[seg] : `المقطع ${seg}: ${data.segments[seg] ?? plan.segments[seg]?.title ?? ""}`,
      added: MARK,
    });
  }
  data.lessons = [...kept, ...added];
  data.sources = {
    ...(spec.main ? { main: { pdf: [spec.main] } } : {}),
    ...(files.length ? { [key]: spec.images ? { images: files } : { pdf: files } } : {}),
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
