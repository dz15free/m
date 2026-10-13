// مُولَّد بـ scripts/curriculum/memo-index.mjs — لا تعدّله يدويًا.
import type { Memo } from "@/features/lessons/memo";

type Entry = { rev: string; count: number; load: () => Promise<{ default: unknown }> };

export const MEMO_FILES: Record<string, Entry> = {
  "1AM_en": { rev: "f9a43d89", count: 39, load: () => import("../../../content/memos/1AM_en.json") },
  "1AM_informatics": { rev: "6097170e", count: 20, load: () => import("../../../content/memos/1AM_informatics.json") },
  "2AM_informatics": { rev: "8a7752dd", count: 21, load: () => import("../../../content/memos/2AM_informatics.json") },
  "3AM_fr": { rev: "66379cdb", count: 68, load: () => import("../../../content/memos/3AM_fr.json") },
  "3AM_math": { rev: "a6411e6c", count: 68, load: () => import("../../../content/memos/3AM_math.json") },
  "3AM_physics": { rev: "36857735", count: 21, load: () => import("../../../content/memos/3AM_physics.json") },
  "3AM_science": { rev: "eef9bfc", count: 24, load: () => import("../../../content/memos/3AM_science.json") },
  "4AM_civic": { rev: "cf485121", count: 20, load: () => import("../../../content/memos/4AM_civic.json") },
  "4AM_histgeo": { rev: "83a99227", count: 42, load: () => import("../../../content/memos/4AM_histgeo.json") },
  "4AM_math": { rev: "e790c1ab", count: 1, load: () => import("../../../content/memos/4AM_math.json") },
};

export type MemoFile = Record<string, Memo>;
