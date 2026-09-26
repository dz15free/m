"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoaderCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { getKpis, getRevenue, type MonthRevenue } from "./repo";
import { useRoles } from "./admin-shell";

export function AdminDashboard() {
  const t = useTranslations("admin.dash");
  const ta = useTranslations("admin");
  const locale = useLocale() as "ar" | "fr";
  const roles = useRoles();
  const isAdmin = roles.includes("admin");
  const kpis = useQuery({ queryKey: ["adminKpis"], queryFn: getKpis, enabled: isAdmin });
  const revenue = useQuery({ queryKey: ["adminRevenue"], queryFn: () => getRevenue(12) });
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-DZ-u-nu-latn" : "fr-DZ");
  const cur = locale === "ar" ? "دج" : "DA";

  const month = revenue.data?.at(-1);
  const year = revenue.data?.reduce((a, m) => ({ gross: a.gross + m.gross, net: a.net + m.net, fees: a.fees + m.fees, count: a.count + m.count }), { gross: 0, net: 0, fees: 0, count: 0 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ta("nav.dashboard")}</h1>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {(
            [
              ["teachers", kpis.data?.teachers],
              ["newWeek", kpis.data?.newWeek],
              ["paidActive", kpis.data?.paidActive],
              ["trialsActive", kpis.data?.trialsActive],
              ["unread", kpis.data?.unread],
            ] as const
          ).map(([k, v]) => (
            <Card key={k} className={cn("space-y-1 p-4", k === "unread" && (v ?? 0) > 0 && "ring-2 ring-accent-300")}>
              <p className="text-sm text-muted">{t(k)}</p>
              <p className="text-3xl font-bold tabular-nums">{v === undefined ? <LoaderCircle aria-hidden className="size-6 animate-spin text-muted" /> : nf.format(v)}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="space-y-1">
          <p className="text-sm text-muted">{t("monthGross")}</p>
          <p className="text-3xl font-bold tabular-nums">{month ? `${nf.format(month.gross)} ${cur}` : "—"}</p>
          {month && <p className="text-sm text-muted">{t("net")}: {nf.format(month.net)} · {t("fees")}: {nf.format(month.fees)} · {t("count", { n: month.count })}</p>}
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-muted">{t("yearGross")}</p>
          <p className="text-3xl font-bold tabular-nums">{year ? `${nf.format(year.gross)} ${cur}` : "—"}</p>
          {year && <p className="text-sm text-muted">{t("net")}: {nf.format(year.net)} · {t("fees")}: {nf.format(year.fees)} · {t("count", { n: year.count })}</p>}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t("revenueChart")}</h2>
        {!revenue.data ? (
          <div className="grid h-48 place-items-center">
            <LoaderCircle aria-hidden className="size-6 animate-spin text-brand-700" />
          </div>
        ) : revenue.data.every((m) => m.gross === 0) ? (
          <p className="py-10 text-center text-muted">{t("noRevenue")}</p>
        ) : (
          <RevenueBars data={revenue.data} locale={locale} format={(n) => `${nf.format(n)} ${cur}`} />
        )}
      </Card>
    </div>
  );
}

/* مخطط أعمدة بسلسلة واحدة (لا مفتاح)؛ أعمدة رفيعة بنهاية مدوّرة 4px ملتصقة بالمحور،
   فجوة بين الأعمدة، تلميح عند التمرير/اللمس، وجدول مخفي لقارئات الشاشة. */
function RevenueBars({ data, locale, format }: { data: MonthRevenue[]; locale: "ar" | "fr"; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((m) => m.gross), 1);
  const label = (m: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { month: "short" }).format(new Date(`${m}-15T12:00:00`));
  const shown = hover !== null ? data[hover] : null;
  return (
    <div>
      <p className="h-6 text-sm tabular-nums text-ink" aria-live="polite">
        {shown ? `${label(shown.month)} ${shown.month.slice(0, 4)} — ${format(shown.gross)}` : format(data.at(-1)!.gross)}
      </p>
      <div className="relative mt-2 h-48 border-b border-line" dir="ltr">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line/70" aria-hidden />
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((m, i) => (
            <button
              key={m.month}
              type="button"
              aria-label={`${m.month}: ${format(m.gross)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              onClick={() => setHover(i)}
              className="flex h-full flex-1 items-end justify-center outline-none"
            >
              <span
                className={cn("block w-full max-w-7 rounded-t-[4px] transition-colors", hover === i ? "bg-brand-800" : "bg-brand-600")}
                style={{ height: `${(m.gross / max) * 100}%`, minHeight: m.gross ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px] text-[11px] text-muted" dir="ltr" aria-hidden>
        {data.map((m) => (
          <span key={m.month} className="flex-1 truncate text-center">{label(m.month)}</span>
        ))}
      </div>
      <table className="sr-only">
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <th>{m.month}</th>
              <td>{format(m.gross)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
