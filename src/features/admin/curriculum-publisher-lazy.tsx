"use client";

import dynamic from "next/dynamic";

/* صفحة النشر تحمّل ملفات المذكرات (عشرات الميغابايت بصورها) عند الطلب: تُعرض في المتصفح فقط (ssr: false)،
   فلا تدخل ملفات content/memos في حزمة الخادم (حدّ حجم Worker في Cloudflare). */
export const CurriculumPublisher = dynamic(() => import("./curriculum-publisher").then((m) => m.CurriculumPublisher), { ssr: false });
