const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const HIRAGANA_OFFSET = 0x60;

export function normalizeKana(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u30a1-\u30f6]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - HIRAGANA_OFFSET),
    );
}

export const PARTICLE_TABLE = {
  は: ["wa", "ha"],
  へ: ["e", "he"],
  を: ["wo", "o"],
};

export const MORA_TABLE = {
  あ: ["a"],
  い: ["i", "yi"],
  う: ["u", "wu"],
  え: ["e"],
  お: ["o"],
  か: ["ka", "ca"],
  き: ["ki"],
  く: ["ku", "cu", "qu"],
  け: ["ke"],
  こ: ["ko", "co"],
  さ: ["sa"],
  し: ["shi", "si", "ci"],
  す: ["su"],
  せ: ["se", "ce"],
  そ: ["so"],
  た: ["ta"],
  ち: ["chi", "ti"],
  つ: ["tsu", "tu"],
  て: ["te"],
  と: ["to"],
  な: ["na"],
  に: ["ni"],
  ぬ: ["nu"],
  ね: ["ne"],
  の: ["no"],
  は: ["ha"],
  ひ: ["hi"],
  ふ: ["fu", "hu"],
  へ: ["he"],
  ほ: ["ho"],
  ま: ["ma"],
  み: ["mi"],
  む: ["mu"],
  め: ["me"],
  も: ["mo"],
  や: ["ya"],
  ゆ: ["yu"],
  よ: ["yo"],
  ら: ["ra"],
  り: ["ri"],
  る: ["ru"],
  れ: ["re"],
  ろ: ["ro"],
  わ: ["wa"],
  ゐ: ["wi"],
  ゑ: ["we"],
  を: ["wo"],
  ん: ["n", "nn", "xn"],

  が: ["ga"],
  ぎ: ["gi"],
  ぐ: ["gu"],
  げ: ["ge"],
  ご: ["go"],
  ざ: ["za"],
  じ: ["ji", "zi"],
  ず: ["zu"],
  ぜ: ["ze"],
  ぞ: ["zo"],
  だ: ["da"],
  ぢ: ["ji", "di"],
  づ: ["zu", "du"],
  で: ["de"],
  ど: ["do"],
  ば: ["ba"],
  び: ["bi"],
  ぶ: ["bu"],
  べ: ["be"],
  ぼ: ["bo"],
  ぱ: ["pa"],
  ぴ: ["pi"],
  ぷ: ["pu"],
  ぺ: ["pe"],
  ぽ: ["po"],
  ゔ: ["vu"],

  きゃ: ["kya"],
  きぃ: ["kyi"],
  きゅ: ["kyu"],
  きぇ: ["kye"],
  きょ: ["kyo"],
  しゃ: ["sha", "sya"],
  しぃ: ["syi"],
  しゅ: ["shu", "syu"],
  しぇ: ["she", "sye"],
  しょ: ["sho", "syo"],
  ちゃ: ["cha", "tya", "cya"],
  ちぃ: ["tyi", "cyi"],
  ちゅ: ["chu", "tyu", "cyu"],
  ちぇ: ["che", "tye", "cye"],
  ちょ: ["cho", "tyo", "cyo"],
  にゃ: ["nya"],
  にぃ: ["nyi"],
  にゅ: ["nyu"],
  にぇ: ["nye"],
  にょ: ["nyo"],
  ひゃ: ["hya"],
  ひぃ: ["hyi"],
  ひゅ: ["hyu"],
  ひぇ: ["hye"],
  ひょ: ["hyo"],
  みゃ: ["mya"],
  みぃ: ["myi"],
  みゅ: ["myu"],
  みぇ: ["mye"],
  みょ: ["myo"],
  りゃ: ["rya"],
  りぃ: ["ryi"],
  りゅ: ["ryu"],
  りぇ: ["rye"],
  りょ: ["ryo"],
  ぎゃ: ["gya"],
  ぎぃ: ["gyi"],
  ぎゅ: ["gyu"],
  ぎぇ: ["gye"],
  ぎょ: ["gyo"],
  じゃ: ["ja", "jya", "zya"],
  じぃ: ["jyi", "zyi"],
  じゅ: ["ju", "jyu", "zyu"],
  じぇ: ["je", "jye", "zye"],
  じょ: ["jo", "jyo", "zyo"],
  ぢゃ: ["ja", "dya"],
  ぢぃ: ["dyi"],
  ぢゅ: ["ju", "dyu"],
  ぢぇ: ["dye"],
  ぢょ: ["jo", "dyo"],
  びゃ: ["bya"],
  びぃ: ["byi"],
  びゅ: ["byu"],
  びぇ: ["bye"],
  びょ: ["byo"],
  ぴゃ: ["pya"],
  ぴぃ: ["pyi"],
  ぴゅ: ["pyu"],
  ぴぇ: ["pye"],
  ぴょ: ["pyo"],

  ぁ: ["xa", "la"],
  ぃ: ["xi", "li"],
  ぅ: ["xu", "lu"],
  ぇ: ["xe", "le"],
  ぉ: ["xo", "lo"],
  ゃ: ["xya", "lya"],
  ゅ: ["xyu", "lyu"],
  ょ: ["xyo", "lyo"],

  うぁ: ["wha"],
  うぃ: ["wi", "whi"],
  うぇ: ["we", "whe"],
  うぉ: ["who"],
  くぁ: ["qa", "kwa", "qwa"],
  くぃ: ["qi", "qwi"],
  くぇ: ["qe", "qwe"],
  くぉ: ["qo", "qwo"],
  ぐぁ: ["gwa"],
  ぐぃ: ["gwi"],
  ぐぇ: ["gwe"],
  ぐぉ: ["gwo"],
  ふぁ: ["fa", "fwa"],
  ふぃ: ["fi", "fyi", "fwi"],
  ふぇ: ["fe", "fye", "fwe"],
  ふぉ: ["fo", "fwo"],
  ふゅ: ["fyu"],
  てぃ: ["thi", "ti"],
  てゅ: ["thu"],
  でぃ: ["dhi", "di"],
  でゅ: ["dhu"],
  とぅ: ["twu", "toxu", "tolu"],
  どぅ: ["dwu", "doxu", "dolu"],
  ヴぁ: ["va", "vwa"],
  ヴぃ: ["vi", "vyi"],
  ヴぇ: ["ve", "vye"],
  ヴぉ: ["vo"],
  ヴゅ: ["vyu"],
};

for (const key of Object.keys(MORA_TABLE)) {
  const normalized = normalizeKana(key);
  if (normalized !== key) {
    MORA_TABLE[normalized] = MORA_TABLE[key];
    delete MORA_TABLE[key];
  }
}

for (const [mora, options] of Object.entries(MORA_TABLE)) {
  if (mora.length !== 2 || !["ゃ", "ゅ", "ょ"].includes(mora[1])) continue;

  const baseOptions = MORA_TABLE[mora[0]] ?? [];
  const smallOptions = MORA_TABLE[mora[1]] ?? [];
  const expanded = new Set(options);
  for (const baseOption of baseOptions) {
    for (const smallOption of smallOptions) {
      expanded.add(`${baseOption}${smallOption}`);
    }
  }
  MORA_TABLE[mora] = [...expanded];
}

export function isKatakana(char) {
  const code = char.codePointAt(0);
  return code >= KATAKANA_START && code <= KATAKANA_END;
}
