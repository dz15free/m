"use client";

import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  ClipboardCheck,
  Download,
  EllipsisVertical,
  Headset,
  House,
  LibraryBig,
  Monitor,
  NotebookPen,
  PartyPopper,
  Printer,
  Share,
  SquarePlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";
import { useAuth } from "@/features/auth/auth-provider";
import { useBilling } from "@/features/billing/repo";
import { useTeacher } from "@/features/classes/hooks";
import { getInstallState, promptInstall, subscribe, type InstallState } from "@/features/pwa/install-store";
import { cn } from "@/lib/utils/cn";
import { deviceOf, installMode, REPLAY_TOUR, tourDoneKey, tourSteps, type TourStep, type TourStepKey } from "./tour-steps";

/* جولة التعريف: تظهر مرة واحدة بعد التسجيل وبدء التجربة، تُبرز كل قسم في القائمة
   وتشرح ما يفعله، وتختم بطريقة التثبيت المناسبة لجهازه. يمكن إعادتها من الإعدادات. */

const ICONS: Record<TourStepKey, LucideIcon> = {
  welcome: House,
  today: House,
  classes: Users,
  schedule: CalendarClock,
  session: ClipboardCheck,
  logbook: NotebookPen,
  lessons: BookOpenCheck,
  library: LibraryBig,
  documents: Printer,
  support: Headset,
  install: Download,
  finish: PartyPopper,
};

const PAD = 6;
const readDone = (uid: string) => {
  try {
    return localStorage.getItem(tourDoneKey(uid)) === "1";
  } catch {
    return false;
  }
};
const writeDone = (uid: string, done: boolean) => {
  try {
    if (done) localStorage.setItem(tourDoneKey(uid), "1");
    else localStorage.removeItem(tourDoneKey(uid));
  } catch {
    /* تخزين محجوب: تظهر الجولة مجددًا في الزيارة القادمة فقط */
  }
};

/** أول عنصر ظاهر يحمل data-tour (القائمة الجانبية على الحاسوب، والشريط السفلي على الهاتف). */
function findTarget(step: TourStep): HTMLElement | null {
  for (const name of [step.target, step.fallback]) {
    if (!name) continue;
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

export function WelcomeTour() {
  const auth = useAuth();
  const uid = auth.status === "signedIn" ? auth.user.uid : null;
  const staff = auth.status === "signedIn" && auth.roles.length > 0;
  const teacher = useTeacher().data;
  const billing = useBilling();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const eligible =
    !!uid && !staff && !!teacher && teacher.profile.stage === "primary" && billing.ready && billing.access !== "locked" && pathname.startsWith("/app");

  useEffect(() => {
    if (!eligible || readDone(uid!)) return;
    // مهلة قصيرة حتى تستقر الصفحة بعد بدء التجربة
    const id = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(id);
  }, [eligible, uid]);

  useEffect(() => {
    const replay = () => {
      if (uid) writeDone(uid, false);
      setOpen(true);
    };
    window.addEventListener(REPLAY_TOUR, replay);
    return () => window.removeEventListener(REPLAY_TOUR, replay);
  }, [uid]);

  const close = useCallback(() => {
    if (uid) writeDone(uid, true);
    setOpen(false);
  }, [uid]);

  if (!open || !uid) return null;
  return (
    <Portal>
      <Tour
        name={teacher?.profile.firstName ?? ""}
        daysLeft={billing.access === "trial" ? billing.effective.daysLeft : null}
        onClose={close}
      />
    </Portal>
  );
}

function Tour({ name, daysLeft, onClose }: { name: string; daysLeft: number | null; onClose: () => void }) {
  const t = useTranslations("tour");
  const router = useRouter();
  const install = useSyncExternalStore<InstallState>(subscribe, getInstallState, () => "installed");
  // نثبّت القائمة عند الفتح: لا تختفي خطوة التثبيت من تحت المستخدم بعد أن يثبّت
  const [steps] = useState(() => tourSteps(getInstallState()));
  const [i, setI] = useState(0);
  const [spot, setSpot] = useState<{ rect: DOMRect | null; more: boolean }>({ rect: null, more: false });
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const Icon = ICONS[step.key];
  const { rect, more: moreHint } = spot;

  // تتبّع موضع العنصر المُبرَز (تمرير، تغيير حجم، حركة القائمة)
  useLayoutEffect(() => {
    let frame = 0;
    const el = findTarget(step);
    const more = !!el && el.dataset.tour !== step.target;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const tick = () => {
      const r = el?.getBoundingClientRect() ?? null;
      setSpot((old) =>
        old.more === more && old.rect?.x === r?.x && old.rect?.y === r?.y && old.rect?.width === r?.width && old.rect?.height === r?.height ? old : { rect: r, more },
      );
      if (el) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const next = useCallback(() => (last ? onClose() : setI((n) => n + 1)), [last, onClose]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    const rtl = document.documentElement.dir === "rtl";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) next();
      else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const cardW = Math.min(380, vw - 32);
  // البطاقة بجانب العنصر على الحاسوب (القائمة الجانبية)، وفوقه/تحته على الهاتف
  let cardStyle: React.CSSProperties | undefined;
  if (rect) {
    const beside = vw >= 1024 && rect.width < vw / 3;
    if (beside) {
      const rtl = document.documentElement.dir === "rtl";
      const left = rtl ? rect.left - cardW - 20 : rect.right + 20;
      cardStyle = { width: cardW, left: Math.max(16, Math.min(vw - cardW - 16, left)), top: Math.max(16, Math.min(vh - 360, rect.top - 24)) };
    } else if (rect.top > vh / 2) {
      cardStyle = { width: cardW, left: Math.max(16, Math.min(vw - cardW - 16, rect.left + rect.width / 2 - cardW / 2)), bottom: vh - rect.top + 18 };
    } else {
      cardStyle = { width: cardW, left: Math.max(16, Math.min(vw - cardW - 16, rect.left + rect.width / 2 - cardW / 2)), top: rect.bottom + 18 };
    }
  }

  return (
    <div className="fixed inset-0 z-[60] print:hidden" role="presentation">
      {/* الطبقة المعتمة؛ مع هدف تصبح «كشّافًا» حوله */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-2xl ring-2 ring-brand-300 transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgb(2 33 37 / 0.62)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-ink/60 backdrop-blur-[2px]" />
      )}
      {/* يمنع النقر على الصفحة أثناء الجولة */}
      <div className="fixed inset-0" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        key={step.key}
        style={cardStyle}
        className={cn(
          "tour-card fixed space-y-4 rounded-3xl bg-surface p-5 shadow-[0_24px_60px_-12px_rgb(2_33_37/0.45)] ring-1 ring-line",
          !cardStyle && "inset-x-4 top-1/2 mx-auto max-w-md -translate-y-1/2",
        )}
      >
        <div className="flex items-start gap-3">
          {step.key === "welcome" ? (
            <Logo variant="mark" className="h-12 shrink-0" />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand-600 to-brand-800 text-white shadow-md">
              <Icon aria-hidden className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-brand-700">{t("progress", { n: i + 1, total: steps.length })}</p>
            <h2 id="tour-title" className="text-lg font-bold leading-snug">
              {step.key === "welcome" ? t("steps.welcome.title", { name: name || t("teacher") }) : t(`steps.${step.key}.title`)}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("skip")} className="-me-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div id="tour-body" className="space-y-3 text-[15px] leading-relaxed text-ink/85">
          <p>{t(`steps.${step.key}.body`)}</p>
          {step.key === "welcome" && daysLeft !== null && (
            <p className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-900">{t("trial", { n: daysLeft })}</p>
          )}
          {step.key !== "welcome" && step.key !== "finish" && step.key !== "install" && (
            <p className="flex items-start gap-2 rounded-2xl bg-canvas p-3 text-sm">
              <span aria-hidden>💡</span>
              <span>{t(`steps.${step.key}.tip`)}</span>
            </p>
          )}
          {moreHint && <p className="text-sm font-medium text-brand-800">{t("inMore")}</p>}
          {step.key === "install" && <InstallHelp install={install} />}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-linear-to-l from-brand-500 to-brand-700 transition-all duration-300" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
          </div>
          {i > 0 && !last && (
            <button type="button" onClick={back} className={buttonClass("ghost", "md")}>
              <ArrowRight aria-hidden className="size-4 ltr:rotate-180" />
              {t("back")}
            </button>
          )}
          {last ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/app/classes");
              }}
              className={buttonClass("primary", "md")}
            >
              {t("start")}
            </button>
          ) : (
            <button type="button" onClick={next} className={buttonClass("primary", "md")} autoFocus>
              {i === 0 ? t("begin") : t("next")}
              <ArrowLeft aria-hidden className="size-4 ltr:rotate-180" />
            </button>
          )}
        </div>
        {i === 0 && (
          <button type="button" onClick={onClose} className="mx-auto block text-sm text-muted underline-offset-4 hover:underline">
            {t("later")}
          </button>
        )}
      </section>
    </div>
  );
}

function InstallHelp({ install }: { install: InstallState }) {
  const t = useTranslations("tour.install");
  const [mode] = useState(() => installMode(install, deviceOf(navigator.userAgent, navigator.maxTouchPoints)));
  const [done, setDone] = useState(false);

  if (mode === "prompt") {
    return done ? (
      <p className="rounded-2xl bg-green-50 p-3 text-sm text-green-800">{t("thanks")}</p>
    ) : (
      <button type="button" onClick={async () => setDone(await promptInstall())} className={buttonClass("secondary", "md", "w-full")}>
        <Download aria-hidden className="size-4" />
        {t("now")}
      </button>
    );
  }
  const steps: { icon: LucideIcon; text: string }[] =
    mode === "ios"
      ? [
          { icon: Share, text: t("ios1") },
          { icon: SquarePlus, text: t("ios2") },
          { icon: Download, text: t("ios3") },
        ]
      : mode === "android"
        ? [
            { icon: EllipsisVertical, text: t("android1") },
            { icon: Download, text: t("android2") },
          ]
        : [
            { icon: Monitor, text: t("desktop1") },
            { icon: Download, text: t("desktop2") },
          ];
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{t(`for.${mode}`)}</p>
      <ol className="space-y-2">
        {steps.map(({ icon: StepIcon, text }, k) => (
          <li key={k} className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5 text-sm">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-700 text-xs font-bold text-white">{k + 1}</span>
            <span className="flex-1">{text}</span>
            <StepIcon aria-hidden className="size-5 shrink-0 text-brand-700" />
          </li>
        ))}
      </ol>
    </div>
  );
}
