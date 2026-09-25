"use client";

/* حدث التثبيت (Android/Chrome) يصل مرة واحدة مبكرًا؛ نحفظه هنا ليستعمله أي زر لاحقًا. */

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initInstallStore() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export type InstallState = "installed" | "prompt" | "ios" | "manual";

export function getInstallState(): InstallState {
  if (typeof window === "undefined") return "installed";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (installed || standalone) return "installed";
  if (deferred) return "prompt";
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "manual";
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}
