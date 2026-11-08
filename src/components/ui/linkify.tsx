import { Fragment } from "react";

import { splitLinks } from "@/lib/utils/links";

/** نص فيه روابط قابلة للضغط (تفتح في نافذة جديدة). */
export function Linkify({ text, className = "font-medium text-brand-800 underline underline-offset-2 break-all hover:text-brand-950" }: { text: string; className?: string }) {
  return (
    <>
      {splitLinks(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" dir="ltr" className={className} onClick={(e) => e.stopPropagation()}>
            {p.t}
          </a>
        ) : (
          <Fragment key={i}>{p.t}</Fragment>
        ),
      )}
    </>
  );
}
