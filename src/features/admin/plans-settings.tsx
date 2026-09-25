"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, SelectField } from "@/components/ui/field";
import { getAppConfig } from "@/features/billing/repo";
import { SiteBannerPreview } from "@/features/pwa/site-banner";
import type { AppConfig, Banner, Plan } from "@/shared/billing/plans";
import { getPlansAdmin, saveAppConfig, savePlan } from "./repo";

function SaveButton({ state, onClick, label }: { state: "idle" | "saving" | "saved" | "error"; onClick: () => void; label: string }) {
  const t = useTranslations("admin.plans");
  return (
    <button type="button" onClick={onClick} disabled={state === "saving"} className={buttonClass("primary")}>
      {state === "saving" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : state === "saved" ? <Check aria-hidden className="size-4" /> : null}
      {state === "saved" ? t("saved") : label}
    </button>
  );
}

// ── الخطط والأسعار ──

export function AdminPlans() {
  const ta = useTranslations("admin");
  const plans = useQuery({ queryKey: ["adminPlans"], queryFn: getPlansAdmin });
  const config = useQuery({ queryKey: ["appConfig"], queryFn: getAppConfig });
  if (!plans.data || !config.data) {
    return (
      <div className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.plans")}</h1>
      <TrialCard initial={config.data.trialDays ?? 7} />
      {plans.data.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </div>
  );
}

function TrialCard({ initial }: { initial: number }) {
  const t = useTranslations("admin.plans");
  const queryClient = useQueryClient();
  const [days, setDays] = useState(String(initial));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <Card className="flex flex-wrap items-end gap-3">
      <Field label={t("trialDays")} inputMode="numeric" dir="ltr" value={days} onChange={(e) => (setDays(e.target.value), setState("idle"))} className="w-56" />
      <SaveButton
        state={state}
        label={t("save")}
        onClick={async () => {
          setState("saving");
          const n = Math.min(90, Math.max(0, Math.round(Number(days)) || 0));
          await saveAppConfig({ trialDays: n }).then(() => setState("saved"), () => setState("error"));
          await queryClient.invalidateQueries({ queryKey: ["appConfig"] });
        }}
      />
    </Card>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const t = useTranslations("admin.plans");
  const queryClient = useQueryClient();
  const [p, setP] = useState<Plan>(plan);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (patch: Partial<Plan>) => {
    setP({ ...p, ...patch });
    setState("idle");
  };
  const free = p.id === "free";
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">{free ? t("free") : t("premium")} <span className="text-sm font-normal text-muted" dir="ltr">({p.id})</span></h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t("name")} (ar)`} value={p.name.ar} onChange={(e) => set({ name: { ...p.name, ar: e.target.value } })} />
        <Field label={`${t("name")} (fr)`} dir="ltr" value={p.name.fr} onChange={(e) => set({ name: { ...p.name, fr: e.target.value } })} />
        <Field label={`${t("description")} (ar)`} value={p.description?.ar ?? ""} onChange={(e) => set({ description: { ...p.description, ar: e.target.value } })} />
        <Field label={`${t("description")} (fr)`} dir="ltr" value={p.description?.fr ?? ""} onChange={(e) => set({ description: { ...p.description, fr: e.target.value } })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {!free && <Field label={t("price")} inputMode="numeric" dir="ltr" value={String(p.priceDzd)} onChange={(e) => set({ priceDzd: Math.max(0, Math.round(Number(e.target.value)) || 0) })} />}
        {!free && <Field label={t("days")} inputMode="numeric" dir="ltr" value={String(p.durationDays)} onChange={(e) => set({ durationDays: Math.max(1, Math.round(Number(e.target.value)) || 1) })} />}
        <Field label={t("maxClasses")} inputMode="numeric" dir="ltr" value={String(p.limits.maxClasses)} onChange={(e) => set({ limits: { maxClasses: Math.max(1, Math.round(Number(e.target.value)) || 1) } })} />
      </div>
      {!free && (
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={p.active} onChange={(e) => set({ active: e.target.checked })} className="size-5 accent-brand-700" />{t("active")}</label>
          <label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={p.trialEligible} onChange={(e) => set({ trialEligible: e.target.checked })} className="size-5 accent-brand-700" />{t("trialEligible")}</label>
        </div>
      )}
      <SaveButton
        state={state}
        label={t("save")}
        onClick={async () => {
          setState("saving");
          await savePlan(p).then(() => setState("saved"), () => setState("error"));
          await queryClient.invalidateQueries({ queryKey: ["plans"] });
        }}
      />
    </Card>
  );
}

// ── الشريط والتواصل ──

const emptyBanner: Banner = { enabled: false, text: { ar: "", fr: "" }, link: "", tone: "info", version: 0 };

export function AdminSettings() {
  const ta = useTranslations("admin");
  const config = useQuery({ queryKey: ["appConfig"], queryFn: getAppConfig });
  if (!config.data) {
    return (
      <div className="grid place-items-center py-16">
        <LoaderCircle aria-hidden className="size-8 animate-spin text-brand-700" />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.settings")}</h1>
      <BannerCard initial={config.data.banner ?? emptyBanner} />
      <ContactCard initial={config.data.contact ?? {}} />
    </div>
  );
}

function BannerCard({ initial }: { initial: Banner }) {
  const t = useTranslations("admin.settings");
  const queryClient = useQueryClient();
  const [b, setB] = useState<Banner>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (patch: Partial<Banner>) => {
    setB({ ...b, ...patch });
    setState("idle");
  };
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">{t("banner")}</h2>
      <label className="flex min-h-10 items-center gap-2 font-medium">
        <input type="checkbox" checked={b.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="size-5 accent-brand-700" />
        {t("enabled")}
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("textAr")} maxLength={200} value={b.text.ar} onChange={(e) => set({ text: { ...b.text, ar: e.target.value } })} />
        <Field label={t("textFr")} dir="ltr" maxLength={200} value={b.text.fr} onChange={(e) => set({ text: { ...b.text, fr: e.target.value } })} />
        <Field label={t("link")} dir="ltr" maxLength={300} value={b.link} onChange={(e) => set({ link: e.target.value })} />
        <SelectField label={t("tone")} value={b.tone} onChange={(e) => set({ tone: e.target.value as Banner["tone"] })}>
          {(["info", "success", "warning", "promo"] as const).map((k) => (
            <option key={k} value={k}>{t(`tones.${k}`)}</option>
          ))}
        </SelectField>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("preview")}</p>
        <div className="overflow-hidden rounded-xl">
          <SiteBannerPreview banner={{ ...b, enabled: true }} />
        </div>
      </div>
      <SaveButton
        state={state}
        label={t("save")}
        onClick={async () => {
          setState("saving");
          // نسخة جديدة: تظهر حتى لمن أغلق الإعلان السابق
          await saveAppConfig({ banner: { ...b, link: b.link.trim(), version: Date.now() } }).then(() => setState("saved"), () => setState("error"));
          await queryClient.invalidateQueries({ queryKey: ["appConfig"] });
        }}
      />
    </Card>
  );
}

function ContactCard({ initial }: { initial: NonNullable<AppConfig["contact"]> }) {
  const t = useTranslations("admin.settings");
  const queryClient = useQueryClient();
  const [c, setC] = useState({ whatsapp: initial.whatsapp ?? "", email: initial.email ?? "", hours: { ar: initial.hours?.ar ?? "", fr: initial.hours?.fr ?? "" } });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">{t("contact")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("whatsapp")} dir="ltr" inputMode="tel" value={c.whatsapp} onChange={(e) => (setC({ ...c, whatsapp: e.target.value }), setState("idle"))} />
        <Field label={t("email")} dir="ltr" type="email" value={c.email} onChange={(e) => (setC({ ...c, email: e.target.value }), setState("idle"))} />
        <Field label={t("hoursAr")} value={c.hours.ar} onChange={(e) => (setC({ ...c, hours: { ...c.hours, ar: e.target.value } }), setState("idle"))} />
        <Field label={t("hoursFr")} dir="ltr" value={c.hours.fr} onChange={(e) => (setC({ ...c, hours: { ...c.hours, fr: e.target.value } }), setState("idle"))} />
      </div>
      <SaveButton
        state={state}
        label={t("save")}
        onClick={async () => {
          setState("saving");
          await saveAppConfig({ contact: { whatsapp: c.whatsapp.replace(/[^\d]/g, ""), email: c.email.trim(), hours: c.hours } }).then(() => setState("saved"), () => setState("error"));
          await queryClient.invalidateQueries({ queryKey: ["appConfig"] });
        }}
      />
    </Card>
  );
}
