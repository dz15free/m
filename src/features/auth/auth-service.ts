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
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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

export async function signOut() {
  await fbSignOut(getFirebase().auth);
}

/** ينشئ `users/{uid}` عند أول دخول. قراءة واحدة (من الكاش غالبًا) في كل دخول.
 *  عند التسجيل بالبريد قد يسبق مستمعُ الجلسة حفظَ الاسم، فنكمل الاسم إن كان فارغًا. */
export async function ensureUserDoc(user: User, locale: Locale, name?: string) {
  const { db } = getFirebase();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (name && !snap.data().displayName) {
      await updateDoc(ref, { displayName: name.slice(0, 80), updatedAt: serverTimestamp() });
    }
    return;
  }
  if (!user.email) return;
  await setDoc(ref, {
    displayName: (name ?? user.displayName ?? "").slice(0, 80),
    email: user.email,
    locale,
    onboardingDone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
