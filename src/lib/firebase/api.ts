"use client";

import { getFirebase } from "./client";

/** طلب إلى /api برمز هوية المستخدم الحالي (يتجدّد تلقائيًا عند انتهائه). */
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = getFirebase().auth.currentUser;
  if (!user) throw new Error("signed out");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
