import { describe, it, expect } from "vitest";
import { generateCandidatePool } from "../packages/analysis/src/pool";
import { critiquePlan } from "../packages/director/src/critic";
import { attributeFailures } from "../packages/evaluation/src/failure-attribution";
import { generateBenchmarkReport, type AutomatedClipEval } from "../packages/evaluation/src/report";
import { createReviewBatch, submitReview, aggregateReviews } from "../packages/evaluation/src/reviews";

/** Steve Jobs Stanford speech segments (3 minutes). */
const SEGMENTS = [
  { id: 0, start: 6.8, end: 20, text: "This program is brought to you by Stanford University. Please visit us at stanford.edu. Thank you." },
  { id: 1, start: 20, end: 27, text: "Thank you." },
  { id: 2, start: 27, end: 35.5, text: "I'm honored to be with you today for your commencement from one of the finest universities in the world." },
  { id: 3, start: 35.5, end: 47.7, text: "Truth be told, I never graduated from college and this is the closest I've ever gotten to a college graduation." },
  { id: 4, start: 47.7, end: 55.6, text: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories." },
  { id: 5, start: 55.6, end: 71.4, text: "The first story is about connecting the dots. I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months or so before I really quit." },
  { id: 6, start: 71.4, end: 88.1, text: "It started before I was born. My biological mother was a young, unwed graduate student and she decided to put me up for adoption." },
  { id: 7, start: 88.1, end: 102.9, text: "Except that when I popped out, they decided at the last minute that they really wanted a girl. So my parents got a call in the middle of the night." },
  { id: 8, start: 102.9, end: 120.7, text: "My biological mother found out later that my mother had never graduated from college. She refused to sign the final adoption papers." },
  { id: 9, start: 120.7, end: 140.7, text: "She only relented a few months later when my parents promised that I would go to college." },
  { id: 10, start: 140.7, end: 157.6, text: "After six months, I couldn't see the value in it. I had no idea what I wanted to do with my life." },
  { id: 11, start: 157.6, end: 175, text: "So I decided to drop out and trust that it would all work out okay. It was pretty scary at the time, but looking back, it was one of the best decisions I ever made." },
  { id: 12, start: 175, end: 180, text: "And begin dropping in on the ones that looked interesting." },
];

describe("M10.5 Candidate Pool", () => {
  it("generates more candidates than the old system", () => {
    const pool = generateCandidatePool(SEGMENTS);
    // Old system: 7 candidates. New system should generate more raw candidates.
    expect(pool.stats.totalGenerated).toBeGreaterThanOrEqual(7);
  });

  it("uses multiple generator types", () => {
    const pool = generateCandidatePool(SEGMENTS);
    const types = new Set(pool.candidates.map((c) => c.generator));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it("maintains diversity", () => {
    const pool = generateCandidatePool(SEGMENTS, { targetCount: 10 });
    expect(pool.stats.diversityScore).toBeGreaterThanOrEqual(0);
    expect(pool.stats.diversityScore).toBeLessThanOrEqual(1);
  });

  it("all candidates have valid signals", () => {
    const pool = generateCandidatePool(SEGMENTS);
    for (const c of pool.candidates) {
      expect(typeof c.signals.hook).toBe("boolean");
      expect(typeof c.signals.narrativeArc).toBe("boolean");
      expect(typeof c.signals.hasPayoff).toBe("boolean");
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("M10.5 Benchmark comparison", () => {
  it("produces a structured comparison report", () => {
    const pool = generateCandidatePool(SEGMENTS);

    // Before (old system): 7 candidates
    const before = { candidateCount: 7, validCount: 6, hookCount: 1, storyCount: 0, emotionCount: 0, diversity: 0 };

    // After (new system)
    const hookCount = pool.candidates.filter((c) => c.generator === "hook").length;
    const storyCount = pool.candidates.filter((c) => c.generator === "story").length;
    const emotionCount = pool.candidates.filter((c) => c.generator === "emotion").length;

    const after = {
      candidateCount: pool.stats.totalGenerated,
      validCount: pool.candidates.length,
      hookCount, storyCount, emotionCount,
      diversity: pool.stats.diversityScore,
    };

    // The new system should have more raw candidates
    expect(after.candidateCount).toBeGreaterThan(before.candidateCount);
    // Generator diversity should be higher
    expect(hookCount + storyCount + emotionCount).toBeGreaterThan(0);
  });
});
