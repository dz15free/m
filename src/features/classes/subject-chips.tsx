"use client";

import { useLocale } from "next-intl";
import { Check } from "lucide-react";
import type { Subject } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";

/** اختيار متعدد للمواد بأزرار كبيرة سهلة اللمس. */
export function SubjectChips({
  subjects,
  selected,
  onToggle,
}: {
  subjects: Subject[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  const locale = useLocale() as "ar" | "fr";
  return (
    <ul className="flex flex-wrap gap-2">
      {subjects.map((s) => {
        const on = selected.has(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(s.id)}
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1 transition-colors",
                on ? "bg-brand-700 text-white ring-brand-700" : "bg-surface text-ink ring-line hover:bg-brand-50",
              )}
            >
              {on && <Check aria-hidden className="size-4" />}
              {s.label[locale]}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** عرض مختصر لمواد قسم (للبطاقات). */
export function SubjectTags({ labels, max = 3 }: { labels: string[]; max?: number }) {
  const shown = labels.slice(0, max);
  const rest = labels.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((l) => (
        <li key={l} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
          {l}
        </li>
      ))}
      {rest > 0 && <li className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-medium text-muted">+{rest}</li>}
    </ul>
  );
}
