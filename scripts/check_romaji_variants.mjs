const romajiVariants = [
  ["shi", "si"],
  ["chi", "ti"],
  ["tsu", "tu"],
  ["fu", "hu"],
  ["ji", "zi"],
  ["sha", "sya"],
  ["shu", "syu"],
  ["sho", "syo"],
  ["cha", "tya"],
  ["chu", "tyu"],
  ["cho", "tyo"],
  ["ja", "zya"],
  ["ju", "zyu"],
  ["jo", "zyo"],
];

const cases = [
  { input: "shisan", typed: "sisan", ok: true, note: "shi/si" },
  { input: "sisan", typed: "shisan", ok: true, note: "si/shi" },
  { input: "tsumitate", typed: "tumitate", ok: true, note: "tsu/tu" },
  { input: "tumitate", typed: "tsumitate", ok: true, note: "tu/tsu" },
  { input: "jibaiseki", typed: "zibaiseki", ok: true, note: "ji/zi" },
  { input: "zidousha", typed: "jidousha", ok: true, note: "zi/ji" },
  { input: "shakai hoken", typed: "syakai hoken", ok: true, note: "sha/sya" },
  { input: "sya sai", typed: "sha sai", ok: true, note: "sya/sha" },
  { input: "chochiku", typed: "tyotiku", ok: true, note: "cho/tyo + chi/ti" },
  { input: "tyousa", typed: "chousa", ok: true, note: "tyo/cho" },
  { input: "fuka nenkin", typed: "huka nenkin", ok: true, note: "fu/hu" },
  { input: "huyou koujo", typed: "fuyou koujo", ok: true, note: "hu/fu" },
  { input: "kouteki nenkin", typed: "koutekinenkin", ok: true, note: "without spaces" },
  { input: "shotoku zei", typed: "syotokuzei", ok: true, note: "variant + without spaces" },
  { input: "roomaji", typed: "roomaji", ok: true, note: "long vowel oo" },
  { input: "ro-maji", typed: "ro-maji", ok: true, note: "loanword long mark" },
  { input: "ro-maji", typed: "roomaji", ok: true, note: "loanword long mark as vowel" },
  { input: "kouteki nenkin", typed: "koutekinenkin", ok: true, note: "long vowel ou + without spaces" },
  { input: "shuushi", typed: "shuushi", ok: true, note: "long vowel uu" },
  { input: "shouhi zei", typed: "syouhizei", ok: true, note: "variant + long vowel + without spaces" },
  { input: "shisan", typed: "shiken", ok: false, note: "different word" },
];

function normalizeTypingInput(input) {
  return input.toLowerCase().replaceAll(" ", "");
}

function buildInputSegments(input) {
  const segments = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] === " ") {
      index++;
      continue;
    }

    const variant = findVariantAt(input, index);
    if (variant) {
      segments.push({ typedOptions: variant.options });
      index += variant.display.length;
      continue;
    }

    segments.push({ typedOptions: [input[index]] });
    index++;
  }

  return segments;
}

function findVariantAt(input, index) {
  if (input[index] === "-") {
    return { display: "-", options: ["", "-", getPreviousVowel(input, index)] };
  }

  let match = null;

  for (const pair of romajiVariants) {
    for (const option of pair) {
      if (!input.startsWith(option, index)) continue;
      if (!match || option.length > match.display.length) {
        match = { display: option, options: pair };
      }
    }
  }

  return match;
}

function getPreviousVowel(input, index) {
  for (let i = index - 1; i >= 0; i--) {
    const char = input[i];
    if ("aiueo".includes(char)) return char;
  }
  return "";
}

function buildCandidates(input) {
  let candidates = [""];

  for (const segment of buildInputSegments(input)) {
    const nextCandidates = [];
    for (const candidate of candidates) {
      for (const option of segment.typedOptions) {
        nextCandidates.push(candidate + option);
      }
    }
    candidates = [...new Set(nextCandidates)].slice(0, 64);
  }

  return candidates;
}

const results = cases.map((testCase) => {
  const candidates = buildCandidates(testCase.input);
  const typed = normalizeTypingInput(testCase.typed);
  const actual = candidates.includes(typed);
  return {
    ...testCase,
    actual,
    passed: actual === testCase.ok,
  };
});

console.log(`cases: ${results.length}`);
console.table(results);

const failed = results.filter((result) => !result.passed);
if (failed.length > 0) {
  console.error(`failed: ${failed.length}`);
  process.exit(1);
}

console.log("romaji variant checks passed");
