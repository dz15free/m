"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getIdTokenResult, onIdTokenChanged, type User } from "firebase/auth";
import { useLocale } from "next-intl";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase/client";
import { ensureUserDoc } from "./auth-service";

export type Role = "admin" | "contentEditor" | "finance";

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; user: User; roles: Role[] };

const AuthContext = createContext<AuthState>({ status: "loading" });

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
      setState({ status: "signedIn", user, roles });
      // مستند الحساب يُنشأ مرة واحدة؛ فشله (مثلًا دون إنترنت) لا يمنع الدخول
      ensureUserDoc(user, locale).catch(() => {});
    });
  }, [locale]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
