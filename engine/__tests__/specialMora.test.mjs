import assert from "node:assert/strict";
import test from "node:test";
import { resolveChouon, resolveN, resolveSokuon } from "../specialMora.js";

test("resolveN accepts legacy single n in every context", () => {
  assert.deepEqual(resolveN(null, "あ"), ["n", "nn", "xn"]);
  assert.deepEqual(resolveN(null, "よ"), ["n", "nn", "xn"]);
  assert.deepEqual(resolveN(null, "か"), ["n", "nn", "xn"]);
});

test("resolveSokuon accepts explicit small-tsu and doubled consonant", () => {
  assert.deepEqual(resolveSokuon("か"), ["xtu", "ltu", "k"]);
  assert.deepEqual(resolveSokuon(null), ["xtu", "ltu"]);
});

test("resolveChouon accepts repeated vowel and hyphen", () => {
  assert.deepEqual(resolveChouon("か"), ["a", "-"]);
});
