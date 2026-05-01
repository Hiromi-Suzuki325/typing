import { MORA_TABLE, normalizeKana } from "./moraTable.js";

const SPECIAL_MORA = new Set(["ん", "っ", "ー"]);
const MAX_MORA_LENGTH = Math.max(...Object.keys(MORA_TABLE).map((mora) => mora.length), 1);

export function moraSplit(input) {
  const normalized = normalizeKana(input);
  const result = [];

  for (let index = 0; index < normalized.length; ) {
    let matched = "";
    const maxLength = Math.min(MAX_MORA_LENGTH, normalized.length - index);

    for (let length = maxLength; length > 0; length -= 1) {
      const candidate = normalized.slice(index, index + length);
      if (MORA_TABLE[candidate] || SPECIAL_MORA.has(candidate)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      throw new Error(`Unknown mora at index ${index}: ${normalized[index]}`);
    }

    result.push(matched);
    index += matched.length;
  }

  return result;
}
