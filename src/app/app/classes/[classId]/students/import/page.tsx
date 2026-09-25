import { getTranslations } from "next-intl/server";
import { FileUp } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* الاستيراد الذكي (صورة، PDF، Excel، لصق) — المرحلة 7. */
export default async function ImportStudentsPage({ params }: PageProps<"/app/classes/[classId]/students/import">) {
  const { classId } = await params;
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold">
        <FileUp aria-hidden className="size-7 text-brand-700" />
        {t("students.import")}
      </h1>
      <Card className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="font-semibold">{t("common.comingSoonTitle")}</p>
        <p className="max-w-sm text-sm text-muted">{t("students.importHint")}</p>
        <LinkButton href={`/app/classes/${classId}/students`} variant="secondary" className="mt-2">
          {t("students.title")}
        </LinkButton>
      </Card>
    </div>
  );
}
