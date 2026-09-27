"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useUid } from "@/features/classes/hooks";
import { FEEDBACK_REASONS, saveFeedback, type Feedback, type FeedbackReason } from "./feedback";

/** «ما رأيك في المنصة؟» — تقييم بالنجوم وأسباب جاهزة وتعليق حر. يصل إلى لوحة الأدمن. */
export function FeedbackForm({ context }: { context: Feedback["context"] }) {
  const t = useTranslations("feedback");
  const locale = useLocale() as "ar" | "fr";
  const uid = useUid();
  const [rating, setRating] = useState(0);
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 rounded-card bg-green-50 p-4 font-medium text-green-800">
        <CheckCircle2 aria-hidden className="size-5" />
        {t("thanks")}
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || rating < 1) return;
    setState("busy");
    try {
      await saveFeedback(uid, { rating, reasons, comment, context, locale });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t("rating")}</legend>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t("stars", { n })}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              className="grid size-11 place-items-center rounded-full hover:bg-amber-50"
            >
              <Star aria-hidden className={cn("size-7", n <= rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">{t("reasonsTitle")}</legend>
        <div className="flex flex-wrap gap-2">
          {FEEDBACK_REASONS.map((r) => {
            const on = reasons.includes(r);
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setReasons(on ? reasons.filter((x) => x !== r) : [...reasons, r])}
                className={cn(
                  "min-h-10 rounded-full border px-3 text-sm",
                  on ? "border-brand-600 bg-brand-50 font-semibold text-brand-900" : "border-line text-ink hover:bg-canvas",
                )}
              >
                {t(`reasons.${r}`)}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">{t("comment")}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          dir="auto"
          placeholder={t("commentHint")}
          className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
        />
      </label>
      {state === "error" && <p role="alert" className="text-sm text-red-700">{t("error")}</p>}
      <button type="submit" disabled={rating < 1 || state === "busy"} className={buttonClass("secondary")}>
        {state === "busy" && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {t("send")}
      </button>
    </form>
  );
}
