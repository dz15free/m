"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "./nav-items";

/** الجزء الوحيد من التنقّل الذي يحتاج المتصفح: معرفة الصفحة الحالية. */
export function NavLink({
  href,
  className,
  activeClassName,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  activeClassName: string;
}) {
  const active = isActive(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className ?? ""} ${active ? activeClassName : ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
