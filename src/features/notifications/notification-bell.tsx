"use client";

import { Portal } from "@/components/ui/portal";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BellRing, BookOpen, CreditCard, Gift, LoaderCircle, Megaphone, Sparkles, X } from "lucide-react";
import { enablePush, getPushState, refreshPush, type PushState } from "@/features/pwa/push";
import { useUid } from "@/features/classes/hooks";
import { cn } from "@/lib/utils/cn";
import { linkKind } from "@/lib/utils/links";
import { getNotificationState, listNotices, markAllRead, type Kind } from "./repo";

const ICON: Record<Kind, typeof Bell> = { news: Megaphone, update: Sparkles, content: BookOpen, offer: Gift, billing: CreditCard };

export function NotificationBell({ className }: { className?: string }) {
  const t = useTranslations("notifications");
  const uid = useUid();
  const queryClient = useQueryClient();
  const state = useQuery({
    queryKey: ["notifState", uid ?? ""],
    queryFn: () => getNotificationState(uid!),
    enabled: !!uid,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
  const [open, setOpen] = useState(false);
  const s = state.data;
  const locale = useLocale();
  useEffect(() => {
    if (uid) refreshPush(locale);
  }, [uid, locale]);
  const unread = !!s && Math.max(s.latestAnnouncementAt, s.personalLatestAt) > s.readAt;

  function close() {
    setOpen(false);
    if (unread && uid) {
      void markAllRead(uid).then(() => queryClient.setQueryData(["notifState", uid], { ...s!, readAt: Date.now() }));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? t("titleUnread") : t("title")}
        aria-haspopup="dialog"
        className={cn("relative grid size-11 place-items-center rounded-full text-ink/80 hover:bg-canvas", className)}
      >
        <Bell aria-hidden className="size-6" />
        {unread && <span className="absolute end-2 top-2 size-2.5 rounded-full bg-red-600 ring-2 ring-surface" />}
      </button>
      {open && uid && (
        <Portal>
          <Panel uid={uid} readAt={s?.readAt ?? 0} onClose={close} />
        </Portal>
      )}
    </>
  );
}

function Panel({ uid, readAt, onClose }: { uid: string; readAt: number; onClose: () => void }) {
  const t = useTranslations("notifications");
  const locale = useLocale() as "ar" | "fr";
  const list = useQuery({ queryKey: ["notices", uid], queryFn: () => listNotices(uid), staleTime: 60_000 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const date = (at: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "medium" }).format(at);
  const text = (v: { ar: string; fr: string }) => v[locale] || v[locale === "ar" ? "fr" : "ar"];

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 print:hidden" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-title"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 top-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-b-3xl bg-surface shadow-float pt-safe lg:inset-x-auto lg:start-80 lg:top-6 lg:w-[26rem] lg:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="notif-title" className="text-lg font-bold">{t("title")}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center rounded-full hover:bg-canvas">
            <X aria-hidden className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto">
          <PushCard />
          {!list.data ? (
            <div className="grid place-items-center py-10">
              <LoaderCircle aria-hidden className="size-6 animate-spin text-brand-700" />
            </div>
          ) : list.data.length === 0 ? (
            <p className="py-10 text-center text-muted">{t("empty")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.data.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                const isNew = n.createdAt > readAt;
                const body = (
                  <>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", isNew ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700")}>
                      <Icon aria-hidden className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span dir="auto" className="font-semibold">{text(n.title)}</span>
                        {isNew && <span className="rounded-full bg-red-50 px-1.5 text-[11px] font-bold text-red-700">{t("new")}</span>}
                      </span>
                      {text(n.body) && <span dir="auto" className="mt-0.5 block whitespace-pre-line text-sm text-muted">{text(n.body)}</span>}
                      <span className="mt-1 block text-xs text-muted">{date(n.createdAt)}</span>
                    </span>
                  </>
                );
                const cls = cn("flex gap-3 px-4 py-3", isNew && "bg-brand-50/50");
                return (
                  <li key={`${n.personal ? "p" : "a"}-${n.id}`}>
                    {linkKind(n.link) === "internal" ? (
                      <Link href={n.link} onClick={onClose} className={cn(cls, "hover:bg-canvas")}>{body}</Link>
                    ) : linkKind(n.link) === "external" ? (
                      <a href={n.link} target="_blank" rel="noopener" className={cn(cls, "hover:bg-canvas")}>{body}</a>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function PushCard() {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const [state, setState] = useState<PushState>(getPushState);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  if (state === "off" || state === "unsupported" || (state === "granted" && !justEnabled)) return null;

  async function enable() {
    setBusy(true);
    setFailed(false);
    try {
      const next = await enablePush(locale);
      setState(next);
      setJustEnabled(next === "granted");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="m-3 rounded-2xl bg-brand-50 p-3 text-sm">
      {state === "granted" ? (
        <p className="font-semibold text-brand-800">{t("pushOn")}</p>
      ) : (
        <div className="flex items-start gap-3">
          <BellRing aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-semibold">{t("pushTitle")}</p>
            <p className="text-muted">{state === "needsInstall" ? t("pushIos") : state === "denied" ? t("pushDenied") : t("pushBody")}</p>
            {state === "default" && (
              <button type="button" onClick={enable} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-brand-700 px-4 font-semibold text-white disabled:opacity-60">
                {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                {t("pushEnable")}
              </button>
            )}
            {failed && <p role="alert" className="text-red-700">{t("pushError")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
