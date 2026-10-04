import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceOf, installMode, TOUR_STEPS, tourSteps } from "./tour-steps.ts";

test("install step hidden once installed", () => {
  assert.ok(tourSteps("ios").some((s) => s.key === "install"));
  assert.ok(!tourSteps("installed").some((s) => s.key === "install"));
  assert.equal(tourSteps("installed").length, TOUR_STEPS.length - 1);
});

test("welcome first, finish last", () => {
  const s = tourSteps("manual");
  assert.equal(s[0]!.key, "welcome");
  assert.equal(s.at(-1)!.key, "finish");
});

test("device detection", () => {
  assert.equal(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "ios");
  assert.equal(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), "ios"); // iPad
  assert.equal(deviceOf("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), "desktop");
  assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-A146B) Chrome/126 Mobile"), "android");
  assert.equal(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126"), "desktop");
});

test("install mode prefers the native prompt", () => {
  assert.equal(installMode("prompt", "desktop"), "prompt");
  assert.equal(installMode("ios", "ios"), "ios");
  assert.equal(installMode("manual", "android"), "android");
  assert.equal(installMode("manual", "desktop"), "desktop");
});
