import assert from "node:assert/strict";
import { validateActions } from "../src/index.ts";

const actions = validateActions([
  { action: "goto", url: "https://example.com" },
  { action: "click", role: "link", name: "More information" }
]);

assert.equal(actions.length, 2);
assert.throws(() => validateActions([{ action: "exec", code: "rm -rf /" }]));
console.log("shared protocol tests passed");
