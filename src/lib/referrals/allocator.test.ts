import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeRotationScore,
  confidenceFromReports,
  filterEligible,
  pickCandidate,
  rankCandidates,
  shouldQuarantine,
} from "./allocator.ts";
import type { AllocationCandidate } from "./types.ts";

function cand(partial: Partial<AllocationCandidate> & { id: string }): AllocationCandidate {
  return {
    userId: `user-${partial.id}`,
    providerId: "lime",
    assignmentCount: 0,
    lastAssignedAt: null,
    successfulReports: 0,
    failedReports: 0,
    anonymousFailedReports: 0,
    confidenceScore: 0.5,
    rotationWeight: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    status: "active",
    ...partial,
  };
}

const now = Date.parse("2026-09-03T18:00:00.000Z");

describe("filterEligible", () => {
  it("keeps the matching active provider and drops everything else", () => {
    const rows = [
      cand({ id: "ok" }),
      cand({ id: "other", providerId: "veo" }),
      cand({ id: "mine", userId: "me" }),
      cand({ id: "paused", status: "paused" }),
      cand({ id: "bad", status: "quarantined" }),
      cand({ id: "recent" }),
    ];
    const eligible = filterEligible(rows, {
      providerId: "lime",
      receivingUserId: "me",
      recentCodeIds: ["recent"],
    });
    assert.deepEqual(
      eligible.map((c) => c.id),
      ["ok"],
    );
  });

  it("returns an empty list when the pool is empty", () => {
    assert.equal(filterEligible([], { providerId: "lime", receivingUserId: null, recentCodeIds: [] }).length, 0);
  });
});

describe("shouldQuarantine", () => {
  it("does not quarantine on a handful of anonymous reports", () => {
    assert.equal(
      shouldQuarantine({ successfulReports: 0, failedReports: 3, anonymousFailedReports: 3 }),
      false,
    );
  });

  it("quarantines after repeated signed-in failures", () => {
    assert.equal(
      shouldQuarantine({ successfulReports: 0, failedReports: 3, anonymousFailedReports: 0 }),
      true,
    );
  });

  it("gives successful codes more room", () => {
    assert.equal(
      shouldQuarantine({ successfulReports: 8, failedReports: 3, anonymousFailedReports: 0 }),
      false,
    );
  });
});

describe("pickCandidate", () => {
  it("returns null when nothing is eligible", () => {
    assert.equal(pickCandidate([], now, () => 0.5), null);
  });

  it("prefers a fresh unused code over a recently served popular one", () => {
    const fresh = cand({ id: "fresh", assignmentCount: 0, lastAssignedAt: null });
    const busy = cand({
      id: "busy",
      assignmentCount: 20,
      lastAssignedAt: "2026-09-03T17:50:00.000Z",
      successfulReports: 12,
      confidenceScore: confidenceFromReports(12, 1),
    });
    const picked = pickCandidate([busy, fresh], now, () => 0.5);
    assert.equal(picked?.id, "fresh");
  });

  it("still considers a reliable older code ahead of a failing one", () => {
    const reliable = cand({
      id: "good",
      assignmentCount: 6,
      lastAssignedAt: "2026-09-02T18:00:00.000Z",
      successfulReports: 4,
      failedReports: 0,
      confidenceScore: confidenceFromReports(4, 0),
    });
    const failing = cand({
      id: "fail",
      assignmentCount: 6,
      lastAssignedAt: "2026-09-01T18:00:00.000Z",
      successfulReports: 0,
      failedReports: 4,
      confidenceScore: confidenceFromReports(0, 4),
      rotationWeight: 0.25,
    });
    const ranked = rankCandidates([failing, reliable], now);
    assert.equal(ranked[0]?.id, "good");
  });

  it("spreads picks instead of always returning the same id", () => {
    const pool = [
      cand({ id: "a", assignmentCount: 1, lastAssignedAt: "2026-09-03T02:00:00.000Z" }),
      cand({ id: "b", assignmentCount: 1, lastAssignedAt: "2026-09-03T02:00:00.000Z" }),
      cand({ id: "c", assignmentCount: 1, lastAssignedAt: "2026-09-03T02:00:00.000Z" }),
    ];
    const counts = new Map<string, number>();
    let i = 0;
    const rng = () => {
      i += 1;
      return (i % 10) / 10;
    };
    for (let n = 0; n < 30; n += 1) {
      const picked = pickCandidate(pool, now, rng);
      if (picked) counts.set(picked.id, (counts.get(picked.id) ?? 0) + 1);
    }
    assert.equal(counts.size, 3);
  });
});

describe("computeRotationScore", () => {
  it("boosts brand-new codes", () => {
    const newbie = computeRotationScore(cand({ id: "n", assignmentCount: 0 }), now);
    const veteran = computeRotationScore(
      cand({
        id: "v",
        assignmentCount: 12,
        lastAssignedAt: "2026-09-03T10:00:00.000Z",
      }),
      now,
    );
    assert.ok(newbie.total > veteran.total);
    assert.ok(newbie.newBoost > 0);
    assert.equal(veteran.newBoost, 0);
  });
});
