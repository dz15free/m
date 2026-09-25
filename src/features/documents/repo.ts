"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase/client";
import type { SessionDoc } from "@/features/attendance/repo";
import { monthRange, type MonthSession } from "./logic";

/** حصص قسم في شهر. نستعلم بالتاريخ وحده (فهرس تلقائي، بلا فهرس مركّب) ونصفّي القسم محليًا. */
export async function listMonthSessions(uid: string, classId: string, month: string): Promise<MonthSession[]> {
  const { start, end } = monthRange(month);
  const snap = await getDocs(
    query(collection(getFirebase().db, "teachers", uid, "sessions"), where("date", ">=", start), where("date", "<=", end)),
  );
  return snap.docs
    .map((d) => d.data() as SessionDoc)
    .filter((s) => s.classId === classId)
    .map((s) => ({ date: s.date, part: s.part, attendance: s.attendance ?? {} }));
}
