// مُولَّد بـ scripts/curriculum/memo-index.mjs — لا تعدّله يدويًا.
import type { Memo } from "@/features/lessons/memo";

type Entry = { rev: string; count: number; load: () => Promise<{ default: unknown }> };

export const MEMO_FILES: Record<string, Entry> = {
  "1AM_ar": { rev: "ec46210f", count: 166, load: () => import("../../../content/memos/1AM_ar.json") },
  "1AM_civic": { rev: "8468150c", count: 18, load: () => import("../../../content/memos/1AM_civic.json") },
  "1AM_en": { rev: "f9a43d89", count: 39, load: () => import("../../../content/memos/1AM_en.json") },
  "1AM_fr": { rev: "61d5a4dd", count: 115, load: () => import("../../../content/memos/1AM_fr.json") },
  "1AM_histgeo": { rev: "43a5d763", count: 45, load: () => import("../../../content/memos/1AM_histgeo.json") },
  "1AM_informatics": { rev: "6097170e", count: 20, load: () => import("../../../content/memos/1AM_informatics.json") },
  "1AM_islamic": { rev: "c4c79732", count: 22, load: () => import("../../../content/memos/1AM_islamic.json") },
  "1AM_math": { rev: "1b35f00b", count: 67, load: () => import("../../../content/memos/1AM_math.json") },
  "1AM_physics": { rev: "196ab000", count: 39, load: () => import("../../../content/memos/1AM_physics.json") },
  "1AM_science": { rev: "d0d555fb", count: 41, load: () => import("../../../content/memos/1AM_science.json") },
  "2AM_ar": { rev: "bde096e2", count: 131, load: () => import("../../../content/memos/2AM_ar.json") },
  "2AM_civic": { rev: "87976e6d", count: 15, load: () => import("../../../content/memos/2AM_civic.json") },
  "2AM_en": { rev: "9f99f0b8", count: 39, load: () => import("../../../content/memos/2AM_en.json") },
  "2AM_histgeo": { rev: "e5d1222", count: 13, load: () => import("../../../content/memos/2AM_histgeo.json") },
  "2AM_informatics": { rev: "8a7752dd", count: 21, load: () => import("../../../content/memos/2AM_informatics.json") },
  "2AM_islamic": { rev: "f2b4f666", count: 16, load: () => import("../../../content/memos/2AM_islamic.json") },
  "2AM_math": { rev: "56d0f6d1", count: 51, load: () => import("../../../content/memos/2AM_math.json") },
  "2AM_physics": { rev: "3e904bc0", count: 36, load: () => import("../../../content/memos/2AM_physics.json") },
  "2AM_science": { rev: "38bae231", count: 29, load: () => import("../../../content/memos/2AM_science.json") },
  "3AM_ar": { rev: "9c3164d6", count: 55, load: () => import("../../../content/memos/3AM_ar.json") },
  "3AM_civic": { rev: "812a574c", count: 12, load: () => import("../../../content/memos/3AM_civic.json") },
  "3AM_en": { rev: "d098e466", count: 48, load: () => import("../../../content/memos/3AM_en.json") },
  "3AM_fr": { rev: "66379cdb", count: 68, load: () => import("../../../content/memos/3AM_fr.json") },
  "3AM_histgeo": { rev: "e55dbfac", count: 38, load: () => import("../../../content/memos/3AM_histgeo.json") },
  "3AM_informatics": { rev: "3d1ecf42", count: 19, load: () => import("../../../content/memos/3AM_informatics.json") },
  "3AM_islamic": { rev: "37698602", count: 18, load: () => import("../../../content/memos/3AM_islamic.json") },
  "3AM_math": { rev: "a6411e6c", count: 68, load: () => import("../../../content/memos/3AM_math.json") },
  "3AM_physics": { rev: "a1e2bb10", count: 21, load: () => import("../../../content/memos/3AM_physics.json") },
  "3AM_science": { rev: "eef9bfc", count: 24, load: () => import("../../../content/memos/3AM_science.json") },
  "4AM_ar": { rev: "5658780a", count: 75, load: () => import("../../../content/memos/4AM_ar.json") },
  "4AM_civic": { rev: "39f270f9", count: 20, load: () => import("../../../content/memos/4AM_civic.json") },
  "4AM_en": { rev: "253a3bc5", count: 57, load: () => import("../../../content/memos/4AM_en.json") },
  "4AM_fr": { rev: "d68ee5ad", count: 39, load: () => import("../../../content/memos/4AM_fr.json") },
  "4AM_histgeo": { rev: "83a99227", count: 42, load: () => import("../../../content/memos/4AM_histgeo.json") },
  "4AM_informatics": { rev: "b5ea0173", count: 24, load: () => import("../../../content/memos/4AM_informatics.json") },
  "4AM_islamic": { rev: "23aea956", count: 21, load: () => import("../../../content/memos/4AM_islamic.json") },
  "4AM_math": { rev: "9410b7fc", count: 114, load: () => import("../../../content/memos/4AM_math.json") },
  "4AM_music": { rev: "91562f0", count: 25, load: () => import("../../../content/memos/4AM_music.json") },
  "4AM_physics": { rev: "21412ade", count: 26, load: () => import("../../../content/memos/4AM_physics.json") },
  "4AM_science": { rev: "456f24ba", count: 64, load: () => import("../../../content/memos/4AM_science.json") },
};

export type MemoFile = Record<string, Memo>;
