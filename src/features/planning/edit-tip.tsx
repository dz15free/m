"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Lightbulb, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const readDismissed = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/** تلميح قابل للإغلاق (يُتذكّر على هذا الجهاز). لا يظهر في تصيير الخادم، فلا اختلاف عند الترطيب. */
export function EditTip({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  const t = useTranslations("planning.tip");
  const key = `tip:${id}`;
  const dismissed = useSyncExternalStore(subscribe, () => readDismissed(key), () => true);
  const [hidden, setHidden] = useState(false);
  if (dismissed || hidden) return null;
  return (
    <div role="note" className={cn("flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 print:hidden", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
        <Lightbulb aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-bold">{title}</p>
        <div className="leading-relaxed">{children}</div>
      </div>
      <button
        type="button"
        aria-label={t("dismiss")}
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(key, "1");
          } catch {
            // تخزين المتصفح غير متاح: يُغلق لهذه الزيارة فقط
          }
        }}
        className="grid size-9 shrink-0 place-items-center rounded-full text-amber-800 hover:bg-amber-100"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
