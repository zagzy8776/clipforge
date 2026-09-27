import { describe, it, expect } from "vitest";
import { attributeFailures } from "../packages/evaluation/src/failure-attribution";
import { createReviewBatch, submitReview, aggregateReviews } from "../packages/evaluation/src/reviews";
import { critiquePlan } from "../packages/director/src/critic";

function mc(text: string, start: number, end: number) {
  return { id: "c1", index: 0, projectId: "p1", sectionId: null, start, end, duration: end - start, text, segmentIds: [], paragraphIds: [], boundaryBasis: { start: "sentence" as const, end: "sentence" as const }, label: text.slice(0, 40), source: "heuristic" as const, score: { dimensions: { hook: 35, emotion: 25, novelty: 20, information: 40, curiosity: 30, payoff: 20, coherence: 60 }, weights: { hook: .20, emotion: .15, novelty: .15, information: .15, curiosity: .10, payoff: .15, coherence: .10 }, overall: 32, reasons: [], scorer: "test" }, kept: true };
}

describe("Failure Attribution", () => {
  it("attributes weak hook to candidate-selection", () => {
    const r = attributeFailures({ clipId: "t", hookStrength: 15, narrativeCoherence: 80, curiosityFactor: 50, emotionalResonance: 40, pacing: 70, visualQuality: 80, captionQuality: 70, effectRelevance: 60, renderValid: true, effectCount: 1, emphasisCount: 1, directorConfidence: 60, candidateScore: 20, clipDuration: 40, sourceDuration: 180 });
    expect(r.failures.some((f) => f.code === "WEAK_HOOK")).toBe(true);
    expect(r.sourceVsPipeline).toBe("source-material");
  });
  it("reports no failures for strong clips", () => {
    const r = attributeFailures({ clipId: "t", hookStrength: 80, narrativeCoherence: 80, curiosityFactor: 70, emotionalResonance: 60, pacing: 80, visualQuality: 85, captionQuality: 80, effectRelevance: 80, renderValid: true, effectCount: 2, emphasisCount: 2, directorConfidence: 80, candidateScore: 50, clipDuration: 45, sourceDuration: 180 });
    expect(r.failures.length).toBe(0);
  });
});

describe("Reviews", () => {
  it("creates blind batch", () => {
    const b = createReviewBatch(["a", "b", "c"]);
    expect(b.blindIds.size).toBe(3);
  });
  it("aggregates reviews", () => {
    submitReview({ reviewId: "r1", clipId: "cr1", reviewerId: "u1", blindId: "c001", isReference: false, ratings: { contextIndependence: 4, hookClarity: 5, narrativeCoherence: 4, cutAppropriateness: 4, captionQuality: 3, visualFraming: 4, pacing: 5, professionalUsability: 4 }, failures: ["CAPTION_TIMING"], notes: "", reviewedAt: "" });
    submitReview({ reviewId: "r2", clipId: "cr1", reviewerId: "u2", blindId: "c001", isReference: false, ratings: { contextIndependence: 3, hookClarity: 4, narrativeCoherence: 4, cutAppropriateness: 5, captionQuality: 3, visualFraming: 3, pacing: 4, professionalUsability: 3 }, failures: ["CAPTION_TIMING"], notes: "", reviewedAt: "" });
    const a = aggregateReviews("cr1");
    expect(a!.reviewCount).toBe(2);
    expect(a!.avgRatings.hookClarity).toBe(4.5);
  });
});

describe("Director Critic", () => {
  it("accepts a good plan", () => {
    const c = mc("Nobody tells you this about starting a company.", 0, 30);
    const p = { hook: "Nobody tells you", pacing: "natural" as const, visualStyle: "clean" as const, musicStrategy: "none" as const, captionStrategy: "standard" as const, framingStrategy: "center" as const, effects: [{ type: "punch-in" as const, at: 0, duration: 1, intensity: .05, reason: "hook" }], transitions: [], emphasisMoments: [{ time: 5, text: "biggest", emphasisType: "bold" as const, duration: .5 }], reasoning: "test", confidence: 70 };
    const v = critiquePlan(p, c);
    expect(v.accepted).toBe(true);
  });
  it("flags excessive effects and suggests revision", () => {
    const c = mc("Test clip.", 0, 30);
    const p = { hook: "Test", pacing: "natural" as const, visualStyle: "clean" as const, musicStrategy: "none" as const, captionStrategy: "standard" as const, framingStrategy: "center" as const, effects: Array.from({ length: 5 }, (_, i) => ({ type: "punch-in" as const, at: i * 5, duration: 1, intensity: .05, reason: "r" + i })), transitions: [], emphasisMoments: [], reasoning: "test", confidence: 70 };
    const v = critiquePlan(p, c);
    expect(v.issues.some((i) => i.dimension === "effects")).toBe(true);
  });
});
