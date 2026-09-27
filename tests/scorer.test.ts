import { describe, it, expect } from "vitest";
import { weightedScore } from "../packages/scoring/src/scorer";

describe("weightedScore", () => {
  it("produces expected weighted total", () => {
    const result = weightedScore({
      hook: 100, emotion: 0, novelty: 0, information: 0,
      curiosity: 0, payoff: 0, coherence: 0,
    });
    expect(result.overall).toBeCloseTo(20, 0);
  });

  it("returns 100 for all-max dimensions", () => {
    const result = weightedScore({
      hook: 100, emotion: 100, novelty: 100, information: 100,
      curiosity: 100, payoff: 100, coherence: 100,
    });
    expect(result.overall).toBe(100);
  });

  it("returns 0 for all-zero dimensions", () => {
    const result = weightedScore({
      hook: 0, emotion: 0, novelty: 0, information: 0,
      curiosity: 0, payoff: 0, coherence: 0,
    });
    expect(result.overall).toBe(0);
  });
});
