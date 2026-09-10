import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankListings } from "./board.ts";

function row(id: string, score: number, createdAt: string) {
  return { id, score, createdAt };
}

describe("rankListings", () => {
  it("orders by boost score descending", () => {
    const ranked = rankListings([
      row("b", 11, "2026-01-02T00:00:00.000Z"),
      row("a", 18, "2026-01-03T00:00:00.000Z"),
      row("c", 2, "2026-01-01T00:00:00.000Z"),
    ]);
    assert.deepEqual(
      ranked.map((r) => r.id),
      ["a", "b", "c"],
    );
  });

  it("keeps the older listing ahead on a tie", () => {
    const ranked = rankListings([
      row("new", 5, "2026-06-01T00:00:00.000Z"),
      row("old", 5, "2026-01-01T00:00:00.000Z"),
    ]);
    assert.equal(ranked[0]?.id, "old");
  });

  it("puts unboosted listings under people who spent points", () => {
    const ranked = rankListings([
      row("free-new", 0, "2026-06-01T00:00:00.000Z"),
      row("boosted", 3, "2026-06-02T00:00:00.000Z"),
      row("free-old", 0, "2026-01-01T00:00:00.000Z"),
    ]);
    assert.deepEqual(
      ranked.map((r) => r.id),
      ["boosted", "free-old", "free-new"],
    );
  });

  it("pins featured creator listings above boost score", () => {
    const ranked = rankListings([
      { id: "community", score: 40, createdAt: "2026-01-01T00:00:00.000Z" },
      { id: "creator", score: 0, createdAt: "2026-06-01T00:00:00.000Z", featured: true },
    ]);
    assert.equal(ranked[0]?.id, "creator");
    assert.equal(ranked[0]?.rank, 1);
    assert.equal(ranked[1]?.id, "community");
  });
});
