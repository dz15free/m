"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useAuth } from "@/features/auth/auth-provider";
import { parseAcademicYearId } from "@/shared/academic-year";
import { getTeacherBundle, saveProfileAndSchool } from "./repo";
import {
  ProfileFields,
  SchoolFields,
  validateProfile,
  validateSchool,
  type Errors,
  type ProfileDraft,
  type SchoolDraft,
} from "./profile-fields";

type Loaded = { schoolId: string; yearId: string; profile: ProfileDraft; school: SchoolDraft };

export function SettingsForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const uid = auth.status === "signedIn" ? auth.user.uid : null;

  const [data, setData] = useState<Loaded | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!uid) return;
    getTeacherBundle(uid).then((bundle) => {
      if (!bundle) return;
      const { profile, school } = bundle;
      setData({
        schoolId: profile.primarySchoolId,
        yearId: profile.activeYearId,
        profile: {
          firstName: profile.firstName,
          lastName: profile.lastName,
          stage: profile.stage,
          gradeId: profile.gradeId,
          gradeCustom: profile.gradeCustom ?? "",
        },
        school: {
          name: school?.name ?? "",
          wilayaCode: school?.wilayaCode ?? profile.wilayaCode,
          commune: school?.commune ?? "",
          directorate: school?.directorate ?? profile.directorate,
        },
      });
    });
  }, [uid]);

  if (!data || !uid) {
    return (
      <div role="status" className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !uid) return;
    const errs = { ...validateProfile(data.profile), ...validateSchool(data.school) };
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState("saving");
    try {
      await saveProfileAndSchool(
        uid,
        data.schoolId,
        {
          ...data.profile,
          wilayaCode: data.school.wilayaCode,
          directorate: data.school.directorate,
        },
        { ...data.school, stage: data.profile.stage },
      );
      setState("saved");
      // الصفحات الأخرى (الأقسام، الوثائق) تقرأ الملف من الكاش المشترك
      await queryClient.invalidateQueries({ queryKey: ["teacher", uid] });
    } catch {
      setState("error");
    }
  }

  const change = () => state !== "idle" && setState("idle");

  return (
    <form onSubmit={save} noValidate className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">{t("profileSection")}</h2>
        <ProfileFields
          value={data.profile}
          onChange={(profile) => {
            setData({ ...data, profile });
            change();
          }}
          errors={errors}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">{t("schoolSection")}</h2>
        <SchoolFields
          value={data.school}
          onChange={(school) => {
            setData({ ...data, school });
            change();
          }}
          errors={errors}
        />
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t("yearSection")}</p>
          <p className="text-lg font-bold" dir="ltr">
            {parseAcademicYearId(data.yearId)?.label ?? data.yearId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{tc("language")}</span>
          <LocaleSwitcher key={locale} />
        </div>
      </Card>

      <div data-sticky-bar className="sticky bottom-24 z-10 flex items-center gap-3 lg:bottom-6">
        <button type="submit" disabled={state === "saving"} className={buttonClass("primary", "lg", "shadow-lg")}>
          {state === "saving" && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
          {t("save")}
        </button>
        {state === "saved" && (
          <span role="status" className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-brand-700 shadow-card">
            <CircleCheck aria-hidden className="size-4" />
            {t("saved")}
          </span>
        )}
        {state === "error" && (
          <span role="alert" className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800">
            {t("error")}
          </span>
        )}
      </div>
    </form>
  );
}
