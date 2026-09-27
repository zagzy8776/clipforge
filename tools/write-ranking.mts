import { writeFileSync } from "node:fs";

const code = `import type { CandidateMoment } from "@clipforge/types";
import { duplicateDetect, type DuplicatePair } from "@clipforge/scoring";

export interface RankingInput {
  candidates: CandidateMoment[];
  targetClips: number;
  minScore: number;
  duplicateThreshold: number;
}

export interface RankingOutput {
  selected: CandidateMoment[];
  dropped: Array<{ candidateId: string; reason: string; detail: string }>;
}

export function rankCandidates(input: RankingInput): RankingOutput {
  const dropped: RankingOutput["dropped"] = [];
  const above = input.candidates.filter((c) => {
    if (c.score.overall < input.minScore) {
      dropped.push({ candidateId: c.id, reason: "below-threshold", detail: \`Score \${c.score.overall} < \${input.minScore}\` });
      return false;
    }
    return true;
  });

  // Jaccard text dedup
  const dupPairs = duplicateDetect(above.map((c) => ({ id: c.id, text: c.text, overall: c.score.overall })), input.duplicateThreshold);
  const dupIds = new Set(dupPairs.map((p) => p.dropped));
  const dupMap = new Map<string, DuplicatePair>();
  for (const p of dupPairs) dupMap.set(p.dropped, p);
  for (const c of above) {
    if (dupIds.has(c.id)) {
      c.kept = false;
      c.duplicateOf = dupMap.get(c.id)!.kept;
      c.duplicateSimilarity = dupMap.get(c.id)!.similarity;
      dropped.push({ candidateId: c.id, reason: "duplicate", detail: \`Text-similar to \${c.duplicateOf} (\${(c.duplicateSimilarity! * 100).toFixed(0)}%)\` });
    }
  }

  // Temporal overlap suppression
  const surviving = above.filter((c) => c.kept);
  const tempDropped = suppressOverlaps(surviving, input.duplicateThreshold);
  for (const td of tempDropped) {
    const c = surviving.find((x) => x.id === td.candidateId)!;
    c.kept = false;
    c.duplicateOf = td.keptBy;
    dropped.push(td);
  }

  // Sort + take top N
  const ranked = above.filter((c) => c.kept).sort((a, b) => b.score.overall - a.score.overall).slice(0, input.targetClips);

  // Percentile normalization
  const scores = ranked.map((c) => c.score.overall);
  for (let i = 0; i < ranked.length; i++) {
    const c = ranked[i]!;
    const below = scores.filter((s) => s < c.score.overall).length;
    c.index = i;
    (c as any).percentile = Math.round((below / Math.max(1, scores.length - 1)) * 100);
  }

  return { selected: ranked, dropped };
}

function suppressOverlaps(candidates: CandidateMoment[], textThreshold: number): Array<{ candidateId: string; reason: string; detail: string; keptBy: string }> {
  const result: Array<{ candidateId: string; reason: string; detail: string; keptBy: string }> = [];
  const sorted = [...candidates].sort((a, b) => b.score.overall - a.score.overall);
  const kept = new Set<string>();
  for (const c of sorted) {
    if (kept.has(c.id)) continue;
    for (const k of kept) {
      const kc = sorted.find((x) => x.id === k)!;
      const iou = temporalIoU(c, kc);
      if (iou > 0.50) {
        const sim = textSim(c.text, kc.text);
        if (sim > textThreshold) {
          result.push({ candidateId: c.id, reason: "duplicate", detail: \`Overlap \${(iou*100).toFixed(0)}% + text \${(sim*100).toFixed(0)}% with \${k}\`, keptBy: k });
        }
        break;
      }
    }
    if (!result.find((r) => r.candidateId === c.id)) kept.add(c.id);
  }
  return result;
}

function temporalIoU(a: CandidateMoment, b: CandidateMoment): number {
  const ix = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const ux = (a.end - a.start) + (b.end - b.start) - ix;
  return ux > 0 ? ix / ux : 0;
}

function textSim(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\\s+/));
  const wb = new Set(b.toLowerCase().split(/\\s+/));
  let ix = 0;
  for (const w of wa) if (wb.has(w)) ix++;
  return (wa.size + wb.size - ix) > 0 ? ix / (wa.size + wb.size - ix) : 0;
}
`;

writeFileSync("e:/video/packages/analysis/src/ranking.ts", code, "utf-8");
console.log("Wrote ranking.ts");
