"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Archive,
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileText,
  LoaderCircle,
  NotebookPen,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { levelById, subjectById, subjectsForLevel, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { keys, useClass, useClasses, useTaxonomy, useUid } from "./hooks";
import { nextSections } from "./naming";
import { archiveClass, createClasses, deleteClass, renameClass, updateClassSubjects, type ClassDoc } from "./repo";
import { SubjectChips, SubjectTags } from "./subject-chips";

const TABS = [
  { key: "students", icon: Users },
  { key: "attendance", icon: ClipboardCheck },
  { key: "lessons", icon: NotebookPen },
  { key: "schedule", icon: CalendarClock },
  { key: "documents", icon: FileText },
  { key: "stats", icon: BarChart3 },
] as const;

export function ClassDetail({ classId }: { classId: string }) {
  const t = useTranslations("classes.detail");
  const locale = useLocale() as "ar" | "fr";
  const cls = useClass(classId);
  const tax = useTaxonomy(cls.data?.stage);
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;

  if (cls.isLoading || (cls.data && !tax.data)) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  if (!cls.data || !tax.data) {
    return <Card className="py-12 text-center text-muted">{t("notFound")}</Card>;
  }

  const c = cls.data;
  const taxonomy = tax.data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/classes" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="text-3xl font-bold" dir="ltr">
          <bdi>{c.displayName}</bdi>
        </h1>
        <p className="text-muted">{levelById(taxonomy, c.level)?.label[locale] ?? c.level}</p>
      </div>

      <SubjectsCard cls={c} taxonomy={taxonomy} labels={c.subjectIds.map((s) => subjectById(taxonomy, s)?.label[locale] ?? s)} />

      {/* أقسام صفحة القسم — تُفعَّل في مراحلها */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {TABS.map(({ key, icon: Icon }) => (
          <li key={key}>
            <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card bg-surface p-4 text-center shadow-card">
              <Icon aria-hidden className="size-6 text-brand-700" />
              <span className="text-sm font-medium">{t(`tabs.${key}`)}</span>
              <span className="rounded-full bg-canvas px-2 text-[11px] text-muted">{t("soon")}</span>
            </div>
          </li>
        ))}
      </ul>

      <ActionsCard cls={c} />
    </div>
  );

}

function SubjectsCard({ cls, labels, taxonomy }: { cls: ClassDoc; labels: string[]; taxonomy: StageTaxonomy }) {
  const t = useTranslations("classes.detail");
  const uid = useUid();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(cls.subjectIds));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!uid || selected.size === 0) return;
    setSaving(true);
    await updateClassSubjects(uid, cls, [...selected]);
    await queryClient.invalidateQueries({ queryKey: ["class", uid, cls.id] });
    await queryClient.invalidateQueries({ queryKey: keys.classes(uid, cls.yearId) });
    setSaving(false);
    setEditing(false);
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("subjects")}</h2>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className={buttonClass("ghost", "md")}>
            <Pencil aria-hidden className="size-4" />
            {t("editSubjects")}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <SubjectChips
            subjects={subjectsForLevel(taxonomy, cls.level)}
            selected={selected}
            onToggle={(id) => {
              const next = new Set(selected);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelected(next);
            }}
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving || selected.size === 0} className={buttonClass("primary")}>
              {saving && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
              {t("save")}
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("secondary")}>
              {t("cancel")}
            </button>
          </div>
        </>
      ) : (
        <SubjectTags labels={labels} max={20} />
      )}
    </Card>
  );
}

function ActionsCard({ cls }: { cls: ClassDoc }) {
  const t = useTranslations("classes.detail");
  const uid = useUid();
  const router = useRouter();
  const queryClient = useQueryClient();
  const classes = useClasses();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(cls.displayName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = async () => {
    if (!uid) return;
    await queryClient.invalidateQueries({ queryKey: ["class", uid, cls.id] });
    await queryClient.invalidateQueries({ queryKey: keys.classes(uid, cls.yearId) });
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t("actions")}</h2>

      {renaming ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!uid || !name.trim()) return;
            run(async () => {
              await renameClass(uid, cls.id, name);
              await refresh();
              setRenaming(false);
            });
          }}
        >
          <Field label={t("name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="flex-1" dir="auto" />
          <button type="submit" disabled={busy} className={buttonClass("primary")}>
            {t("save")}
          </button>
          <button type="button" onClick={() => setRenaming(false)} className={buttonClass("secondary")}>
            {t("cancel")}
          </button>
        </form>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setRenaming(true)} className={buttonClass("secondary", "md", "justify-start")}>
            <Pencil aria-hidden className="size-4" />
            {t("rename")}
          </button>
          <button
            type="button"
            disabled={busy || !classes.data}
            title={t("copyHint")}
            onClick={() =>
              uid &&
              classes.data &&
              run(async () => {
                const [section] = nextSections(classes.data, cls.level, 1);
                const [newId] = await createClasses(
                  uid,
                  { yearId: cls.yearId, schoolId: cls.schoolId, stage: cls.stage },
                  [{ level: cls.level, section: section!, subjectIds: cls.subjectIds, copiedFrom: cls.id }],
                );
                await refresh();
                router.push(`/app/classes/${newId}`);
              })
            }
            className={buttonClass("secondary", "md", "justify-start")}
          >
            <Copy aria-hidden className="size-4" />
            {t("copy")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              uid &&
              confirm(t("archiveConfirm")) &&
              run(async () => {
                await archiveClass(uid, cls.id);
                await refresh();
                router.push("/app/classes");
              })
            }
            className={buttonClass("secondary", "md", "justify-start")}
          >
            <Archive aria-hidden className="size-4" />
            {t("archive")}
          </button>
          {cls.studentCount === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                uid &&
                confirm(t("deleteConfirm")) &&
                run(async () => {
                  await deleteClass(uid, cls);
                  await refresh();
                  router.push("/app/classes");
                })
              }
              className={buttonClass("secondary", "md", "justify-start text-red-700 ring-red-200 hover:bg-red-50")}
            >
              <Trash2 aria-hidden className="size-4" />
              {t("delete")}
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </Card>
  );
}
