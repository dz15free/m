"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CheckCircle2, CloudUpload, LoaderCircle, TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { useTaxonomy } from "@/features/classes/hooks";
import { getCurriculum } from "@/features/lessons/repo";
import { curriculumId } from "@/features/lessons/logic";
import { levelById } from "@/shared/taxonomy/taxonomy";
import { REPO_CURRICULA } from "./curriculum-ids";
import { contentRev, publishCurriculum, publishedRev, type CurriculumFile, type Progress } from "./curriculum-publish";
import { MEMO_FILES, type MemoFile } from "./curriculum-memos.gen";

type Row = { file: CurriculumFile; rev: string; published: string | null; added: number; memos: number };
type RunState = { id: string; progress?: Progress } | null;

async function loadRows(): Promise<Row[]> {
  // المناهج تُحمَّل مع هذه الصفحة فقط
  const { CURRICULA } = await import("./curriculum-catalog");
  return Promise.all(
    CURRICULA.map(async (file) => ({
      file,
      rev: contentRev(file, MEMO_FILES[file.id]?.rev),
      published: await publishedRev(file.id),
      added: file.lessons.filter((l) => (l as { added?: string }).added).length,
      memos: MEMO_FILES[file.id]?.count ?? 0,
    })),
  );
}

export function CurriculumPublisher() {
  const t = useTranslations("admin.curriculum");
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["curriculumPublish"], queryFn: loadRows, staleTime: 0 });
  const [run, setRun] = useState<RunState>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function publish(list: Row[]) {
    for (const r of list) {
      setRun({ id: r.file.id });
      setErrors((e) => ({ ...e, [r.file.id]: "" }));
      try {
        // المذكرات المُنسّقة تُحمَّل عند نشر منهاجها فقط
        const memos = MEMO_FILES[r.file.id] ? ((await MEMO_FILES[r.file.id]!.load()).default as MemoFile) : undefined;
        await publishCurriculum(r.file, (progress) => setRun({ id: r.file.id, progress }), memos);
        await qc.invalidateQueries({ queryKey: ["curriculum", r.file.id] });
      } catch (e) {
        setErrors((x) => ({ ...x, [r.file.id]: e instanceof Error ? e.message : String(e) }));
      }
    }
    setRun(null);
    await rows.refetch();
  }

  if (!rows.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  const pending = rows.data.filter((r) => r.published !== r.rev);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-sm leading-relaxed text-muted">{t("intro")}</p>
        <button type="button" disabled={!!run || !pending.length} onClick={() => void publish(pending)} className={buttonClass("primary")}>
          {run ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <CloudUpload aria-hidden className="size-4" />}
          {pending.length ? t("publishAll", { n: pending.length }) : t("allPublished")}
        </button>
      </Card>
      <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
        {rows.data.map((r) => {
          const current = run?.id === r.file.id;
          const ok = r.published === r.rev;
          const p = current ? run?.progress : undefined;
          return (
            <li key={r.file.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{r.file.title}</span>
                <span className="block text-sm text-muted">
                  <bdi dir="ltr">{r.file.id}</bdi> · {t("lessons", { n: r.file.lessons.length })}
                  {r.added > 0 && ` · ${t("added", { n: r.added })}`}
                  {r.memos > 0 && ` · ${t("memos", { n: r.memos })}`}
                </span>
                {current && p && <span className="block text-sm text-brand-800">{t(`step.${p.step}`, { done: p.done, total: p.total })}</span>}
                {errors[r.file.id] && <span role="alert" className="block text-sm text-red-700">{errors[r.file.id]}</span>}
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", ok ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900")}>
                {ok ? <CheckCircle2 aria-hidden className="size-3.5" /> : <TriangleAlert aria-hidden className="size-3.5" />}
                {ok ? t("published") : t("pending")}
              </span>
              <button type="button" disabled={!!run} onClick={() => void publish([r])} className={buttonClass("secondary")}>
                {current ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <CloudUpload aria-hidden className="size-4" />}
                {t("publish")}
              </button>
            </li>
          );
        })}
      </ul>
      <Coverage refresh={rows.dataUpdatedAt} />
    </div>
  );
}

/** المواد المقرّرة (التصنيف) التي لا فهرس مذكرات لها في القاعدة: يراها الأستاذ «قريبًا». */
function Coverage({ refresh }: { refresh: number }) {
  const t = useTranslations("admin.curriculum");
  const primary = useTaxonomy("primary");
  const middle = useTaxonomy("middle");
  const levelShort = (l: string) => levelById(primary.data!, l)?.short.ar ?? levelById(middle.data!, l)?.short.ar ?? l;
  const missing = useQuery({
    queryKey: ["curriculumCoverage", refresh],
    enabled: !!primary.data && !!middle.data,
    queryFn: async () => {
      const ids = [primary.data!, middle.data!].flatMap((tax) => tax.subjects.flatMap((s) => s.levels.map((l) => ({ id: curriculumId(l, s.id), level: l, label: s.label.ar }))));
      const docs = await Promise.all(ids.map((x) => getCurriculum(x.id)));
      return ids.filter((_, i) => !docs[i]);
    },
  });
  if (!missing.data) return null;
  return (
    <Card className="space-y-2">
      <h2 className="font-bold">{t("coverageTitle")}</h2>
      {missing.data.length === 0 ? (
        <p className="text-sm text-green-800">{t("coverageNone")}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{t("coverageHint")}</p>
          <ul className="flex flex-wrap gap-2">
            {missing.data.map((x) => (
              <li key={x.id} className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900 ring-1 ring-amber-200">
                {x.label} · {levelShort(x.level)}
                {!REPO_CURRICULA.includes(x.id) && <span className="text-xs text-amber-700"> — {t("coverageNoFile")}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
