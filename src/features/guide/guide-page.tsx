"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  LibraryBig,
  ListChecks,
  NotebookPen,
  Printer,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Table2,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n/config";
import { FIRST_STEPS, GUIDE, type GuideIcon } from "./content";

const ICONS: Record<GuideIcon, LucideIcon> = {
  account: UserPlus,
  classes: Users,
  students: UsersRound,
  schedule: CalendarClock,
  session: ClipboardCheck,
  logbook: NotebookPen,
  grades: Table2,
  lessons: BookOpenCheck,
  aiMemo: Sparkles,
  planning: ListChecks,
  documents: Printer,
  library: LibraryBig,
  billing: CreditCard,
  app: Smartphone,
  settings: Settings,
};

/** يطابق البحث مع تجاهل التشكيل والهمزات وحالة الأحرف. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

export function GuidePage() {
  const t = useTranslations("guide");
  const locale = useLocale() as Locale;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<GuideIcon | null>(null);

  const sections = useMemo(
    () =>
      GUIDE.map((s) => ({
        ...s,
        t: s.title[locale],
        i: s.intro[locale],
        st: s.steps[locale],
        tp: s.tips[locale],
      })),
    [locale],
  );
  const needle = fold(q.trim());
  const shown = needle
    ? sections.filter((s) =>
        fold([s.t, s.i, ...s.st, ...s.tp].join(" ")).includes(needle),
      )
    : sections;

  const jump = (id: GuideIcon) => {
    setQ("");
    setOpen(id);
    window.setTimeout(
      () =>
        document
          .getElementById(`guide-${id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  return (
    <div className="space-y-6">
      {/* مسار البداية */}
      <section className="rounded-card bg-gradient-to-br from-brand-800 to-brand-950 p-5 text-white shadow-card">
        <h2 className="text-lg font-bold">{t("startTitle")}</h2>
        <p className="mt-1 text-sm text-white/75">{t("startBody")}</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FIRST_STEPS.map((id, n) => {
            const s = sections.find((x) => x.id === id)!;
            const Icon = ICONS[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => jump(id)}
                  className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-start ring-1 ring-white/15 transition-colors hover:bg-white/15"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-400 text-sm font-bold text-brand-950">
                    {n + 1}
                  </span>
                  <Icon
                    aria-hidden
                    className="size-5 shrink-0 text-brand-200"
                  />
                  <span className="text-sm font-semibold">{s.t}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* البحث */}
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="h-12 w-full rounded-full border border-line bg-surface ps-12 pe-4 shadow-card outline-none focus:border-brand-500"
        />
      </label>

      {/* الأقسام */}
      {shown.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-center text-muted shadow-card">
          {t("noResults")}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((s) => {
            const Icon = ICONS[s.id];
            const isOpen = !!needle || open === s.id;
            return (
              <li
                key={s.id}
                id={`guide-${s.id}`}
                className="scroll-mt-24 overflow-hidden rounded-card bg-surface shadow-card"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen && !needle ? null : s.id)}
                  className="flex w-full items-center gap-4 p-4 text-start transition-colors hover:bg-brand-50/60"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{s.t}</span>
                    <span className="block text-sm text-muted">{s.i}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "text-xl text-muted transition-transform",
                      isOpen && "rotate-45",
                    )}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-4 border-t border-line px-4 pb-5 pt-4">
                    <ol className="space-y-2.5">
                      {s.st.map((step, k) => (
                        <li key={k} className="flex gap-3">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                            {k + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                    {s.tp.length > 0 && (
                      <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
                        <p className="mb-1 font-semibold">💡 {t("tips")}</p>
                        <ul className="list-disc space-y-1 ps-5">
                          {s.tp.map((tip, k) => (
                            <li key={k}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.href && (
                      <Link
                        href={s.href}
                        className={buttonClass("primary", "md")}
                      >
                        {t("open")}
                      </Link>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-sm text-muted">{t("footer")}</p>
    </div>
  );
}
