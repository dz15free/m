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
import h5 from "../../../content/curriculum/5AP_history.json";
import type { CurriculumFile } from "./curriculum-publish";

export const CURRICULA = [m4, i4, s4, h4, g4, a4, mu4, ar4, h5] as unknown as CurriculumFile[];

/** معرّفات ملفات Drive المعلنة مصادرَ لهذه المناهج. */
export const SOURCE_FILE_IDS = new Set(CURRICULA.flatMap((c) => Object.values(c.sources ?? {}).flatMap((s) => [...(s.pdf ?? []), ...(s.images ?? [])])));
