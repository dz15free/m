"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  FileText,
  LoaderCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrintButtons } from "@/components/ui/print-actions";
import { intlLocale } from "@/i18n/pick";
import type { Locale } from "@/i18n/config";
import { EditableMemo } from "./memo-editor";
import { SaveMemoButton } from "./save-button";
import { sanitizeMemoHtml } from "./sanitize";
import { deleteSaved, getSaved, listSaved } from "./saved";

function Spinner() {
  return (
    <div role="status" className="grid place-items-center py-16">
      <LoaderCircle
        aria-hidden
        className="size-8 animate-spin text-brand-700"
      />
    </div>
  );
}

/** قائمة «مذكراتي المحفوظة». */
export function SavedMemosList() {
  const t = useTranslations("aiMemo.saved");
  const locale = useLocale() as Locale;
  const list = useQuery({ queryKey: ["savedMemos"], queryFn: listSaved });
  if (list.isLoading) return <Spinner />;
  const items = list.data?.items ?? [];
  if (!items.length) {
    return (
      <Card className="space-y-3 py-10 text-center">
        <p className="text-muted">{t("empty")}</p>
        <Link
          href="/app/lessons/write"
          className={buttonClass("primary", "md")}
        >
          <Sparkles aria-hidden className="size-4" />
          {t("writeFirst")}
        </Link>
      </Card>
    );
  }
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    dateStyle: "medium",
  });
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        {t("count", { n: items.length, max: list.data!.max })}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              href={`/app/lessons/mine/${m.id}`}
              className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <FileText aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span dir="auto" className="block truncate font-semibold">
                  {m.title}
                </span>
                <span className="block text-sm text-muted">
                  {m.level} · {m.subject} ·{" "}
                  {m.updatedAt ? fmt.format(m.updatedAt) : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** مذكرة محفوظة: عرض، تعديل، حفظ التعديلات، طباعة وحذف. */
export function SavedMemoView({ id }: { id: string }) {
  const t = useTranslations("aiMemo.saved");
  const router = useRouter();
  const qc = useQueryClient();
  const memo = useQuery({
    queryKey: ["savedMemo", id],
    queryFn: () => getSaved(id),
    staleTime: Infinity,
    gcTime: 0,
  });
  if (memo.isLoading) return <Spinner />;
  if (!memo.data)
    return (
      <Card className="py-10 text-center text-muted">{t("notFound")}</Card>
    );
  const m = memo.data;
  return (
    <article className="space-y-4 print:space-y-0">
      <style>{"@page { size: A4 portrait; margin: 9mm 10mm; }"}</style>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/app/lessons/mine"
          className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand-800"
        >
          <ArrowRight aria-hidden className="size-4 ltr:rotate-180" />
          {t("title")}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SaveMemoButton
            id={m.id}
            meta={{
              title: m.title,
              level: m.level,
              subject: m.subject,
              lang: m.lang,
            }}
          />
          <PrintButtons title={() => m.title} />
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t("deleteConfirm"))) return;
              await deleteSaved(m.id);
              await qc.invalidateQueries({ queryKey: ["savedMemos"] });
              router.push("/app/lessons/mine");
            }}
            className={buttonClass(
              "secondary",
              "md",
              "text-red-700 ring-red-200 hover:bg-red-50",
            )}
          >
            <Trash2 aria-hidden className="size-4" />
            {t("delete")}
          </button>
        </div>
      </div>
      <EditableMemo version={m.id}>
        <div dangerouslySetInnerHTML={{ __html: sanitizeMemoHtml(m.html) }} />
      </EditableMemo>
    </article>
  );
}
