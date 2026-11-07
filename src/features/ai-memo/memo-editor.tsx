"use client";

import { memo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AArrowDown,
  AArrowUp,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/* تحرير المذكرة كمحرّر نصوص: الورقة المعروضة نفسها تصبح قابلة للكتابة (contentEditable)، مع شريط أدوات
   (تنسيق، قوائم، محاذاة، حجم الخط، تراجع، أسطر الجدول). التعديلات على الورقة المعروضة، فتُطبع كما هي.
   الورقة لا يعاد تصييرها أثناء التحرير (memo) حتى لا تمحو React ما كتبه الأستاذ. */

const Sheet = memo(
  function Sheet({ children }: { children: ReactNode }) {
    return <>{children}</>;
  },
  // لا يُعاد تصييرها أبدًا: نسخة جديدة (مذكرة أخرى أو استرجاع) تُركَّب من جديد بمفتاح الحاوية
  () => true,
);

/** أمر تحرير على التحديد الحالي (execCommand: مدعوم في كل المتصفحات رغم وسمه بالقديم). */
const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

export function EditableMemo({ children, version }: { children: ReactNode; version: string | number }) {
  const t = useTranslations("aiMemo.editor");
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [reset, setReset] = useState(0);

  /** السطر (tr) الذي فيه المؤشر داخل الورقة */
  const currentRow = () => {
    const node = window.getSelection()?.anchorNode;
    const el = node instanceof Element ? node : node?.parentElement;
    const tr = el?.closest("tr");
    return tr && tr.closest("[data-memo-edit]") && tr.parentElement?.tagName === "TBODY" ? tr : null;
  };
  const addRow = () => {
    const tr = currentRow();
    if (!tr) return;
    const copy = tr.cloneNode(true) as HTMLTableRowElement;
    copy.querySelectorAll("td").forEach((td) => (td.innerHTML = "<br>"));
    tr.parentElement!.insertBefore(copy, tr.nextSibling);
    setEdited(true);
  };
  const deleteRow = () => {
    const tr = currentRow();
    if (tr && (tr.parentElement?.children.length ?? 0) > 1) {
      tr.remove();
      setEdited(true);
    }
  };
  const size = (step: 1 | -1) => {
    // حجم الخط بخطوات (1–7) على النص المحدد
    const cur = Number(document.queryCommandValue("fontSize")) || 3;
    exec("fontSize", String(Math.min(7, Math.max(1, cur + step))));
  };

  const tools: { icon: LucideIcon; label: string; run: () => void }[][] = [
    [
      { icon: Undo2, label: t("undo"), run: () => exec("undo") },
      { icon: Redo2, label: t("redo"), run: () => exec("redo") },
    ],
    [
      { icon: Bold, label: t("bold"), run: () => exec("bold") },
      { icon: Italic, label: t("italic"), run: () => exec("italic") },
      { icon: Underline, label: t("underline"), run: () => exec("underline") },
      { icon: Highlighter, label: t("highlight"), run: () => exec("hiliteColor", "#fff3a3") },
      { icon: Baseline, label: t("red"), run: () => exec("foreColor", "#b42318") },
    ],
    [
      { icon: AArrowUp, label: t("bigger"), run: () => size(1) },
      { icon: AArrowDown, label: t("smaller"), run: () => size(-1) },
    ],
    [
      { icon: List, label: t("bullets"), run: () => exec("insertUnorderedList") },
      { icon: ListOrdered, label: t("numbers"), run: () => exec("insertOrderedList") },
      { icon: AlignRight, label: t("right"), run: () => exec("justifyRight") },
      { icon: AlignCenter, label: t("center"), run: () => exec("justifyCenter") },
      { icon: AlignLeft, label: t("left"), run: () => exec("justifyLeft") },
    ],
    [
      { icon: Plus, label: t("addRow"), run: addRow },
      { icon: Trash2, label: t("deleteRow"), run: deleteRow },
    ],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" onClick={() => setEditing(!editing)} className={buttonClass(editing ? "primary" : "secondary", "md")}>
          {editing ? <Check aria-hidden className="size-4" /> : <Pencil aria-hidden className="size-4" />}
          {editing ? t("done") : t("edit")}
        </button>
        {edited && (
          <button
            type="button"
            onClick={() => {
              if (!confirm(t("resetConfirm"))) return;
              setReset((n) => n + 1);
              setEdited(false);
            }}
            className={buttonClass("secondary", "md")}
          >
            <RotateCcw aria-hidden className="size-4" />
            {t("reset")}
          </button>
        )}
        {editing && <span className="text-sm text-muted">{t("hint")}</span>}
      </div>

      {editing && (
        <div role="toolbar" aria-label={t("toolbar")} className="sticky top-2 z-20 flex flex-wrap items-center gap-1 rounded-xl bg-surface p-1.5 shadow-card ring-1 ring-line print:hidden">
          {tools.map((group, g) => (
            <div key={g} className="flex items-center gap-0.5 border-line pe-1 [&:not(:last-child)]:border-e">
              {group.map(({ icon: Icon, label, run }) => (
                <button
                  key={label}
                  type="button"
                  title={label}
                  aria-label={label}
                  // يبقى التحديد في الورقة (لا يأخذ الزر التركيز)
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    run();
                    setEdited(true);
                  }}
                  className="grid size-9 place-items-center rounded-lg text-ink hover:bg-brand-50"
                >
                  <Icon aria-hidden className="size-[18px]" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div
        data-memo-edit
        key={`${version}-${reset}`}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing}
        onInput={() => setEdited(true)}
        className={cn(editing && "rounded-lg outline-2 outline-offset-4 outline-brand-400 outline-dashed focus:outline-brand-600 print:outline-none")}
      >
        <Sheet>{children}</Sheet>
      </div>
    </div>
  );
}
