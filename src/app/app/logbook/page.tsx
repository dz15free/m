import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BookOpenCheck, ClipboardList, NotebookPen, Users } from "lucide-react";

const NOTEBOOKS = [
  { key: "daily", href: "/app/logbook/daily", icon: NotebookPen },
  { key: "training", href: "/app/logbook/training", icon: Users },
  { key: "prep", href: null, icon: BookOpenCheck },
  { key: "grades", href: null, icon: ClipboardList },
] as const;

export async function generateMetadata() {
  const t = await getTranslations("logbook");
  return { title: t("title") };
}

export default async function LogbookPage() {
  const t = await getTranslations("logbook");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <NotebookPen aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {NOTEBOOKS.map(({ key, href, icon: Icon }) => {
          const body = (
            <>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon aria-hidden className="size-6" />
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {t(`notebooks.${key}.title`)}
                  {!href && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-muted">{t("notebooks.soon")}</span>}
                </span>
                <span className="block text-sm text-muted">{t(`notebooks.${key}.body`)}</span>
              </span>
            </>
          );
          return (
            <li key={key}>
              {href ? (
                <Link href={href} className="flex h-full items-start gap-4 rounded-card bg-surface p-5 shadow-card transition-shadow hover:shadow-md">
                  {body}
                </Link>
              ) : (
                <div aria-disabled className="flex h-full items-start gap-4 rounded-card bg-surface/60 p-5 opacity-70 shadow-card">
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
