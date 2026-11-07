import { getTranslations } from "next-intl/server";
import { SavedMemoView } from "@/features/ai-memo/saved-memos";

export async function generateMetadata() {
  const t = await getTranslations("aiMemo.saved");
  return { title: t("title") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SavedMemoView id={id} />;
}
