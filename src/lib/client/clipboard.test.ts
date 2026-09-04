import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { copyToClipboard } from "./clipboard.ts";

describe("copyToClipboard", () => {
  it("returns false for empty text", async () => {
    assert.equal(await copyToClipboard(""), false);
    assert.equal(await copyToClipboard("   "), false);
  });
});
