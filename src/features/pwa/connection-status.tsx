"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, CloudUpload, Check } from "lucide-react";
import { waitForPendingWrites } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import { cn } from "@/lib/utils/cn";

type State = "online" | "offline" | "syncing" | "synced";

/* مؤشر الاتصال: دون إنترنت تُحفظ الكتابات في كاش Firestore وتُرسل تلقائيًا عند العودة؛
   بعد العودة ننتظر تأكيد الخادم لكل الكتابات المعلّقة (waitForPendingWrites) ثم نُعلم الأستاذ. */
export function ConnectionStatus() {
  const t = useTranslations("pwa");
  const [state, setState] = useState<State>("online");

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const goOffline = () => setState("offline");
    const goOnline = () => {
      setState("syncing");
      waitForPendingWrites(getFirebase().db)
        .then(() => {
          if (!alive) return;
          setState("synced");
          timer = setTimeout(() => alive && setState("online"), 2500);
        })
        .catch(() => alive && setState("online"));
    };
    if (!navigator.onLine) goOffline();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (state === "online") return null;
  const Icon = state === "offline" ? CloudOff : state === "syncing" ? CloudUpload : Check;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium print:hidden",
        state === "offline" ? "bg-ink text-white" : state === "syncing" ? "bg-amber-100 text-amber-950" : "bg-green-100 text-green-900",
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", state === "syncing" && "animate-pulse")} />
      {t(state)}
    </div>
  );
}
