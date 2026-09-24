import {
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  House,
  LayoutGrid,
  LibraryBig,
  ListChecks,
  NotebookPen,
  Printer,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavKey =
  | "today"
  | "classes"
  | "session"
  | "library"
  | "more"
  | "schedule"
  | "logbook"
  | "planning"
  | "documents"
  | "billing"
  | "settings";

export type NavItem = { key: NavKey; href: string; icon: LucideIcon };

const item = (key: NavKey, href: string, icon: LucideIcon): NavItem => ({ key, href, icon });

export const NAV = {
  today: item("today", "/app", House),
  classes: item("classes", "/app/classes", Users),
  session: item("session", "/app/session", ClipboardCheck),
  library: item("library", "/app/library", LibraryBig),
  more: item("more", "/app/more", LayoutGrid),
  schedule: item("schedule", "/app/schedule", CalendarClock),
  logbook: item("logbook", "/app/logbook", NotebookPen),
  planning: item("planning", "/app/planning", ListChecks),
  documents: item("documents", "/app/documents", Printer),
  billing: item("billing", "/app/billing", CreditCard),
  settings: item("settings", "/app/settings", Settings),
} satisfies Record<NavKey, NavItem>;

/** الهاتف: خمس خانات، والحصة في الوسط كزرّ بارز. */
export const BOTTOM_NAV = [NAV.today, NAV.classes, NAV.session, NAV.library, NAV.more];

/** سطح المكتب: الشريط الجانبي بمجموعتين. */
export const SIDEBAR_PRIMARY = [
  NAV.today,
  NAV.classes,
  NAV.schedule,
  NAV.logbook,
  NAV.planning,
  NAV.library,
  NAV.documents,
];
export const SIDEBAR_SECONDARY = [NAV.billing, NAV.settings];

/** صفحة «المزيد» على الهاتف: كل ما لا يتّسع له الشريط السفلي. */
export const MORE_ITEMS = [NAV.schedule, NAV.logbook, NAV.planning, NAV.documents, NAV.billing, NAV.settings];

export function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}
