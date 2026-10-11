"use client";

/* لقطة SVG (foreignObject) للصفحة في «وضع الطباعة»، يرسمها المتصفح نفسه بأوراق الأنماط الأصلية للمنصة
   (لا أنماط محسوبة منسوخة لكل عنصر): نفس قواعد الطباعة ⇒ نفس التخطيط، وحجم صغير.
   داخل صورة SVG لا تُجلب أي موارد خارجية، فنضمّن الخطوط المستعملة والصور كـ data URL. */

const IGNORE = "data-pdf-ignore";

let cssCache: string | null = null;

function collectCss(): string {
  if (cssCache) return cssCache;
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of Array.from(rules)) if (!(r instanceof CSSFontFaceRule)) parts.push(r.cssText);
  }
  // المتغيرات معرّفة على ‎:root‎، وجذر اللقطة عنصر <html> متداخل داخل SVG
  cssCache = parts.join("\n").replace(/:root\b/g, "html");
  return cssCache;
}

const fontCache = new Map<string, Promise<string | null>>();

function toDataUrl(url: string): Promise<string | null> {
  let p = fontCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .then(
        (b) =>
          b &&
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.onerror = reject;
            fr.readAsDataURL(b);
          }),
      )
      .catch(() => null);
    fontCache.set(url, p);
  }
  return p;
}

const norm = (s: string) => s.replace(/["']/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** قواعد ‎@font-face‎ للخطوط التي حمّلتها الصفحة فعلًا فقط (حسب العائلة والوزن ونطاق المحارف)، مضمّنة. */
async function embeddedFonts(): Promise<string> {
  const loaded = new Set(
    Array.from(document.fonts)
      .filter((f) => f.status === "loaded")
      .map((f) => `${norm(f.family)}|${norm(f.weight)}|${norm(f.style)}|${norm(f.unicodeRange)}`),
  );
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) if (r instanceof CSSFontFaceRule) rules.push(r);
    } catch {
      /* ورقة من نطاق آخر */
    }
  }
  const out = await Promise.all(
    rules.map(async (r) => {
      const s = r.style;
      const key = `${norm(s.getPropertyValue("font-family"))}|${norm(s.getPropertyValue("font-weight") || "normal")}|${norm(s.getPropertyValue("font-style") || "normal")}|${norm(s.getPropertyValue("unicode-range") || "U+0-10FFFF")}`;
      if (!loaded.has(key)) return "";
      const src = s.getPropertyValue("src");
      const m = /url\(["']?([^"')]+\.woff2[^"')]*)["']?\)/.exec(src) ?? /url\(["']?([^"')]+)["']?\)/.exec(src);
      const url = m?.[1];
      if (!url) return "";
      const data = url.startsWith("data:") ? url : await toDataUrl(new URL(url, r.parentStyleSheet?.href ?? location.href).href);
      if (!data) return "";
      const text = r.cssText.replace(/src\s*:[^;]+;/, `src: url("${data}");`);
      return text;
    }),
  );
  return out.filter(Boolean).join("\n");
}

/** قيم الحقول والصور واللوحات في النسخة؛ يعيد false إن استُبدل العنصر (فلا نمرّ على أبنائه). */
function fixNode(le: Element, ce: Element, jobs: Promise<void>[]): boolean {
  if (le instanceof HTMLInputElement) {
    if (le.type !== "checkbox" && le.type !== "radio") ce.setAttribute("value", le.value);
    else if (le.checked) ce.setAttribute("checked", "");
    else ce.removeAttribute("checked");
  } else if (le instanceof HTMLTextAreaElement) ce.textContent = le.value;
  else if (le instanceof HTMLSelectElement) {
    ce.querySelectorAll("option").forEach((o, j) => {
      if (j === le.selectedIndex) o.setAttribute("selected", "");
      else o.removeAttribute("selected");
    });
  } else if (le instanceof HTMLCanvasElement) {
    const img = document.createElement("img");
    try {
      img.src = le.toDataURL();
    } catch {
      /* لوحة ملوّثة */
    }
    const r = le.getBoundingClientRect();
    img.setAttribute("style", `width:${r.width}px;height:${r.height}px`);
    img.className = le.className;
    ce.replaceWith(img);
    return false;
  } else if (le instanceof HTMLImageElement) {
    const src = le.currentSrc || le.src;
    ce.removeAttribute("srcset");
    ce.removeAttribute("loading");
    if (src && !src.startsWith("data:"))
      jobs.push(
        toDataUrl(src).then((d) => {
          if (d) ce.setAttribute("src", d);
          else ce.remove();
        }),
      );
  }
  return true;
}

/** نسخة من العنصر بلا ما هو مخفي في الطباعة، مع قيم الحقول والصور واللوحات مضمّنة. */
async function cloneVisible(live: HTMLElement): Promise<HTMLElement> {
  const clone = live.cloneNode(true) as HTMLElement;
  const jobs: Promise<void>[] = [];
  const walk = (l: Element, c: Element) => {
    const lk = Array.from(l.children);
    const ck = Array.from(c.children);
    for (let i = 0; i < lk.length; i++) {
      const le = lk[i];
      const ce = ck[i];
      if (!le || !ce) continue;
      const tag = le.tagName;
      if (le.hasAttribute(IGNORE) || tag === "SCRIPT" || tag === "NOSCRIPT" || tag === "IFRAME" || tag === "TEMPLATE" || tag === "LINK") {
        ce.remove();
        continue;
      }
      if (le instanceof HTMLElement || le instanceof SVGElement) {
        const cs = getComputedStyle(le);
        if (cs.display === "none") {
          ce.remove();
          continue;
        }
      }
      if (fixNode(le, ce, jobs)) walk(le, ce);
    }
  };
  walk(live, clone);
  await Promise.all(jobs);
  return clone;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export type Snapshot = { svgFor: (top: number, height: number) => string; bytes: number };

/** لقطة جسم الصفحة بعرض width؛ svgFor يعطي SVG لشريحة عمودية منها (صفحة). */
export async function snapshotBody(width: number, total: number): Promise<Snapshot> {
  const [fonts, body] = await Promise.all([embeddedFonts(), cloneVisible(document.body)]);
  body.style.width = `${width}px`;
  body.style.minWidth = `${width}px`;
  body.style.margin = "0";
  const root = document.documentElement;
  const attrs = Array.from(root.attributes)
    .filter((a) => a.name !== "xmlns" && a.name !== "style")
    .map((a) => ` ${a.name}="${a.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`)
    .join("");
  const content =
    `<foreignObject x="0" y="0" width="${width}" height="${total}">` +
    `<html xmlns="http://www.w3.org/1999/xhtml"${attrs}><head><style>${escapeXml(fonts)}\n${escapeXml(collectCss())}</style></head>` +
    new XMLSerializer().serializeToString(body) +
    `</html></foreignObject></svg>`;
  return {
    bytes: content.length,
    svgFor: (top, height) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 ${top} ${width} ${height}">${content}`,
  };
}
