import { describe, it, expect } from "vitest";
import { scoreText } from "../packages/ai/src/providers/signals";

describe("scoreText", () => {
  it("scores a strong opener highly on hook", () => {
    const result = scoreText("Nobody tells you this about starting a company");
    expect(result.hook).toBeGreaterThanOrEqual(30);
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });

  it("scores emotional text highly on emotion", () => {
    const result = scoreText(
      "I was terrified and desperate but I knew this dream was impossible to give up"
    );
    expect(result.emotion).toBeGreaterThan(40);
  });

  it("produces a weighted overall between 0 and 100", () => {
    const result = scoreText("The biggest mistake founders make is actually quite simple");
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("scores coherent text higher on coherence", () => {
    const coherent = scoreText(
      "I learned this lesson the hard way. When I first started my company, I made every mistake. But looking back, that struggle changed everything."
    );
    const gibberish = scoreText("cat purple running fast tomorrow blue");
    expect(coherent.coherence).toBeGreaterThanOrEqual(gibberish.coherence);
  });
});
