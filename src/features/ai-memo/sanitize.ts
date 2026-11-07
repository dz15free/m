/* تنظيف HTML المذكرة المحفوظة (ما كتبه الأستاذ في المحرّر): لا سكربتات ولا إطارات ولا معالِجات أحداث ولا روابط javascript.
   يُطبَّق في الخادم عند الحفظ، وفي المتصفح قبل العرض. */
export const MAX_SAVED_HTML = 400_000;

export function sanitizeMemoHtml(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta|form|input|textarea|button|select)\b[\s\S]*?(?:<\s*\/\s*\1\s*>|\/?>)/gi,
      "",
    )
    .replace(
      /<\s*\/\s*(script|style|iframe|object|embed|form|textarea|button|select)\s*>/gi,
      "",
    )
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+contenteditable\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(href|src|xlink:href)\s*=\s*("|')\s*(?:javascript|vbscript|data:text\/html)[^"']*\2/gi,
      '$1="#"',
    );
}
