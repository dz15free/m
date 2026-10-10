import { getTranslations } from "next-intl/server";
import { CurriculumPublisher } from "@/features/admin/curriculum-publisher";

export default async function Page() {
  const t = await getTranslations("admin.curriculum");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CurriculumPublisher />
    </div>
  );
}
