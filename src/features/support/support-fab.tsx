"use client";

import { Portal } from "@/components/ui/portal";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Headset, LoaderCircle, Mail, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { useTeacher, useUid } from "@/features/classes/hooks";
import { getAppConfig } from "@/features/billing/repo";
import { authedFetch } from "@/lib/firebase/api";
import { cn } from "@/lib/utils/cn";
import { markReadByTeacher, OPEN_SUPPORT, openSupport, sendTeacherMessage, watchMessages, watchThread, type Message, type Thread } from "./repo";

/* زر عائم للتواصل مع الإدارة. على الهاتف يرتفع فوق الشريط السفلي (وفوق أشرطة الحفظ
   الثابتة عبر CSS :has)، وعلى الحاسوب في الزاوية. يفتح لوحة محادثة كاملة الشاشة على الهاتف. */
export function SupportFab() {
  const t = useTranslations("support");
  const uid = useUid();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);

  useEffect(() => {
    if (!uid) return;
    return watchThread(uid, setThread);
  }, [uid]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text ?? "";
      if (text) setDraft(text);
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT, onOpen);
    // فتح مباشر من إشعار الهاتف: /app?support=1
    const url = new URL(window.location.href);
    if (url.searchParams.get("support") === "1") {
      url.searchParams.delete("support");
      window.history.replaceState(window.history.state, "", url);
      openSupport();
    }
    return () => window.removeEventListener(OPEN_SUPPORT, onOpen);
  }, []);

  const unread = !!thread?.unreadTeacher;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `${t("fab")} — ${t("newReply")}` : t("fab")}
        className="contact-fab group fixed end-4 bottom-24 z-30 inline-flex h-14 items-center gap-2.5 rounded-full bg-linear-to-br from-brand-600 to-brand-800 p-1.5 text-white shadow-[0_10px_28px_-6px_rgb(6_90_73/0.55)] ring-1 ring-white/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-6px_rgb(6_90_73/0.6)] focus-visible:outline-offset-4 active:translate-y-0 active:scale-95 print:hidden lg:end-8 lg:bottom-8 lg:pe-5"
      >
        <span className="grid size-11 place-items-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25">
          <Headset aria-hidden className="size-6" strokeWidth={1.9} />
        </span>
        <span className="hidden text-[15px] font-semibold lg:inline">{t("fabShort")}</span>
        {unread && (
          <span className="absolute -top-0.5 end-0 flex size-4">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-4 rounded-full bg-red-600 ring-2 ring-white" />
          </span>
        )}
      </button>
      {open && uid && (
        <Portal>
          <SupportPanel uid={uid} draft={draft} setDraft={setDraft} unread={unread} onClose={() => setOpen(false)} />
        </Portal>
      )}
    </>
  );
}

function SupportPanel({
  uid,
  draft,
  setDraft,
  unread,
  onClose,
}: {
  uid: string;
  draft: string;
  setDraft: (v: string) => void;
  unread: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("support");
  const locale = useLocale() as "ar" | "fr";
  const auth = useAuth();
  const teacher = useTeacher().data;
  const config = useQuery({ queryKey: ["appConfig"], queryFn: getAppConfig, staleTime: 10 * 60_000 });
  const contact = config.data?.contact;
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => watchMessages(uid, setMessages), [uid]);
  useEffect(() => {
    if (unread) void markReadByTeacher(uid);
  }, [uid, unread]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setState("sending");
    try {
      await sendTeacherMessage(
        uid,
        {
          name: teacher ? `${teacher.profile.lastName} ${teacher.profile.firstName}` : auth.status === "signedIn" ? (auth.user.displayName ?? "") : "",
          email: auth.status === "signedIn" ? (auth.user.email ?? "") : "",
        },
        draft,
      );
      // إشعار هاتف للإدارة (الخادم يقرأ المحادثة ويحدّ من التكرار)
      void authedFetch("/api/support/notify", { method: "POST" }).catch(() => {});
      setDraft("");
      setState("idle");
    } catch {
      setState("error");
    }
  }

  const time = (at: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "short", timeStyle: "short" }).format(at);
  const wa = contact?.whatsapp?.replace(/[^\d]/g, "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/30 print:hidden sm:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-float sm:h-[min(640px,85dvh)] sm:max-w-md sm:rounded-3xl"
      >
        <header className="flex items-start gap-3 bg-linear-to-br from-brand-900 to-brand-600 p-4 text-white">
          <div className="min-w-0 flex-1">
            <h2 id="support-title" className="text-lg font-bold">{t("title")}</h2>
            <p className="text-sm text-white/85">{t("subtitle")}</p>
            <p className="mt-1 text-xs text-white/70">{contact?.hours?.[locale] || t("hours")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="grid size-10 place-items-center rounded-full hover:bg-white/10">
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {(wa || contact?.email) && (
          <div className="flex gap-2 border-b border-line p-3">
            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-green-50 px-4 text-sm font-semibold text-green-800">
                <MessageCircle aria-hidden className="size-4" />
                {t("whatsapp")}
              </a>
            )}
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-canvas px-4 text-sm font-semibold">
                <Mail aria-hidden className="size-4" />
                {t("email")}
              </a>
            )}
          </div>
        )}
        <div ref={list} className="flex-1 space-y-2 overflow-y-auto bg-canvas p-4" aria-live="polite">
          {messages === null ? (
            <div className="grid h-full place-items-center">
              <LoaderCircle aria-hidden className="size-6 animate-spin text-brand-700" />
            </div>
          ) : messages.length === 0 ? (
            <p className="mx-auto mt-6 max-w-xs rounded-2xl bg-surface p-4 text-center text-sm text-muted shadow-card">{t("empty")}</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.from === "teacher" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 shadow-card", m.from === "teacher" ? "bg-brand-700 text-white" : "bg-surface")}>
                  <p dir="auto" className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={cn("mt-0.5 text-[11px]", m.from === "teacher" ? "text-white/70" : "text-muted")}>
                    {m.from === "teacher" ? t("you") : t("admin")} · {time(m.at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3 pb-safe">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 640px)").matches) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={Math.min(4, Math.max(1, draft.split("\n").length))}
            maxLength={2000}
            dir="auto"
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600"
          />
          <button type="submit" disabled={!draft.trim() || state === "sending"} aria-label={t("send")} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white disabled:opacity-50">
            {state === "sending" ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5 rtl:-scale-x-100" />}
          </button>
        </form>
        {state === "error" && <p role="alert" className="px-3 pb-2 text-sm text-red-700">{t("error")}</p>}
      </section>
    </div>
  );
}
