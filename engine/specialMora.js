import { MORA_TABLE, normalizeKana } from "./moraTable.js";

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

function primaryOption(mora) {
  const normalized = normalizeKana(mora);
  const options = MORA_TABLE[normalized];
  return options?.[0] ?? "";
}

function consonantForSokuon(mora) {
  const option = primaryOption(mora);
  if (!option || VOWELS.has(option[0]) || option[0] === "n") {
    return null;
  }
  if (option.startsWith("ch")) return "t";
  if (option.startsWith("sh")) return "s";
  if (option.startsWith("ts")) return "t";
  return option[0];
}

function vowelOfMora(mora) {
  const option = primaryOption(mora);
  for (let index = option.length - 1; index >= 0; index -= 1) {
    if (VOWELS.has(option[index])) return option[index];
  }
  return null;
}

export function resolveN(_prevMora, _nextMora) {
  return ["n", "nn", "xn"];
}

export function resolveSokuon(nextMora) {
  const options = ["xtu", "ltu"];
  const consonant = nextMora ? consonantForSokuon(nextMora) : null;
  if (consonant) options.push(consonant);
  return options;
}

export function resolveChouon(prevMora) {
  const vowel = prevMora ? vowelOfMora(prevMora) : null;
  return vowel ? [vowel, "-"] : ["-"];
}
