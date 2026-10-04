import { test } from "node:test";
import assert from "node:assert/strict";
import { actionErrorKey, parseActionLink } from "./action-link.ts";

const CODE = "AbC-123_xyzAbC-123_xyz";

test("parses valid modes", () => {
  for (const mode of ["verifyEmail", "resetPassword", "recoverEmail", "verifyAndChangeEmail"]) {
    assert.deepEqual(parseActionLink({ mode, oobCode: CODE, lang: "ar" }), { mode, oobCode: CODE });
  }
});

test("rejects unknown mode, missing or malformed code", () => {
  assert.equal(parseActionLink({ mode: "signIn", oobCode: CODE }), null);
  assert.equal(parseActionLink({ mode: "verifyEmail" }), null);
  assert.equal(parseActionLink({ mode: "verifyEmail", oobCode: "<script>" }), null);
  assert.equal(parseActionLink({ mode: ["verifyEmail"], oobCode: CODE }), null);
});

test("maps Firebase errors", () => {
  assert.equal(actionErrorKey({ code: "auth/expired-action-code" }), "expired");
  assert.equal(actionErrorKey({ code: "auth/invalid-action-code" }), "invalid");
  assert.equal(actionErrorKey({ code: "auth/weak-password" }), "weakPassword");
  assert.equal(actionErrorKey({ code: "auth/network-request-failed" }), "network");
  assert.equal(actionErrorKey(new Error("x")), "generic");
});
