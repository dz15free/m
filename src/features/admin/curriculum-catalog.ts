/* المناهج التي تغيّرت في المستودع ولها مصادر Drive (scripts/curriculum/add-drive-memos.mjs) — تُنشر من /admin/curriculum.
   يستورده الخادم (قائمة ملفات Drive المسموح بتحميلها) وصفحة النشر (تحميل مؤجّل، فلا يدخل حزمة بقية الصفحات).
   لإضافة منهاج: سطر استيراد وسطر في CURRICULA. */
import m4 from "../../../content/curriculum/4AP_math.json";
import i4 from "../../../content/curriculum/4AP_islamic.json";
import s4 from "../../../content/curriculum/4AP_science.json";
import h4 from "../../../content/curriculum/4AP_history.json";
import g4 from "../../../content/curriculum/4AP_geography.json";
import a4 from "../../../content/curriculum/4AP_art.json";
import mu4 from "../../../content/curriculum/4AP_music.json";
import ar4 from "../../../content/curriculum/4AP_ar.json";
import c4 from "../../../content/curriculum/4AP_civic.json";
import pe4 from "../../../content/curriculum/4AP_pe.json";
import fr4 from "../../../content/curriculum/4AP_fr.json";
import fr5 from "../../../content/curriculum/5AP_fr.json";
import h5 from "../../../content/curriculum/5AP_history.json";
import i5 from "../../../content/curriculum/5AP_islamic.json";
import c5 from "../../../content/curriculum/5AP_civic.json";
import s5 from "../../../content/curriculum/5AP_science.json";
import mid_1AM_ar from "../../../content/curriculum/1AM_ar.json";
import mid_1AM_civic from "../../../content/curriculum/1AM_civic.json";
import mid_1AM_en from "../../../content/curriculum/1AM_en.json";
import mid_1AM_fr from "../../../content/curriculum/1AM_fr.json";
import mid_1AM_histgeo from "../../../content/curriculum/1AM_histgeo.json";
import mid_1AM_informatics from "../../../content/curriculum/1AM_informatics.json";
import mid_1AM_islamic from "../../../content/curriculum/1AM_islamic.json";
import mid_1AM_math from "../../../content/curriculum/1AM_math.json";
import mid_1AM_music from "../../../content/curriculum/1AM_music.json";
import mid_1AM_physics from "../../../content/curriculum/1AM_physics.json";
import mid_1AM_science from "../../../content/curriculum/1AM_science.json";
import mid_2AM_ar from "../../../content/curriculum/2AM_ar.json";
import mid_2AM_civic from "../../../content/curriculum/2AM_civic.json";
import mid_2AM_en from "../../../content/curriculum/2AM_en.json";
import mid_2AM_histgeo from "../../../content/curriculum/2AM_histgeo.json";
import mid_2AM_informatics from "../../../content/curriculum/2AM_informatics.json";
import mid_2AM_islamic from "../../../content/curriculum/2AM_islamic.json";
import mid_2AM_math from "../../../content/curriculum/2AM_math.json";
import mid_2AM_physics from "../../../content/curriculum/2AM_physics.json";
import mid_2AM_science from "../../../content/curriculum/2AM_science.json";
import mid_3AM_ar from "../../../content/curriculum/3AM_ar.json";
import mid_3AM_civic from "../../../content/curriculum/3AM_civic.json";
import mid_3AM_en from "../../../content/curriculum/3AM_en.json";
import mid_3AM_fr from "../../../content/curriculum/3AM_fr.json";
import mid_3AM_histgeo from "../../../content/curriculum/3AM_histgeo.json";
import mid_3AM_math from "../../../content/curriculum/3AM_math.json";
import mid_3AM_informatics from "../../../content/curriculum/3AM_informatics.json";
import mid_3AM_islamic from "../../../content/curriculum/3AM_islamic.json";
import mid_3AM_physics from "../../../content/curriculum/3AM_physics.json";
import mid_3AM_science from "../../../content/curriculum/3AM_science.json";
import mid_4AM_ar from "../../../content/curriculum/4AM_ar.json";
import mid_4AM_civic from "../../../content/curriculum/4AM_civic.json";
import mid_4AM_en from "../../../content/curriculum/4AM_en.json";
import mid_4AM_fr from "../../../content/curriculum/4AM_fr.json";
import mid_4AM_histgeo from "../../../content/curriculum/4AM_histgeo.json";
import mid_4AM_informatics from "../../../content/curriculum/4AM_informatics.json";
import mid_4AM_islamic from "../../../content/curriculum/4AM_islamic.json";
import mid_4AM_math from "../../../content/curriculum/4AM_math.json";
import mid_4AM_music from "../../../content/curriculum/4AM_music.json";
import mid_4AM_physics from "../../../content/curriculum/4AM_physics.json";
import mid_4AM_science from "../../../content/curriculum/4AM_science.json";
import type { CurriculumFile } from "./curriculum-publish";

export const CURRICULA = [
  m4, i4, s4, h4, g4, a4, mu4, ar4, c4, pe4, fr4, h5, i5, c5, s5, fr5,
  // التعليم المتوسط (scripts/curriculum/build-middle.mjs)
  mid_1AM_ar, mid_1AM_civic, mid_1AM_en, mid_1AM_fr, mid_1AM_histgeo, mid_1AM_informatics, mid_1AM_islamic, mid_1AM_math, mid_1AM_music, mid_1AM_physics, mid_1AM_science, mid_2AM_ar, mid_2AM_civic, mid_2AM_en, mid_2AM_histgeo, mid_2AM_informatics, mid_2AM_islamic, mid_2AM_math, mid_2AM_physics, mid_2AM_science, mid_3AM_ar, mid_3AM_civic, mid_3AM_en, mid_3AM_fr, mid_3AM_histgeo, mid_3AM_informatics, mid_3AM_islamic, mid_3AM_math, mid_3AM_physics, mid_3AM_science, mid_4AM_ar, mid_4AM_civic, mid_4AM_en, mid_4AM_fr, mid_4AM_histgeo, mid_4AM_informatics, mid_4AM_islamic, mid_4AM_math, mid_4AM_music, mid_4AM_physics, mid_4AM_science,
] as unknown as CurriculumFile[];

/** معرّفات ملفات Drive المعلنة مصادرَ لهذه المناهج (نسخة خفيفة للخادم في curriculum-sources.json؛ اختبار يتأكد من تطابقهما). */
export const SOURCE_FILE_IDS = new Set(CURRICULA.flatMap((c) => Object.values(c.sources ?? {}).flatMap((s) => [...(s.pdf ?? []), ...(s.images ?? [])])));
