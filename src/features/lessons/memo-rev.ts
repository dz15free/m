/** بصمة ملف مذكرات (FNV-1a على JSON بمفاتيح مرتّبة): تتغيّر بتغيّر أي مذكرة. */
export function memoFileRev(memos: Record<string, unknown>): string {
  const s = JSON.stringify(Object.keys(memos).sort().map((k) => [k, memos[k]]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}
