import { getTranslations } from "next-intl/server";
import { ContentAdminList } from "@/features/library/content-editor";

export default async function Page() {
  const t = await getTranslations("contentAdmin");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <ContentAdminList />
    </div>
  );
}
