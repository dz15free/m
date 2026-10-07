/* قراءة ملف Word (.docx) دون LibreOffice: فقرات النص وصفوف الجداول («خلية | خلية»، وفقرات الخلية بـ « ¶ »).
   بعض ملفات درايف تنقصها أجزاء قياسية فلا يفتحها LibreOffice، لكن word/document.xml سليم. */
import { readFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";

const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const textOf = (xml) =>
  decode(
    [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:(?:br|cr)\/>/g)]
      .map((m) => (m[1] !== undefined ? m[1] : m[0].startsWith("<w:tab") ? "\t" : "\n"))
      .join(""),
  );
export function docxLines(file) {
  const xml = strFromU8(unzipSync(readFileSync(file))["word/document.xml"]);
  const body = xml.slice(xml.indexOf("<w:body>"));
  const out = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    if (m[0].startsWith("<w:tbl>")) {
      for (const tr of m[0].matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
        const cells = [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((tc) =>
          [...tc[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => textOf(p[0])).filter((t) => t.trim()).join(" ¶ "),
        );
        out.push(cells.join(" | "));
      }
    } else out.push(textOf(m[0]));
  }
  return out;
}

