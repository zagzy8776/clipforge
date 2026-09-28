export interface FillerSpan { start: number; end: number; word: string; }

const FILLER_PATTERNS = [
  /\b(um|uh|uhm|err|ah|eh)\b/gi,
  /\b(you know|i mean|sort of|kind of)\b/gi,
  /\b(like)\b/gi,
  /\b(basically|actually|literally)\b/gi,
];

export function detectFillers(segments: Array<{ start: number; end: number; text: string; words?: Array<{ word: string; start: number; end: number }> }>): FillerSpan[] {
  const spans: FillerSpan[] = [];
  for (const seg of segments) {
    if (seg.words?.length) {
      for (const w of seg.words) {
        for (const re of FILLER_PATTERNS) {
          re.lastIndex = 0;
          if (re.test(w.word)) {
            spans.push({ start: w.start, end: w.end, word: w.word });
            break;
          }
        }
      }
    }
  }
  return spans;
}

export function stripFillersFromText(text: string): string {
  let cleaned = text;
  for (const re of FILLER_PATTERNS) cleaned = cleaned.replace(re, " ");
  return cleaned.replace(/\s{2,}/g, " ").trim();
}
