import { getTranslations } from "next-intl/server";
import { NewClassesForm } from "@/features/classes/new-classes-form";

export async function generateMetadata() {
  const t = await getTranslations("classes.new");
  return { title: t("title") };
}

export default async function NewClassesPage() {
  const t = await getTranslations("classes.new");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-muted">{t("subtitle")}</p>
      </div>
      <NewClassesForm />
    </div>
  );
}
