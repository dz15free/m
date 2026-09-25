import { getTranslations } from "next-intl/server";
import { ContentAdminList } from "@/features/library/content-editor";

export async function generateMetadata() {
  const t = await getTranslations("contentAdmin");
  return { title: t("title") };
}

export default async function ContentAdminPage() {
  const t = await getTranslations("contentAdmin");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ContentAdminList />
    </div>
  );
}
