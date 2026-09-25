"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownAZ,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileUp,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { keys, useClass, useClasses, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { cn } from "@/lib/utils/cn";
import { mutateRoster, transferStudents } from "./repo";
import {
  MAX_STUDENTS,
  addStudents,
  findDuplicates,
  moveStudents,
  removeStudents,
  RosterFullError,
  rosterToCsv,
  searchRoster,
  setGender,
  sortAlphabetically,
  updateStudent,
  type Gender,
  type Student,
} from "./roster";

type Op = (roster: Student[]) => Student[];

export function StudentsManager({ classId }: { classId: string }) {
  const cls = useClass(classId);
  if (!cls.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return <Manager cls={cls.data} />;
}

function Manager({ cls }: { cls: ClassDoc }) {
  const t = useTranslations("students");
  const locale = useLocale();
  const uid = useUid();
  const queryClient = useQueryClient();
  const classes = useClasses();
  const roster = cls.roster ?? [];

  const [queryText, setQueryText] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "full">("idle");

  const Back = locale === "ar" ? ChevronRight : ChevronLeft;
  const visible = searchRoster(roster, queryText);
  const duplicates = findDuplicates(roster).length;
  const classKey = keys.class(uid ?? "", cls.id);

  const setRosterCache = (next: Student[]) =>
    queryClient.setQueryData<ClassDoc | null>(classKey, (prev) =>
      prev ? { ...prev, roster: next, studentCount: next.length } : prev,
    );

  /** تحديث متفائل: الواجهة تتغيّر فورًا، والحفظ يجري في الخلفية؛ عند الفشل نعود. */
  async function apply(op: Op) {
    if (!uid) return;
    let optimistic: Student[];
    try {
      optimistic = op(roster);
    } catch (e) {
      setStatus(e instanceof RosterFullError ? "full" : "error");
      return;
    }
    const previous = roster;
    setRosterCache(optimistic);
    setStatus("saving");
    try {
      const saved = await mutateRoster(uid, cls.id, op);
      setRosterCache(saved);
      setStatus("idle");
      queryClient.invalidateQueries({ queryKey: keys.classes(uid, cls.yearId) });
    } catch (e) {
      setRosterCache(previous);
      setStatus(e instanceof RosterFullError ? "full" : "error");
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function exportCsv() {
    const csv = rosterToCsv(roster, { n: t("n"), last: t("last"), first: t("first"), gender: t("gender") }, (g) =>
      g === "M" ? t("male") : t("female"),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${cls.displayName}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function moveTo(target: ClassDoc) {
    if (!uid || !confirm(t("moveConfirm", { name: target.displayName }))) return;
    setStatus("saving");
    try {
      await transferStudents(uid, cls.id, target.id, (from, to) => moveStudents(from, to, selected));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: classKey }),
        queryClient.invalidateQueries({ queryKey: keys.class(uid, target.id) }),
        queryClient.invalidateQueries({ queryKey: keys.classes(uid, cls.yearId) }),
      ]);
      setSelected(new Set());
      setSelecting(false);
      setStatus("idle");
    } catch (e) {
      setStatus(e instanceof RosterFullError ? "full" : "error");
    }
  }

  const otherClasses = (classes.data ?? []).filter((c) => c.id !== cls.id);

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/app/classes/${cls.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          <bdi dir="ltr">{cls.displayName}</bdi>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {t("title")} <span className="text-muted">({roster.length}/{MAX_STUDENTS})</span>
          </h1>
          <SaveStatus status={status} />
        </div>
      </div>

      {/* الاستيراد الذكي — المرحلة 7 */}
      <Link
        href={`/app/classes/${cls.id}/students/import`}
        className="flex items-center gap-4 rounded-card bg-linear-to-br from-brand-900 to-brand-600 p-4 text-white shadow-card"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
          <FileUp aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t("import")}</span>
          <span className="block text-sm text-white/80">{t("importHint")}</span>
        </span>
        <Back aria-hidden className="size-5 rotate-180" />
      </Link>

      <QuickAdd onAdd={(input) => apply((r) => addStudents(r, [input]))} disabled={roster.length >= MAX_STUDENTS} />

      {roster.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-48 flex-1">
              <span className="sr-only">{t("search")}</span>
              <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder={t("search")}
                className="min-h-11 w-full rounded-full border border-line bg-surface ps-10 pe-4 outline-none focus:border-brand-600"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setSelecting(!selecting);
                setSelected(new Set());
                setEditingId(null);
              }}
              className={buttonClass(selecting ? "primary" : "secondary")}
            >
              <ListChecks aria-hidden className="size-4" />
              {selecting ? t("done") : t("select")}
            </button>
            <button type="button" onClick={() => apply(sortAlphabetically)} className={buttonClass("secondary")}>
              <ArrowDownAZ aria-hidden className="size-4" />
              {t("sort")}
            </button>
            <button type="button" onClick={exportCsv} className={buttonClass("secondary")}>
              <Download aria-hidden className="size-4" />
              {t("export")}
            </button>
          </div>

          {duplicates > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <CircleAlert aria-hidden className="size-4 shrink-0" />
              {t("duplicates", { count: duplicates })}
            </p>
          )}
        </>
      )}

      {roster.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="font-semibold">{t("empty")}</p>
          <p className="mt-1 text-sm text-muted">{t("emptyHint")}</p>
        </Card>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-muted">{t("noResults")}</p>
      ) : (
        <ol className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {visible.map((s) => {
            const index = roster.indexOf(s) + 1;
            if (editingId === s.id) {
              return (
                <li key={s.id} className="bg-brand-50/50 p-3">
                  <EditRow
                    student={s}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) => {
                      setEditingId(null);
                      apply((r) => updateStudent(r, s.id, patch));
                    }}
                    onDelete={() => {
                      setEditingId(null);
                      apply((r) => removeStudents(r, new Set([s.id])));
                    }}
                  />
                </li>
              );
            }
            const on = selected.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => (selecting ? toggle(s.id) : setEditingId(s.id))}
                  aria-pressed={selecting ? on : undefined}
                  className={cn("flex min-h-14 w-full items-center gap-3 px-4 text-start transition-colors hover:bg-brand-50", on && "bg-brand-50")}
                >
                  {selecting ? (
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md ring-2", on ? "bg-brand-700 text-white ring-brand-700" : "ring-line")}>
                      {on && <Check aria-hidden className="size-4" />}
                    </span>
                  ) : (
                    <span className="w-7 shrink-0 text-center text-sm tabular-nums text-muted">{index}</span>
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{s.last}</span> {s.first}
                  </span>
                  {s.gender && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        s.gender === "M" ? "bg-sky-50 text-sky-800" : "bg-pink-50 text-pink-800",
                      )}
                    >
                      {s.gender === "M" ? t("male") : t("female")}
                    </span>
                  )}
                  {!selecting && <Pencil aria-hidden className="size-4 shrink-0 text-muted" />}
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {/* شريط الإجراءات الجماعية */}
      {selecting && (
        <div className="sticky bottom-24 z-10 flex flex-wrap items-center gap-2 rounded-card bg-ink p-3 text-white shadow-lg lg:bottom-6">
          <span className="px-2 text-sm font-medium">{t("selected", { count: selected.size })}</span>
          <button
            type="button"
            onClick={() => setSelected(new Set(visible.map((s) => s.id)))}
            className="min-h-10 rounded-full px-3 text-sm hover:bg-white/10"
          >
            {t("selectAll")}
          </button>
          <span className="flex-1" />
          {(["M", "F"] as Gender[]).map((g) => (
            <button
              key={g}
              type="button"
              disabled={!selected.size}
              onClick={() => apply((r) => setGender(r, selected, g))}
              className="min-h-10 rounded-full bg-white/10 px-3 text-sm disabled:opacity-40"
            >
              {g === "M" ? t("male") : t("female")}
            </button>
          ))}
          {otherClasses.length > 0 && (
            <select
              aria-label={t("move")}
              disabled={!selected.size}
              value=""
              onChange={(e) => {
                const target = otherClasses.find((c) => c.id === e.target.value);
                if (target) moveTo(target);
              }}
              className="min-h-10 rounded-full bg-white/10 px-3 text-sm disabled:opacity-40 [&>option]:text-ink"
            >
              <option value="">{t("move")}</option>
              {otherClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!selected.size}
            onClick={() => {
              if (!confirm(t("deleteConfirm", { count: selected.size }))) return;
              const ids = new Set(selected);
              setSelected(new Set());
              apply((r) => removeStudents(r, ids));
            }}
            className="flex min-h-10 items-center gap-1 rounded-full bg-red-600 px-3 text-sm font-medium disabled:opacity-40"
          >
            <Trash2 aria-hidden className="size-4" />
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}

function SaveStatus({ status }: { status: "idle" | "saving" | "error" | "full" }) {
  const t = useTranslations("students");
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span role="status" className="flex items-center gap-1.5 text-sm text-muted">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        {t("saving")}
      </span>
    );
  }
  return (
    <span role="alert" className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-800">
      {status === "full" ? t("full") : t("error")}
    </span>
  );
}

function GenderToggle({ value, onChange }: { value: Gender | null; onChange: (g: Gender | null) => void }) {
  const t = useTranslations("students");
  return (
    <div role="group" aria-label={t("gender")} className="flex rounded-full bg-canvas p-1 ring-1 ring-line">
      {(["M", "F"] as Gender[]).map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={value === g}
          onClick={() => onChange(value === g ? null : g)}
          className={cn(
            "min-h-9 rounded-full px-3 text-sm font-medium",
            value === g ? "bg-brand-700 text-white" : "text-ink",
          )}
        >
          {g === "M" ? t("male") : t("female")}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "min-h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100";

/** إضافة سريعة بلوحة المفاتيح: اللقب ← Enter ← الاسم ← Enter ← التلميذ التالي. */
function QuickAdd({ onAdd, disabled }: { onAdd: (input: { last: string; first: string; gender: Gender | null }) => void; disabled: boolean }) {
  const t = useTranslations("students");
  const lastRef = useRef<HTMLInputElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);
  const [last, setLast] = useState("");
  const [first, setFirst] = useState("");
  const [gender, setGenderValue] = useState<Gender | null>(null);

  function submit() {
    if (!last.trim() && !first.trim()) return;
    onAdd({ last, first, gender });
    setLast("");
    setFirst("");
    setGenderValue(null);
    lastRef.current?.focus();
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">{t("quickAdd")}</h2>
        <p className="text-xs text-muted">{t("quickAddHint")}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          ref={lastRef}
          value={last}
          onChange={(e) => setLast(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              firstRef.current?.focus();
            }
          }}
          placeholder={t("last")}
          aria-label={t("last")}
          enterKeyHint="next"
          autoComplete="off"
          maxLength={60}
          disabled={disabled}
          className={cn(inputClass, "flex-1 basis-32")}
        />
        <input
          ref={firstRef}
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder={t("first")}
          aria-label={t("first")}
          enterKeyHint="done"
          autoComplete="off"
          maxLength={60}
          disabled={disabled}
          className={cn(inputClass, "flex-1 basis-32")}
        />
        <GenderToggle value={gender} onChange={setGenderValue} />
        <button type="submit" disabled={disabled} className={buttonClass("primary", "lg")}>
          <Plus aria-hidden className="size-5" />
          {t("add")}
        </button>
      </form>
    </Card>
  );
}

function EditRow({
  student,
  onSave,
  onCancel,
  onDelete,
}: {
  student: Student;
  onSave: (patch: { last: string; first: string; gender: Gender | null }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("students");
  const [last, setLast] = useState(student.last);
  const [first, setFirst] = useState(student.first);
  const [gender, setGenderValue] = useState<Gender | null>(student.gender);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ last, first, gender });
      }}
      className="space-y-2"
    >
      <div className="flex flex-wrap gap-2">
        <input value={last} onChange={(e) => setLast(e.target.value)} aria-label={t("last")} maxLength={60} autoFocus className={cn(inputClass, "flex-1 basis-32")} />
        <input value={first} onChange={(e) => setFirst(e.target.value)} aria-label={t("first")} maxLength={60} className={cn(inputClass, "flex-1 basis-32")} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GenderToggle value={gender} onChange={setGenderValue} />
        <span className="flex-1" />
        <button type="button" onClick={onDelete} aria-label={t("deleteOne")} className="grid size-11 place-items-center rounded-full text-red-700 hover:bg-red-50">
          <Trash2 aria-hidden className="size-5" />
        </button>
        <button type="button" onClick={onCancel} aria-label={t("cancel")} className="grid size-11 place-items-center rounded-full text-muted hover:bg-canvas">
          <X aria-hidden className="size-5" />
        </button>
        <button type="submit" className={buttonClass("primary")}>
          <Check aria-hidden className="size-4" />
          {t("save")}
        </button>
      </div>
    </form>
  );
}
