"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarRange,
  ClipboardCheck,
  FileBadge,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  LayoutTemplate,
  Library,
  LoaderCircle,
  Lock,
  Music,
  PencilLine,
  Presentation,
  Search,
  Video,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useClasses, useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { levelById, subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { CONTENT_TYPES, search, type ContentType, type IndexEntry } from "./logic";
import { getIndex, previewUrl } from "./repo";

export const TYPE_ICON: Record<ContentType, typeof FileText> = {
  fiche: FileText,
  progression: CalendarRange,
  exercise: PencilLine,
  evaluation: ClipboardCheck,
  exam: GraduationCap,
  poster: Presentation,
  template: LayoutTemplate,
  adminDoc: FileBadge,
  audio: Music,
  video: Video,
  image: ImageIcon,
};

export const titleOf = (t: { ar: string; fr: string }, locale: "ar" | "fr") => t[locale] || t[locale === "ar" ? "fr" : "ar"];

export function LibraryBrowser() {
  const t = useTranslations("library");
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher();
  const stage = teacher.data?.profile.stage;
  const classes = useClasses();
  const tax = useTaxonomy(stage);
  const index = useQuery({ queryKey: ["contentIndex", stage ?? ""], queryFn: () => getIndex(stage!), enabled: !!stage, staleTime: 10 * 60_000 });
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [mine, setMine] = useState(true);
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<ContentType | "">("");

  if (!index.data || !tax.data || !classes.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const taxonomy = tax.data;
  const active = classes.data.filter((c) => !c.archived);
  const myLevels = new Set(active.map((c) => c.level));
  const mySubjects = new Set(active.flatMap((c) => c.subjectIds));
  const canMine = active.length > 0;
  const useMine = canMine && mine && !level && !subject;

  let results = search(index.data, query, { level, subject, type });
  if (useMine) results = results.filter((e) => (!e.l || myLevels.has(e.l)) && (!e.s || mySubjects.has(e.s)));
  const presentTypes = CONTENT_TYPES.filter((ty) => index.data.some((e) => e.ty === ty));
  const filtered = !!(query || level || subject || type);

  if (index.data.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <Library aria-hidden className="size-8 text-brand-700" />
        <p className="max-w-sm text-muted">{t("empty")}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <Search aria-hidden className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
          className="block min-h-13 w-full rounded-2xl border border-line bg-surface ps-12 pe-4 text-base shadow-card outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {canMine && (
          <button
            type="button"
            aria-pressed={useMine}
            onClick={() => {
              setMine(!useMine);
              setLevel("");
              setSubject("");
            }}
            className={chip(useMine)}
          >
            {t("myClasses")}
          </button>
        )}
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label={t("allLevels")} className={select(!!level)}>
          <option value="">{t("allLevels")}</option>
          {taxonomy.levels.map((l) => (
            <option key={l.id} value={l.id}>{l.label[locale]}</option>
          ))}
        </select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label={t("allSubjects")} className={select(!!subject)}>
          <option value="">{t("allSubjects")}</option>
          {taxonomy.subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.label[locale]}</option>
          ))}
        </select>
      </div>
      {presentTypes.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <button type="button" aria-pressed={!type} onClick={() => setType("")} className={chip(!type)}>{t("allTypes")}</button>
          {presentTypes.map((ty) => (
            <button key={ty} type="button" aria-pressed={type === ty} onClick={() => setType(type === ty ? "" : ty)} className={chip(type === ty)}>
              {t(`types.${ty}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted">{t("results", { n: results.length })}</p>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setLevel("");
              setSubject("");
              setType("");
            }}
            className="inline-flex min-h-9 items-center gap-1 text-sm font-medium text-brand-700"
          >
            <X aria-hidden className="size-4" />
            {t("clear")}
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <Card className="py-10 text-center text-muted">{t("noResults")}</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.slice(0, 200).map((e) => (
            <li key={e.id}>
              <ResultCard entry={e} taxonomy={taxonomy} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const chip = (on: boolean) =>
  cn("min-h-10 shrink-0 rounded-full px-4 text-sm font-medium ring-1 whitespace-nowrap", on ? "bg-brand-700 text-white ring-brand-700" : "bg-surface ring-line");
const select = (on: boolean) =>
  cn("min-h-10 rounded-full border-0 px-4 text-sm font-medium ring-1 outline-none", on ? "bg-brand-50 ring-brand-300" : "bg-surface ring-line");

function ResultCard({ entry: e, taxonomy }: { entry: IndexEntry; taxonomy: StageTaxonomy }) {
  const t = useTranslations("library");
  const locale = useLocale() as "ar" | "fr";
  const Icon = TYPE_ICON[e.ty] ?? FileText;
  const meta = [
    e.l ? levelById(taxonomy, e.l)?.short[locale] : t("allLevelsTag"),
    e.s && subjectById(taxonomy, e.s)?.label[locale],
    e.tm ? t("term", { n: e.tm }) : null,
  ].filter(Boolean);
  return (
    <Link href={`/app/library/${e.id}`} className="flex h-full gap-3 rounded-card bg-surface p-3 shadow-card transition-shadow hover:shadow-md">
      <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 text-brand-700">
        {e.pk ? (
          // eslint-disable-next-line @next/next/no-img-element -- صور معاينة من R2، لا خدمة تحسين صور
          <img src={previewUrl(e.pk)} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <Icon aria-hidden className="size-6" />
        )}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2 text-xs text-muted">
          {t(`types.${e.ty}`)}
          {e.a === "premium" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-700">
              <Lock aria-hidden className="size-3" />
              {t("premium")}
            </span>
          )}
        </span>
        <span dir="auto" className="line-clamp-2 block font-semibold leading-snug">{titleOf(e.t, locale)}</span>
        <span className="block truncate text-xs text-muted">{meta.join(" · ")}</span>
      </span>
    </Link>
  );
}
