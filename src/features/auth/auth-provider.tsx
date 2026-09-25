"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getIdTokenResult, onIdTokenChanged, type User } from "firebase/auth";
import { useLocale } from "next-intl";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureUserDoc } from "./auth-service";

export type Role = "admin" | "contentEditor" | "finance";

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
      status: "signedIn";
      user: User;
      roles: Role[];
      /** null أثناء قراءة حالة الحساب */
      onboardingDone: boolean | null;
    };

type AuthContextValue = AuthState & {
  /** يُستدعى بعد إنهاء معالج البداية دون انتظار قراءة جديدة */
  markOnboarded: () => void;
};

const AuthContext = createContext<AuthContextValue>({ status: "loading", markOnboarded: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [state, setState] = useState<AuthState>(
    isFirebaseConfigured ? { status: "loading" } : { status: "signedOut" },
  );

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    const { auth } = getFirebase();

    // onIdTokenChanged (لا onAuthStateChanged): يلتقط أيضًا تحديث الأدوار وتأكيد البريد
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ status: "signedOut" });
        return;
      }
      const { claims } = await getIdTokenResult(user);
      const roles = (["admin", "contentEditor", "finance"] as const).filter((r) => claims[r] === true);
      setState((prev) => ({
        status: "signedIn",
        user,
        roles,
        // تحديث الرمز لا يعيد حالة الحساب إلى «مجهول» إن كانت معروفة
        onboardingDone: prev.status === "signedIn" && prev.user.uid === user.uid ? prev.onboardingDone : null,
      }));

      let onboardingDone: boolean;
      try {
        ({ onboardingDone } = await ensureUserDoc(user, locale));
      } catch {
        // دون إنترنت ولا كاش: لا نحبس الأستاذ في المعالج (يُعاد التحقق في الجلسة التالية).
        // مع وجود الإنترنت نعامله كحساب جديد: المعالج يعرض خطأ الحفظ بوضوح إن استمرّ الفشل.
        onboardingDone = !navigator.onLine;
      }
      setState((prev) =>
        prev.status === "signedIn" && prev.user.uid === user.uid ? { ...prev, onboardingDone } : prev,
      );
    });
  }, [locale]);

  const markOnboarded = useCallback(() => {
    setState((prev) => (prev.status === "signedIn" ? { ...prev, onboardingDone: true } : prev));
  }, []);

  const value = useMemo(() => ({ ...state, markOnboarded }), [state, markOnboarded]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
