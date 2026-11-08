/** روابط يكتبها الأدمن (الشريط، الإشعارات): داخلي يبدأ بـ «/» (لا «//»)، أو خارجي https فقط.
 *  أي شيء آخر (javascript:، data:…) يُتجاهل. */
export function linkKind(link: string | undefined | null): "internal" | "external" | null {
  if (!link) return null;
  if (/^\/(?![/\\])/.test(link)) return "internal";
  if (/^https:\/\/[^\s]+$/i.test(link)) return "external";
  return null;
}

/* روابط قابلة للضغط داخل نص عادي (رسائل المحادثة، الإشعارات، الملاحظات): http(s):// وwww. تفتح في نافذة جديدة.
   علامات الترقيم في آخر الرابط لا تُعدّ منه. */
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAIL = /[.,;:!?؟،؛)\]}»"']+$/;

export function splitLinks(text: string): { t: string; href?: string }[] {
  const out: { t: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0];
    const url = raw.replace(TRAIL, "");
    const start = m.index!;
    if (start > last) out.push({ t: text.slice(last, start) });
    out.push({ t: url, href: url.startsWith("www.") ? `https://${url}` : url });
    last = start + url.length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
