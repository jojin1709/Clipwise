import test from "node:test";
import assert from "node:assert/strict";
import { sameOrigin } from "../src/security.js";

test("sameOrigin accepts same origin", () => {
  assert.equal(sameOrigin("https://example.com", "https://example.com/a"), true);
});

test("sameOrigin rejects external origin", () => {
  assert.equal(sameOrigin("https://example.com", "https://evil.example/a"), false);
});
