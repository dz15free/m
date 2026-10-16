import { test } from "node:test";
import assert from "node:assert/strict";
import ar from "./messages/ar.json" with { type: "json" };
import fr from "./messages/fr.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };

/* كل لغات الواجهة بنفس المفاتيح (نص ناقص في لغة يظهر مفتاحًا خامًا للأستاذ). */
function keys(v: unknown, p = ""): string[] {
  if (Array.isArray(v)) return [`${p}[${v.length}]`, ...v.flatMap((x, i) => keys(x, `${p}[${i}]`))];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => keys(x, `${p}.${k}`));
  return [p];
}

test("ar وfr وen بالمفاتيح نفسها", () => {
  const base = keys(ar).sort();
  assert.deepEqual(keys(fr).sort(), base);
  assert.deepEqual(keys(en).sort(), base);
});
