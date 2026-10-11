"use client";

import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { CheckCircle2, FileDown, Loader2, Printer, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buttonClass } from "./button";
import { Portal } from "./portal";

/* زرّان منفصلان في كل وثيقة: «طباعة» (نافذة الطباعة مباشرة) و«حفظ PDF» (ملف يُنزَّل دون المرور بالطباعة).
   prepare: يهيّئ ما سيُطبع قبل الطباعة أو الحفظ (مثل اختيار نموذج الطباعة في دفتر التنقيط). */

type State =
  | { phase: "idle" }
  | { phase: "working"; done: number; total: number }
  | { phase: "ready"; blob: Blob; name: string; delivered: boolean }
  | { phase: "error" };

export function usePrintActions({ title, prepare }: { title: string | (() => string); prepare?: () => void }) {
  const [state, setState] = useState<State>({ phase: "idle" });

  const print = useCallback(() => {
    if (prepare) flushSync(prepare);
    window.print();
  }, [prepare]);

  const savePdf = useCallback(async () => {
    if (state.phase === "working") return;
    if (prepare) flushSync(prepare);
    flushSync(() => setState({ phase: "working", done: 0, total: 0 }));
    try {
      const { buildPdf, deliverPdf, isIOS, pdfFileName } = await import("@/lib/print/save-pdf");
      const name = typeof title === "function" ? title() : title;
      const blob = await buildPdf({ title: name, onProgress: (done, total) => setState({ phase: "working", done, total }) });
      const file = pdfFileName(name);
      // iPhone/iPad: التنزيل يحتاج لمسة مباشرة، فنعرض زر «حفظ الملف»؛ وغيرها يُنزَّل فورًا
      if (isIOS()) setState({ phase: "ready", blob, name: file, delivered: false });
      else {
        await deliverPdf(blob, file);
        setState({ phase: "ready", blob, name: file, delivered: true });
      }
    } catch (e) {
      console.error("pdf", e);
      setState({ phase: "error" });
    }
  }, [prepare, state.phase, title]);

  const overlay = <PdfOverlay state={state} onClose={() => setState({ phase: "idle" })} onDeliver={async (blob, name) => {
    const { deliverPdf } = await import("@/lib/print/save-pdf");
    await deliverPdf(blob, name);
    setState({ phase: "ready", blob, name, delivered: true });
  }} />;

  return { print, savePdf, busy: state.phase === "working", overlay };
}

function PdfOverlay({ state, onClose, onDeliver }: { state: State; onClose: () => void; onDeliver: (blob: Blob, name: string) => void }) {
  const t = useTranslations("common.print");
  if (state.phase === "idle") return null;
  return (
    <Portal>
      <div data-pdf-ignore="" className="fixed inset-0 z-[100] grid place-items-center bg-brand-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="polite">
        <div className="w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-float">
          {state.phase === "working" && (
            <>
              <Loader2 aria-hidden className="mx-auto size-10 animate-spin text-brand-600" />
              <p className="mt-4 font-semibold">{t("preparing")}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-50">
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${state.total ? Math.max(8, (100 * state.done) / state.total) : 8}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">{state.total ? t("progress", { done: state.done, total: state.total }) : t("layout")}</p>
            </>
          )}
          {state.phase === "ready" && (
            <>
              <CheckCircle2 aria-hidden className="mx-auto size-11 text-brand-600" />
              <p className="mt-3 font-semibold">{state.delivered ? t("downloaded") : t("ready")}</p>
              <p className="mt-1 text-xs text-muted" dir="auto">{state.name.replace(/\.pdf$/i, "")}</p>
              <div className="mt-5 grid gap-2">
                <button type="button" onClick={() => onDeliver(state.blob, state.name)} className={buttonClass(state.delivered ? "secondary" : "primary")}>
                  <FileDown aria-hidden className="size-4" />
                  {state.delivered ? t("again") : t("save")}
                </button>
                <button type="button" onClick={onClose} className={buttonClass("ghost")}>{t("close")}</button>
              </div>
            </>
          )}
          {state.phase === "error" && (
            <>
              <TriangleAlert aria-hidden className="mx-auto size-10 text-late" />
              <p className="mt-3 text-sm">{t("error")}</p>
              <button type="button" onClick={onClose} className={cn(buttonClass("secondary"), "mt-5 w-full")}>{t("close")}</button>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

/** الزرّان جنبًا إلى جنب. tone="dark" للأشرطة الداكنة. */
export function PrintButtons({
  title,
  prepare,
  disabled,
  tone = "light",
  className,
}: {
  title: string | (() => string);
  prepare?: () => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const t = useTranslations("common.print");
  const { print, savePdf, busy, overlay } = usePrintActions({ title, prepare });
  const dark = tone === "dark";
  const cls = (primary: boolean) =>
    dark
      ? cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold disabled:opacity-50", primary ? "bg-white text-brand-900 hover:bg-brand-50" : "text-white ring-1 ring-white/50 hover:bg-white/10")
      : buttonClass(primary ? "primary" : "secondary");
  return (
    <div className={cn("flex flex-wrap gap-2 print:hidden", className)}>
      <button type="button" onClick={print} disabled={disabled} className={cls(true)}>
        <Printer aria-hidden className="size-4" />
        {t("print")}
      </button>
      <button type="button" onClick={savePdf} disabled={disabled || busy} className={cls(false)}>
        <FileDown aria-hidden className="size-4" />
        {t("pdf")}
      </button>
      {overlay}
    </div>
  );
}
