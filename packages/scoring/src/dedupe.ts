/**
 * Duplicate detection using Jaccard similarity on word sets.
 * Two candidates are duplicates if their text overlap exceeds the threshold.
 */
export interface DuplicatePair {
  kept: string;
  dropped: string;
  similarity: number;
}

export function duplicateDetect(
  candidates: Array<{ id: string; text: string; overall: number }>,
  threshold = 0.55,
): DuplicatePair[] {
  const sorted = [...candidates].sort((a, b) => b.overall - a.overall);
  const kept = new Set<string>();
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    let isDup = false;
    for (const k of kept) {
      const kObj = sorted.find((x) => x.id === k)!;
      if (jaccard(a.text, kObj.text) >= threshold) {
        pairs.push({ kept: k, dropped: a.id, similarity: jaccard(a.text, kObj.text) });
        isDup = true;
        break;
      }
    }
    if (!isDup) kept.add(a.id);
  }
  return pairs;
}

function jaccard(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
