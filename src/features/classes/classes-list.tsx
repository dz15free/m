"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Plus, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { useClasses, useTaxonomy, useTeacher } from "./hooks";
import { compareClasses } from "./naming";
import { SubjectTags } from "./subject-chips";

export function ClassesList() {
  const t = useTranslations("classes");
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  const classes = useClasses();

  if (classes.isError) {
    return <p className="rounded-card bg-red-50 p-4 text-sm text-red-800">{t("loadError")}</p>;
  }
  if (!classes.data || !tax.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const taxonomy = tax.data;
  if (classes.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Users aria-hidden className="size-7" />
        </span>
        <p className="font-semibold">{t("empty")}</p>
        <p className="max-w-sm text-sm text-muted">{t("emptyHint")}</p>
        <LinkButton href="/app/classes/new" size="lg" className="mt-2">
          <Plus aria-hidden className="size-5" />
          {t("add")}
        </LinkButton>
      </Card>
    );
  }

  const order = (level: string) => levelById(taxonomy, level)?.order ?? 99;
  const sorted = [...classes.data].sort(compareClasses(order));
  const levels = [...new Set(sorted.map((c) => c.level))];

  return (
    <div className="space-y-6">
      {levels.map((level) => (
        <section key={level} aria-labelledby={`lvl-${level}`} className="space-y-3">
          <h2 id={`lvl-${level}`} className="text-sm font-semibold text-muted">
            {levelById(taxonomy, level)?.label[locale] ?? level}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted
              .filter((c) => c.level === level)
              .map((c) => (
                <li key={c.id}>
                  <Link href={`/app/classes/${c.id}`} className="group block h-full">
                    <Card className="h-full space-y-3 transition-shadow group-hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xl font-bold" dir="ltr">
                          {c.displayName}
                        </p>
                        <span className="flex items-center gap-1 text-sm text-muted">
                          <Users aria-hidden className="size-4" />
                          {t("students", { count: c.studentCount })}
                        </span>
                      </div>
                      <SubjectTags labels={c.subjectIds.map((s) => subjectById(taxonomy, s)?.label[locale] ?? s)} />
                    </Card>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
