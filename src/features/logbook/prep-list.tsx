"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenCheck, Copy, LoaderCircle, Plus, Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher, useUid } from "@/features/classes/hooks";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { normalizeArabic } from "@/shared/text/names";
import { prepTitle } from "./logic";
import { listPreps, savePrep, type PrepDoc } from "./repo";

export function PrepList() {
  const t = useTranslations("logbook.prep");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const uid = useUid();
  const teacher = useTeacher();
  const classes = useClasses();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const preps = useQuery({ queryKey: ["preps", uid ?? ""], queryFn: () => listPreps(uid!), enabled: !!uid });
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (!preps.data || !tax.data || !classes.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const taxonomy = tax.data;
  const usedSubjects = [...new Set(preps.data.map((p) => p.subjectId).filter(Boolean))];
  const needle = normalizeArabic(q.trim().toLowerCase());
  const shown = preps.data.filter(
    (p) =>
      (!subject || p.subjectId === subject) &&
      (!needle ||
        normalizeArabic([p.activity, p.content, p.domain, p.sequence, p.objective].join(" ").toLowerCase()).includes(needle)),
  );

  async function duplicate(p: PrepDoc) {
    if (!uid) return;
    setBusy(p.id);
    try {
      const { id: _id, ...data } = p;
      void _id;
      const id = await savePrep(uid, { ...data, date: "" });
      router.push(`/app/logbook/prep/${id}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/app/logbook/prep/new" className={buttonClass("primary")}>
          <Plus aria-hidden className="size-4" />
          {t("new")}
        </Link>
      </div>

      {preps.data.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <BookOpenCheck aria-hidden className="size-8 text-brand-700" />
          <p className="max-w-sm text-muted">{t("empty")}</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t("search")}</span>
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search")}
                className="block min-h-11 w-full rounded-xl border border-line bg-surface ps-9 pe-3 outline-none focus:border-brand-600"
              />
            </label>
            {usedSubjects.length > 1 && (
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                aria-label={t("subject")}
                className="min-h-11 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600"
              >
                <option value="">{t("allSubjects")}</option>
                {usedSubjects.map((s) => (
                  <option key={s} value={s}>{subjectById(taxonomy, s)?.label[locale] ?? s}</option>
                ))}
              </select>
            )}
          </div>
          <ul className="space-y-2">
            {shown.map((p) => (
              <li key={p.id} className="flex items-stretch gap-2 rounded-card bg-surface shadow-card">
                <Link href={`/app/logbook/prep/${p.id}`} className="min-w-0 flex-1 space-y-0.5 p-4">
                  <span className="block font-semibold">{prepTitle(p) || p.domain || t("untitled")}</span>
                  <span className="block text-sm text-muted">
                    {[
                      subjectById(taxonomy, p.subjectId)?.label[locale],
                      levelById(taxonomy, p.gradeId)?.short[locale],
                      p.sequence && `${t("fields.sequence")} ${p.sequence}`,
                      p.week && `${t("fields.week")} ${p.week}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => duplicate(p)}
                  disabled={busy === p.id}
                  aria-label={`${t("duplicate")}: ${prepTitle(p)}`}
                  className="grid w-12 shrink-0 place-items-center text-muted hover:text-ink"
                >
                  {busy === p.id ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Copy aria-hidden className="size-4" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
