import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeMemoHtml } from "./sanitize.ts";

test("saved memo HTML keeps formatting and drops anything executable", () => {
  const html = sanitizeMemoHtml(
    '<table><tr><td><b>غامق</b> <span style="background-color:#fff3a3">ظل</span><img src="/brand/x.webp" onerror="alert(1)"></td></tr></table>' +
      '<script>alert(1)</script><iframe src="https://x"></iframe><a href="javascript:alert(1)">x</a><div contenteditable="true" onclick="x()">y</div>',
  );
  assert.match(html, /<b>غامق<\/b>/);
  assert.match(html, /background-color:#fff3a3/);
  assert.match(html, /<img src="\/brand\/x.webp">/);
  assert.doesNotMatch(
    html,
    /script|iframe|onerror|onclick|javascript:|contenteditable/i,
  );
});
