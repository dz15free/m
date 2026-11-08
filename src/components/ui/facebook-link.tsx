import { cn } from "@/lib/utils/cn";

/** صفحة المنصة على فيسبوك */
export const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61595378373043";

/** أيقونة فيسبوك (شعار «f» في دائرة) ورابط صفحتنا؛ النص للقارئ الصوتي أو ظاهر بجانب الأيقونة. */
export function FacebookLink({ label, showLabel = false, className }: { label: string; showLabel?: boolean; className?: string }) {
  return (
    <a
      href={FACEBOOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={showLabel ? undefined : label}
      title={label}
      className={cn("inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-[#1877F2]", className)}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0">
        <circle cx="12" cy="12" r="12" fill="#1877F2" />
        <path
          fill="#fff"
          d="M15.12 15.47 15.65 12h-3.33V9.75c0-.95.47-1.88 1.95-1.88h1.51V4.92s-1.37-.23-2.68-.23c-2.74 0-4.53 1.66-4.53 4.66V12H5.53v3.47h3.04v8.39a12.1 12.1 0 0 0 3.75 0v-8.39h2.8Z"
        />
      </svg>
      {showLabel && <span>{label}</span>}
    </a>
  );
}
