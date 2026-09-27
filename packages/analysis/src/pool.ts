import type { RawCandidate, CandidateGenerator } from "./generators/index.js";
import { HookFinder } from "./generators/hook-finder.js";
import { StoryFinder } from "./generators/story-finder.js";
import { EmotionFinder } from "./generators/emotion-finder.js";
import { QuestionFinder } from "./generators/question-finder.js";
import { ContrastFinder } from "./generators/contrast-finder.js";
import { PayoffFinder } from "./generators/payoff-finder.js";
import { CuriosityFinder } from "./generators/curiosity-finder.js";

export interface CandidatePoolOptions {
  minDuration?: number;
  maxDuration?: number;
  dedupThreshold?: number;
  targetCount?: number;
}

/**
 * Multi-strategy candidate pool.
 * Runs all generators, merges results, deduplicates, diversifies.
 */
export function generateCandidatePool(
  segments: Array<{ start: number; end: number; text: string; id: number }>,
  options: CandidatePoolOptions = {},
): { candidates: RawCandidate[]; stats: PoolStats } {
  const { minDuration = 15, maxDuration = 90, targetCount = 15 } = options;

  // Run all generators
  const generators: CandidateGenerator[] = [
    new HookFinder(), new StoryFinder(), new EmotionFinder(),
    new QuestionFinder(), new ContrastFinder(), new PayoffFinder(),
    new CuriosityFinder(),
  ];

  let allCandidates: RawCandidate[] = [];
  const genCounts: Record<string, number> = {};

  for (const gen of generators) {
    const found = gen.generate(segments);
    genCounts[gen.type] = found.length;
    allCandidates = allCandidates.concat(found);
  }

  const totalBeforeDedup = allCandidates.length;

  // Step 1: Filter by duration — trim oversized candidates instead of removing
  allCandidates = allCandidates.map((c) => {
    const dur = c.end - c.start;
    if (dur > maxDuration) {
      // Trim to maxDuration from the start (keep the hook/opening)
      return { ...c, end: c.start + maxDuration };
    }
    return c;
  }).filter((c) => (c.end - c.start) >= minDuration);

  // Step 2: Temporal dedup (IoU > 0.5 + same generator)
  allCandidates = temporalDedup(allCandidates, 0.5);

  // Step 3: Merge multi-source candidates
  allCandidates = mergeMultiSource(allCandidates);

  // Step 4: Sort by confidence
  allCandidates.sort((a, b) => b.confidence - a.confidence);

  // Step 5: Enforce diversity — don't allow all from one generator
  const diversified = enforceDiversity(allCandidates, targetCount);

  return {
    candidates: diversified,
    stats: {
      totalGenerated: totalBeforeDedup,
      generatorCounts: genCounts,
      afterDurationFilter: allCandidates.length,
      afterDedup: diversified.length,
      diversityScore: computeDiversityScore(diversified),
    },
  };
}

export interface PoolStats {
  totalGenerated: number;
  generatorCounts: Record<string, number>;
  afterDurationFilter: number;
  afterDedup: number;
  diversityScore: number;
}

/** Remove candidates with high temporal overlap from the same generator. */
function temporalDedup(candidates: RawCandidate[], iouThreshold: number): RawCandidate[] {
  const result: RawCandidate[] = [];
  for (const c of candidates) {
    const dominated = result.some((r) => {
      if (r.generator !== c.generator) return false;
      const ix = Math.max(0, Math.min(c.end, r.end) - Math.max(c.start, r.start));
      const union = (c.end - c.start) + (r.end - r.start) - ix;
      return union > 0 && ix / union > iouThreshold;
    });
    if (!dominated) result.push(c);
  }
  return result;
}

/** Merge candidates from different generators that cover the same time range. */
function mergeMultiSource(candidates: RawCandidate[]): RawCandidate[] {
  const sorted = [...candidates].sort((a, b) => a.start - b.start);
  const merged: RawCandidate[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;
    const c = sorted[i]!;
    const sources = new Set([c.generator]);
    let bestStart = c.start;
    let bestEnd = c.end;

    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j]!;
      if (used.has(j)) continue;
      if (other.start > bestEnd) break; // Must overlap

      const overlap = Math.max(0, Math.min(bestEnd, other.end) - Math.max(bestStart, other.start));
      const smallerLen = Math.min(bestEnd - bestStart, other.end - other.start);
      if (smallerLen > 0 && overlap / smallerLen > 0.6) {
        sources.add(other.generator);
        used.add(j);
        // Only extend by max 15 seconds to keep windows reasonable
        bestEnd = Math.min(bestEnd + 15, other.end);
      }
    }

    merged.push({
      ...c, start: bestStart, end: bestEnd,
      confidence: Math.min(1, c.confidence + (sources.size - 1) * 0.1),
    });
    used.add(i);
  }
  return merged;
}

/** Enforce diversity: cap each generator type to prevent domination. */
function enforceDiversity(candidates: RawCandidate[], targetCount: number): RawCandidate[] {
  const byGen = new Map<string, RawCandidate[]>();
  for (const c of candidates) {
    const list = byGen.get(c.generator) ?? [];
    list.push(c);
    byGen.set(c.generator, list);
  }

  const result: RawCandidate[] = [];
  const perGenMax = Math.max(3, Math.ceil(targetCount / byGen.size));

  for (const [, genCandidates] of byGen) {
    result.push(...genCandidates.slice(0, perGenMax));
  }

  return result
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, targetCount);
}

/** Compute diversity score: 0 = all same type, 1 = perfectly distributed. */
function computeDiversityScore(candidates: RawCandidate[]): number {
  if (candidates.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.generator, (counts.get(c.generator) ?? 0) + 1);
  const uniqueTypes = counts.size;
  const maxPerType = Math.max(...counts.values());
  const idealPerType = candidates.length / uniqueTypes;
  const variance = [...counts.values()].reduce((a, c) => a + Math.pow(c - idealPerType, 2), 0) / uniqueTypes;
  return Math.max(0, 1 - variance / (idealPerType * idealPerType));
}
