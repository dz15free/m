"use client";

import { authedFetch } from "@/lib/firebase/api";
import { getFirebase } from "@/lib/firebase/client";

/* تفعيل إشعارات الهاتف (FCM Web Push). المفتاح العام VAPID قيمة عامة من Firebase
   (Cloud Messaging → Web Push certificates)؛ بدونه تبقى الميزة مخفية. */

const VAPID = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export type PushState = "off" | "unsupported" | "needsInstall" | "default" | "granted" | "denied";

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function getPushState(): PushState {
  if (typeof window === "undefined" || !VAPID) return "off";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // على iPhone لا تعمل الإشعارات إلا بعد تثبيت التطبيق على الشاشة الرئيسية
  if (ios && !standalone()) return "needsInstall";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission as PushState;
}

async function register(locale: string) {
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) throw new Error("unsupported");
  const token = await getToken(getMessaging(getFirebase().app), { vapidKey: VAPID, serviceWorkerRegistration: reg });
  if (!token) throw new Error("no token");
  const res = await authedFetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, locale }),
  });
  if (!res.ok) throw new Error(`register ${res.status}`);
}

/** يطلب الإذن ثم يسجّل الجهاز. يُرجع الحالة الجديدة. */
export async function enablePush(locale: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushState;
  await register(locale);
  return "granted";
}

let refreshed = false;
/** إن كان الإذن ممنوحًا: تحديث الرمز بصمت مرة في كل جلسة (الرموز تتجدّد). */
export function refreshPush(locale: string) {
  if (refreshed || getPushState() !== "granted") return;
  refreshed = true;
  void register(locale).catch(() => {});
}
