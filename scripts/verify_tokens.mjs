import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLatticeFromTokens } from "../engine/buildLattice.js";
import { moraSplit } from "../engine/mora.js";
import { acceptsString } from "../engine/typingMachine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const levels = [1, 2, 3, 4];
const errors = [];
const reviewItems = [];
const counts = new Map();

function compactInput(input) {
  return String(input || "").toLowerCase().replace(/[ \t]/g, "");
}

function verifyAccepted(question, input, label) {
  const lattice = buildLatticeFromTokens(question.tokens);
  const result = acceptsString(lattice, compactInput(input));
  if (!result.ok || !result.complete) {
    errors.push(`${question.id}: ${label} rejected at ${result.failedAt ?? "end"} (${input})`);
    return false;
  }
  return true;
}

function mutateInput(input) {
  const chars = compactInput(input).split("");
  if (chars.length === 0) return "x";
  const index = Math.floor(chars.length / 2);
  chars[index] = chars[index] === "a" ? "i" : "a";
  return chars.join("");
}

function variantInputs(input) {
  const variants = new Set();
  const compact = compactInput(input);
  variants.add(compact);
  variants.add(compact.replaceAll("shi", "si").replaceAll("sha", "sya").replaceAll("shu", "syu").replaceAll("sho", "syo"));
  variants.add(compact.replaceAll("chi", "ti").replaceAll("cha", "tya").replaceAll("chu", "tyu").replaceAll("cho", "tyo"));
  variants.add(compact.replaceAll("tsu", "tu").replaceAll("fu", "hu").replaceAll("ji", "zi"));
  return [...variants].filter(Boolean);
}

function verifyStructure(question, location) {
  if (!Array.isArray(question.tokens)) {
    errors.push(`${location}: tokens must be an array`);
    return null;
  }

  const display = question.tokens.map((token) => token.text).join("");
  if (display !== question.display) {
    errors.push(`${location}: tokens.text does not match display`);
  }

  for (const [index, token] of question.tokens.entries()) {
    if (typeof token.text !== "string") errors.push(`${location} token ${index + 1}: text must be string`);
    if (token.kind === "raw") continue;
    if (typeof token.yomi !== "string") errors.push(`${location} token ${index + 1}: yomi must be string`);
    if (token.yomi) {
      try {
        moraSplit(token.yomi);
      } catch (error) {
        errors.push(`${location} token ${index + 1}: ${error.message}`);
      }
    }
  }

  try {
    return buildLatticeFromTokens(question.tokens);
  } catch (error) {
    errors.push(`${location}: buildLattice failed: ${error.message}`);
    return null;
  }
}

function verifyFixtures() {
  const fixtures = [
    {
      name: "信用",
      tokens: [{ text: "信用", yomi: "しんよう" }],
      accepted: ["shinyou", "shinnyou", "shixnyou"],
    },
    {
      name: "任意加入",
      tokens: [{ text: "任意加入", yomi: "にんいかにゅう" }],
      accepted: ["ninnikanyuu"],
    },
    {
      name: "キャッシュフロー表",
      tokens: [
        { text: "キャッシュフロー", yomi: "キャッシュフロー" },
        { text: "表", yomi: "ひょう" },
      ],
      accepted: ["kyasshufuro-hyou", "kyasshufuroohyou", "kyaxtushufuro-hyou"],
    },
    {
      name: "バランスシート",
      tokens: [{ text: "バランスシート", yomi: "バランスシート" }],
      accepted: ["baransushi-to", "baransushiito"],
    },
    {
      name: "助詞",
      tokens: [
        { text: "私", yomi: "わたし" },
        { text: "は", yomi: "は", particle: true },
        { text: "駅", yomi: "えき" },
        { text: "へ", yomi: "へ", particle: true },
        { text: "本", yomi: "ほん" },
        { text: "を", yomi: "を", particle: true },
      ],
      accepted: ["watashiwaekiehonwo", "watashihaekihehonwo", "watashiwaekiehono"],
    },
  ];

  for (const fixture of fixtures) {
    const lattice = buildLatticeFromTokens(fixture.tokens);
    for (const input of fixture.accepted) {
      const result = acceptsString(lattice, compactInput(input));
      assert.equal(result.complete, true, `${fixture.name}: ${input}`);
    }
  }
}

function verifyDataFixtures(data) {
  const wrongTetsuzuki = data.filter((question) =>
    question.tokens.some((token) => String(token.yomi || "").includes("てつずき"))
  );
  assert.equal(wrongTetsuzuki.length, 0, "手続き must be read as てつづき");

  const optionalEnrollment = data.find((question) => question.id === "fp3_l1_0036");
  if (optionalEnrollment) {
    assert.equal(
      optionalEnrollment.tokens.map((token) => token.yomi || "").join(""),
      "にんいかにゅう",
      "任意加入 keeps n before i",
    );
  }

  const ownershipTransfer = data.find((question) => question.id === "fp3_l1_0246");
  if (ownershipTransfer) {
    assert.equal(
      ownershipTransfer.tokens.map((token) => token.yomi || "").join(""),
      "しょゆうけんいてんとうき",
      "所有権移転登記 keeps n before a word-boundary vowel",
    );
  }
}

verifyFixtures();

for (const level of levels) {
  const file = path.join(rootDir, "data", "v2", `questions_level${level}.json`);
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(rootDir, file)}: ${error.message}`);
    continue;
  }

  counts.set(level, data.length);
  verifyDataFixtures(data);

  for (const [index, question] of data.entries()) {
    const location = `level ${level} item ${index + 1}`;
    verifyStructure(question, location);

    if (question.needsReview) {
      reviewItems.push(`${question.id}: ${(question.reviewNotes || []).join("; ")}`);
      continue;
    }

    if (question.input) {
      verifyAccepted(question, question.input, "legacy input");
      for (const variant of variantInputs(question.input)) verifyAccepted(question, variant, "variant");

      const bad = mutateInput(question.input);
      const badResult = acceptsString(buildLatticeFromTokens(question.tokens), bad);
      if (badResult.complete) errors.push(`${question.id}: mutated input unexpectedly accepted (${bad})`);
    }
  }

  const sentenceFixtures = data.filter((question) => /[、。]/.test(question.display)).slice(0, 3);
  if (level >= 3 && sentenceFixtures.length < 3) {
    errors.push(`level ${level}: expected at least 3 punctuation fixtures`);
  }
}

if (reviewItems.length > 0) {
  errors.push(`needsReview items: ${reviewItems.length}`);
  await writeFile(
    path.join(rootDir, "data", "v2", "needs_review.txt"),
    `${reviewItems.join("\n")}\n`
  );
}

if (errors.length > 0) {
  console.error(errors.slice(0, 80).join("\n"));
  if (errors.length > 80) console.error(`... ${errors.length - 80} more errors`);
  process.exit(1);
}

console.log([...counts].map(([level, count]) => `level ${level}: ${count}`).join("\n"));
console.log(`total: ${[...counts.values()].reduce((sum, count) => sum + count, 0)}`);
console.log("token verification passed");
