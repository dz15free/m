/* eslint-disable @next/next/no-img-element -- الصور مولّدة مسبقًا بعدة مقاسات (srcset)، ولا خدمة تحسين صور على الخادم */
import { cn } from "@/lib/utils/cn";

/* الشعار الرسمي كما هو، مقصوص فقط إلى أجزائه (scripts/generate-brand-assets.mjs):
   - mark:   الأيقونة وحدها (الشريط الجانبي المصغّر، رأس الهاتف، الأيقونات)
   - lockup: الأيقونة + اسم «مساعد الأستاذ» بخطّ الشعار نفسه (الرؤوس والقوائم)
   - full:   الشعار الكامل مع الشعار النصّي (الصفحة الرئيسية، الدخول، الوثائق)
   الارتفاع يُضبط بـ className والعرض يتبعه تلقائيًا، فيبقى متناسبًا في كل مقاس.
   كل جزء بمقاسين: الهاتف يحمّل الأصغر، والشاشات الكبيرة أو عالية الكثافة الأكبر. */

const NAME = "مساعد الأستاذ";

type Props = {
  variant?: "mark" | "lockup" | "full";
  className?: string;
  priority?: boolean;
  /** العرض المعروض تقريبًا (لاختيار المقاس)، مثل "(min-width: 1024px) 384px, 224px" */
  sizes?: string;
};

const load = (priority?: boolean) =>
  priority ? ({ loading: "eager", fetchPriority: "high" } as const) : ({ loading: "lazy" } as const);

export function Logo({ variant = "lockup", className, priority, sizes }: Props) {
  if (variant === "full") {
    return (
      <img
        src="/brand/logo.webp"
        srcSet="/brand/logo-360.webp 360w, /brand/logo-560.webp 560w, /brand/logo.webp 720w"
        sizes={sizes ?? "160px"}
        alt={NAME}
        width={720}
        height={716}
        decoding="async"
        {...load(priority)}
        className={cn("h-40 w-auto", className)}
      />
    );
  }

  const mark = (
    <img
      src="/brand/mark.webp"
      srcSet="/brand/mark-128.webp 120w, /brand/mark.webp 241w"
      sizes={variant === "mark" ? (sizes ?? "64px") : "40px"}
      alt={variant === "mark" ? NAME : ""}
      width={241}
      height={256}
      decoding="async"
      {...load(priority)}
      className="h-full w-auto"
    />
  );

  if (variant === "mark") {
    return <span className={cn("inline-flex h-10", className)}>{mark}</span>;
  }

  return (
    // الترتيب ثابت (الأيقونة ثم الاسم من اليمين) كما في الشعار، بصرف النظر عن لغة الواجهة
    <span dir="rtl" className={cn("inline-flex h-10 items-center gap-2", className)}>
      {mark}
      <img
        src="/brand/wordmark.webp"
        srcSet="/brand/wordmark-320.webp 320w, /brand/wordmark.webp 640w"
        sizes="120px"
        alt={NAME}
        width={640}
        height={102}
        decoding="async"
        {...load(priority)}
        className="h-[45%] w-auto"
      />
    </span>
  );
}
