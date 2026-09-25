"use client";

import { useLocale, useTranslations } from "next-intl";
import { Field, SelectField } from "@/components/ui/field";
import { STAGES, gradesFor, type Stage } from "@/shared/dz/education";
import { WILAYAS, wilayaByCode } from "@/shared/dz/wilayas";
import { defaultDirectorate } from "./types";

/* حقول الملف المهني والمؤسسة — مشتركة بين معالج البداية وصفحة الإعدادات. */

export type ProfileDraft = {
  firstName: string;
  lastName: string;
  stage: Stage;
  gradeId: string;
  gradeCustom: string;
};

export type SchoolDraft = {
  name: string;
  wilayaCode: number; // 0 = لم تُختر بعد
  commune: string;
  directorate: string;
};

export type Errors = Partial<Record<string, true>>;

export function validateProfile(p: ProfileDraft): Errors {
  const e: Errors = {};
  if (!p.firstName.trim()) e.firstName = true;
  if (!p.lastName.trim()) e.lastName = true;
  if (!p.gradeId) e.gradeId = true;
  if (p.gradeId === "other" && !p.gradeCustom.trim()) e.gradeCustom = true;
  return e;
}

export function validateSchool(s: SchoolDraft): Errors {
  const e: Errors = {};
  if (s.name.trim().length < 2) e.name = true;
  if (!s.wilayaCode) e.wilayaCode = true;
  if (!s.directorate.trim()) e.directorate = true;
  return e;
}

export function ProfileFields({
  value,
  onChange,
  errors,
  showStage = true,
}: {
  value: ProfileDraft;
  onChange: (next: ProfileDraft) => void;
  errors: Errors;
  showStage?: boolean;
}) {
  const t = useTranslations("profile");
  const locale = useLocale();
  const set = <K extends keyof ProfileDraft>(key: K, v: ProfileDraft[K]) => onChange({ ...value, [key]: v });
  const req = (key: string) => (errors[key] ? t("required") : null);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("lastName")}
          value={value.lastName}
          onChange={(e) => set("lastName", e.target.value)}
          autoComplete="family-name"
          maxLength={60}
          error={req("lastName")}
        />
        <Field
          label={t("firstName")}
          value={value.firstName}
          onChange={(e) => set("firstName", e.target.value)}
          autoComplete="given-name"
          maxLength={60}
          error={req("firstName")}
        />
      </div>

      {showStage && (
        <SelectField
          label={t("stage")}
          value={value.stage}
          // تغيير الطور يعيد اختيار الرتبة (رتب كل طور مختلفة)
          onChange={(e) => onChange({ ...value, stage: e.target.value as Stage, gradeId: "" })}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {t(`stages.${s}`)}
            </option>
          ))}
        </SelectField>
      )}

      <SelectField label={t("grade")} value={value.gradeId} onChange={(e) => set("gradeId", e.target.value)} error={req("gradeId")}>
        <option value="" disabled>
          —
        </option>
        {gradesFor(value.stage).map((g) => (
          <option key={g.id} value={g.id}>
            {locale === "fr" ? g.fr : g.ar}
          </option>
        ))}
        <option value="other">{t("gradeOther")}</option>
      </SelectField>

      {value.gradeId === "other" && (
        <Field
          label={t("gradeCustom")}
          value={value.gradeCustom}
          onChange={(e) => set("gradeCustom", e.target.value)}
          maxLength={80}
          error={req("gradeCustom")}
        />
      )}
    </div>
  );
}

export function SchoolFields({
  value,
  onChange,
  errors,
}: {
  value: SchoolDraft;
  onChange: (next: SchoolDraft) => void;
  errors: Errors;
}) {
  const t = useTranslations("profile");
  const locale = useLocale() as "ar" | "fr";
  const set = <K extends keyof SchoolDraft>(key: K, v: SchoolDraft[K]) => onChange({ ...value, [key]: v });
  const req = (key: string) => (errors[key] ? t("required") : null);

  function changeWilaya(code: number) {
    const previousDefault = defaultDirectorate(wilayaByCode(value.wilayaCode)?.[locale] ?? "", locale);
    const untouched = !value.directorate.trim() || value.directorate === previousDefault;
    onChange({
      ...value,
      wilayaCode: code,
      // نقترح المديرية تلقائيًا ما لم يعدّلها الأستاذ بنفسه
      directorate: untouched ? defaultDirectorate(wilayaByCode(code)?.[locale] ?? "", locale) : value.directorate,
    });
  }

  return (
    <div className="space-y-4">
      <Field
        label={t("schoolName")}
        placeholder={t("schoolNamePlaceholder")}
        value={value.name}
        onChange={(e) => set("name", e.target.value)}
        maxLength={120}
        error={req("name")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t("wilaya")}
          value={value.wilayaCode || ""}
          onChange={(e) => changeWilaya(Number(e.target.value))}
          error={req("wilayaCode")}
        >
          <option value="" disabled>
            {t("wilayaPlaceholder")}
          </option>
          {WILAYAS.map((w) => (
            <option key={w.code} value={w.code}>
              {String(w.code).padStart(2, "0")} — {w[locale]}
            </option>
          ))}
        </SelectField>
        <Field label={t("commune")} value={value.commune} onChange={(e) => set("commune", e.target.value)} maxLength={80} />
      </div>
      <Field
        label={t("directorate")}
        hint={t("directorateHint")}
        value={value.directorate}
        onChange={(e) => set("directorate", e.target.value)}
        maxLength={120}
        error={req("directorate")}
      />
    </div>
  );
}
