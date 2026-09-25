import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export async function generateMetadata() {
  const t = await getTranslations("onboarding");
  return { title: t("title") };
}

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
