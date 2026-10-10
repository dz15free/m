"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CalendarClock, Check, LoaderCircle, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { ROW_MAX } from "./logic";

export type CellEditorProps = {
  /** اسم المادة (والميدان) */
  title: string;
  /** الأسبوع وتواريخه */
  subtitle: string;
  /** اتجاه الكتابة: العربية من اليمين، الفرنسية والإنجليزية من اليسار */
  dir: "rtl" | "ltr";
  /** لون المادة (نقطة العنوان) */
  dotClass: string;
  initial: string[];
  /** محتوى المذكرات لهذه الخانة (للاسترجاع) */
  official: string[];
  week: number;
  weeks: { n: number; label: string }[];
  saving: boolean;
  error: boolean;
  onSave: (items: string[], target: number) => void;
  onClose: () => void;
};

type Item = { id: number; text: string };
let seq = 0;
const toItems = (list: string[]): Item[] => (list.length ? list : [""]).map((text) => ({ id: ++seq, text }));

/** محرّر خانة من المخطط الشهري: عنصر لكل سطر، بأدوات الترتيب والحذف والاسترجاع والنقل إلى أسبوع آخر. */
export function CellEditor(p: CellEditorProps) {
  const t = useTranslations("planning.editor");
  const [items, setItems] = useState<Item[]>(() => toItems(p.initial));
  const [target, setTarget] = useState(p.week);
  const refs = useRef(new Map<number, HTMLInputElement>());
  // العنصر الذي يأخذ التركيز بعد التصيير (الأول عند الفتح، والجديد عند الإضافة)
  const pendingFocus = useRef<number | null>(items[0]?.id ?? null);
  const { onClose } = p;

  useEffect(() => {
    const id = pendingFocus.current;
    if (id == null) return;
    refs.current.get(id)?.focus();
    pendingFocus.current = null;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clean = items.map((i) => i.text.replace(/\s+/g, " ").trim()).filter(Boolean);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  const changed = !same(clean, p.initial) || target !== p.week;

  function insertAfter(index: number) {
    const item = { id: ++seq, text: "" };
    pendingFocus.current = item.id;
    setItems((cur) => [...cur.slice(0, index + 1), item, ...cur.slice(index + 1)]);
  }
  function remove(index: number) {
    const next = items.filter((_, i) => i !== index);
    const list = next.length ? next : [{ id: ++seq, text: "" }];
    pendingFocus.current = list[Math.max(0, Math.min(index - 1, list.length - 1))]!.id;
    setItems(list);
  }
  function move(index: number, by: -1 | 1) {
    setItems((cur) => {
      const j = index + by;
      if (j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[j]] = [next[j]!, next[index]!];
      return next;
    });
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4 print:hidden" onClick={p.onClose}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="cell-editor-title"
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-float sm:max-w-xl sm:rounded-3xl"
        >
          <header className="flex items-start gap-3 border-b border-line px-5 py-4">
            <span aria-hidden className={cn("mt-2 size-3 shrink-0 rounded-full", p.dotClass)} />
            <div className="min-w-0 flex-1">
              <h2 id="cell-editor-title" className="text-lg font-bold">{p.title}</h2>
              <p className="text-sm text-muted">{p.subtitle}</p>
            </div>
            <button type="button" onClick={p.onClose} aria-label={t("close")} className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-canvas">
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <p className="text-xs text-muted">{t("hint")}</p>
            <ol className="space-y-2">
              {items.map((item, i) => (
                <li key={item.id} className="flex items-center gap-1.5">
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted">{i + 1}</span>
                  <input
                    ref={(el) => {
                      if (el) refs.current.set(item.id, el);
                      else refs.current.delete(item.id);
                    }}
                    value={item.text}
                    dir={p.dir}
                    maxLength={ROW_MAX.content}
                    aria-label={t("item", { n: i + 1 })}
                    placeholder={t("placeholder")}
                    onChange={(e) => setItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, text: e.target.value } : x)))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        insertAfter(i);
                      } else if (e.key === "Backspace" && !item.text && items.length > 1) {
                        e.preventDefault();
                        remove(i);
                      }
                    }}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                  <button type="button" aria-label={t("up")} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas disabled:opacity-30">
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button type="button" aria-label={t("down")} disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas disabled:opacity-30">
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button type="button" aria-label={t("remove")} onClick={() => remove(i)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-red-700">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => insertAfter(items.length - 1)} className={buttonClass("secondary", "md", "w-full")}>
              <Plus aria-hidden className="size-4" />
              {t("add")}
            </button>

            <div className="space-y-3 rounded-2xl bg-canvas p-3">
              <p className="text-xs font-semibold text-muted">{t("tools")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={same(clean, p.official)}
                  onClick={() => setItems(toItems(p.official))}
                  className={buttonClass("secondary")}
                >
                  <RotateCcw aria-hidden className="size-4" />
                  {t("restore")}
                </button>
                <button type="button" disabled={!clean.length} onClick={() => setItems(toItems([]))} className={buttonClass("secondary")}>
                  <Trash2 aria-hidden className="size-4" />
                  {t("clear")}
                </button>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <CalendarClock aria-hidden className="size-4 text-brand-700" />
                <span className="font-medium">{t("moveTo")}</span>
                <select
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-2 outline-none focus:border-brand-600"
                >
                  {p.weeks.map((w) => (
                    <option key={w.n} value={w.n}>{w.n === p.week ? t("sameWeek", { label: w.label }) : w.label}</option>
                  ))}
                </select>
              </label>
              {target !== p.week && <p className="text-xs text-brand-800">{t("moveHint")}</p>}
            </div>
            {p.error && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
          </div>

          <footer className="flex gap-2 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" disabled={!changed || p.saving} onClick={() => p.onSave(clean, target)} className={buttonClass("primary", "md", "flex-1")}>
              {p.saving ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
              {t("save")}
            </button>
            <button type="button" onClick={p.onClose} className={buttonClass("ghost")}>{t("cancel")}</button>
          </footer>
        </section>
      </div>
    </Portal>
  );
}
