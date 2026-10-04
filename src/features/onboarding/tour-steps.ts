/* جولة التعريف الأولى: الخطوات ومنطق اختيارها (بلا واجهة، قابل للاختبار). */

import type { InstallState } from "@/features/pwa/install-store";

export type TourStepKey =
  | "welcome"
  | "today"
  | "classes"
  | "schedule"
  | "session"
  | "logbook"
  | "lessons"
  | "library"
  | "documents"
  | "support"
  | "install"
  | "finish";

/** الجهاز لاختيار طريقة التثبيت المناسبة. */
export type Device = "android" | "ios" | "desktop";
export type InstallMode = "prompt" | "ios" | "android" | "desktop";

export type TourStep = {
  key: TourStepKey;
  /** عنصر الصفحة المُبرَز (data-tour)؛ بلا هدف ⇐ بطاقة في الوسط */
  target?: string;
  /** هدف بديل حين يكون الأصلي مخفيًا (على الهاتف: داخل «المزيد») */
  fallback?: string;
};

export const TOUR_STEPS: TourStep[] = [
  { key: "welcome" },
  { key: "today", target: "today" },
  { key: "classes", target: "classes" },
  { key: "schedule", target: "schedule", fallback: "more" },
  { key: "session", target: "session" },
  { key: "logbook", target: "logbook", fallback: "more" },
  { key: "lessons", target: "lessons", fallback: "more" },
  { key: "library", target: "library" },
  { key: "documents", target: "documents", fallback: "more" },
  { key: "support", target: "support" },
  { key: "install" },
  { key: "finish" },
];

/** الخطوات المعروضة: خطوة التثبيت تُحذف إن كان التطبيق مثبّتًا (أو مفتوحًا منه). */
export function tourSteps(install: InstallState): TourStep[] {
  return TOUR_STEPS.filter((s) => s.key !== "install" || install !== "installed");
}

export function deviceOf(ua: string, touchPoints = 0): Device {
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** كيف يثبّت: نافذة المتصفح المباشرة إن توفّرت، وإلا خطوات تناسب جهازه. */
export function installMode(install: InstallState, device: Device): InstallMode {
  if (install === "prompt") return "prompt";
  if (device === "ios") return "ios";
  return device === "android" ? "android" : "desktop";
}

export const tourDoneKey = (uid: string) => `prof-tour-done:${uid}`;
/** حدث لإعادة الجولة يدويًا (من الإعدادات). */
export const REPLAY_TOUR = "prof:replay-tour";
