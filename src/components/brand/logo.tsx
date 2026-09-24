import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/* الشعار الرسمي كما هو، مقصوص فقط إلى أجزائه (scripts/generate-brand-assets.mjs):
   - mark:   الأيقونة وحدها (الشريط الجانبي المصغّر، رأس الهاتف، الأيقونات)
   - lockup: الأيقونة + اسم «مساعد الأستاذ» بخطّ الشعار نفسه (الرؤوس والقوائم)
   - full:   الشعار الكامل مع الشعار النصّي (الصفحة الرئيسية، الدخول، الوثائق)
   الارتفاع يُضبط بـ className والعرض يتبعه تلقائيًا، فيبقى متناسبًا في كل مقاس. */

const NAME = "مساعد الأستاذ";

type Props = {
  variant?: "mark" | "lockup" | "full";
  className?: string;
  priority?: boolean;
};

export function Logo({ variant = "lockup", className, priority }: Props) {
  if (variant === "full") {
    return (
      <Image
        src="/brand/logo.webp"
        alt={NAME}
        width={720}
        height={716}
        priority={priority}
        className={cn("h-40 w-auto", className)}
      />
    );
  }

  const mark = (
    <Image
      src="/brand/mark.webp"
      alt={variant === "mark" ? NAME : ""}
      width={241}
      height={256}
      priority={priority}
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
      <Image
        src="/brand/wordmark.webp"
        alt={NAME}
        width={640}
        height={102}
        priority={priority}
        className="h-[45%] w-auto"
      />
    </span>
  );
}
