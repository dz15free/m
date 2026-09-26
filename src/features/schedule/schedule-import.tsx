"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Camera,
  Download,
  FileSpreadsheet,
  Images,
  Keyboard,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useClasses,
  useTaxonomy,
  useTeacher,
  useUid,
} from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { loadImage, prepareForOcr } from "@/features/import/image";
import { OcrEngine } from "@/features/import/ocr";
import {
  readPdf,
  readSpreadsheet,
  UnsupportedFileError,
} from "@/features/import/sources";
import type { Table } from "@/features/import/table";
import { subjectById, type StageTaxonomy } from "@/shared/taxonomy/taxonomy";
import { cn } from "@/lib/utils/cn";
import { reportClientError } from "@/lib/firebase/report";
import {
  parseTimetable,
  type DraftSlot,
  type ImportSubject,
} from "./import-logic";
import {
  bySlotTime,
  isValidTime,
  newSlotId,
  overlaps,
  toMinutes,
  type Slot,
} from "./logic";
import { saveSchedule, scheduleKey, useCalendar, useSchedule } from "./repo";

/* استيراد جدول التوقيت: Excel، PDF، صورة (أو الكاميرا). كل القراءة على جهاز الأستاذ،
   ثم مراجعة حصة حصة (القسم والمادة والوقت) قبل الحفظ. */

type Stage = "source" | "processing" | "review";

export function ScheduleImport() {
  const teacher = useTeacher();
  const classes = useClasses();
  const schedule = useSchedule();
  const calendar = useCalendar();
  const tax = useTaxonomy(teacher.data?.profile.stage);
  if (
    !teacher.data ||
    !classes.data ||
    !schedule.data ||
    !calendar.data ||
    !tax.data
  ) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle
          aria-hidden
          className="size-8 animate-spin text-brand-700"
        />
      </div>
    );
  }
  return (
    <Importer
      yearId={teacher.data.profile.activeYearId}
      classes={classes.data.filter((c) => !c.archived)}
      existing={schedule.data}
      schoolDays={calendar.data.schoolDays}
      taxonomy={tax.data}
    />
  );
}

function Importer({
  yearId,
  classes,
  existing,
  schoolDays,
  taxonomy,
}: {
  yearId: string;
  classes: ClassDoc[];
  existing: Slot[];
  schoolDays: number[];
  taxonomy: StageTaxonomy;
}) {
  const t = useTranslations("scheduleImport");
  const ts = useTranslations("schedule");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const uid = useUid();
  const queryClient = useQueryClient();
  const days = ts.raw("days") as string[];

  const [stage, setStage] = useState<Stage>("source");
  const [progress, setProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [mode, setMode] = useState<"replace" | "add">(
    existing.length ? "add" : "replace",
  );
  const [saving, setSaving] = useState(false);
  const engine = useRef<OcrEngine | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const excel = useRef<HTMLInputElement>(null);
  useEffect(() => () => void engine.current?.terminate(), []);

  const usedSubjects = new Set(classes.flatMap((c) => c.subjectIds));
  const subjects: ImportSubject[] = taxonomy.subjects
    .filter((s) => usedSubjects.has(s.id))
    .map((s) => ({ id: s.id, label: s.label }));
  const ctx = {
    classes: classes.map((c) => ({
      id: c.id,
      level: c.level,
      section: c.section,
      displayName: c.displayName,
      subjectIds: c.subjectIds,
    })),
    subjects,
  };

  /** أفضل جدول بين الصفحات/الأوراق: الأكثر حصصًا. */
  function finish(tables: Table[]) {
    let best: DraftSlot[] | null = null;
    let reason: string = "noDays";
    for (const table of tables) {
      const res = parseTimetable(table, ctx);
      if (res.ok) {
        if (!best || res.slots.length > best.length) best = res.slots;
      } else if (reason === "noDays") reason = res.reason;
    }
    if (!best) {
      setError(t(`errors.${reason as "noDays"}`));
      setStage("source");
      return;
    }
    setSlots(best);
    setStage("review");
  }

  async function ocr(
    canvases: (HTMLCanvasElement | ImageBitmap)[],
  ): Promise<Table[]> {
    engine.current ??= new OcrEngine();
    const out: Table[] = [];
    for (let i = 0; i < canvases.length; i++) {
      setProgress(t("recognizing", { current: i + 1, total: canvases.length }));
      await engine.current.init("ara+fra");
      const src = canvases[i]!;
      const prepared = prepareForOcr(src, 0);
      out.push(
        (await engine.current.recognize(prepared, { refine: "all" })).table,
      );
      prepared.width = prepared.height = 0;
      if ("close" in src) src.close();
    }
    return out;
  }

  async function readFiles(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    setError(null);
    setStage("processing");
    setProgress(t("reading"));
    try {
      const name = f.name.toLowerCase();
      if (
        /\.(xlsx|xls|csv|txt)$/.test(name) ||
        f.type.includes("sheet") ||
        f.type === "text/csv"
      ) {
        finish((await readSpreadsheet(f)).map((s) => s.table));
      } else if (f.type === "application/pdf" || name.endsWith(".pdf")) {
        const pdf = await readPdf(f);
        if (pdf.kind === "text") {
          const tables = pdf.pages.map((p) => p.table);
          // PDF نصّي بلا جدول مفهوم (نص مشوّه أو مرسوم): نقرأ صورة الصفحة
          if (tables.some((tb) => parseTimetable(tb, ctx).ok)) finish(tables);
          else finish(await ocr(await pdf.render()));
        } else finish(await ocr(pdf.pages));
      } else if (f.type.startsWith("image/")) {
        finish(await ocr([await loadImage(f)]));
      } else {
        throw new UnsupportedFileError("type");
      }
    } catch (e) {
      console.error("[schedule import]", e);
      if (!(e instanceof UnsupportedFileError)) reportClientError("schedule.import", e, { type: f.type, size: f.size });
      setError(
        e instanceof UnsupportedFileError ? t("errors.xls") : t("errors.read"),
      );
      setStage("source");
    }
  }

  function downloadTemplate() {
    const times = [
      "08:00-09:00",
      "09:00-10:00",
      "10:15-11:15",
      "11:15-12:15",
      "13:00-14:00",
      "14:00-15:00",
    ];
    const rows = [
      [t("template.day"), ...times],
      ...schoolDays.map((d) => [days[d]!, ...times.map(() => "")]),
    ];
    const csv =
      "﻿" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = locale === "ar" ? "جدول-التوقيت.csv" : "emploi-du-temps.csv";
    a.click();
  }

  const update = (key: string, patch: Partial<DraftSlot>) =>
    setSlots((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        const next = { ...s, ...patch };
        // تغيير القسم: مادته الوحيدة تُختار تلقائيًا، ومادة لا يدرّسها تُلغى
        if (patch.classId !== undefined) {
          const cls = classes.find((c) => c.id === patch.classId);
          if (cls && !cls.subjectIds.includes(next.subjectId))
            next.subjectId =
              cls.subjectIds.length === 1 ? cls.subjectIds[0]! : "";
        }
        const valid =
          isValidTime(next.start) &&
          isValidTime(next.end) &&
          toMinutes(next.end) > toMinutes(next.start);
        next.status = next.classId && next.subjectId && valid ? "ok" : "check";
        return next;
      }),
    );

  const chosen = slots.filter((s) => s.include);
  const ready = chosen.length > 0 && chosen.every((s) => s.status === "ok");

  async function save() {
    if (!uid || !ready) return;
    setSaving(true);
    const imported: Slot[] = chosen.map(
      ({ day, start, end, classId, subjectId }) => ({
        id: newSlotId(),
        day,
        start,
        end,
        classId,
        subjectId,
      }),
    );
    const next = mode === "replace" ? imported : [...existing, ...imported];
    try {
      await saveSchedule(uid, yearId, next.sort(bySlotTime));
      queryClient.setQueryData(scheduleKey(uid, yearId), next);
      router.push("/app/schedule");
    } catch {
      setError(t("errors.save"));
      setSaving(false);
    }
  }

  const inputs = (
    <>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void readFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={file}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          void readFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={excel}
        type="file"
        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => {
          void readFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
  const errorBox = error && (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-800"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {error}
    </p>
  );

  if (stage === "processing") {
    return (
      <Card className="space-y-4 py-10 text-center">
        <LoaderCircle
          aria-hidden
          className="mx-auto size-10 animate-spin text-brand-700"
        />
        <p className="font-semibold" aria-live="polite">
          {progress}
        </p>
        <button
          type="button"
          onClick={() => {
            void engine.current?.terminate();
            engine.current = null;
            setStage("source");
          }}
          className={buttonClass("secondary")}
        >
          <X aria-hidden className="size-4" />
          {t("cancel")}
        </button>
      </Card>
    );
  }

  if (stage === "review") {
    const byDay = [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b);
    const toCheck = slots.filter(
      (s) => s.include && s.status === "check",
    ).length;
    return (
      <div className="space-y-4 pb-28">
        <Card className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold">
              {t("found", { count: slots.length })}
            </p>
            <p className="text-sm text-muted">
              {toCheck ? t("toCheck", { count: toCheck }) : t("allGood")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSlots([]);
              setStage("source");
            }}
            className="shrink-0 text-sm font-semibold text-brand-700 hover:underline"
          >
            {t("restart")}
          </button>
        </Card>
        {byDay.map((d) => (
          <section key={d} className="space-y-2">
            <h2 className="font-bold">{days[d]}</h2>
            <ul className="space-y-2">
              {slots
                .filter((s) => s.day === d)
                .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
                .map((s) => {
                  const cls = classes.find((c) => c.id === s.classId);
                  const pool = cls
                    ? subjects.filter((x) => cls.subjectIds.includes(x.id))
                    : subjects;
                  const clash =
                    s.include &&
                    slots.some(
                      (o) => o.key !== s.key && o.include && overlaps(o, s),
                    );
                  return (
                    <li
                      key={s.key}
                      className={cn(
                        "space-y-2 rounded-card bg-surface p-3 shadow-card",
                        !s.include && "opacity-50",
                        s.include &&
                          s.status === "check" &&
                          "ring-2 ring-amber-300",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={s.include}
                          onChange={(e) =>
                            update(s.key, { include: e.target.checked })
                          }
                          aria-label={t("include")}
                          className="size-5 accent-brand-700"
                        />
                        <input
                          type="time"
                          value={s.start}
                          onChange={(e) =>
                            update(s.key, { start: e.target.value })
                          }
                          aria-label={ts("start")}
                          className="min-h-10 rounded-xl border border-line px-2 tabular-nums"
                        />
                        <span aria-hidden>–</span>
                        <input
                          type="time"
                          value={s.end}
                          onChange={(e) =>
                            update(s.key, { end: e.target.value })
                          }
                          aria-label={ts("end")}
                          className="min-h-10 rounded-xl border border-line px-2 tabular-nums"
                        />
                        <span
                          dir="auto"
                          className="ms-auto truncate text-xs text-muted"
                          title={s.raw}
                        >
                          «{s.raw}»
                        </span>
                      </div>
                      <div
                        className={cn(
                          "grid gap-2",
                          classes.length > 1 && "grid-cols-2",
                        )}
                      >
                        {classes.length > 1 && (
                          <select
                            value={s.classId}
                            onChange={(e) =>
                              update(s.key, { classId: e.target.value })
                            }
                            aria-label={ts("class")}
                            className={cn(
                              "min-h-11 min-w-0 rounded-xl border bg-surface px-2",
                              s.classId ? "border-line" : "border-amber-400",
                            )}
                          >
                            <option value="">{t("chooseClass")}</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.displayName}
                              </option>
                            ))}
                          </select>
                        )}
                        <select
                          value={s.subjectId}
                          onChange={(e) =>
                            update(s.key, { subjectId: e.target.value })
                          }
                          aria-label={ts("subject")}
                          className={cn(
                            "min-h-11 min-w-0 rounded-xl border bg-surface px-2",
                            s.subjectId ? "border-line" : "border-amber-400",
                          )}
                        >
                          <option value="">{t("chooseSubject")}</option>
                          {pool.map((x) => (
                            <option key={x.id} value={x.id}>
                              {subjectById(taxonomy, x.id)?.label[locale] ??
                                x.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      {clash && (
                        <p className="text-xs text-amber-800">
                          {ts("overlap")}
                        </p>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
        {existing.length > 0 && (
          <Card className="space-y-2">
            <p className="font-semibold">
              {t("modeTitle", { count: existing.length })}
            </p>
            {(["add", "replace"] as const).map((m) => (
              <label key={m} className="flex min-h-10 items-center gap-3">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m}
                  onChange={() => setMode(m)}
                  className="size-5 accent-brand-700"
                />
                {t(`mode.${m}`)}
              </label>
            ))}
          </Card>
        )}
        {errorBox}
        <div
          data-sticky-bar
          className="fixed inset-x-0 bottom-20 z-20 flex gap-2 px-4 lg:bottom-6 lg:start-72 lg:end-6"
        >
          <button
            type="button"
            disabled={!ready || saving}
            onClick={save}
            className={buttonClass("primary", "lg", "flex-1 shadow-float")}
          >
            {saving && (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            )}
            {ready ? t("save", { count: chosen.length }) : t("fixFirst")}
          </button>
        </div>
        {inputs}
      </div>
    );
  }

  const sources = [
    { key: "camera", icon: Camera },
    { key: "file", icon: Images },
    { key: "excel", icon: FileSpreadsheet },
  ] as const;
  function openSource(key: (typeof sources)[number]["key"]) {
    if (key === "camera") camera.current?.click();
    else if (key === "file") file.current?.click();
    else excel.current?.click();
  }

  return (
    <div className="space-y-4">
      {errorBox}
      <div className="grid gap-3 sm:grid-cols-2">
        {sources.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => openSource(key)}
            className="flex items-center gap-4 rounded-card bg-surface p-4 text-start shadow-card transition-shadow hover:shadow-md"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon aria-hidden className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold">
                {t(`sources.${key}.title`)}
              </span>
              <span className="block text-sm text-muted">
                {t(`sources.${key}.hint`)}
              </span>
            </span>
          </button>
        ))}
        <Link
          href="/app/schedule"
          className="flex items-center gap-4 rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-md"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-canvas text-ink/70">
            <Keyboard aria-hidden className="size-6" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">
              {t("sources.manual.title")}
            </span>
            <span className="block text-sm text-muted">
              {t("sources.manual.hint")}
            </span>
          </span>
        </Link>
      </div>
      <Card className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">{t("templateHint")}</p>
        <button
          type="button"
          onClick={downloadTemplate}
          className={buttonClass("secondary")}
        >
          <Download aria-hidden className="size-4" />
          {t("template.download")}
        </button>
      </Card>
      <p className="text-xs text-muted">{t("privacy")}</p>
      {inputs}
    </div>
  );
}
