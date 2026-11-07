"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle, Save } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { saveMemo, sheetHtml } from "./saved";

/** حفظ الورقة كما هي الآن في «مذكراتي» (جديدة، أو تحديث مذكرة محفوظة بـ id). */
export function SaveMemoButton({
  id,
  meta,
  onSaved,
}: {
  id?: string;
  meta: { title: string; level: string; subject: string; lang: string };
  onSaved?: (id: string) => void;
}) {
  const t = useTranslations("aiMemo.saved");
  const qc = useQueryClient();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  async function save() {
    setState("saving");
    try {
      const saved = await saveMemo({
        ...meta,
        ...(id ? { id } : {}),
        html: sheetHtml(),
      });
      setState("saved");
      onSaved?.(saved);
      await qc.invalidateQueries({ queryKey: ["savedMemos"] });
    } catch (e) {
      setError(
        e instanceof Error && e.message === "too many"
          ? t("tooMany")
          : t("error"),
      );
      setState("error");
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={state === "saving"}
        onClick={() => void save()}
        className={buttonClass("primary", "md")}
      >
        {state === "saving" ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : state === "saved" ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Save aria-hidden className="size-4" />
        )}
        {state === "saved" ? t("done") : id ? t("update") : t("save")}
      </button>
      {state === "error" && (
        <span className="text-sm text-red-700">{error}</span>
      )}
    </span>
  );
}
