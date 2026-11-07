"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Compass, LifeBuoy } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REPLAY_TOUR } from "./tour-steps";

/** إعادة جولة التعريف من الإعدادات. */
export function ReplayTour() {
  const t = useTranslations("tour");
  const tg = useTranslations("guide");
  const router = useRouter();
  return (
    <>
      <Card className="flex flex-wrap items-center gap-3">
        <Compass aria-hidden className="size-6 text-brand-700" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("replayTitle")}</h2>
          <p className="text-sm text-muted">{t("replayBody")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            router.push("/app");
            window.setTimeout(
              () => window.dispatchEvent(new Event(REPLAY_TOUR)),
              400,
            );
          }}
          className={buttonClass("secondary")}
        >
          {t("replay")}
        </button>
      </Card>
      <Card className="flex flex-wrap items-center gap-3">
        <LifeBuoy aria-hidden className="size-6 text-brand-700" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{tg("title")}</h2>
          <p className="text-sm text-muted">{tg("cardBody")}</p>
        </div>
        <Link href="/app/guide" className={buttonClass("secondary")}>
          {tg("cardCta")}
        </Link>
      </Card>
    </>
  );
}
