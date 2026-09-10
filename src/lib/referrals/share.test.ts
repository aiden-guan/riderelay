import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countsAsListingCopy, canMoveBoost, formatPoints, formatShares, pointsEarned, shareBlockReason, unspentPoints } from "./share.ts";

const visitor = "11111111-1111-1111-1111-111111111111";
const other = "22222222-2222-2222-2222-222222222222";

describe("shareBlockReason", () => {
  it("blocks a user crediting their own invite", () => {
    assert.equal(
      shareBlockReason({
        inviterUserId: "ada",
        inviterVisitorId: visitor,
        visitorId: other,
        actorUserId: "ada",
        listingOwnerId: null,
      }),
      "self_account",
    );
  });

  it("blocks the same browser as the inviter", () => {
    assert.equal(
      shareBlockReason({
        inviterUserId: "ada",
        inviterVisitorId: visitor,
        visitorId: visitor,
        actorUserId: null,
        listingOwnerId: null,
      }),
      "self_device",
    );
  });

  it("blocks copying your own listing to farm a share", () => {
    assert.equal(
      shareBlockReason({
        inviterUserId: "bob",
        inviterVisitorId: other,
        visitorId: visitor,
        actorUserId: "ada",
        listingOwnerId: "ada",
      }),
      "self_listing",
    );
  });

  it("allows a different person using the site through an invite", () => {
    assert.equal(
      shareBlockReason({
        inviterUserId: "ada",
        inviterVisitorId: visitor,
        visitorId: other,
        actorUserId: "bob",
        listingOwnerId: "ada",
      }),
      null,
    );
  });
});

describe("countsAsListingCopy", () => {
  it("does not count the owner copying their own code", () => {
    assert.equal(
      countsAsListingCopy({
        actorUserId: "ada",
        listingOwnerId: "ada",
        visitorId: visitor,
        ownerVisitorId: visitor,
      }),
      false,
    );
  });

  it("counts a stranger copying the code", () => {
    assert.equal(
      countsAsListingCopy({
        actorUserId: "bob",
        listingOwnerId: "ada",
        visitorId: other,
        ownerVisitorId: visitor,
      }),
      true,
    );
  });
});

describe("formatShares", () => {
  it("pluralizes friends referred", () => {
    assert.equal(formatShares(0), "0 friends");
    assert.equal(formatShares(1), "1 friend");
    assert.equal(formatShares(18), "18 friends");
  });
});

describe("invite points", () => {
  it("pays 10 points per credited friend", () => {
    assert.equal(pointsEarned(0), 0);
    assert.equal(pointsEarned(3), 30);
  });

  it("treats leftover points as unspent", () => {
    assert.equal(unspentPoints(30, 12), 18);
    assert.equal(unspentPoints(10, 10), 0);
  });

  it("lets you move points onto a listing you can afford", () => {
    assert.equal(
      canMoveBoost({ earned: 30, othersAllocated: 10, current: 3, delta: 7 }),
      true,
    );
    assert.equal(
      canMoveBoost({ earned: 30, othersAllocated: 10, current: 3, delta: 18 }),
      false,
    );
    assert.equal(
      canMoveBoost({ earned: 30, othersAllocated: 0, current: 5, delta: -2 }),
      true,
    );
    assert.equal(
      canMoveBoost({ earned: 30, othersAllocated: 0, current: 1, delta: -2 }),
      false,
    );
  });

  it("formats points", () => {
    assert.equal(formatPoints(0), "0 pts");
    assert.equal(formatPoints(1), "1 pt");
    assert.equal(formatPoints(12), "12 pts");
  });
});
