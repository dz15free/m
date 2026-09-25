import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { ClassesList } from "@/features/classes/classes-list";

export async function generateMetadata() {
  const t = await getTranslations("classes");
  return { title: t("title") };
}

export default async function ClassesPage() {
  const t = await getTranslations("classes");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-bold">
          <Users aria-hidden className="size-7 text-brand-700" />
          {t("title")}
        </h1>
        <LinkButton href="/app/classes/new">
          <Plus aria-hidden className="size-5" />
          {t("add")}
        </LinkButton>
      </div>
      <ClassesList />
    </div>
  );
}
