import assert from "node:assert/strict";
import test from "node:test";
import { buildLatticeFromTokens } from "../buildLattice.js";

test("buildLatticeFromTokens expands normal token moras", () => {
  const lattice = buildLatticeFromTokens([{ text: "信用", yomi: "しんよう" }]);

  assert.equal(lattice.length, 4);
  assert.deepEqual(lattice.map((entry) => entry.mora), ["し", "ん", "よ", "う"]);
  assert.ok(lattice[1].options.includes("n"));
  assert.ok(lattice[1].options.includes("nn"));
  assert.ok(lattice[1].options.includes("xn"));
});

test("buildLatticeFromTokens skips punctuation yomi", () => {
  assert.deepEqual(buildLatticeFromTokens([{ text: "。", yomi: "" }]), []);
});

test("buildLatticeFromTokens passes raw tokens through as one segment", () => {
  const lattice = buildLatticeFromTokens([{ text: "NISA", kind: "raw" }]);

  assert.equal(lattice.length, 1);
  assert.equal(lattice[0].kind, "raw");
  assert.deepEqual(lattice[0].options, ["nisa"]);
});

test("buildLatticeFromTokens propagates particle metadata and options", () => {
  const lattice = buildLatticeFromTokens([{ text: "は", yomi: "は", particle: true }]);

  assert.equal(lattice[0].particle, true);
  assert.deepEqual(lattice[0].options, ["wa", "ha"]);
});
