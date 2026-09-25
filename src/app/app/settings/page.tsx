import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";
import { SettingsForm } from "@/features/profile/settings-form";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-bold">
        <Settings aria-hidden className="size-7 text-brand-700" />
        {t("title")}
      </h1>
      <SettingsForm />
    </div>
  );
}
