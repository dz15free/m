import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Construction } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NAV, type NavKey } from "@/components/layout/nav-items";

/* صفحات مؤقتة لأقسام التطبيق حتى تُبنى في مراحلها.
   كل قسم يُنشأ لاحقًا كمجلّد مستقل (مثل app/app/classes/) فيأخذ الأولوية
   على هذا المسار الديناميكي تلقائيًا، دون حذف أو تعديل هنا. */
const SECTIONS = ["classes", "session", "library", "schedule", "logbook", "planning", "documents", "billing"] as const satisfies readonly NavKey[];
type Section = (typeof SECTIONS)[number];

const isSection = (value: string): value is Section => (SECTIONS as readonly string[]).includes(value);

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/app/[section]">) {
  const { section } = await params;
  if (!isSection(section)) return {};
  const t = await getTranslations("nav");
  return { title: t(section) };
}

export default async function SectionPlaceholder({ params }: PageProps<"/app/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();

  const t = await getTranslations();
  const Icon = NAV[section].icon;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold">
        <Icon aria-hidden className="size-7 text-brand-700" />
        {t(`nav.${section}`)}
      </h1>
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <Construction aria-hidden className="size-7" />
        </span>
        <p className="font-semibold">{t("common.comingSoonTitle")}</p>
        <p className="max-w-sm text-sm text-muted">{t("common.comingSoonBody")}</p>
        <LinkButton href="/app" variant="secondary" className="mt-2">
          {t("common.backToToday")}
        </LinkButton>
      </Card>
    </div>
  );
}
