import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MORA_TABLE, normalizeKana } from "../engine/moraTable.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outDir = path.join(dataDir, "v2");

const levels = [1, 2, 3, 4];
const punctuationPattern = /^[、。・，．,.]$/u;
const hiraganaCharPattern = /^[ぁ-んー]$/u;
const katakanaCharPattern = /^[ァ-ヶー]$/u;
const kanjiCharPattern = /^[一-龯々〆ヵヶ]+$/u;
const alphaCharPattern = /^[A-Za-z]$/u;
const digitCharPattern = /^[0-9]$/u;
const particleChars = new Set(["は", "が", "を", "に", "へ", "と", "で", "も", "や", "ね"]);
const yomiCorrections = [
  ["ににかにゅう", "にんいかにゅう"],
  ["きにゅう", "きんゆう"],
  ["うにょう", "うんよう"],
  ["しにょう", "しんよう"],
  ["てつずき", "てつづき"],
];

const reverseTable = buildReverseTable();

function buildReverseTable() {
  const entries = [];
  for (const [mora, options] of Object.entries(MORA_TABLE)) {
    for (const option of options) {
      if (mora === "ん" && option === "n") continue;
      entries.push([option, mora]);
    }
  }
  entries.push(["xtu", "っ"], ["ltu", "っ"], ["xtsu", "っ"], ["ltsu", "っ"]);
  entries.sort((a, b) => b[0].length - a[0].length);
  return entries;
}

function parseRomajiToKana(input) {
  const chunks = String(input ?? "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const mora = [];
  const warnings = [];

  chunks.forEach((source, chunkIndex) => {
    const parsed = parseRomajiChunk(source);
    mora.push(...parsed.mora);
    warnings.push(...parsed.warnings.map((warning) => `chunk ${chunkIndex + 1}: ${warning}`));
  });

  return {
    yomi: applyYomiCorrections(mora.join("")),
    needsReview: warnings.length > 0,
    warnings,
  };
}

function parseRomajiChunk(source) {
  const mora = [];
  const warnings = [];
  let index = 0;

  while (index < source.length) {
    const rest = source.slice(index);

    if (rest[0] === "-") {
      mora.push("ー");
      index += 1;
      continue;
    }

    if (rest.startsWith("xn")) {
      mora.push("ん");
      index += 2;
      continue;
    }

    if (rest.startsWith("nn")) {
      const after = rest[2] || "";
      mora.push("ん");
      index += /[aiueoy]/.test(after) ? 1 : 2;
      continue;
    }

    if (rest[0] === "n") {
      const next = rest[1] || "";
      if (!next || !/[aiueoy]/.test(next)) {
        mora.push("ん");
        index += 1;
        continue;
      }
    }

    if (
      rest.length >= 2 &&
      rest[0] === rest[1] &&
      /[bcdfghjklmpqrstvwxyz]/.test(rest[0]) &&
      rest[0] !== "n"
    ) {
      mora.push("っ");
      index += 1;
      continue;
    }

    const match = reverseTable.find(([romaji]) => rest.startsWith(romaji));
    if (!match) {
      warnings.push(`unknown romaji at ${index}: ${rest.slice(0, 8)}`);
      mora.push(rest[0]);
      index += 1;
      continue;
    }

    mora.push(match[1]);
    index += match[0].length;
  }

  return { mora, warnings };
}

function applyYomiCorrections(yomi) {
  return yomiCorrections.reduce(
    (current, [from, to]) => current.replaceAll(from, to),
    yomi,
  );
}

function charKind(char) {
  if (punctuationPattern.test(char)) return "punct";
  if (hiraganaCharPattern.test(char)) return "hiragana";
  if (katakanaCharPattern.test(char)) return "katakana";
  if (kanjiCharPattern.test(char)) return "kanji";
  if (digitCharPattern.test(char)) return "kanji";
  if (alphaCharPattern.test(char)) return "raw";
  return "other";
}

function splitDisplay(display) {
  const tokens = [];
  let current = "";
  let currentKind = "";

  for (const char of display) {
    const kind = charKind(char);
    if (kind === "punct") {
      if (current) tokens.push({ text: current, kind: currentKind });
      tokens.push({ text: char, kind: "punct" });
      current = "";
      currentKind = "";
      continue;
    }

    const mergeKind = kind === "other" ? currentKind : kind;
    if (current && mergeKind === currentKind) {
      current += char;
      continue;
    }

    if (current) tokens.push({ text: current, kind: currentKind });
    current = char;
    currentKind = mergeKind || kind;
  }

  if (current) tokens.push({ text: current, kind: currentKind });
  return tokens;
}

function inputWithoutRawChunks(input, parts) {
  const chunks = String(input ?? "").trim().split(/\s+/).filter(Boolean);
  const rawParts = parts.filter((part) => part.kind === "raw");
  let chunkIndex = 0;

  for (const part of rawParts) {
    const expected = part.text.toLowerCase();
    while (chunkIndex < chunks.length && chunks[chunkIndex].toLowerCase() !== expected) {
      chunkIndex += 1;
    }
    if (chunkIndex < chunks.length) {
      chunks.splice(chunkIndex, 1);
    }
  }

  return chunks.join(" ");
}

function tokenPrefix(token) {
  if (!token) return "";
  if (token.kind === "hiragana" || token.kind === "katakana") {
    return normalizeKana(token.text)[0] || "";
  }
  return "";
}

function findTokenPrefix(flatYomi, prefix, fromIndex) {
  const smallYouon = new Set(["ゃ", "ゅ", "ょ"]);
  let found = flatYomi.indexOf(prefix, fromIndex);
  while (found >= 0) {
    if (!smallYouon.has(flatYomi[found + prefix.length])) return found;
    found = flatYomi.indexOf(prefix, found + 1);
  }
  return -1;
}

function allocateYomi(parts, flatYomi) {
  let offset = 0;
  const tokens = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.kind === "punct") {
      tokens.push({ text: part.text, yomi: "" });
      continue;
    }

    if (part.kind === "raw") {
      tokens.push({ text: part.text, kind: "raw" });
      continue;
    }

    if (part.kind === "hiragana" || part.kind === "katakana") {
      const expected = normalizeKana(part.text);
      const actual = flatYomi.slice(offset, offset + expected.length);
      tokens.push({ text: part.text, yomi: actual === expected ? actual : "" });
      if (actual === expected) offset += expected.length;
      continue;
    }

    const nextPrefix = tokenPrefix(parts.slice(i + 1).find((next) => next.kind !== "punct" && next.kind !== "raw"));
    let end = flatYomi.length;
    if (nextPrefix) {
      const found = findTokenPrefix(flatYomi, nextPrefix, offset + 1);
      if (found >= 0) end = found;
      else end = offset;
    }

    tokens.push({ text: part.text, yomi: flatYomi.slice(offset, end) });
    offset = end;
  }

  if (offset !== flatYomi.length) {
    const tail = flatYomi.slice(offset);
    const lastReadable = [...tokens].reverse().find((token) => "yomi" in token && token.yomi !== "");
    if (lastReadable) lastReadable.yomi += tail;
  }

  markParticles(tokens);
  return { tokens, needsReview: false, warnings: [] };
}

function markParticles(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.text.length !== 1 || !particleChars.has(token.text)) continue;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (!prev || !next || prev.yomi === "" || next.yomi === "") continue;
    token.particle = true;
  }
}

function migrateQuestion(question) {
  const parts = splitDisplay(question.display);
  const parsed = parseRomajiToKana(inputWithoutRawChunks(question.input, parts));
  const allocated = allocateYomi(parts, parsed.yomi);
  const needsReview = parsed.needsReview || allocated.needsReview;
  const tokens = needsReview
    ? [{ text: question.display, yomi: parsed.yomi }]
    : allocated.tokens;
  const migrated = {
    id: question.id,
    level: question.level,
    category: question.category,
    display: question.display,
    input: question.input,
    tokens,
    tags: question.tags || [],
  };

  if (needsReview) {
    migrated.migrationFallback = true;
    migrated.reviewNotes = [...parsed.warnings, ...allocated.warnings];
  }

  return migrated;
}

await mkdir(outDir, { recursive: true });

let total = 0;
let reviewTotal = 0;

for (const level of levels) {
  const file = path.join(dataDir, `questions_level${level}.json`);
  const data = JSON.parse(await readFile(file, "utf8"));
  const migrated = data.map(migrateQuestion);
  const reviewCount = migrated.filter((question) => question.needsReview).length;
  const fallbackCount = migrated.filter((question) => question.migrationFallback).length;
  total += migrated.length;
  reviewTotal += reviewCount;

  const outFile = path.join(outDir, `questions_level${level}.json`);
  await writeFile(outFile, `${JSON.stringify(migrated, null, 2)}\n`);
  console.log(`level ${level}: ${migrated.length} questions, needsReview ${reviewCount}, fallback ${fallbackCount} -> ${path.relative(rootDir, outFile)}`);
}

console.log(`total: ${total}`);
console.log(`needsReview: ${reviewTotal}`);
