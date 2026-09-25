import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Award, CalendarX, FileText, IdCard, Mail, Signpost } from "lucide-react";
import { TEMPLATES } from "@/features/documents/templates";

const ICONS = { certificates: Award, absences: CalendarX, convocation: Mail, classSign: Signpost, nameCards: IdCard } as const;

export async function generateMetadata() {
  const t = await getTranslations("documents");
  return { title: t("title") };
}

export default async function DocumentsPage() {
  const t = await getTranslations("documents");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <FileText aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((id) => {
          const Icon = ICONS[id];
          return (
            <li key={id}>
              <Link href={`/app/documents/${id}`} className="flex h-full items-start gap-4 rounded-card bg-surface p-5 shadow-card transition-shadow hover:shadow-md">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block font-semibold">{t(`templates.${id}.title`)}</span>
                  <span className="block text-sm text-muted">{t(`templates.${id}.body`)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
