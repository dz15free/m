"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PrintButtons } from "@/components/ui/print-actions";
import { authedFetch } from "@/lib/firebase/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useTaxonomy, useTeacher } from "@/features/classes/hooks";
import { MemoSheet } from "@/features/lessons/memo-sheet";
import { EditableMemo } from "./memo-editor";
import { getCurriculum, useMyCurricula } from "@/features/lessons/repo";
import type { Memo } from "@/features/lessons/memo";
import { levelById, subjectById } from "@/shared/taxonomy/taxonomy";
import { pick } from "@/i18n/pick";
import type { Locale } from "@/i18n/config";
import { AI_FORMATS, type AiFormat, type AiMemoRequest } from "./prompt";

type Status = { available: boolean; limit: number; remaining: number };
type Result = { title: string; memo: Memo; lang: "ar" | "fr" | "en"; remaining: number };
const ERRORS = ["subscription required", "daily limit", "ai unavailable", "refused", "busy", "ai busy"] as const;

async function getStatus(): Promise<Status> {
  const res = await authedFetch("/api/ai/memo");
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as Status;
}

/** كتابة مذكرة بالذكاء الاصطناعي: حصة من مذكرات المنصة أو موضوع حر، بالنموذج والمدة المختارين. */
export function AiMemoWriter({ lesson }: { lesson?: string }) {
  const t = useTranslations("aiMemo");
  const locale = useLocale() as Locale;
  const auth = useAuth();
  const mine = useMyCurricula();
  const tax = useTaxonomy(useTeacher().data?.profile.stage ?? "primary");
  const status = useQuery({ queryKey: ["aiMemoStatus"], queryFn: getStatus, staleTime: 60_000 });

  const [picked, setCurId] = useState(lesson ? lesson.replace(/_\d{3}$/, "") : "");
  const [lessonId, setLessonId] = useState(lesson ?? "");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<AiFormat>("official");
  const [minutes, setMinutes] = useState(45);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  // كل مذكرة جديدة تُركَّب من جديد في المحرّر
  const [version, setVersion] = useState(0);

  // أول قسم/مادة افتراضيًا
  const curId = picked || mine.list[0]?.id || "";

  const choice = mine.list.find((c) => c.id === curId);
  const cur = useQuery({ queryKey: ["curriculum", curId], queryFn: () => getCurriculum(curId), enabled: !!choice?.available, staleTime: 60 * 60_000 });
  const entries = useMemo(() => [...(cur.data?.entries ?? [])].sort((a, b) => a.u - b.u || a.o - b.o), [cur.data]);
  const entry = entries.find((e) => e.id === lessonId);
  const label = (c: { level: string; subject: string }) =>
    tax.data ? `${pick(subjectById(tax.data, c.subject)?.label, locale) ?? c.subject} · ${pick(levelById(tax.data, c.level)?.short, locale) ?? c.level}` : `${c.subject} · ${c.level}`;

  const theTopic = entry ? entry.t || entry.a : topic.trim();
  const canWrite = !!choice && theTopic.length >= 2 && !busy && status.data?.available && (status.data?.remaining ?? 0) > 0;

  async function write() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    const body: AiMemoRequest = {
      level: choice.level,
      subject: choice.subject,
      topic: theTopic,
      format,
      minutes,
      ...(entry
        ? { lessonId: entry.id, domain: entry.d || undefined, activity: entry.a || undefined, week: entry.k === "week" ? entry.u : undefined, segment: cur.data?.segments.find((s) => s.n === entry.s)?.title }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      const res = await authedFetch("/api/ai/memo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as Partial<Result> & { error?: string };
      if (!res.ok || !data.memo) {
        setError((ERRORS as readonly string[]).includes(data.error ?? "") ? data.error! : "generic");
        return;
      }
      setResult(data as Result);
      setVersion((v) => v + 1);
      status.refetch();
      window.setTimeout(() => document.getElementById("ai-memo-result")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setError("generic");
    } finally {
      setBusy(false);
    }
  }

  const errorText = (e: string) =>
    ({
      "subscription required": t("errors.subscription"),
      "daily limit": t("errors.limit"),
      "ai unavailable": t("errors.unavailable"),
      refused: t("errors.refused"),
      busy: t("errors.busy"),
      "ai busy": t("errors.busy"),
    })[e] ?? t("errors.generic");

  return (
    <div className="space-y-5">
      <Card className="space-y-4 print:hidden">
        {status.data && !status.data.available && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">{t("errors.unavailable")}</p>}

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{t("classSubject")}</span>
          <select
            value={curId}
            onChange={(e) => {
              setCurId(e.target.value);
              setLessonId("");
            }}
            className="h-11 w-full rounded-xl border border-line bg-surface px-3"
          >
            {!mine.ready && <option>…</option>}
            {mine.list.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </select>
          {mine.ready && mine.list.length === 0 && (
            <span className="block text-sm text-muted">
              {t("noClasses")}{" "}
              <Link href="/app/classes" className="font-semibold text-brand-800 underline">
                {t("addClass")}
              </Link>
            </span>
          )}
        </label>

        {choice?.available && (
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{t("lesson")}</span>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="h-11 w-full rounded-xl border border-line bg-surface px-3">
              <option value="">{t("freeTopic")}</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.k === "week" ? t("week", { n: e.u }) : t("day", { n: e.u })} · {e.t || e.a}
                </option>
              ))}
            </select>
          </label>
        )}

        {!entry && (
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold">{t("topic")}</span>
            <input value={topic} maxLength={200} onChange={(e) => setTopic(e.target.value)} placeholder={t("topicPlaceholder")} className="h-11 w-full rounded-xl border border-line bg-surface px-3" />
          </label>
        )}

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-semibold">{t("format")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {AI_FORMATS.map((f) => (
              <label key={f} className={`flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ${format === f ? "bg-brand-50 ring-brand-500" : "ring-line"}`}>
                <input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} className="mt-1" />
                <span>
                  <span className="block font-semibold">{t(`formats.${f}.title`)}</span>
                  <span className="block text-sm text-muted">{t(`formats.${f}.body`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{t("duration")}</span>
          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="h-11 w-full rounded-xl border border-line bg-surface px-3 sm:w-48">
            {[30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {t("minutes", { n: m })}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">{t("notes")}</span>
          <textarea value={notes} maxLength={600} rows={3} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} className="w-full rounded-xl border border-line bg-surface p-3" />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!canWrite} onClick={() => void write()} className={buttonClass("primary", "md")}>
            {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Sparkles aria-hidden className="size-4" />}
            {busy ? t("writing") : result ? t("rewrite") : t("write")}
          </button>
          {status.data && status.data.limit > 0 && <span className="text-sm text-muted">{t("remaining", { n: status.data.remaining, limit: status.data.limit })}</span>}
          {status.data?.limit === 0 && (
            <Link href="/app/billing" className="text-sm font-semibold text-brand-800 underline">
              {t("errors.subscription")}
            </Link>
          )}
        </div>
        {busy && <p className="text-sm text-muted">{t("wait")}</p>}
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">{errorText(error)}</p>}
      </Card>

      {result && (
        <article id="ai-memo-result" className="space-y-4 print:space-y-0">
          <style>{"@page { size: A4 portrait; margin: 9mm 10mm; }"}</style>
          <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
            <p className="text-sm font-semibold text-amber-800">{t("review")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!canWrite} onClick={() => void write()} className={buttonClass("secondary", "md")}>
                <RefreshCw aria-hidden className="size-4" />
                {t("rewrite")}
              </button>
              <PrintButtons title={() => result.title} />
            </div>
          </div>
          <EditableMemo version={version}>
            <MemoSheet
              memo={result.memo}
              lang={result.lang}
              title={result.title}
              tag={choice ? label(choice) : ""}
              meta={entry ? `${t("week", { n: entry.u })}` : undefined}
              teacher={auth.status === "signedIn" ? (auth.user.displayName ?? undefined) : undefined}
            />
          </EditableMemo>
        </article>
      )}
    </div>
  );
}
