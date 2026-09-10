import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractReferralToken,
  extractReferralUrl,
  normalizeCodeKey,
  usernameSchemaError,
  validateReferralCode,
  validateReferralUrl,
} from "./validate.ts";

const limeHosts = ["li.me", "www.li.me", "lime.bike"];
const limeShareCopy =
  "Want a $5 ride credit with Lime? Use this link to download the app:\nhttps://lime.bike/referral_signin/RKTQDED6A27";

describe("validateReferralCode", () => {
  it("accepts a typical provider code", () => {
    const result = validateReferralCode("  RideAda ");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, "RideAda");
  });

  it("strips a leading $ from cashtags", () => {
    const result = validateReferralCode("$campus", "^[A-Za-z0-9_]{3,20}$");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, "campus");
  });

  it("rejects empty, tiny, huge, and unsafe codes", () => {
    assert.equal(validateReferralCode("ab").ok, false);
    assert.equal(validateReferralCode("x".repeat(40)).ok, false);
    assert.equal(validateReferralCode("<script>hi</script>").ok, false);
    assert.equal(validateReferralCode("bad code!").ok, false);
  });
});

describe("validateReferralUrl", () => {
  it("accepts an https allowlisted host and normalizes it", () => {
    const result = validateReferralUrl("https://www.li.me/refer/RIDEADA#x", limeHosts);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.startsWith("https://www.li.me/refer/RIDEADA"), true);
      assert.equal(result.value.includes("#"), false);
    }
  });

  it("accepts a Lime invite link and keeps the token case", () => {
    const result = validateReferralUrl(
      "https://lime.bike/referral_signin/RIP3PXL4TC3",
      limeHosts,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, "https://lime.bike/referral_signin/RIP3PXL4TC3");
    }
  });

  it("strips Lime share copy and keeps only the invite URL", () => {
    const result = validateReferralUrl(limeShareCopy, limeHosts);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, "https://lime.bike/referral_signin/RKTQDED6A27");
    }
    assert.equal(
      extractReferralUrl(limeShareCopy, limeHosts),
      "https://lime.bike/referral_signin/RKTQDED6A27",
    );
  });

  it("rejects malformed, http, foreign, and credentialed urls", () => {
    assert.equal(validateReferralUrl("not-a-url", limeHosts).ok, false);
    assert.equal(validateReferralUrl("http://www.li.me/refer/x", limeHosts).ok, false);
    assert.equal(validateReferralUrl("javascript:alert(1)", limeHosts).ok, false);
    assert.equal(validateReferralUrl("https://evil.example/phish", limeHosts).ok, false);
    assert.equal(validateReferralUrl("https://user:pass@www.li.me/refer/x", limeHosts).ok, false);
  });
});

describe("extractReferralToken", () => {
  it("pulls the Lime path token", () => {
    assert.equal(
      extractReferralToken("https://lime.bike/referral_signin/RIP3PXL4TC3"),
      "RIP3PXL4TC3",
    );
  });

  it("pulls the Lime path token from share copy", () => {
    assert.equal(extractReferralToken(limeShareCopy), "RKTQDED6A27");
  });
});

describe("normalizeCodeKey", () => {
  it("collapses duplicates regardless of case and spacing", () => {
    assert.equal(normalizeCodeKey(" RideAda "), normalizeCodeKey("rideada"));
  });
});

describe("usernameSchemaError", () => {
  it("allows a simple handle and blocks reserved or unsafe ones", () => {
    assert.equal(usernameSchemaError("ada"), null);
    assert.ok(usernameSchemaError("ab"));
    assert.ok(usernameSchemaError("admin"));
    assert.ok(usernameSchemaError("1ada"));
  });
});
