import { getTranslations } from "next-intl/server";
import { BOTTOM_NAV, NAV } from "./nav-items";
import { NavLink } from "./nav-link";

export async function BottomNav() {
  const t = await getTranslations("nav");

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-line bg-surface/95 pb-safe shadow-float backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {BOTTOM_NAV.map(({ key, href, icon: Icon }) =>
          key === NAV.session.key ? (
            <li key={key} className="flex justify-center">
              {/* زرّ الحصة: بارز فوق الشريط، ويفتح الحصة الجارية مباشرة */}
              <NavLink
                href={href}
                aria-label={t("sessionHint")}
                className="-mt-6 flex size-16 flex-col items-center justify-center gap-0.5 rounded-full bg-linear-to-br from-brand-900 via-brand-700 to-brand-500 text-white shadow-lg ring-4 ring-surface transition-transform active:scale-95"
                activeClassName="ring-brand-100"
              >
                <Icon aria-hidden className="size-6" />
                <span className="text-[11px] font-semibold leading-none">{t("session")}</span>
              </NavLink>
            </li>
          ) : (
            <li key={key}>
              <NavLink
                href={href}
                className="flex min-h-16 flex-col items-center justify-center gap-1 text-[12px] font-medium text-muted transition-colors"
                activeClassName="text-brand-700! [&>svg]:stroke-[2.4]"
              >
                <Icon aria-hidden className="size-6" />
                <span>{t(key)}</span>
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
