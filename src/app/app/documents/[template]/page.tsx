import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocumentBuilder } from "@/features/documents/document-builder";
import { TEMPLATES, type TemplateId } from "@/features/documents/templates";

const isTemplate = (v: string): v is TemplateId => (TEMPLATES as readonly string[]).includes(v);

export async function generateMetadata({ params }: PageProps<"/app/documents/[template]">) {
  const { template } = await params;
  const t = await getTranslations("documents");
  return { title: isTemplate(template) ? t(`templates.${template}.title`) : t("title") };
}

export default async function DocumentPage({ params }: PageProps<"/app/documents/[template]">) {
  const { template } = await params;
  if (!isTemplate(template)) notFound();
  const t = await getTranslations("documents");
  const Back = (await getLocale()) === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className="space-y-3">
      <div className="print:hidden">
        <Link href="/app/documents" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-700">
          <Back aria-hidden className="size-4" />
          {t("back")}
        </Link>
        <h1 className="text-2xl font-bold">{t(`templates.${template}.title`)}</h1>
      </div>
      <DocumentBuilder template={template} />
    </div>
  );
}
