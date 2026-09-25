"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LoaderCircle, Send } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authedFetch } from "@/lib/firebase/api";
import { cn } from "@/lib/utils/cn";
import {
  markReadByAdmin,
  sendAdminMessage,
  setThreadStatus,
  watchMessages,
  watchThreads,
  type Message,
  type Thread,
} from "@/features/support/repo";

/* صندوق الرسائل: قائمة المحادثات (حيّة) + المحادثة المختارة. على الهاتف شاشة واحدة
   بالتناوب، وعلى الحاسوب عمودان. */
export function SupportInbox() {
  const t = useTranslations("admin.support");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const router = useRouter();
  const selected = useSearchParams().get("uid");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => watchThreads(setThreads), []);
  const current = threads?.find((x) => x.uid === selected) ?? null;
  const time = (at: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "short", timeStyle: "short" }).format(at);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.support")}</h1>
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className={cn("p-0", selected && "hidden lg:block")}>
          <h2 className="border-b border-line px-4 py-3 font-semibold">{t("threads")}</h2>
          {!threads ? (
            <div className="grid place-items-center py-10">
              <LoaderCircle aria-hidden className="size-6 animate-spin text-brand-700" />
            </div>
          ) : !threads.length ? (
            <p className="py-10 text-center text-muted">{t("empty")}</p>
          ) : (
            <ul className="max-h-[70dvh] divide-y divide-line overflow-y-auto">
              {threads.map((th) => (
                <li key={th.uid}>
                  <button
                    type="button"
                    onClick={() => router.replace(`/admin/support?uid=${th.uid}`)}
                    className={cn("flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-brand-50", th.uid === selected && "bg-brand-50")}
                  >
                    <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", th.unreadAdmin ? "bg-red-600" : "bg-transparent")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("truncate", th.unreadAdmin ? "font-bold" : "font-medium")}>{th.name || th.email}</span>
                        <span className="shrink-0 text-[11px] text-muted">{time(th.lastMessageAt)}</span>
                      </span>
                      <span dir="auto" className="block truncate text-sm text-muted">
                        {th.lastFrom === "admin" ? "↩ " : ""}
                        {th.lastMessage}
                      </span>
                      {th.status === "closed" && <span className="text-[11px] text-muted">{t("closed")}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {current ? (
          <Conversation key={current.uid} thread={current} onBack={() => router.replace("/admin/support")} />
        ) : (
          <Card className={cn("hidden place-items-center py-16 text-muted lg:grid", selected && "grid")}>{selected && threads ? t("empty") : t("pick")}</Card>
        )}
      </div>
    </div>
  );
}

function Conversation({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const t = useTranslations("admin.support");
  const locale = useLocale() as "ar" | "fr";
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => watchMessages(thread.uid, setMessages), [thread.uid]);
  useEffect(() => {
    if (thread.unreadAdmin) void markReadByAdmin(thread.uid);
  }, [thread.uid, thread.unreadAdmin]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);
  const Back = locale === "ar" ? ChevronRight : ChevronLeft;
  const time = (at: number) => new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ", { dateStyle: "short", timeStyle: "short" }).format(at);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await sendAdminMessage(thread.uid, draft);
      // إشعار هاتف للأستاذ (لا يعطّل الإرسال إن فشل)
      void authedFetch("/api/admin/support-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: thread.uid, preview: draft.trim().slice(0, 140) }),
      }).catch(() => {});
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex h-[75dvh] flex-col p-0">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <button type="button" onClick={onBack} aria-label={t("back")} className="grid size-10 place-items-center rounded-full hover:bg-canvas lg:hidden">
          <Back aria-hidden className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{thread.name || thread.email}</p>
          <p dir="ltr" className="truncate text-start text-xs text-muted">{thread.email}</p>
        </div>
        <button type="button" onClick={() => setThreadStatus(thread.uid, thread.status === "closed" ? "open" : "closed")} className={buttonClass("ghost")}>
          {thread.status === "closed" ? t("reopen") : t("close")}
        </button>
      </header>
      <div ref={list} className="flex-1 space-y-2 overflow-y-auto bg-canvas p-4">
        {!messages ? (
          <div className="grid h-full place-items-center">
            <LoaderCircle aria-hidden className="size-6 animate-spin text-brand-700" />
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "admin" ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 shadow-card", m.from === "admin" ? "bg-brand-700 text-white" : "bg-surface")}>
                <p dir="auto" className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn("mt-0.5 text-[11px]", m.from === "admin" ? "text-white/70" : "text-muted")}>{time(m.at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={Math.min(4, Math.max(1, draft.split("\n").length))}
          maxLength={2000}
          dir="auto"
          placeholder={t("reply")}
          aria-label={t("reply")}
          className="min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-3 py-2.5 outline-none focus:border-brand-600"
        />
        <button type="submit" disabled={!draft.trim() || busy} aria-label={t("send")} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-700 text-white disabled:opacity-50">
          {busy ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Send aria-hidden className="size-5 rtl:-scale-x-100" />}
        </button>
      </form>
    </Card>
  );
}
