import assert from "node:assert/strict";
import test from "node:test";
import { buildLatticeFromTokens } from "../buildLattice.js";
import { TypingMachine, acceptsString } from "../typingMachine.js";

function latticeFor(tokens) {
  return buildLatticeFromTokens(tokens);
}

function assertComplete(tokens, inputs) {
  const lattice = latticeFor(tokens);
  for (const input of inputs) {
    assert.deepEqual(acceptsString(lattice, input), { ok: true, complete: true }, input);
  }
}

test("accepts n variants before y-sounds", () => {
  assertComplete([{ text: "信用", yomi: "しんよう" }], ["shinnyou", "shixnyou"]);
});

test("accepts continuous n sequence", () => {
  assertComplete([{ text: "侵入", yomi: "しんにゅう" }], ["shinnnyuu"]);
});

test("accepts representative M1 domain fixtures", () => {
  assertComplete([{ text: "任意加入", yomi: "にんいかにゅう" }], ["ninnikanyuu", "ninnikanixyuu"]);
  assertComplete([{ text: "キャッシュフロー表", yomi: "キャッシュフローひょう" }], [
    "kyasshufuro-hyou",
    "kyasshufuroohyou",
  ]);
  assertComplete([{ text: "バランスシート", yomi: "バランスシート" }], [
    "baransushi-to",
    "baransushiito",
  ]);
});

test("accepts sokuon doubled consonant and explicit small-tsu", () => {
  assertComplete([{ text: "失敗", yomi: "しっぱい" }], ["shippai", "shixtupai"]);
});

test("accepts chouon repeated vowel and hyphen", () => {
  assertComplete([{ text: "シート", yomi: "シート" }], ["shi-to", "shiito"]);
});

test("accepts particle variants", () => {
  assertComplete([{ text: "は", yomi: "は", particle: true }], ["wa", "ha"]);
});

test("committedIndex stays conservative while n before y is unresolved", () => {
  const lattice = latticeFor([{ text: "信用", yomi: "しんよう" }]);
  const machine = new TypingMachine(lattice);

  assert.equal(machine.step("s"), true);
  assert.equal(machine.step("h"), true);
  assert.equal(machine.step("i"), true);
  assert.equal(machine.committedIndex, 1);
  assert.equal(machine.step("n"), true);
  assert.equal(machine.committedIndex, 1);
  assert.equal(machine.step("n"), true);
  assert.equal(machine.committedIndex, 2);
});

test("acceptsString reports failedAt on invalid input", () => {
  const lattice = latticeFor([{ text: "信用", yomi: "しんよう" }]);

  assert.deepEqual(acceptsString(lattice, "shiz"), {
    ok: false,
    complete: false,
    failedAt: 3,
  });
});
