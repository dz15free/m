"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenText, CalendarCheck2, ChevronLeft, ChevronRight, GraduationCap, LoaderCircle, School, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { completeOnboarding } from "@/features/profile/repo";
import {
  ProfileFields,
  SchoolFields,
  validateProfile,
  validateSchool,
  type Errors,
  type ProfileDraft,
  type SchoolDraft,
} from "@/features/profile/profile-fields";
import type { PresetType } from "@/features/profile/types";
import { gradeLabel, type Stage } from "@/shared/dz/education";
import { wilayaByCode } from "@/shared/dz/wilayas";
import { academicYearFor } from "@/shared/academic-year";
import { cn } from "@/lib/utils/cn";

const PRESETS: { id: PresetType; icon: typeof Users; stage: Stage }[] = [
  { id: "primaryGeneralist", icon: Users, stage: "primary" },
  { id: "primarySubject", icon: BookOpenText, stage: "primary" },
  { id: "middleSecondary", icon: GraduationCap, stage: "middle" },
];

const STEPS = ["preset", "profile", "school", "year"] as const;
type Step = (typeof STEPS)[number];

/** يقسم الاسم المعروض إلى اسم ولقب كاقتراح أولي (الأستاذ يصحّحه). */
function splitName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const tp = useTranslations("profile");
  const locale = useLocale() as "ar" | "fr";
  const auth = useAuth();
  const user = auth.status === "signedIn" ? auth.user : null;

  const [step, setStep] = useState<Step>("preset");
  const [preset, setPreset] = useState<PresetType | null>(null);
  const [profile, setProfile] = useState<ProfileDraft>(() => ({
    ...splitName(user?.displayName),
    stage: "primary",
    gradeId: "",
    gradeCustom: "",
  }));
  const [school, setSchool] = useState<SchoolDraft>({ name: "", wilayaCode: 0, commune: "", directorate: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const year = academicYearFor(new Date());
  const index = STEPS.indexOf(step);
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;

  function choosePreset(p: (typeof PRESETS)[number]) {
    setPreset(p.id);
    setProfile((prev) => (prev.stage === p.stage ? prev : { ...prev, stage: p.stage, gradeId: "" }));
    setStep("profile");
  }

  function next() {
    const e = step === "profile" ? validateProfile(profile) : step === "school" ? validateSchool(school) : {};
    setErrors(e);
    if (Object.keys(e).length) return;
    const following = STEPS[index + 1];
    if (following) setStep(following);
  }

  async function finish() {
    if (!user || !preset) return;
    setSaving(true);
    setSaveError(false);
    try {
      await completeOnboarding(user.uid, {
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          stage: profile.stage,
          gradeId: profile.gradeId,
          gradeCustom: profile.gradeCustom,
          wilayaCode: school.wilayaCode,
          directorate: school.directorate,
          presetType: preset,
        },
        school: { ...school, stage: profile.stage },
        year: { id: year.id, label: year.label },
      });
      auth.markOnboarded(); // RequireAuth يحوّل إلى /app
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  const heading = {
    preset: { title: t("preset.title"), subtitle: t("preset.subtitle") },
    profile: { title: t("profileStep.title"), subtitle: t("profileStep.subtitle") },
    school: { title: t("schoolStep.title"), subtitle: t("schoolStep.subtitle") },
    year: { title: t("yearStep.title"), subtitle: t("yearStep.subtitle") },
  }[step];

  return (
    <div className="space-y-6">
      {/* التقدّم */}
      <div>
        <p className="text-sm font-medium text-muted">{t("step", { current: index + 1, total: STEPS.length })}</p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= index ? "bg-brand-600" : "bg-line")} />
          ))}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{heading.title}</h1>
        <p className="mt-1 text-muted">{heading.subtitle}</p>
      </div>

      {step === "preset" && (
        <ul className="space-y-3">
          {PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => choosePreset(p)}
                aria-pressed={preset === p.id}
                className={cn(
                  "flex w-full items-start gap-4 rounded-card bg-surface p-4 text-start shadow-card ring-2 ring-transparent transition",
                  "hover:ring-brand-200 aria-pressed:ring-brand-600",
                )}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                  <p.icon aria-hidden className="size-6" />
                </span>
                <span>
                  <span className="block font-semibold">{t(`preset.${p.id}.title`)}</span>
                  <span className="mt-0.5 block text-sm text-muted">{t(`preset.${p.id}.body`)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === "profile" && (
        <ProfileFields
          value={profile}
          onChange={setProfile}
          errors={errors}
          showStage={preset === "middleSecondary"}
        />
      )}

      {step === "school" && <SchoolFields value={school} onChange={setSchool} errors={errors} />}

      {step === "year" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-card bg-brand-50 p-4">
            <CalendarCheck2 aria-hidden className="size-8 text-brand-700" />
            <div>
              <p className="text-sm text-muted">{t("yearStep.yearLabel")}</p>
              <p className="text-2xl font-bold text-brand-900" dir="ltr">
                {year.label}
              </p>
              <p className="text-xs text-muted">{t("yearStep.yearHint")}</p>
            </div>
          </div>
          <dl className="divide-y divide-line rounded-card bg-surface text-sm shadow-card">
            {[
              [tp("lastName") + " / " + tp("firstName"), `${profile.lastName} ${profile.firstName}`],
              [tp("grade"), gradeLabel(profile.stage, profile.gradeId, profile.gradeCustom, locale)],
              [tp("schoolName"), school.name],
              [tp("wilaya"), wilayaByCode(school.wilayaCode)?.[locale] ?? ""],
              [tp("directorate"), school.directorate],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-3 px-4 py-3">
                <dt className="w-32 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {saveError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {t("error")}
            </p>
          )}
        </div>
      )}

      {/* أزرار التنقّل — في أسفل الشاشة على الهاتف، قريبة من الإبهام */}
      {step !== "preset" && (
        <div data-sticky-bar className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-surface/95 px-4 py-3 pb-safe backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setStep(STEPS[index - 1] ?? "preset");
            }}
            disabled={saving}
            className={buttonClass("secondary", "lg")}
          >
            <Back aria-hidden className="size-5" />
            {t("back")}
          </button>
          {step === "year" ? (
            <button type="button" onClick={finish} disabled={saving} className={buttonClass("primary", "lg", "flex-1")}>
              {saving ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <School aria-hidden className="size-5" />}
              {saving ? t("saving") : t("finish")}
            </button>
          ) : (
            <button type="button" onClick={next} className={buttonClass("primary", "lg", "flex-1")}>
              {t("next")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
