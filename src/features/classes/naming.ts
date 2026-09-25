/* تسمية الأفواج: 3AP-01, 3AP-02… الترقيم يكمل بعد الأفواج الموجودة
   للمستوى نفسه، فلا تتكرر الأسماء عند الإضافة لاحقًا أو عند النسخ. */

export type ClassKey = { level: string; section: string };

export function formatSection(n: number): string {
  return String(n).padStart(2, "0");
}

export function classDisplayName(level: string, section: string): string {
  return `${level}-${section}`;
}

/** أرقام الأفواج التالية لمستوى، بعد أكبر رقم مستعمل (الفجوات لا تُملأ عمدًا لتفادي الالتباس). */
export function nextSections(existing: readonly ClassKey[], level: string, count: number): string[] {
  const used = existing
    .filter((c) => c.level === level)
    .map((c) => Number.parseInt(c.section, 10))
    .filter(Number.isFinite);
  const start = used.length ? Math.max(...used) + 1 : 1;
  return Array.from({ length: count }, (_, i) => formatSection(start + i));
}

/** يرتّب الأقسام حسب ترتيب المستوى ثم رقم الفوج. */
export function compareClasses(levelOrder: (level: string) => number) {
  return (a: ClassKey, b: ClassKey) =>
    levelOrder(a.level) - levelOrder(b.level) || a.section.localeCompare(b.section, "en", { numeric: true });
}
