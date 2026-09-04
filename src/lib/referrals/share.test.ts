import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countsAsListingCopy, formatShares, shareBlockReason } from "./share.ts";

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
  it("pluralizes", () => {
    assert.equal(formatShares(0), "0 shares");
    assert.equal(formatShares(1), "1 share");
    assert.equal(formatShares(18), "18 shares");
  });
});
