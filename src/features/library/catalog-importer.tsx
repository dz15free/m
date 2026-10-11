"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, DownloadCloud, FileUp, FolderSync, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import catalog from "./catalog.json";
import { pendingCatalog, toContentDoc, type CatalogEntry } from "./catalog";
import { ALLOWED_MIME, type ContentFile } from "./logic";
import { driveContentId, driveToContentDoc, guessMeta, type DriveListing } from "./drive-guess";
import { importCatalogFile, listDriveLibrary, removeFile, saveContent } from "./repo";
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
  // ملفات موادنا الخاصة يختارها الأدمن من جهازه، وتُطابَق بالاسم
  const [local, setLocal] = useState<Map<string, File>>(() => new Map());
  const uploads = pending.flatMap((e) => e.files.filter((f) => f.upload).map((f) => f.name));
  const ready = (e: CatalogEntry) => e.files.every((f) => !f.upload || local.has(f.name));
  const importable = pending.filter(ready);
  const waiting = pending.length - importable.length;

  function choose(list: FileList | null) {
    setLocal((m) => {
      const n = new Map(m);
      for (const f of Array.from(list ?? [])) {
        // المتصفح قد يضيف «(1)» عند تكرار التنزيل
        const name = uploads.find((u) => u.toLowerCase() === f.name.replace(/\s*\(\d+\)(?=\.pdf$)/i, "").toLowerCase());
        if (name) n.set(name, f);
      }
      return n;
    });
  }

  async function start() {
    setFailed([]);
    setFinished(false);
    const list = importable;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i]!;
      setRun({ done: i, total: list.length, current: titleOf(entry.title, locale) });
      const files: ContentFile[] = [];
      try {
        for (const f of entry.files) files.push(await importCatalogFile(f, f.upload ? local.get(f.name) : undefined));
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
        <button type="button" onClick={start} disabled={!!run || !importable.length} className={cn(buttonClass("primary"), "shrink-0")}>
          {run ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <DownloadCloud aria-hidden className="size-4" />}
          {t("button", { n: importable.length })}
        </button>
      </div>
      {uploads.length > 0 && (
        <div className="space-y-2 rounded-xl bg-canvas p-3 text-sm">
          <p className="font-semibold">{t("uploadsTitle")}</p>
          <p className="text-muted">{t("uploadsBody", { n: uploads.length })}</p>
          <ul className="space-y-0.5 text-xs" dir="ltr">
            {uploads.map((name) => (
              <li key={name} className={cn("flex items-center gap-1.5", local.has(name) ? "text-green-800" : "text-muted")}>
                {local.has(name) ? <CheckCircle2 aria-hidden className="size-3.5" /> : <FileUp aria-hidden className="size-3.5" />}
                <span className="font-mono">{name}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <label className={cn(buttonClass("secondary"), "cursor-pointer")}>
              <FileUp aria-hidden className="size-4" />
              {t("choose")}
              <input type="file" accept="application/pdf" multiple className="sr-only" onChange={(e) => choose(e.target.files)} />
            </label>
            <span className="text-xs text-muted">{t("matched", { n: uploads.filter((n) => local.has(n)).length, total: uploads.length })}</span>
          </div>
          {waiting > 0 && <p className="text-xs text-muted">{t("waiting", { n: waiting })}</p>}
        </div>
      )}
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
            {failed.map((f, i) => (
              <li key={i} dir="auto">
                {f.title} — <span dir="ltr" className="font-mono">{f.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const CATALOG_FILES = (catalog as CatalogEntry[]).flatMap((c) => c.files);
const CATALOG_DRIVE_IDS = new Set(CATALOG_FILES.map((f) => f.driveId));
const MAX_IMPORT = 100 * 1024 * 1024;
/** مفتاح التكرار: الاسم دون لاحقة النسخ «(1)» مع الحجم — النسخ المكررة في الدرايف تُعرض مرة واحدة. */
const dupKey = (name: string, size: number | null) => `${size ?? 0}:${name.replace(/\s*\(\d+\)(?=\.[^.]+$|$)/, "").trim().toLowerCase()}`;
const CATALOG_KEYS = new Set(CATALOG_FILES.map((f) => dupKey(f.name, f.size)));

/** «ملفات جديدة في الدرايف»: ما أُضيف إلى مجلد المكتبة ولم يُستورد بعد، مصنّفًا تلقائيًا من اسمه. */
export function DriveImporter({ existingIds }: { existingIds: Set<string> }) {
  const t = useTranslations("contentAdmin.drive");
  const tl = useTranslations("library");
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["driveLibrary"], queryFn: listDriveLibrary, retry: false, staleTime: 60_000 });
  const [run, setRun] = useState<{ done: number; total: number; current: string } | null>(null);
  const [failed, setFailed] = useState<{ title: string; reason: string }[]>([]);
  // المستبعَد من الاختيار (الافتراضي: كل ملف جديد محدَّد)
  const [unchecked, setUnchecked] = useState<Set<string>>(() => new Set());

  const seen = new Set(CATALOG_KEYS);
  const files = (list.data ?? []).filter((f) => {
    if (CATALOG_DRIVE_IDS.has(f.id)) return false;
    const k = dupKey(f.name, f.size);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const fresh = files.filter((f) => !existingIds.has(driveContentId(f.id)));
  const ok = fresh.filter((f) => (ALLOWED_MIME as readonly string[]).includes(f.mime) && f.size > 0 && f.size <= MAX_IMPORT);
  const skipped = fresh.length - ok.length;
  const selected = ok.filter((f) => !unchecked.has(f.id));

  function toggle(id: string) {
    setUnchecked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function start(chosen: DriveListing[]) {
    setFailed([]);
    for (let i = 0; i < chosen.length; i++) {
      const f = chosen[i]!;
      const title = guessMeta(f).title;
      setRun({ done: i, total: chosen.length, current: title });
      let uploaded: ContentFile | null = null;
      try {
        uploaded = await importCatalogFile({ driveId: f.id, mime: f.mime });
        await saveContent(driveToContentDoc(f, uploaded), driveContentId(f.id));
      } catch (e) {
        if (uploaded) await removeFile(uploaded.key);
        setFailed((x) => [...x, { title, reason: e instanceof Error ? e.message : String(e) }]);
      }
    }
    setRun(null);
    await qc.invalidateQueries({ queryKey: ["contentsAdmin"] });
  }

  return (
    <Card className="space-y-3 border border-brand-100">
      <div className="flex flex-wrap items-center gap-3">
        <FolderSync aria-hidden className="size-6 text-brand-700" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted">
            {list.isLoading
              ? t("checking")
              : list.isError
                ? t("error", { reason: (list.error as Error).message })
                : ok.length
                  ? t("body", { n: ok.length })
                  : t("none")}
            {skipped > 0 && ` ${t("skipped", { n: skipped })}`}
          </p>
        </div>
        <button type="button" onClick={() => list.refetch()} disabled={list.isFetching || !!run} className={cn(buttonClass("secondary"), "shrink-0")}>
          {list.isFetching ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <FolderSync aria-hidden className="size-4" />}
          {t("refresh")}
        </button>
        {ok.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => start(selected)}
              disabled={!!run || !selected.length}
              className={cn(buttonClass("secondary"), "shrink-0")}
            >
              <DownloadCloud aria-hidden className="size-4" />
              {t("importSelected", { n: selected.length })}
            </button>
            <button type="button" onClick={() => start(ok)} disabled={!!run} className={cn(buttonClass("primary"), "shrink-0")}>
              {run ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <DownloadCloud aria-hidden className="size-4" />}
              {t("button", { n: ok.length })}
            </button>
          </>
        )}
      </div>
      {ok.length > 0 && !run && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted">{t("selected", { n: selected.length, total: ok.length })}</span>
            <button type="button" onClick={() => setUnchecked(new Set())} className="font-medium text-brand-700 hover:underline">
              {t("selectAll")}
            </button>
            <button type="button" onClick={() => setUnchecked(new Set(ok.map((f) => f.id)))} className="font-medium text-brand-700 hover:underline">
              {t("selectNone")}
            </button>
          </div>
          <ul className="max-h-72 space-y-1 overflow-auto text-xs">
            {ok.map((f) => {
              const g = guessMeta(f);
              return (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-canvas" dir="auto">
                    <input type="checkbox" checked={!unchecked.has(f.id)} onChange={() => toggle(f.id)} className="mt-0.5 size-4 shrink-0 accent-brand-600" />
                    <span className="min-w-0">
                      <span className="font-medium">{g.title}</span>{" "}
                      <span className="text-muted">
                        — {[tl(`types.${g.type}`), g.level, g.subject, `${(f.size / 1024 / 1024).toFixed(1)} MB`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
            {failed.map((f, i) => (
              <li key={i} dir="auto">
                {f.title} — <span dir="ltr" className="font-mono">{f.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
