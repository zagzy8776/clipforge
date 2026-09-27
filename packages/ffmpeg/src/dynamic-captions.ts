import type { AssCue } from "./captions.js";

export type WordEmphasis = "normal" | "important" | "emotional" | "punchline";

export interface EmphasizedWord {
  text: string;
  start: number;
  end: number;
  emphasis: WordEmphasis;
}

/** Pattern banks for word emphasis detection */
const EMPHASIS_PATTERNS = {
  important: /\b(never|always|biggest|most|only|first|last|everyone|nobody|everything|nothing|secret|truth|key|critical|essential|fundamental|core|heart)\b/i,
  emotional: /\b(terrified|amazing|incredible|love|hate|beautiful|horrible|impossible|insane|passionate|desperate|devastated|struggle|pain|dream|nightmare|sacrifice|fear|anger|joy|grief)\b/i,
  punchline: /^(nobody|everyone|here's the thing|the truth is|but actually|the secret|what most people|i learned|the biggest mistake|nobody tells you)\b/i,
};

/**
 * Detect word-level emphasis for dynamic caption rendering.
 *
 * Returns each word with its emphasis level, which the caption
 * renderer uses to apply visual treatment (size, color, animation).
 */
export function detectWordEmphasis(words: EmphasizedWord[]): EmphasizedWord[] {
  // Score each word in context
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const context = words.slice(Math.max(0, i - 3), i + 4).map((x) => x.text).join(" ");

    // Check punchline first (strongest signal)
    if (EMPHASIS_PATTERNS.punchline.test(w.text)) {
      w.emphasis = "punchline";
      continue;
    }

    // Check emotional
    if (EMPHASIS_PATTERNS.emotional.test(w.text)) {
      w.emphasis = "emotional";
      continue;
    }

    // Check importance
    if (EMPHASIS_PATTERNS.important.test(w.text)) {
      w.emphasis = "important";
      continue;
    }

    // ALL CAPS words are important
    if (w.text === w.text.toUpperCase() && w.text.length > 2) {
      w.emphasis = "important";
      continue;
    }

    w.emphasis = "normal";
  }

  return words;
}

/**
 * Generate ASS override tags for emphasized words.
 * Creates karaoke-style highlighting with emphasis-based styling.
 */
export function emphasisToAssTags(word: EmphasizedWord, nextWord?: EmphasizedWord): string {
  const durationCs = nextWord
    ? Math.round((nextWord.start - word.start) * 100)
    : 30;

  switch (word.emphasis) {
    case "punchline":
      // Big, bold, yellow highlight
      return `{\\kf${durationCs}\\fs68\\c&H00FFFF&\\b1}${word.text}`;
    case "emotional":
      // Red tint, slight size increase
      return `{\\kf${durationCs}\\fs62\\c&H0080FF&\\b1}${word.text}`;
    case "important":
      // Bold, slightly larger
      return `{\\kf${durationCs}\\fs60\\b1}${word.text}`;
    case "normal":
    default:
      return `{\\kf${durationCs}}${word.text}`;
  }
}
