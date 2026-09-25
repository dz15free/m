"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FolderCog } from "lucide-react";
import { useIsEditor } from "./content-editor";

/** رابط «إدارة المحتوى» لا يظهر إلا للمحرّرين (والحماية الفعلية في القواعد والخادم). */
export function EditorLink() {
  const t = useTranslations("library");
  if (!useIsEditor()) return null;
  return (
    <Link href="/app/manage/content" className="flex min-h-14 items-center gap-4 rounded-card bg-surface px-4 shadow-card transition-colors hover:bg-brand-50">
      <span className="grid size-10 place-items-center rounded-xl bg-accent-100 text-accent-700">
        <FolderCog aria-hidden className="size-5" />
      </span>
      <span className="flex-1 font-medium">{t("manage")}</span>
    </Link>
  );
}
