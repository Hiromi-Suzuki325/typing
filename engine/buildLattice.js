import { moraSplit } from "./mora.js";
import { MORA_TABLE, PARTICLE_TABLE, normalizeKana } from "./moraTable.js";
import { resolveChouon, resolveN, resolveSokuon } from "./specialMora.js";

function optionsForMora(mora, prevMora, nextMora, particle) {
  if (particle && PARTICLE_TABLE[mora]) return PARTICLE_TABLE[mora];
  if (mora === "ん") return resolveN(prevMora, nextMora);
  if (mora === "っ") return resolveSokuon(nextMora);
  if (mora === "ー") return resolveChouon(prevMora);

  const options = MORA_TABLE[mora];
  if (!options) {
    throw new Error(`Unknown mora: ${mora}`);
  }
  return options;
}

export function buildLatticeFromTokens(tokens) {
  const lattice = [];
  const segments = [];

  tokens.forEach((token, tokenIndex) => {
    if (token?.kind === "raw") {
      segments.push({
        kind: "raw",
        token,
        tokenIndex,
        text: String(token.text ?? ""),
      });
      return;
    }

    if (token?.yomi === "") return;

    const yomi = normalizeKana(token?.yomi ?? token?.text ?? "");
    const moras = moraSplit(yomi);
    let charStart = 0;

    for (const mora of moras) {
      const charEnd = charStart + mora.length;
      segments.push({
        kind: "mora",
        token,
        tokenIndex,
        mora,
        displayRange: { tokenIndex, charStart, charEnd },
      });
      charStart = charEnd;
    }
  });

  segments.forEach((segment, index) => {
    if (segment.kind === "raw") {
      lattice.push({
        kind: "raw",
        text: segment.text,
        displayRange: { tokenIndex: segment.tokenIndex },
        options: [segment.text.toLowerCase()],
      });
      return;
    }

    const prevMora = previousMora(segments, index);
    const nextMora = nextMoraAfter(segments, index);
    const particle = Boolean(segment.token.particle);

    lattice.push({
      kind: "mora",
      mora: segment.mora,
      particle,
      displayRange: segment.displayRange,
      options: optionsForMora(segment.mora, prevMora, nextMora, particle),
    });
  });

  return lattice;
}

function previousMora(segments, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (segments[cursor].kind === "mora") return segments[cursor].mora;
  }
  return null;
}

function nextMoraAfter(segments, index) {
  for (let cursor = index + 1; cursor < segments.length; cursor += 1) {
    if (segments[cursor].kind === "mora") return segments[cursor].mora;
  }
  return null;
}
