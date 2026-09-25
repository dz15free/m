"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  FileSpreadsheet,
  Images,
  Keyboard,
  LoaderCircle,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { keys, useClass, useUid } from "@/features/classes/hooks";
import type { ClassDoc } from "@/features/classes/repo";
import { mutateRoster } from "@/features/students/repo";
import { MAX_STUDENTS, addStudents } from "@/features/students/roster";
import { cn } from "@/lib/utils/cn";
import { loadImage, prepareForOcr, thumbnail } from "./image";
import { OcrEngine, type OcrLang } from "./ocr";
import { pasteToTable } from "./paste";
import { editRow, reorderAll, summary, toReviewRows, type ReviewRow, type RowStatus } from "./review";
import { readPdf, readSpreadsheet, UnsupportedFileError } from "./sources";
import type { NameOrder } from "./split-name";
import { parseTable, type Candidate, type Table } from "./table";

type Page = { id: string; source: ImageBitmap | HTMLCanvasElement; rotation: number; thumb: string };
type Stage = "source" | "pages" | "paste" | "processing" | "review";
type Draft = { rows: ReviewRow[]; order: NameOrder; savedAt: number };

const DRAFT_TTL = 24 * 60 * 60 * 1000;
const draftKey = (classId: string) => `import-draft:${classId}`;

function readDraft(classId: string): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(classId)) ?? "null") as Draft | null;
    return d && Date.now() - d.savedAt < DRAFT_TTL && d.rows.length ? d : null;
  } catch {
    return null;
  }
}
function writeDraft(classId: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(draftKey(classId), JSON.stringify(draft));
    else localStorage.removeItem(draftKey(classId));
  } catch {
    // التخزين المحلي غير متاح (تصفّح خاص): المسودّة مجرد راحة
  }
}

export function ImportWizard({ classId }: { classId: string }) {
  const cls = useClass(classId);
  if (!cls.data) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return <Wizard cls={cls.data} />;
}

function Wizard({ cls }: { cls: ClassDoc }) {
  const t = useTranslations("import");
  const locale = useLocale();
  const router = useRouter();
  const uid = useUid();
  const queryClient = useQueryClient();
  const roster = cls.roster ?? [];
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;

  const [stage, setStage] = useState<Stage>("source");
  const [lang, setLang] = useState<OcrLang>(locale === "fr" ? "fra" : "ara");
  const [pages, setPages] = useState<Page[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [progress, setProgress] = useState<{ label: string; pct: number } | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [order, setOrder] = useState<NameOrder>("lastFirst");
  const [groups, setGroups] = useState<string[]>([]);
  const [group, setGroup] = useState<string>("all");
  const [reviewFirst, setReviewFirst] = useState(true);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // الشاشة لا تُصيَّر على الخادم (خلف حارس الدخول)، فقراءة التخزين المحلي هنا آمنة
  const [draft, setDraft] = useState<Draft | null>(() => readDraft(cls.id));

  const engine = useRef<OcrEngine | null>(null);
  const cancelled = useRef(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const excelInput = useRef<HTMLInputElement>(null);

  // إيقاف محرّك التعرّف عند مغادرة الشاشة
  useEffect(() => () => void engine.current?.terminate(), []);

  // حفظ المسودّة محليًا عند كل تعديل في المراجعة
  useEffect(() => {
    if (stage === "review") writeDraft(cls.id, { rows, order, savedAt: Date.now() });
  }, [stage, rows, order, cls.id]);

  function finish(tables: { table: Table; group?: string }[]) {
    const candidates: Candidate[] = [];
    const found: string[] = [];
    for (const { table, group } of tables) {
      const res = parseTable(table, { order, group });
      candidates.push(...res.candidates);
      res.groups.forEach((g) => found.includes(g) || found.push(g));
    }
    setRows(toReviewRows(candidates, roster));
    setGroups(found);
    setGroup("all");
    setProgress(null);
    setStage("review");
  }

  // ── المصادر ─────────────────────────────────────────────

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const added: Page[] = [];
    for (const file of Array.from(files)) {
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          setStage("processing");
          setProgress({ label: t("reading"), pct: 0 });
          const pdf = await readPdf(file, (n, total) => setProgress({ label: t("page", { current: n, total }), pct: n / total }));
          if (pdf.kind === "text") {
            // PDF نصّي: استخراج مباشر دقيق دون OCR
            finish(pdf.pages.map((table) => ({ table })));
            return;
          }
          pdf.pages.forEach((canvas) =>
            added.push({ id: crypto.randomUUID(), source: canvas, rotation: 0, thumb: thumbnail(canvas, 0) }),
          );
        } else if (file.type.startsWith("image/")) {
          const bitmap = await loadImage(file);
          added.push({ id: crypto.randomUUID(), source: bitmap, rotation: 0, thumb: thumbnail(bitmap, 0) });
        }
      } catch {
        setError(t("readError"));
      }
    }
    setPages((prev) => [...prev, ...added]);
    setProgress(null);
    setStage(added.length || pages.length ? "pages" : "source");
  }

  async function readExcel(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setStage("processing");
    setProgress({ label: t("reading"), pct: 0 });
    try {
      const sheets = await readSpreadsheet(file);
      finish(sheets.map((s) => ({ table: s.table, group: sheets.length > 1 ? s.name : undefined })));
    } catch (e) {
      setError(e instanceof UnsupportedFileError ? t("xlsUnsupported") : t("readError"));
      setProgress(null);
      setStage(e instanceof UnsupportedFileError ? "paste" : "source");
    }
  }

  async function runOcr() {
    cancelled.current = false;
    setStage("processing");
    setProgress({ label: t("loadingEngine"), pct: 0 });
    try {
      engine.current ??= new OcrEngine();
      const tables: { table: Table }[] = [];
      for (let i = 0; i < pages.length; i++) {
        const label = t("page", { current: i + 1, total: pages.length });
        await engine.current.init(lang, (p) => setProgress({ label, pct: (i + p) / pages.length }));
        setProgress({ label, pct: i / pages.length });
        const page = pages[i]!;
        const canvas = prepareForOcr(page.source, page.rotation);
        const { table } = await engine.current.recognize(canvas);
        if (cancelled.current) return;
        tables.push({ table });
        canvas.width = canvas.height = 0; // تحرير الذاكرة فورًا
      }
      // لا نحتفظ بالصور: تُحرَّر بعد التعرّف
      pages.forEach((p) => "close" in p.source && p.source.close());
      setPages([]);
      finish(tables);
    } catch {
      if (!cancelled.current) {
        setError(t("readError"));
        setStage("pages");
        setProgress(null);
      }
    }
  }

  function cancel() {
    cancelled.current = true;
    engine.current?.terminate();
    engine.current = null;
    setProgress(null);
    setStage(pages.length ? "pages" : "source");
  }

  function reset() {
    writeDraft(cls.id, null);
    setRows([]);
    setPages([]);
    setError(null);
    setStage("source");
  }

  // ── الاعتماد ────────────────────────────────────────────

  const visibleRows = rows.filter((r) => group === "all" || r.group === group);
  const toImport = visibleRows.filter((r) => r.include && (r.last.trim() || r.first.trim()));
  const total = (mode === "replace" ? 0 : roster.length) + toImport.length;

  async function confirmImport() {
    if (!uid || !toImport.length) return;
    if (total > MAX_STUDENTS) return setError(t("tooMany"));
    const input = toImport.map((r) => ({ last: r.last, first: r.first, gender: r.gender }));
    setSaving(true);
    setError(null);
    try {
      await mutateRoster(uid, cls.id, (current) => addStudents(mode === "replace" ? [] : current, input));
      writeDraft(cls.id, null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.class(uid, cls.id) }),
        queryClient.invalidateQueries({ queryKey: keys.classes(uid, cls.yearId) }),
      ]);
      router.push(`/app/classes/${cls.id}/students`);
    } catch {
      setError(t("saveError"));
      setSaving(false);
    }
  }

  // ── الواجهة ─────────────────────────────────────────────

  const header = (
    <div>
      <Link href={`/app/classes/${cls.id}/students`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
        <Back aria-hidden className="size-4" />
        <bdi dir="ltr">{cls.displayName}</bdi>
      </Link>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-1 text-muted">{t("subtitle")}</p>
    </div>
  );

  const hiddenInputs = (
    <>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
      <input
        ref={excelInput}
        type="file"
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(e) => { readExcel(e.target.files); e.target.value = ""; }}
      />
    </>
  );

  const errorBox = error && (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {error}
    </p>
  );

  if (stage === "processing") {
    return (
      <div className="space-y-6">
        {header}
        <Card className="space-y-4 py-10 text-center">
          <LoaderCircle aria-hidden className="mx-auto size-10 animate-spin text-brand-700" />
          <p className="font-semibold" aria-live="polite">{progress?.label}</p>
          <div className="mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round((progress?.pct ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${Math.round((progress?.pct ?? 0) * 100)}%` }} />
          </div>
          <button type="button" onClick={cancel} className={buttonClass("secondary")}>
            <X aria-hidden className="size-4" />
            {t("cancel")}
          </button>
        </Card>
      </div>
    );
  }

  if (stage === "review") {
    return (
      <Review
        header={header}
        rows={rows}
        setRows={setRows}
        order={order}
        onOrder={(next) => {
          setRows(reorderAll(rows, next));
          setOrder(next);
        }}
        groups={groups}
        group={group}
        setGroup={setGroup}
        reviewFirst={reviewFirst}
        setReviewFirst={setReviewFirst}
        hasStudents={roster.length > 0}
        mode={mode}
        setMode={setMode}
        toImport={toImport.length}
        saving={saving}
        errorBox={errorBox}
        onConfirm={confirmImport}
        onStartOver={reset}
        onPaste={() => setStage("paste")}
        onExcel={() => excelInput.current?.click()}
        manualHref={`/app/classes/${cls.id}/students`}
        hiddenInputs={hiddenInputs}
      />
    );
  }

  if (stage === "paste") {
    return (
      <div className="space-y-5">
        {header}
        {errorBox}
        <Card className="space-y-3">
          <label htmlFor="paste" className="font-semibold">{t("pasteTitle")}</label>
          <textarea
            id="paste"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t("pastePlaceholder")}
            rows={10}
            dir="auto"
            autoFocus
            className="block w-full rounded-xl border border-line bg-surface p-3 leading-8 outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100"
          />
          <p className="text-xs text-muted">{t("pasteHint")}</p>
          <div className="flex gap-2">
            <button type="button" disabled={!pasteText.trim()} onClick={() => finish([{ table: pasteToTable(pasteText) }])} className={buttonClass("primary", "lg", "flex-1")}>
              {t("analyze")}
            </button>
            <button type="button" onClick={() => setStage("source")} className={buttonClass("secondary", "lg")}>
              {t("back")}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (stage === "pages") {
    return (
      <div className="space-y-5">
        {header}
        {hiddenInputs}
        {errorBox}
        <Card className="space-y-4">
          <h2 className="font-semibold">{t("pages")} ({pages.length})</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pages.map((p, i) => (
              <li key={p.id} className="relative overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- معاينة محلية (data URL) */}
                <img src={p.thumb} alt={t("page", { current: i + 1, total: pages.length })} className="mx-auto max-h-48 object-contain" />
                <span className="absolute start-2 top-2 rounded-full bg-ink/80 px-2 text-xs font-bold text-white">{i + 1}</span>
                <div className="flex justify-center gap-1 border-t border-line bg-surface p-1">
                  <button
                    type="button"
                    aria-label={t("rotate")}
                    onClick={() =>
                      setPages(pages.map((x) => (x.id === p.id ? { ...x, rotation: (x.rotation + 90) % 360, thumb: thumbnail(x.source, (x.rotation + 90) % 360) } : x)))
                    }
                    className="grid size-10 place-items-center rounded-full hover:bg-canvas"
                  >
                    <RotateCw aria-hidden className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("removePage")}
                    onClick={() => setPages(pages.filter((x) => x.id !== p.id))}
                    className="grid size-10 place-items-center rounded-full text-red-700 hover:bg-red-50"
                  >
                    <Trash2 aria-hidden className="size-5" />
                  </button>
                </div>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                <Plus aria-hidden className="size-6" />
                {t("addPage")}
              </button>
            </li>
          </ul>
          <p className="text-xs text-muted">{t("photoTips")}</p>
          <LangPicker lang={lang} setLang={setLang} />
          <button type="button" disabled={!pages.length} onClick={runOcr} className={buttonClass("primary", "lg", "w-full")}>
            {t("startOcr")}
          </button>
        </Card>
      </div>
    );
  }

  // stage === "source"
  const sources = [
    { key: "camera", icon: Camera },
    { key: "file", icon: Images },
    { key: "excel", icon: FileSpreadsheet },
    { key: "paste", icon: ClipboardPaste },
  ] as const;

  function openSource(key: (typeof sources)[number]["key"]) {
    if (key === "camera") cameraInput.current?.click();
    else if (key === "file") fileInput.current?.click();
    else if (key === "excel") excelInput.current?.click();
    else setStage("paste");
  }

  return (
    <div className="space-y-5">
      {header}
      {hiddenInputs}
      {draft && (
        <Card className="flex flex-wrap items-center gap-3 bg-accent-100">
          <p className="min-w-0 flex-1 text-sm font-medium">{t("restore")}</p>
          <button
            type="button"
            onClick={() => {
              setRows(draft.rows);
              setOrder(draft.order);
              setStage("review");
              setDraft(null);
            }}
            className={buttonClass("primary")}
          >
            {t("restoreYes")}
          </button>
          <button type="button" onClick={() => { writeDraft(cls.id, null); setDraft(null); }} className={buttonClass("secondary")}>
            {t("restoreNo")}
          </button>
        </Card>
      )}
      {errorBox}
      <ul className="grid gap-3 sm:grid-cols-2">
        {sources.map(({ key, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => openSource(key)}
              className="flex w-full items-center gap-4 rounded-card bg-surface p-4 text-start shadow-card ring-2 ring-transparent transition hover:ring-brand-200"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon aria-hidden className="size-7" />
              </span>
              <span>
                <span className="block font-semibold">{t(`sources.${key}.title`)}</span>
                <span className="mt-0.5 block text-sm text-muted">{t(`sources.${key}.body`)}</span>
              </span>
            </button>
          </li>
        ))}
        <li>
          <Link
            href={`/app/classes/${cls.id}/students`}
            className="flex w-full items-center gap-4 rounded-card bg-surface p-4 shadow-card ring-2 ring-transparent transition hover:ring-brand-200"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-canvas text-muted">
              <Keyboard aria-hidden className="size-7" />
            </span>
            <span>
              <span className="block font-semibold">{t("sources.manual.title")}</span>
              <span className="mt-0.5 block text-sm text-muted">{t("sources.manual.body")}</span>
            </span>
          </Link>
        </li>
      </ul>
      <LangPicker lang={lang} setLang={setLang} />
      <p className="flex items-center gap-2 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-4 shrink-0 text-brand-700" />
        {t("privacy")}
      </p>
    </div>
  );
}

function LangPicker({ lang, setLang }: { lang: OcrLang; setLang: (l: OcrLang) => void }) {
  const t = useTranslations("import");
  const options: [OcrLang, string][] = [["ara", t("langAr")], ["fra", t("langFr")], ["ara+fra", t("langBoth")]];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{t("listLang")}</span>
      <div role="group" aria-label={t("listLang")} className="flex rounded-full bg-canvas p-1 ring-1 ring-line">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={lang === value}
            onClick={() => setLang(value)}
            className={cn("min-h-9 rounded-full px-3 text-sm font-medium", lang === value ? "bg-brand-700 text-white" : "text-ink")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── شاشة المراجعة ─────────────────────────────────────────

const STATUS_STYLE: Record<RowStatus, string> = {
  ok: "bg-green-50 text-green-800",
  check: "bg-amber-50 text-amber-900",
  bad: "bg-red-50 text-red-800",
};
const STATUS_DOT: Record<RowStatus, string> = { ok: "🟢", check: "🟡", bad: "🔴" };
const RANK: Record<RowStatus, number> = { bad: 0, check: 1, ok: 2 };

function Review(props: {
  header: React.ReactNode;
  rows: ReviewRow[];
  setRows: (rows: ReviewRow[]) => void;
  order: NameOrder;
  onOrder: (order: NameOrder) => void;
  groups: string[];
  group: string;
  setGroup: (g: string) => void;
  reviewFirst: boolean;
  setReviewFirst: (v: boolean) => void;
  hasStudents: boolean;
  mode: "append" | "replace";
  setMode: (m: "append" | "replace") => void;
  toImport: number;
  saving: boolean;
  errorBox: React.ReactNode;
  onConfirm: () => void;
  onStartOver: () => void;
  onPaste: () => void;
  onExcel: () => void;
  manualHref: string;
  hiddenInputs: React.ReactNode;
}) {
  const t = useTranslations("import");
  const { rows, setRows, group } = props;
  const visible = rows.filter((r) => group === "all" || r.group === group);
  const s = summary(visible);
  const lowQuality = s.total === 0 || s.ok / s.total < 0.5;
  const shown = props.reviewFirst ? [...visible].sort((a, b) => RANK[a.status] - RANK[b.status]) : visible;
  const update = (key: string, patch: Partial<ReviewRow>) =>
    setRows(rows.map((r) => (r.key === key ? ("last" in patch || "first" in patch ? editRow(r, patch) : { ...r, ...patch }) : r)));

  return (
    <div className="space-y-5 pb-4">
      {props.header}
      {props.hiddenInputs}

      <Card className="space-y-3">
        <p className="text-xl font-bold">{t("found", { count: s.total })}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className={cn("rounded-full px-3 py-1 font-medium", STATUS_STYLE.ok)}>🟢 {s.ok} {t("statusOk")}</span>
          <span className={cn("rounded-full px-3 py-1 font-medium", STATUS_STYLE.check)}>🟡 {s.check} {t("statusCheck")}</span>
          <span className={cn("rounded-full px-3 py-1 font-medium", STATUS_STYLE.bad)}>🔴 {s.bad} {t("statusBad")}</span>
        </div>
        {!lowQuality && s.check + s.bad > 0 && <p className="text-sm text-muted">{t("mostlyOk", { count: s.check + s.bad })}</p>}
      </Card>

      {lowQuality && (
        <Card className="space-y-3 bg-amber-50">
          <p className="flex items-center gap-2 font-semibold text-amber-900">
            <TriangleAlert aria-hidden className="size-5" />
            {t("failTitle")}
          </p>
          <p className="text-sm text-amber-900">{t("failBody")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={props.onExcel} className={buttonClass("secondary")}>
              <FileSpreadsheet aria-hidden className="size-4" />
              {t("sources.excel.title")}
            </button>
            <button type="button" onClick={props.onPaste} className={buttonClass("secondary")}>
              <ClipboardPaste aria-hidden className="size-4" />
              {t("sources.paste.title")}
            </button>
            <Link href={props.manualHref} className={buttonClass("secondary")}>
              <Keyboard aria-hidden className="size-4" />
              {t("sources.manual.title")}
            </Link>
          </div>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => props.onOrder(props.order === "lastFirst" ? "firstLast" : "lastFirst")}
            className={buttonClass("secondary")}
          >
            <ArrowLeftRight aria-hidden className="size-4" />
            {t("swap")}
          </button>
          <label className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm ring-1 ring-line">
            <input type="checkbox" checked={props.reviewFirst} onChange={(e) => props.setReviewFirst(e.target.checked)} className="size-4 accent-brand-700" />
            {t("reviewFirst")}
          </label>
          {props.groups.length > 1 && (
            <select
              aria-label={t("group")}
              value={group}
              onChange={(e) => props.setGroup(e.target.value)}
              className="min-h-11 rounded-full border border-line bg-surface px-3 text-sm"
            >
              <option value="all">{t("allGroups")}</option>
              {props.groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {shown.map((r) => (
            <li key={r.key} className={cn("space-y-1.5 p-3", !r.include && "bg-canvas/70")}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(r.key, { include: e.target.checked })}
                  aria-label={t("include")}
                  className="size-5 shrink-0 accent-brand-700"
                />
                <span className="w-6 shrink-0 text-center text-xs tabular-nums text-muted">{visible.indexOf(r) + 1}</span>
                <input
                  value={r.last}
                  onChange={(e) => update(r.key, { last: e.target.value })}
                  aria-label="last"
                  dir="auto"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 font-semibold outline-none focus:border-brand-600"
                />
                <input
                  value={r.first}
                  onChange={(e) => update(r.key, { first: e.target.value })}
                  aria-label="first"
                  dir="auto"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 outline-none focus:border-brand-600"
                />
                <button
                  type="button"
                  aria-label={t("deleteRow")}
                  onClick={() => setRows(rows.filter((x) => x.key !== r.key))}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-700"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {r.reasons.length > 0 && (
                <p
                  className={cn(
                    "ms-15 inline-flex flex-wrap gap-x-2 rounded-lg px-2 py-0.5 text-xs",
                    r.status === "ok" ? "bg-canvas text-muted" : STATUS_STYLE[r.status],
                  )}
                >
                  {r.status !== "ok" && <span>{STATUS_DOT[r.status]}</span>}
                  {r.reasons.map((reason) => t(`reasons.${reason}`)).join(" · ")}
                  {/* النص الأصلي يفيد فقط حين تكون القراءة نفسها موضع شك */}
                  {r.reasons.some((x) => x === "lowConfidence" || x === "veryLowConfidence" || x === "strangeChars") && r.raw && (
                    <bdi className="opacity-75">«{r.raw}»</bdi>
                  )}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={() =>
          setRows([
            ...rows,
            { key: `n${Date.now()}`, last: "", first: "", gender: null, raw: "", status: "check", reasons: ["missingLast", "missingFirst"], include: true },
          ])
        }
        className={buttonClass("secondary")}
      >
        <Plus aria-hidden className="size-4" />
        {t("addRow")}
      </button>

      {props.hasStudents && (
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {(["append", "replace"] as const).map((m) => (
            <label key={m} className={cn("flex min-h-11 items-center gap-2 rounded-full px-4 text-sm ring-1", props.mode === m ? "bg-brand-50 ring-brand-600" : "ring-line")}>
              <input type="radio" name="mode" checked={props.mode === m} onChange={() => props.setMode(m)} className="accent-brand-700" />
              {m === "append" ? t("modeAppend") : t("modeReplace")}
            </label>
          ))}
        </div>
      )}

      {props.errorBox}

      <div data-sticky-bar className="sticky bottom-24 z-10 flex flex-wrap gap-2 lg:bottom-6">
        <button
          type="button"
          disabled={props.saving || props.toImport === 0}
          onClick={props.onConfirm}
          className={buttonClass("primary", "lg", "flex-1 shadow-lg sm:flex-none")}
        >
          {props.saving ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Check aria-hidden className="size-5" />}
          {props.saving ? t("saving") : t("confirm", { count: props.toImport })}
        </button>
        <button type="button" onClick={props.onStartOver} className={buttonClass("secondary", "lg", "shadow-lg")}>
          {t("startOver")}
        </button>
      </div>
    </div>
  );
}
