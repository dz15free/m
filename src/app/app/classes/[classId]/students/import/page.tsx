import { getTranslations } from "next-intl/server";
import { ImportWizard } from "@/features/import/import-wizard";

export async function generateMetadata() {
  const t = await getTranslations("import");
  return { title: t("title") };
}

export default async function ImportStudentsPage({ params }: PageProps<"/app/classes/[classId]/students/import">) {
  const { classId } = await params;
  return <ImportWizard classId={classId} />;
}
