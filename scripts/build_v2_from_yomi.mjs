import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MORA_TABLE, normalizeKana } from "../engine/moraTable.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "data", "source");
const outDir = path.join(rootDir, "data", "v2");

const levels = [1, 2, 3, 4];
const punctuationPattern = /^[、。・，．,.]$/u;
const hiraganaCharPattern = /^[ぁ-んー]$/u;
const katakanaCharPattern = /^[ァ-ヶー]$/u;
const kanjiCharPattern = /^[一-龯々〆ヵヶ]+$/u;
const alphaCharPattern = /^[A-Za-z]$/u;
const digitCharPattern = /^[0-9]$/u;
const particleChars = new Set(["は", "が", "を", "に", "へ", "と", "で", "も", "や", "ね"]);

function charKind(char) {
  if (char === "ー") return "other";
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
  const issues = [];

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
      if (actual !== expected) {
        issues.push(`hiragana/katakana mismatch at part ${i}: expected "${expected}", got "${actual}"`);
        tokens.push({ text: part.text, yomi: "" });
        continue;
      }
      tokens.push({ text: part.text, yomi: actual });
      offset += expected.length;
      continue;
    }

    // kanji
    const nextPrefix = tokenPrefix(parts.slice(i + 1).find((next) => next.kind === "hiragana" || next.kind === "katakana"));
    let end = flatYomi.length;
    if (nextPrefix) {
      const found = findTokenPrefix(flatYomi, nextPrefix, offset + 1);
      if (found >= 0) end = found;
    }

    const slice = flatYomi.slice(offset, end);
    tokens.push({ text: part.text, yomi: slice });
    offset = end;
  }

  if (offset !== flatYomi.length) {
    issues.push(`yomi length mismatch: consumed ${offset}, total ${flatYomi.length}`);
  }

  return { tokens, issues };
}

function markParticles(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.text || token.text.length !== 1 || !particleChars.has(token.text)) continue;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    if (!prev || !next) continue;
    if (prev.yomi === "" && prev.kind !== "raw") continue;
    if (next.yomi === "" && next.kind !== "raw") continue;
    token.particle = true;
  }
}

function validateTokens(tokens) {
  for (const token of tokens) {
    if (token.kind === "raw") continue;
    if (token.text.length === 0) continue;
    if (token.yomi === "" && !punctuationPattern.test(token.text)) {
      return false;
    }
  }
  return true;
}

function detectKanjiOverflow(tokens, flatYomi) {
  const kanjiOnlyTokens = tokens.filter((t) => t.kind !== "raw" && !punctuationPattern.test(t.text));
  for (let i = 0; i < kanjiOnlyTokens.length - 1; i++) {
    const t = kanjiOnlyTokens[i];
    if (!t.yomi) continue;
    if (t.yomi.length > t.text.length * 4) {
      return true;
    }
  }
  return false;
}

function buildTokens(display, yomi) {
  const parts = splitDisplay(display);
  const flatYomi = normalizeKana(yomi);

  if (parts.length === 1 && parts[0].kind === "kanji") {
    return { tokens: [{ text: display, yomi: flatYomi }], fallback: false };
  }

  const allocated = allocateYomi(parts, flatYomi);
  const ok = validateTokens(allocated.tokens) && allocated.issues.length === 0 && !detectKanjiOverflow(allocated.tokens, flatYomi);

  if (!ok) {
    return {
      tokens: [{ text: display, yomi: flatYomi }],
      fallback: true,
      issues: allocated.issues,
    };
  }

  markParticles(allocated.tokens);
  return { tokens: allocated.tokens, fallback: false };
}

function yomiToRomaji(yomi) {
  const flat = normalizeKana(yomi);
  const result = [];
  let i = 0;
  while (i < flat.length) {
    const two = flat.slice(i, i + 2);
    const one = flat[i];
    if (MORA_TABLE[two]) {
      result.push(MORA_TABLE[two][0]);
      i += 2;
      continue;
    }
    if (one === "ん") {
      result.push("nn");
      i += 1;
      continue;
    }
    if (one === "っ") {
      const next = flat[i + 1];
      if (next && MORA_TABLE[next]) {
        const nextRomaji = MORA_TABLE[next][0];
        result.push(nextRomaji[0]);
      } else {
        result.push("xtu");
      }
      i += 1;
      continue;
    }
    if (one === "ー") {
      const prev = result[result.length - 1] ?? "";
      const lastChar = prev[prev.length - 1] ?? "";
      result.push(lastChar);
      i += 1;
      continue;
    }
    if (MORA_TABLE[one]) {
      result.push(MORA_TABLE[one][0]);
      i += 1;
      continue;
    }
    i += 1;
  }
  return result.join("");
}

function buildInput(tokens) {
  return tokens
    .map((token) => {
      if (token.kind === "raw") return token.text;
      if (!token.yomi) return "";
      return yomiToRomaji(token.yomi);
    })
    .join("");
}

function buildQuestion(source) {
  const { tokens, fallback, issues } = buildTokens(source.display, source.yomi);
  const input = buildInput(tokens);

  const result = {
    id: source.id,
    level: source.level,
    category: source.category,
    display: source.display,
    input,
    tokens,
    tags: source.tags || [source.category],
  };

  if (fallback) {
    result.fallback = true;
    if (issues && issues.length) result.issues = issues;
  }
  return result;
}

await mkdir(outDir, { recursive: true });

let total = 0;
let fallbackTotal = 0;

for (const level of levels) {
  const file = path.join(sourceDir, `level${level}.json`);
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (err) {
    console.warn(`skip level ${level}: ${err.message}`);
    continue;
  }
  const questions = data.map(buildQuestion);
  const fallbackCount = questions.filter((q) => q.fallback).length;
  total += questions.length;
  fallbackTotal += fallbackCount;

  const outFile = path.join(outDir, `questions_level${level}.json`);
  await writeFile(outFile, `${JSON.stringify(questions, null, 2)}\n`);
  console.log(`level ${level}: ${questions.length} questions, fallback ${fallbackCount} -> ${path.relative(rootDir, outFile)}`);

  if (fallbackCount > 0) {
    questions.filter((q) => q.fallback).forEach((q) => {
      console.log(`  fallback: ${q.id} ${q.display}`);
    });
  }
}

console.log(`total: ${total}, fallback: ${fallbackTotal}`);
