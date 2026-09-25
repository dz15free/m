"use client";

import { Portal } from "@/components/ui/portal";
import { useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  LoaderCircle,
  Lock,
  MessagesSquare,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { useAuth } from "@/features/auth/auth-provider";
import { formatLongDate } from "@/i18n/dates";
import { wilayaByCode } from "@/shared/dz/wilayas";
import { cn } from "@/lib/utils/cn";
import {
  adminApi,
  getPlansAdmin,
  getTeacherOverview,
  listUsers,
  type UserRow,
} from "./repo";

export function AdminTeachers() {
  const t = useTranslations("admin.teachers");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<UserRow | null>(null);
  const users = useInfiniteQuery({
    queryKey: ["adminUsers", search],
    queryFn: ({ pageParam }) => listUsers(pageParam, search),
    initialPageParam: undefined as Parameters<typeof listUsers>[0],
    getNextPageParam: (last) =>
      !search && last.rows.length === 30 ? last.last : undefined,
  });
  const rows = users.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{ta("nav.teachers")}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
        className="relative"
      >
        <Search
          aria-hidden
          className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          dir="ltr"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value) setSearch("");
          }}
          placeholder={t("search")}
          aria-label={t("search")}
          className="block min-h-12 w-full rounded-2xl border border-line bg-surface ps-12 pe-4 outline-none focus:border-brand-600"
        />
      </form>
      {!users.data ? (
        <div className="grid place-items-center py-12">
          <LoaderCircle
            aria-hidden
            className="size-8 animate-spin text-brand-700"
          />
        </div>
      ) : !rows.length ? (
        <Card className="py-10 text-center text-muted">{t("empty")}</Card>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {rows.map((u) => (
            <li key={u.uid}>
              <button
                type="button"
                onClick={() => setOpen(u)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-brand-50"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-800">
                  {(u.displayName || u.email).slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {u.displayName || "—"}
                  </span>
                  <span
                    dir="ltr"
                    className="block truncate text-start text-sm text-muted"
                  >
                    {u.email}
                  </span>
                </span>
                <span className="hidden shrink-0 text-end text-xs text-muted sm:block">
                  {t("joined")}{" "}
                  {u.createdAt
                    ? formatLongDate(new Date(u.createdAt), locale)
                    : "—"}
                  <br />
                  {u.onboardingDone ? t("onboarded") : t("notOnboarded")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {users.hasNextPage && (
        <button
          type="button"
          onClick={() => users.fetchNextPage()}
          disabled={users.isFetchingNextPage}
          className={buttonClass("secondary", "md", "w-full")}
        >
          {users.isFetchingNextPage && (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          )}
          {t("more")}
        </button>
      )}
      {open && (
        <Portal>
          <TeacherSheet user={open} onClose={() => setOpen(null)} />
        </Portal>
      )}
    </div>
  );
}

function TeacherSheet({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  const t = useTranslations("admin.teachers");
  const locale = useLocale() as "ar" | "fr";
  const auth = useAuth();
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["adminTeacher", user.uid],
    queryFn: () => getTeacherOverview(user.uid),
  });
  const account = useQuery({
    queryKey: ["adminAccount", user.uid],
    queryFn: () =>
      adminApi<{
        roles: { admin: boolean; contentEditor: boolean; finance: boolean };
      }>(`/api/admin/users/${user.uid}`),
  });
  const plans = useQuery({ queryKey: ["adminPlans"], queryFn: getPlansAdmin });
  const premium = plans.data?.find((p) => p.id === "premium");
  const [days, setDays] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [roles, setRoles] = useState<{
    admin: boolean;
    contentEditor: boolean;
    finance: boolean;
  } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const r = roles ?? account.data?.roles ?? null;
  const ent = overview.data?.entitlement;
  const active = !!ent?.active;
  const p = overview.data?.profile;

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setMsg(null);
    try {
      setMsg({ ok: true, text: await fn() });
      await queryClient.invalidateQueries({
        queryKey: ["adminTeacher", user.uid],
      });
    } catch (e) {
      setMsg({
        ok: false,
        text:
          (e as Error).message === "cannot remove own admin"
            ? t("selfAdmin")
            : String((e as Error).message),
      });
    } finally {
      setBusy(false);
    }
  }

  const dval = days ?? String(premium?.durationDays ?? 365);
  const aval = amount ?? String(premium?.priceDzd ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/30"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-title"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-lg space-y-4 overflow-y-auto bg-canvas p-4 pt-safe shadow-float sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="teacher-title" className="text-xl font-bold">
              {p?.lastName
                ? `${p.lastName} ${p.firstName}`
                : user.displayName || "—"}
            </h2>
            <p dir="ltr" className="truncate text-start text-sm text-muted">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="×"
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-surface"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <Card className="space-y-1 text-sm">
          {p?.wilayaCode && (
            <p>
              <b>{t("wilaya")}:</b> {wilayaByCode(p.wilayaCode)?.[locale]}
            </p>
          )}
          <p>
            <b>{t("joined")}:</b>{" "}
            {user.createdAt
              ? formatLongDate(new Date(user.createdAt), locale)
              : "—"}
          </p>
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted">
            <Lock aria-hidden className="size-3.5" />
            {t("privacy")}
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{t("plan")}</h3>
            {overview.data && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  active
                    ? "bg-accent-100 text-accent-700"
                    : "bg-canvas text-muted",
                )}
              >
                {active
                  ? ent!.status === "trial"
                    ? t("trial")
                    : t("active")
                  : t("free")}
                {active &&
                  ` · ${t("until", { date: formatLongDate(new Date(ent!.end), locale) })}`}
              </span>
            )}
          </div>
          {!plans.data ? (
            <LoaderCircle
              aria-hidden
              className="size-5 animate-spin text-muted"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={t("days")}
                  inputMode="numeric"
                  dir="ltr"
                  value={dval}
                  onChange={(e) => setDays(e.target.value)}
                />
                <Field
                  label={t("amount")}
                  inputMode="numeric"
                  dir="ltr"
                  value={aval}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Field
                label={t("note")}
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const res = await adminApi<{ until: number }>(
                        `/api/admin/users/${user.uid}`,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            action: "grant",
                            planId: "premium",
                            days: Number(dval) || 0,
                            amount: Number(aval) || 0,
                            note,
                          }),
                        },
                      );
                      return t("granted", {
                        date: formatLongDate(new Date(res.until), locale),
                      });
                    })
                  }
                  className={buttonClass("primary")}
                >
                  {busy ? (
                    <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <Check aria-hidden className="size-4" />
                  )}
                  {t("grantCta")}
                </button>
                {active && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      window.confirm(t("revokeConfirm")) &&
                      run(async () => {
                        await adminApi(`/api/admin/users/${user.uid}`, {
                          method: "POST",
                          body: JSON.stringify({ action: "revoke", note }),
                        });
                        return t("revoked");
                      })
                    }
                    className={buttonClass("ghost", "md", "text-red-700")}
                  >
                    {t("revoke")}
                  </button>
                )}
              </div>
            </>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">{t("roles")}</h3>
          {!r ? (
            <LoaderCircle
              aria-hidden
              className="size-5 animate-spin text-muted"
            />
          ) : (
            <>
              {(["admin", "contentEditor", "finance"] as const).map((k) => (
                <label key={k} className="flex min-h-10 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={r[k]}
                    disabled={
                      k === "admin" &&
                      auth.status === "signedIn" &&
                      auth.user.uid === user.uid
                    }
                    onChange={(e) => setRoles({ ...r, [k]: e.target.checked })}
                    className="size-5 accent-brand-700"
                  />
                  {t(`roleNames.${k}`)}
                </label>
              ))}
              <button
                type="button"
                disabled={busy || !roles}
                onClick={() =>
                  run(async () => {
                    await adminApi(`/api/admin/users/${user.uid}`, {
                      method: "POST",
                      body: JSON.stringify({ action: "roles", roles: r }),
                    });
                    return t("rolesSaved");
                  })
                }
                className={buttonClass("secondary")}
              >
                {t("saveRoles")}
              </button>
            </>
          )}
        </Card>

        {msg && (
          <p
            role="status"
            className={cn(
              "rounded-xl p-3 text-sm font-medium",
              msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800",
            )}
          >
            {msg.text}
          </p>
        )}

        <Link
          href={`/admin/support?uid=${user.uid}`}
          className={buttonClass("secondary", "md", "w-full")}
        >
          <MessagesSquare aria-hidden className="size-4" />
          {t("message")}
        </Link>
      </section>
    </div>
  );
}
