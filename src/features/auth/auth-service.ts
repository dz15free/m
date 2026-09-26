"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { clearIndexedDbPersistence, doc, getDoc, serverTimestamp, setDoc, terminate, updateDoc, waitForPendingWrites } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { Locale } from "@/i18n/config";

/* كل عمليات المصادقة في مكان واحد. الواجهة لا تستدعي Firebase مباشرة. */

function authFor(locale: Locale) {
  const { auth } = getFirebase();
  // رسائل Firebase (التأكيد، استعادة كلمة المرور) بلغة الأستاذ
  auth.languageCode = locale;
  return auth;
}

export async function signInWithGoogle(locale: Locale) {
  const auth = authFor(locale);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string }).code;
    // بعض المتصفحات وتطبيقات PWA تمنع النوافذ المنبثقة: ننتقل بإعادة التوجيه
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string, locale: Locale) {
  await signInWithEmailAndPassword(authFor(locale), email.trim(), password);
}

export async function registerWithEmail(name: string, email: string, password: string, locale: Locale) {
  const auth = authFor(locale);
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(user, { displayName: name.trim() });
  // الإرسال لا يمنع الدخول: التأكيد مطلوب لاحقًا للعمليات الحسّاسة فقط (الدفع، التجربة)
  await sendEmailVerification(user).catch(() => {});
  await ensureUserDoc(user, locale, name.trim());
}

export async function resetPassword(email: string, locale: Locale) {
  await sendPasswordResetEmail(authFor(locale), email.trim());
}

export async function resendVerification(locale: Locale) {
  const user = authFor(locale).currentUser;
  if (user && !user.emailVerified) await sendEmailVerification(user);
}

/** الخروج يمسح بيانات الأستاذ المحفوظة على الجهاز (كاش Firestore وصفحات عامل الخدمة)،
 *  فلا يبقى شيء من أسماء التلاميذ على جهاز مشترك. إن بقيت تغييرات لم تُرسل بعد
 *  (دون إنترنت) نُرجع "pending" ليؤكّد المستخدم، لأن المسح يُضيّعها. */
export async function signOut({ force = false } = {}): Promise<"ok" | "pending"> {
  const { auth, db } = getFirebase();
  const flushed = await Promise.race([
    waitForPendingWrites(db).then(() => true),
    new Promise<boolean>((r) => setTimeout(() => r(false), 4000)),
  ]);
  if (!flushed && !force) return "pending";
  await fbSignOut(auth);
  await terminate(db).catch(() => {});
  await clearIndexedDbPersistence(db).catch(() => {});
  if ("caches" in window) {
    const keys = await caches.keys().catch(() => [] as string[]);
    await Promise.all(keys.filter((k) => k.startsWith("pages-")).map((k) => caches.delete(k)));
  }
  // تحميل كامل مقصود: نسخة Firestore أُنهيت، ونبدأ بحالة نظيفة
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
  return "ok";
}

export type AccountInfo = { onboardingDone: boolean };

/** ينشئ `users/{uid}` عند أول دخول ويعيد حالة الحساب. قراءة واحدة (من الكاش غالبًا).
 *  عند التسجيل بالبريد قد يسبق مستمعُ الجلسة حفظَ الاسم، فنكمل الاسم إن كان فارغًا. */
export async function ensureUserDoc(user: User, locale: Locale, name?: string): Promise<AccountInfo> {
  const { db } = getFirebase();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (name && !snap.data().displayName) {
      await updateDoc(ref, { displayName: name.slice(0, 80), updatedAt: serverTimestamp() });
    }
    return { onboardingDone: snap.data().onboardingDone === true };
  }
  if (!user.email) return { onboardingDone: false };
  try {
    await setDoc(ref, {
      displayName: (name ?? user.displayName ?? "").slice(0, 80),
      email: user.email,
      locale,
      onboardingDone: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // عند التسجيل ينشئ المستندَ مساران في اللحظة نفسها (النموذج ومستمع الجلسة)؛
    // الكتابة الثانية تُرفض لأنها صارت «تعديلًا»، فنقرأ ما أنشأه الأول.
    const again = await getDoc(ref);
    if (!again.exists()) throw error;
    if (name && !again.data().displayName) {
      await updateDoc(ref, { displayName: name.slice(0, 80), updatedAt: serverTimestamp() });
    }
    return { onboardingDone: again.data().onboardingDone === true };
  }
  return { onboardingDone: false };
}

/** طريقة الدخول الحالية: لطلب كلمة المرور أو نافذة Google قبل العمليات الحساسة. */
export function currentProvider(): "password" | "google" | null {
  const user = getFirebase().auth.currentUser;
  if (!user) return null;
  return user.providerData.some((p) => p.providerId === "password") ? "password" : "google";
}

/** حذف الحساب نهائيًا: إعادة المصادقة (دخول حديث يطلبه الخادم)، ثم الحذف، ثم مسح الجهاز. */
export async function deleteMyAccount(password: string, locale: Locale) {
  const auth = authFor(locale);
  const user = auth.currentUser;
  if (!user) throw new Error("signed out");
  if (currentProvider() === "password") {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password));
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
  const token = await user.getIdToken(true);
  const res = await fetch("/api/account", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 409) throw new Error("admin");
  if (!res.ok) throw new Error(`delete ${res.status}`);
  await signOut({ force: true });
}
