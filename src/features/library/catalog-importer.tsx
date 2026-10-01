"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DownloadCloud, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import catalog from "./catalog.json";
import { pendingCatalog, toContentDoc, type CatalogEntry } from "./catalog";
import type { ContentFile } from "./logic";
import { importCatalogFile, removeFile, saveContent } from "./repo";
import { titleOf } from "./library-browser";

/** «المكتبة الجاهزة»: زر واحد للأدمن يستورد كل ما لم يُستورد بعد من catalog.json (ملفات Drive مصنّفة). */
export function CatalogImporter({ existingIds }: { existingIds: Set<string> }) {
  const t = useTranslations("contentAdmin.catalog");
  const locale = useLocale() as "ar" | "fr";
  const qc = useQueryClient();
  const pending = pendingCatalog(catalog as CatalogEntry[], existingIds);
  const [run, setRun] = useState<{ done: number; total: number; current: string } | null>(null);
  const [failed, setFailed] = useState<{ title: string; reason: string }[]>([]);
  const [finished, setFinished] = useState(false);

  async function start() {
    setFailed([]);
    setFinished(false);
    const list = pending;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i]!;
      setRun({ done: i, total: list.length, current: titleOf(entry.title, locale) });
      const files: ContentFile[] = [];
      try {
        for (const f of entry.files) files.push(await importCatalogFile(f));
        try {
          await saveContent(toContentDoc(entry, files), entry.id);
        } catch (e) {
          throw new Error(`Firestore: ${e instanceof Error ? e.message : String(e)}`);
        }
      } catch (e) {
        // لا نترك ملفات يتيمة لمحتوى لم يُحفظ
        await Promise.all(files.map((f) => removeFile(f.key)));
        setFailed((x) => [...x, { title: titleOf(entry.title, locale), reason: e instanceof Error ? e.message : String(e) }]);
      }
    }
    setRun(null);
    setFinished(true);
    await qc.invalidateQueries({ queryKey: ["contentsAdmin"] });
  }

  if (!pending.length && !failed.length) return finished ? <Card className="text-sm text-green-800">{t("done")}</Card> : null;
  const files = pending.reduce((n, c) => n + c.files.length, 0);
  return (
    <Card className="space-y-3 border border-brand-100">
      <div className="flex flex-wrap items-center gap-3">
        <DownloadCloud aria-hidden className="size-6 text-brand-700" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted">{t("body", { n: pending.length, files })}</p>
        </div>
        <button type="button" onClick={start} disabled={!!run || !pending.length} className={cn(buttonClass("primary"), "shrink-0")}>
          {run ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <DownloadCloud aria-hidden className="size-4" />}
          {t("button", { n: pending.length })}
        </button>
      </div>
      {run && (
        <div role="status" className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${Math.round((run.done / run.total) * 100)}%` }} />
          </div>
          <p className="truncate text-xs text-muted" dir="auto">{t("progress", { done: run.done, total: run.total, title: run.current })}</p>
        </div>
      )}
      {failed.length > 0 && (
        <div className="text-sm text-red-800">
          <p>{t("failed", { n: failed.length })}</p>
          <ul className="list-inside list-disc text-xs">
            {failed.map((f) => (
              <li key={f.title} dir="auto">
                {f.title} — <span dir="ltr" className="font-mono">{f.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
