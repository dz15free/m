/* كاتب PDF صغير بلا مكتبات: كل صفحة صورة JPEG (DCTDecode) موضوعة داخل هوامش الصفحة.
   الأبعاد بالنقاط (1/72 بوصة). */

export type PdfPage = { jpeg: Uint8Array; width: number; height: number };
export type PdfLayout = { pageW: number; pageH: number; x: number; y: number; w: number; h: number };

export const MM_TO_PT = 72 / 25.4;

function utf16Hex(s: string) {
  let hex = "FEFF";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, "0") + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
    } else hex += code.toString(16).padStart(4, "0");
  }
  return `<${hex.toUpperCase()}>`;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();

export function jpegPdf(pages: PdfPage[], layout: PdfLayout, title = ""): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(bytes);
    size += bytes.length;
  };
  const obj = (id: number, body: string | (() => void)) => {
    offsets[id] = size;
    push(`${id} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };

  // 1 الفهرس، 2 شجرة الصفحات، 3 المعلومات، ثم لكل صفحة: الصفحة والمحتوى والصورة
  const first = 4;
  const kids = pages.map((_, i) => `${first + i * 3} 0 R`).join(" ");
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  obj(3, `<< /Producer (Prof Assistant) /Title ${utf16Hex(title)} >>`);
  pages.forEach((p, i) => {
    const id = first + i * 3;
    const draw = `q ${n(layout.w)} 0 0 ${n(layout.h)} ${n(layout.x)} ${n(layout.pageH - layout.y - layout.h)} cm /Im0 Do Q`;
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(layout.pageW)} ${n(layout.pageH)}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    obj(id + 1, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
    obj(id + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push("\nendstream");
    });
  });
  const count = first + pages.length * 3;
  const xref = size;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(new ArrayBuffer(size));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
