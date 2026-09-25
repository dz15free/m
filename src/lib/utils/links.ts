/** روابط يكتبها الأدمن (الشريط، الإشعارات): داخلي يبدأ بـ «/» (لا «//»)، أو خارجي https فقط.
 *  أي شيء آخر (javascript:، data:…) يُتجاهل. */
export function linkKind(link: string | undefined | null): "internal" | "external" | null {
  if (!link) return null;
  if (/^\/(?![/\\])/.test(link)) return "internal";
  if (/^https:\/\/[^\s]+$/i.test(link)) return "external";
  return null;
}
