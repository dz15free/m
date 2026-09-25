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
import { TRAINING_DOMAINS, TRAINING_KINDS, TRAINING_MAX, type TrainingDomain, type TrainingEntry, type TrainingKind } from "./logic";
import { addTraining, listTrainings, removeTraining, updateTraining, type TrainingDoc } from "./repo";
import { PrintHeader } from "./print-header";

const blank = (kind: TrainingKind = "seminar"): TrainingEntry => ({
  date: todayInAlgiers(),
  kind,
  topic: "",
  place: "",
  lesson: "",
  practitioner: "",
  level: "",
  supervisor: "",
  domain: "",
  notes: "",
});

const dmy = (iso: string) => iso.split("-").reverse().join("/");

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
  // الدفتر الورقي مرتّب زمنيًا من الأقدم
  const chrono = [...items].reverse();
  const byKind = (k: TrainingKind) => chrono.filter((i) => i.kind === k);
  const withNotes = chrono.filter((i) => i.notes.trim());

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
          TRAINING_KINDS.map((kind) => {
            const group = items.filter((i) => i.kind === kind);
            if (!group.length) return null;
            return (
              <section key={kind} aria-labelledby={`k-${kind}`} className="space-y-2">
                <h2 id={`k-${kind}`} className="text-sm font-semibold text-muted">{t(`sections.${kind}`)}</h2>
                <ul className="space-y-2">
                  {group.map((item) =>
                    editing === item.id ? (
                      <li key={item.id}>
                        <TrainingForm initial={item} onSave={save} onCancel={() => setEditing(null)} onDelete={() => remove(item)} />
                      </li>
                    ) : (
                      <li key={item.id}>
                        <Card className="flex items-start gap-3 p-4">
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                              {formatLongDate(new Date(`${item.date}T12:00:00`), locale)}
                              {item.domain && (
                                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">{t(`domains.${item.domain}`)}</span>
                              )}
                            </p>
                            <p className="font-semibold">{item.topic}</p>
                            {(item.lesson || item.practitioner || item.place) && (
                              <p className="text-sm text-muted">{[item.lesson, item.practitioner, item.level, item.place].filter(Boolean).join(" · ")}</p>
                            )}
                            {item.notes && <p className="line-clamp-3 whitespace-pre-line text-sm">{item.notes}</p>}
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
              </section>
            );
          })
        )}
      </div>

      {/* ── الطباعة: رزنامة بجداولها الثلاثة ثم الخلاصات حسب المجال (A4 عمودي) ── */}
      <div className="hidden text-[10pt] print:block">
        <style>{"@page { size: A4 portrait; margin: 12mm; }"}</style>
        <PrintHeader title={t("calendarTitle")} />
        {TRAINING_KINDS.map((kind) => {
          const rows = byKind(kind);
          const cols =
            kind === "seminar"
              ? [t("num"), t("date"), t("lesson"), t("practitioner"), t("level"), t("topic.seminar")]
              : [t("num"), t("date"), t("place"), t(`topic.${kind}`)];
          // أسطر فارغة إضافية ليكمل الأستاذ بخطّ اليد كما في الدفتر الورقي
          const pad = Math.max(0, 6 - rows.length);
          return (
            <table key={kind} className="mb-5 w-full break-inside-avoid border-collapse">
              <caption className="pb-1 text-start text-[11pt] font-bold">{t(`sections.${kind}`)}:</caption>
              <thead>
                <tr className="bg-canvas">
                  {cols.map((h, i) => (
                    <th key={h} className={`border border-ink px-1.5 py-1 text-center font-semibold ${i === 0 ? "w-12" : i === 1 ? "w-20" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="align-top">
                    <td className="w-10 border border-ink px-1 py-1 text-center">{String(i + 1).padStart(2, "0")}</td>
                    <td className="w-20 border border-ink px-1 py-1 text-center"><bdi dir="ltr">{dmy(r.date)}</bdi></td>
                    {kind === "seminar" ? (
                      <>
                        <td className="border border-ink px-1.5 py-1"><bdi>{r.lesson}</bdi></td>
                        <td className="border border-ink px-1.5 py-1"><bdi>{r.practitioner}</bdi></td>
                        <td className="border border-ink px-1.5 py-1"><bdi>{r.level}</bdi></td>
                        <td className="w-[35%] border border-ink px-1.5 py-1"><bdi>{r.topic}</bdi></td>
                      </>
                    ) : (
                      <>
                        <td className="w-[30%] border border-ink px-1.5 py-1"><bdi>{r.place}</bdi></td>
                        <td className="border border-ink px-1.5 py-1"><bdi>{r.topic}</bdi></td>
                      </>
                    )}
                  </tr>
                ))}
                {Array.from({ length: pad }, (_, i) => (
                  <tr key={`pad-${i}`}>
                    <td className="h-6 border border-ink px-1 text-center">{String(rows.length + i + 1).padStart(2, "0")}</td>
                    {cols.slice(1).map((c) => <td key={c} className="border border-ink" />)}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}

        {withNotes.length > 0 && (
          <div className="break-before-page">
            <h2 className="mb-3 text-center text-[14pt] font-bold">{t("summaries")}</h2>
            {([...TRAINING_DOMAINS, ""] as const).map((domain) => {
              const group = withNotes.filter((i) => i.domain === domain);
              if (!group.length) return null;
              return (
                <section key={domain || "none"} className="mb-4">
                  <h3 className="mb-1 border-b border-ink text-[12pt] font-bold">{domain ? t(`domains.${domain}`) : t("noDomain")}</h3>
                  {group.map((r) => (
                    <div key={r.id} className="mb-2 break-inside-avoid">
                      <p className="font-semibold">
                        <bdi dir="ltr">{dmy(r.date)}</bdi> — {t(`kinds.${r.kind}`)}: {r.topic}
                        {r.supervisor ? ` (${r.supervisor})` : ""}
                      </p>
                      <p className="whitespace-pre-line" dir="auto">{r.notes}</p>
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
        )}
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
  const [draft, setDraft] = useState<TrainingEntry>(() => {
    const { date, kind, topic, place, lesson, practitioner, level, supervisor, domain, notes } = initial;
    return { date, kind, topic, place, lesson, practitioner, level, supervisor, domain, notes };
  });
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const set = <K extends keyof TrainingEntry>(k: K, v: TrainingEntry[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const seminar = draft.kind === "seminar";

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
        <div role="radiogroup" aria-label={t("kind")} className="flex flex-wrap gap-2">
          {TRAINING_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={draft.kind === k}
              onClick={() => set("kind", k)}
              className={
                draft.kind === k
                  ? "min-h-10 rounded-full bg-brand-700 px-4 text-sm font-medium text-white"
                  : "min-h-10 rounded-full px-4 text-sm font-medium ring-1 ring-line"
              }
            >
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("date")} type="date" required value={draft.date} onChange={(e) => set("date", e.target.value)} />
          <Field label={t("place")} dir="auto" maxLength={TRAINING_MAX.place} value={draft.place} onChange={(e) => set("place", e.target.value)} />
        </div>
        <Field label={t(`topic.${draft.kind}`)} required dir="auto" maxLength={TRAINING_MAX.topic} value={draft.topic} onChange={(e) => set("topic", e.target.value)} />
        {seminar && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("lesson")} dir="auto" maxLength={TRAINING_MAX.lesson} value={draft.lesson} onChange={(e) => set("lesson", e.target.value)} />
            <Field label={t("practitioner")} dir="auto" maxLength={TRAINING_MAX.practitioner} value={draft.practitioner} onChange={(e) => set("practitioner", e.target.value)} />
            <Field label={t("level")} dir="auto" maxLength={TRAINING_MAX.level} value={draft.level} onChange={(e) => set("level", e.target.value)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("supervisor")} dir="auto" maxLength={TRAINING_MAX.supervisor} value={draft.supervisor} onChange={(e) => set("supervisor", e.target.value)} />
          <SelectField label={t("domain")} value={draft.domain} onChange={(e) => set("domain", e.target.value as TrainingDomain | "")}>
            <option value="">{t("noDomain")}</option>
            {TRAINING_DOMAINS.map((d) => (
              <option key={d} value={d}>{t(`domains.${d}`)}</option>
            ))}
          </SelectField>
        </div>
        <label className="block space-y-1.5">
          <span className="block text-sm font-medium">{t("notes")}</span>
          <textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            maxLength={TRAINING_MAX.notes}
            rows={5}
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
