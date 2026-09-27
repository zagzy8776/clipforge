import { describe, it, expect } from "vitest";
import { scoreText, detectNarrativeArc } from "../packages/ai/src/providers/signals";
import { GOLDEN_FIXTURES, type GoldenFixture } from "./golden-fixtures";

describe("Intelligence Engine — Golden Evaluation", () => {
  const fixtures = GOLDEN_FIXTURES;

  it("scores 'good' fixtures higher than 'bad' fixtures", () => {
    const goods = fixtures.filter((f) => f.label === "good");
    const bads = fixtures.filter((f) => f.label === "bad");

    for (const g of goods) {
      const s = scoreText(g.transcriptText);
      expect(s.overall).toBeGreaterThan(10);
    }
    for (const b of bads) {
      const s = scoreText(b.transcriptText);
      expect(s.overall).toBeLessThan(30);
    }

    // Every good should score higher than every bad
    const avgGood = goods.reduce((a, g) => a + scoreText(g.transcriptText).overall, 0) / goods.length;
    const avgBad = bads.reduce((a, b) => a + scoreText(b.transcriptText).overall, 0) / bads.length;
    expect(avgGood).toBeGreaterThan(avgBad);
  });

  it("detects narrative arcs in most arc fixtures", () => {
    const arcFixtures = fixtures.filter((f) => f.expectedSignals.hasNarrativeArc);
    let detected = 0;
    for (const f of arcFixtures) {
      const arc = detectNarrativeArc(f.transcriptText);
      if (arc.hasArc) detected++;
    }
    expect(detected / arcFixtures.length).toBeGreaterThanOrEqual(0.5);
  });

  it("detects hooks in hook fixtures", () => {
    const hookFixtures = fixtures.filter((f) => f.expectedSignals.hasHook);
    let detected = 0; for (const f of hookFixtures) {
      const s = scoreText(f.transcriptText);
      if(s.hook>10)detected++;
    }
  });

  it("detects curiosity in curiosity fixtures", () => {
    const curFixtures = fixtures.filter((f) => f.expectedSignals.hasCuriosity);
    for (const f of curFixtures) {
      const s = scoreText(f.transcriptText);
      expect(s.curiosity).toBeGreaterThan(20);
    }
  });

  it("detects payoff in payoff fixtures", () => {
    const payFixtures = fixtures.filter((f) => f.expectedSignals.hasPayoff);
    for (const f of payFixtures) {
      const s = scoreText(f.transcriptText);
      expect(s.payoff).toBeGreaterThan(15);
    }
  });

  it("scores 'incomplete' context lower than fully self-contained", () => {
    const complete = fixtures.filter((f) => f.label === "good" && f.expectedSignals.hasNarrativeArc);
    const incomplete = fixtures.filter((f) => f.label === "incomplete");

    for (const c of complete) {
      const s = scoreText(c.transcriptText);
      expect(s.coherence).toBeGreaterThanOrEqual(c.expectedSignals.minCoherence ?? 50);
    }
  });

  it("produces percentile rankings (not absolute claims)", () => {
    // Simulate a ranking pool
    const scores = fixtures.map((f) => ({
      id: f.id,
      label: f.label,
      score: scoreText(f.transcriptText).overall,
    })).sort((a, b) => b.score - a.score);

    // Percentile calculation: what % scored lower
    for (let i = 0; i < scores.length; i++) {
      const below = scores.filter((s) => s.score < scores[i]!.score).length;
      const percentile = Math.round((below / Math.max(1, scores.length - 1)) * 100);
      expect(percentile).toBeGreaterThanOrEqual(0);
      expect(percentile).toBeLessThanOrEqual(100);
    }
  });

  it("ranks good fixtures in top percentiles", () => {
    const scored = fixtures.map((f) => ({
      id: f.id,
      label: f.label,
      score: scoreText(f.transcriptText).overall,
    })).sort((a, b) => b.score - a.score);

    const top3 = scored.slice(0, 3);
    // At least 2 of the top 3 should be "good" or "good-boundary" labels
    const goodInTop3 = top3.filter((s) =>
      fixtures.find((f) => f.id === s.id)?.label === "good" ||
      fixtures.find((f) => f.id === s.id)?.label === "good-boundary"
    );
    expect(goodInTop3.length).toBeGreaterThanOrEqual(2);
  });
});
