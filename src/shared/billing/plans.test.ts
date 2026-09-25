import { test } from "node:test";
import assert from "node:assert/strict";
import { effectivePlan, renewEnd } from "./plans.ts";

const DAY = 86_400_000;
const now = 1_000 * DAY;
const premium = { planId: "premium", status: "active" as const, currentPeriodEnd: now + 3 * DAY + 1, limits: { maxClasses: 20 }, features: ["x"], contentAccess: "premium" as const, trialUsedAt: now - 30 * DAY, source: "chargily" as const };

test("اشتراك فعّال وأيام متبقية", () => {
  const e = effectivePlan(premium, null, now);
  assert.equal(e.status, "active");
  assert.equal(e.limits.maxClasses, 20);
  assert.equal(e.daysLeft, 4);
  assert.equal(e.contentAccess, "premium");
});

test("الانتهاء الكسول يعيد المجاني دون حذف شيء", () => {
  const e = effectivePlan({ ...premium, currentPeriodEnd: now - 1 }, { limits: { maxClasses: 3 } }, now);
  assert.deepEqual([e.status, e.limits.maxClasses, e.contentAccess, e.expired, e.trialUsed], ["free", 3, "free", true, true]);
  const fresh = effectivePlan(null, null, now);
  assert.deepEqual([fresh.limits.maxClasses, fresh.expired, fresh.trialUsed], [2, false, false]);
});

test("التجديد المبكر يضيف فوق المتبقي", () => {
  assert.equal(renewEnd(now + 5 * DAY, now, 30), now + 35 * DAY);
  assert.equal(renewEnd(now - 5 * DAY, now, 30), now + 30 * DAY);
  assert.equal(renewEnd(null, now, 7), now + 7 * DAY);
});

test("الصافي، شهر الإيرادات، ومرجع الدفع", async () => {
  const { netOf, revenueMonth, payRef } = await import("./plans.ts");
  assert.equal(netOf(2500, 100, false), 2400);
  assert.equal(netOf(2500, 100, true), 2500);
  assert.equal(revenueMonth(Date.parse("2026-09-30T23:30:00Z")), "2026-10"); // منتصف الليل في الجزائر
  assert.match(payRef(new Uint8Array([0, 1, 2, 3, 250])), /^P-[2-9A-Z]{5}$/);
});
