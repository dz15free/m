"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle, Pencil, Plus, Printer, Trash2, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { useUid } from "@/features/classes/hooks";
import { todayInAlgiers } from "@/features/attendance/logic";
import { formatLongDate } from "@/i18n/dates";
import { TRAINING_KINDS, TRAINING_MAX, type TrainingEntry, type TrainingKind } from "./logic";
import { addTraining, listTrainings, removeTraining, updateTraining, type TrainingDoc } from "./repo";
import { PrintHeader } from "./print-header";

const blank = (): TrainingEntry => ({ date: todayInAlgiers(), kind: "seminar", topic: "", supervisor: "", place: "", notes: "" });

export function TrainingNotebook() {
  const t = useTranslations("logbook.training");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const queryClient = useQueryClient();
  const key = ["trainings", uid ?? ""];
  const list = useQuery({ queryKey: key, queryFn: () => listTrainings(uid!), enabled: !!uid });
  // null: لا تحرير؛ "new": إضافة؛ وإلا معرّف التسجيل.
  const [editing, setEditing] = useState<string | null>(null);

  if (!list.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  const items = list.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const dateLabel = (iso: string) => formatLongDate(new Date(`${iso}T12:00:00`), locale);

  async function save(entry: TrainingEntry) {
    if (!uid) return;
    if (editing === "new") await addTraining(uid, entry);
    else if (editing) await updateTraining(uid, editing, entry);
    await refresh();
    setEditing(null);
  }

  async function remove(item: TrainingDoc) {
    if (!uid || !window.confirm(t("deleteConfirm"))) return;
    await removeTraining(uid, item.id);
    await refresh();
    setEditing(null);
  }

  return (
    <>
      <div className="space-y-4 pb-4 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEditing("new")} disabled={editing === "new"} className={buttonClass("primary")}>
            <Plus aria-hidden className="size-4" />
            {t("add")}
          </button>
          {items.length > 0 && (
            <button type="button" onClick={() => window.print()} className={buttonClass("secondary")}>
              <Printer aria-hidden className="size-4" />
              {t("print")}
            </button>
          )}
        </div>

        {editing === "new" && <TrainingForm initial={blank()} onSave={save} onCancel={() => setEditing(null)} />}

        {items.length === 0 && editing !== "new" ? (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <Users aria-hidden className="size-8 text-brand-700" />
            <p className="text-muted">{t("empty")}</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {items.map((item) =>
              editing === item.id ? (
                <li key={item.id}>
                  <TrainingForm initial={item} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(item)} />
                </li>
              ) : (
                <li key={item.id}>
                  <Card className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">{t(`kinds.${item.kind}`)}</span>
                        {dateLabel(item.date)}
                      </p>
                      <p className="font-semibold">{item.topic}</p>
                      {(item.supervisor || item.place) && (
                        <p className="text-sm text-muted">{[item.supervisor, item.place].filter(Boolean).join(" · ")}</p>
                      )}
                      {item.notes && <p className="whitespace-pre-line text-sm">{item.notes}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(item.id)}
                      aria-label={`${t("edit")}: ${item.topic}`}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas"
                    >
                      <Pencil aria-hidden className="size-4" />
                    </button>
                  </Card>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {/* ── الطباعة: A4 عمودي، الأقدم أولًا كما في الدفتر الورقي ── */}
      <div className="hidden print:block">
        <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
        <PrintHeader title={t("title")} />
        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr className="bg-canvas">
              {[t("date"), t("kind"), t("topic"), t("supervisor"), t("place"), t("notes")].map((h) => (
                <th key={h} className="border border-ink px-1.5 py-1 text-start font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...items].reverse().map((item) => (
              <tr key={item.id} className="break-inside-avoid align-top">
                <td className="border border-ink px-1.5 py-1 whitespace-nowrap"><bdi dir="ltr">{item.date.split("-").reverse().join("/")}</bdi></td>
                <td className="border border-ink px-1.5 py-1">{t(`kinds.${item.kind}`)}</td>
                <td className="border border-ink px-1.5 py-1">{item.topic}</td>
                <td className="border border-ink px-1.5 py-1">{item.supervisor}</td>
                <td className="border border-ink px-1.5 py-1">{item.place}</td>
                <td className="w-[35%] border border-ink px-1.5 py-1 whitespace-pre-line">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TrainingForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: TrainingEntry;
  onSave: (e: TrainingEntry) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const t = useTranslations("logbook.training");
  const [draft, setDraft] = useState<TrainingEntry>({
    date: initial.date,
    kind: initial.kind,
    topic: initial.topic,
    supervisor: initial.supervisor,
    place: initial.place,
    notes: initial.notes,
  });
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const set = <K extends keyof TrainingEntry>(k: K, v: TrainingEntry[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.topic.trim()) return;
    setState("saving");
    try {
      await onSave(draft);
    } catch {
      setState("error");
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("date")} type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />
          <SelectField label={t("kind")} value={draft.kind} onChange={(e) => set("kind", e.target.value as TrainingKind)}>
            {TRAINING_KINDS.map((k) => (
              <option key={k} value={k}>{t(`kinds.${k}`)}</option>
            ))}
          </SelectField>
        </div>
        <Field label={t("topic")} required dir="auto" maxLength={TRAINING_MAX.topic} value={draft.topic} onChange={(e) => set("topic", e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("supervisor")} dir="auto" maxLength={TRAINING_MAX.supervisor} value={draft.supervisor} onChange={(e) => set("supervisor", e.target.value)} />
          <Field label={t("place")} dir="auto" maxLength={TRAINING_MAX.place} value={draft.place} onChange={(e) => set("place", e.target.value)} />
        </div>
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium">{t("notes")}</span>
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            maxLength={TRAINING_MAX.notes}
            rows={4}
            dir="auto"
            className="block w-full resize-y rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
          />
        </label>
        {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={state === "saving"} className={buttonClass("primary")}>
            {state === "saving" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
            {t("save")}
          </button>
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>{t("cancel")}</button>
          {onDelete && (
            <button type="button" onClick={onDelete} className={buttonClass("ghost", "md", "ms-auto text-red-700")}>
              <Trash2 aria-hidden className="size-4" />
              {t("delete")}
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
