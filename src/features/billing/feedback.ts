"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";

/** أسباب جاهزة (مفاتيح ثابتة تُترجم في الواجهة وتُجمَّع في لوحة الأدمن). */
export const FEEDBACK_REASONS = ["useful", "saveTime", "price", "missingContent", "hardToUse", "noTime", "otherLevel"] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];

export type Feedback = {
  rating: number;
  reasons: FeedbackReason[];
  comment: string;
  context: "trialEnd" | "trial" | "general";
  locale: "ar" | "fr";
};

const ref = (uid: string) => doc(getFirebase().db, "feedback", uid);

/** رأي واحد لكل أستاذ يُحدَّث (آخر رأي هو المعتمد). */
export async function saveFeedback(uid: string, f: Feedback) {
  const snap = await getDoc(ref(uid)).catch(() => null);
  const clean = {
    rating: Math.min(5, Math.max(1, Math.round(f.rating))),
    reasons: f.reasons.filter((r) => (FEEDBACK_REASONS as readonly string[]).includes(r)).slice(0, 8),
    comment: f.comment.trim().slice(0, 1000),
    context: f.context,
    locale: f.locale,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref(uid), { ...clean, createdAt: snap?.exists() ? snap.data().createdAt : serverTimestamp() });
}
