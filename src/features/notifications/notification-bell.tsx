"use client";

import { Portal } from "@/components/ui/portal";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Bell, BookOpen, CreditCard, Gift, LoaderCircle, Megaphone, Sparkles, X } from "lucide-react";
import { useUid } from "@/features/classes/hooks";
import { cn } from "@/lib/utils/cn";
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
                    {n.link.startsWith("/") ? (
                      <Link href={n.link} onClick={onClose} className={cn(cls, "hover:bg-canvas")}>{body}</Link>
                    ) : n.link ? (
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
