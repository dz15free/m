"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Download, ExternalLink, FileText, LoaderCircle, Lock, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { formatSize, type ContentFile } from "./logic";
import { fetchFile, getContent, PremiumRequired, previewUrl } from "./repo";
import { titleOf, TYPE_ICON } from "./library-browser";

export function ContentView({ contentId }: { contentId: string }) {
  const t = useTranslations("library");
  const locale = useLocale() as "ar" | "fr";
  const teacher = useTeacher();
  const content = useQuery({ queryKey: ["content", contentId], queryFn: () => getContent(contentId), staleTime: 10 * 60_000 });
  const tax = useTaxonomy(content.data?.stage ?? teacher.data?.profile.stage);
  const [locked, setLocked] = useState(false);

  if (content.isPending || (content.data && !tax.data)) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const c = content.data;
  if (!c) return <Card className="py-12 text-center text-muted">{t("notFound")}</Card>;

  const Icon = TYPE_ICON[c.type] ?? FileText;
  const meta = [
    t(`types.${c.type}`),
    c.level ? levelById(tax.data!, c.level)?.label[locale] : t("allLevelsTag"),
    c.subject && subjectById(tax.data!, c.subject)?.label[locale],
    c.term ? t("term", { n: c.term }) : null,
  ].filter(Boolean);
  const premium = c.access === "premium";

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-50 text-brand-700">
            {c.previewKey ? (
              // eslint-disable-next-line @next/next/no-img-element -- صورة معاينة من R2
              <img src={previewUrl(c.previewKey)} alt="" className="size-full object-cover" />
            ) : (
              <Icon aria-hidden className="size-8" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-muted">{meta.join(" · ")}</p>
            <h1 dir="auto" className="text-xl font-bold leading-snug">{titleOf(c.title, locale)}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              {premium ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 font-semibold text-accent-700">
                  <Lock aria-hidden className="size-3.5" />
                  {t("premium")}
                </span>
              ) : (
                <span className="rounded-full bg-green-50 px-2 py-0.5 font-semibold text-green-800">{t("free")}</span>
              )}
              {c.author && <span className="text-muted">{t("author")}: {c.author}</span>}
            </p>
          </div>
        </div>
        {c.unit && <p className="text-sm"><b>{t("unit")}:</b> <bdi>{c.unit}</bdi></p>}
        {c.excerpt && <p dir="auto" className="whitespace-pre-line text-muted">{c.excerpt}</p>}
        {c.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {c.tags.map((tag) => (
              <li key={tag} dir="auto" className="rounded-full bg-canvas px-2.5 py-0.5 text-xs text-muted">{tag}</li>
            ))}
          </ul>
        )}
      </Card>

      {locked && (
        <Card className="flex flex-col items-center gap-3 border-2 border-accent-300 py-8 text-center">
          <Sparkles aria-hidden className="size-8 text-accent-700" />
          <p className="font-semibold">{t("premiumTitle")}</p>
          <p className="max-w-sm text-sm text-muted">{t("premiumBody")}</p>
          <Link href="/app/billing" className={buttonClass("primary")}>{t("upgrade")}</Link>
        </Card>
      )}

      <section aria-labelledby="files" className="space-y-2">
        <h2 id="files" className="font-semibold">{t("files")}</h2>
        <ul className="space-y-2">
          {c.files.map((f, i) => (
            <li key={f.key}>
              <FileRow contentId={c.id} index={i} file={f} onLocked={() => setLocked(true)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FileRow({ contentId, index, file, onLocked }: { contentId: string; index: number; file: ContentFile; onLocked: () => void }) {
  const t = useTranslations("library");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function get(download: boolean) {
    // نافذة تُفتح فورًا (قبل الانتظار) كي لا يحجبها المتصفح على الهاتف
    const win = download ? null : window.open("", "_blank");
    setState("busy");
    try {
      const blob = await fetchFile(contentId, index);
      const url = URL.createObjectURL(blob);
      if (win) {
        win.location.href = url;
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setState("idle");
    } catch (e) {
      win?.close();
      if (e instanceof PremiumRequired) {
        onLocked();
        setState("idle");
      } else setState("error");
    }
  }

  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center gap-3">
        <FileText aria-hidden className="size-5 shrink-0 text-muted" />
        <p className="min-w-0 flex-1">
          <bdi className="block truncate font-medium">{file.name}</bdi>
          <span className="text-xs text-muted" dir="ltr">{formatSize(file.size)}</span>
        </p>
        {state === "busy" && <LoaderCircle aria-label={t("opening")} className="size-5 animate-spin text-muted" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={state === "busy"} onClick={() => get(false)} className={buttonClass("secondary")}>
          <ExternalLink aria-hidden className="size-4" />
          {t("open")}
        </button>
        <button type="button" disabled={state === "busy"} onClick={() => get(true)} className={buttonClass("secondary")}>
          <Download aria-hidden className="size-4" />
          {t("download")}
        </button>
      </div>
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t("fileError")}</p>}
    </Card>
  );
}
