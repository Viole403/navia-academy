const INITIALS = [
  "zh", "ch", "sh",
  "b", "p", "m", "f", "d", "t", "n", "l",
  "g", "k", "h", "j", "q", "x",
  "r", "z", "c", "s", "y", "w",
];

const INITIAL_TO_ZHUYIN: Record<string, string> = {
  b: "ㄅ", p: "ㄆ", m: "ㄇ", f: "ㄈ",
  d: "ㄉ", t: "ㄊ", n: "ㄋ", l: "ㄌ",
  g: "ㄍ", k: "ㄎ", h: "ㄏ",
  j: "ㄐ", q: "ㄑ", x: "ㄒ",
  zh: "ㄓ", ch: "ㄔ", sh: "ㄕ", r: "ㄖ",
  z: "ㄗ", c: "ㄘ", s: "ㄙ",
};

const FINAL_TO_ZHUYIN: Record<string, string> = {
  a: "ㄚ", o: "ㄛ", e: "ㄜ", ê: "ㄝ",
  ai: "ㄞ", ei: "ㄟ", ao: "ㄠ", ou: "ㄡ",
  an: "ㄢ", en: "ㄣ", ang: "ㄤ", eng: "ㄥ", er: "ㄦ",
  ong: "ㄨㄥ",
  ia: "ㄧㄚ", ie: "ㄧㄝ", iao: "ㄧㄠ", iu: "ㄧㄡ",
  ian: "ㄧㄢ", in: "ㄧㄣ", iang: "ㄧㄤ", ing: "ㄧㄥ", iong: "ㄩㄥ",
  ua: "ㄨㄚ", uo: "ㄨㄛ", uai: "ㄨㄞ", ui: "ㄨㄟ",
  uan: "ㄨㄢ", un: "ㄨㄣ", uang: "ㄨㄤ", ueng: "ㄨㄥ",
  üe: "ㄩㄝ", üan: "ㄩㄢ", ün: "ㄩㄣ",
  i: "ㄧ", u: "ㄨ", ü: "ㄩ",
};

const TONE_DIACRITICS: Record<string, { base: string; tone: number }> = {
  ā: { base: "a", tone: 1 }, á: { base: "a", tone: 2 }, ǎ: { base: "a", tone: 3 }, à: { base: "a", tone: 4 },
  ē: { base: "e", tone: 1 }, é: { base: "e", tone: 2 }, ě: { base: "e", tone: 3 }, è: { base: "e", tone: 4 },
  ī: { base: "i", tone: 1 }, í: { base: "i", tone: 2 }, ǐ: { base: "i", tone: 3 }, ì: { base: "i", tone: 4 },
  ō: { base: "o", tone: 1 }, ó: { base: "o", tone: 2 }, ǒ: { base: "o", tone: 3 }, ò: { base: "o", tone: 4 },
  ū: { base: "u", tone: 1 }, ú: { base: "u", tone: 2 }, ǔ: { base: "u", tone: 3 }, ù: { base: "u", tone: 4 },
  ǖ: { base: "ü", tone: 1 }, ǘ: { base: "ü", tone: 2 }, ǚ: { base: "ü", tone: 3 }, ǜ: { base: "ü", tone: 4 },
};

const TONE_SUFFIX: Record<number, string> = {
  1: "", 2: "ˊ", 3: "ˇ", 4: "ˋ", 0: "˙",
};

// y/w → i/u normalization mapping for pinyin syllable parsing
const YW_NORMALIZE: Record<string, string> = {
  yi: "i", yin: "in", ying: "ing",
  ya: "ia", ye: "ie", yao: "iao", you: "iu",
  yan: "ian", yang: "iang", yong: "iong", yo: "io",
  yu: "ü", yue: "üe", yuan: "üan", yun: "ün",
  wu: "u",
  wa: "ua", wo: "uo", wai: "uai", wei: "ui",
  wan: "uan", wen: "un", wang: "uang", weng: "ueng",
};

// build valid syllable set for greedy matching
const VALID_SYLLABLES: Set<string> = new Set();
for (const init of [...INITIALS, ""]) {
  for (const fin of Object.keys(FINAL_TO_ZHUYIN)) {
    VALID_SYLLABLES.add(init + fin);
    if (fin.startsWith("ü") && (init === "j" || init === "q" || init === "x" || init === "")) {
      VALID_SYLLABLES.add(init + "u" + fin.slice(1));
    }
  }
}
for (const key of Object.keys(YW_NORMALIZE)) VALID_SYLLABLES.add(key);
for (const c of ["n", "m", "h", "r"]) VALID_SYLLABLES.add(c);
VALID_SYLLABLES.add("hm");
VALID_SYLLABLES.add("hng");

const SORTED_SYLLABLES = [...VALID_SYLLABLES].sort((a, b) => b.length - a.length);

function stripTone(syl: string): { clean: string; tone: number } {
  let tone = 0;
  let clean = "";
  for (const ch of syl) {
    const d = TONE_DIACRITICS[ch];
    if (d) {
      clean += d.base;
      tone = d.tone;
    } else clean += ch;
  }
  return { clean, tone };
}

/** Split pinyin text into individual syllables (handles both spaced and unspaced). */
function splitSyllables(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    // skip non-letter chars (punctuation, spaces)
    if (!/[a-zA-Zāēīōūǖáéíóúǘǎěǐǒǔǚàèìòùǜ]/.test(text[i])) {
      out.push(text[i]);
      i++;
      continue;
    }
    let matched = false;
    for (const syl of SORTED_SYLLABLES) {
      const candidate = text.slice(i, i + syl.length);
      // check if candidate matches the syllable ignoring tone marks
      if (stripTone(candidate).clean === syl) {
        out.push(candidate);
        i += candidate.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // just consume one char as fallback
      out.push(text[i]);
      i++;
    }
  }
  return out;
}

function syllableToZhuyin(raw: string): string {
  const { clean, tone } = stripTone(raw);
  if (!clean) return raw;
  if (clean === "r") return "ㄦ" + TONE_SUFFIX[tone];
  if (clean === "m") return "ㄇ" + TONE_SUFFIX[tone];
  if (clean === "n") return "ㄋ" + TONE_SUFFIX[tone];
  if (clean === "ng") return "ㄫ" + TONE_SUFFIX[tone];
  if (clean === "hm") return "ㄏㄇ" + TONE_SUFFIX[tone];
  if (clean === "hng") return "ㄏㄫ" + TONE_SUFFIX[tone];

  // apply y/w normalization
  const norm = YW_NORMALIZE[clean];
  const resolved = norm ?? clean;

  // j/q/x + u → ü
  let finalResolved = resolved;
  for (const jqx of ["j", "q", "x"]) {
    if (finalResolved.startsWith(jqx) && finalResolved[jqx.length] === "u") {
      finalResolved = finalResolved.slice(0, jqx.length) + "ü" + finalResolved.slice(jqx.length + 1);
      break;
    }
  }

  // handle apical vowel (zh/ch/sh/r/z/c/s + i → just the initial + tone)
  for (const apical of ["zh", "ch", "sh", "r", "z", "c", "s"]) {
    if (finalResolved === apical + "i") {
      return INITIAL_TO_ZHUYIN[apical] + TONE_SUFFIX[tone];
    }
  }

  // try to match final (longest match)
  const possibleFinals = Object.keys(FINAL_TO_ZHUYIN).sort((a, b) => b.length - a.length);
  for (const fin of possibleFinals) {
    if (finalResolved.endsWith(fin)) {
      const potentialInit = finalResolved.slice(0, finalResolved.length - fin.length);
      if (potentialInit === "" || INITIAL_TO_ZHUYIN[potentialInit]) {
        const zinit = potentialInit ? INITIAL_TO_ZHUYIN[potentialInit] : "";
        const zfin = FINAL_TO_ZHUYIN[fin];
        return zinit + zfin + TONE_SUFFIX[tone];
      }
    }
  }

  // check if whole thing is a standalone initial
  if (INITIAL_TO_ZHUYIN[finalResolved]) {
    return INITIAL_TO_ZHUYIN[finalResolved] + TONE_SUFFIX[tone];
  }

  return raw;
}

export function pinyinToZhuyin(pinyin: string): string {
  if (!pinyin) return "";
  return pinyin
    .split(" ")
    .map((token) => {
      const syls = splitSyllables(token);
      return syls.map((s) => syllableToZhuyin(s)).join("");
    })
    .join(" ");
}
