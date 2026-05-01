import assert from "node:assert/strict";
import test from "node:test";
import { MORA_TABLE, PARTICLE_TABLE, normalizeKana } from "../moraTable.js";
import { moraSplit } from "../mora.js";

test("mora table exposes expected variants and normalization", () => {
  assert.ok(MORA_TABLE["しゃ"].includes("sha"));
  assert.ok(MORA_TABLE["しゃ"].includes("sya"));
  assert.deepEqual(PARTICLE_TABLE["は"], ["wa", "ha"]);
  assert.equal(normalizeKana("シャ"), "しゃ");
});

test("moraSplit handles long-match youon and special mora", () => {
  assert.deepEqual(moraSplit("しょうらい"), ["しょ", "う", "ら", "い"]);
  assert.deepEqual(moraSplit("にんいかにゅう"), ["に", "ん", "い", "か", "にゅ", "う"]);
  assert.deepEqual(moraSplit("キャッシュフロー"), ["きゃ", "っ", "しゅ", "ふ", "ろ", "ー"]);
});

test("moraSplit fails fast on unknown mora", () => {
  assert.throws(() => moraSplit("しょA"), /Unknown mora/);
});
