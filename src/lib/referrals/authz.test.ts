import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../app-error.ts";
import { assertAdmin, assertOwns, canMutateReferral, isAdminRole } from "./authz.ts";

describe("authorization", () => {
  it("lets owners edit their code and nobody else", () => {
    assert.equal(canMutateReferral("u1", "u1"), true);
    assert.equal(canMutateReferral("u1", "u2"), false);
    assert.doesNotThrow(() => assertOwns("u1", "u1"));
    assert.throws(() => assertOwns("u1", "u2"), AppError);
  });

  it("blocks admin routes for members", () => {
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("member"), false);
    assert.throws(() => assertAdmin("member"), AppError);
    assert.doesNotThrow(() => assertAdmin("admin"));
  });
});
