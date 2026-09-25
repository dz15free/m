"use client";

import { createPortal } from "react-dom";

/* النوافذ المنبثقة تُرسَم في <body> مباشرة: عنصر أب بـ backdrop-filter أو transform
   (مثل الترويسة المضبّبة) يحبس `position: fixed` داخله فتظهر النافذة تحت المحتوى. */
export function Portal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
