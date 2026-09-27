import { describe, it, expect } from "vitest";
import { duplicateDetect } from "../packages/scoring/src/dedupe";

describe("duplicateDetect", () => {
  it("marks identical text as duplicate", () => {
    const pairs = duplicateDetect([
      { id: "a", text: "Starting a company is very difficult and hard", overall: 90 },
      { id: "b", text: "Starting a company is very difficult and hard", overall: 85 },
    ], 0.5);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.kept).toBe("a");
    expect(pairs[0]!.dropped).toBe("b");
  });

  it("keeps diverse candidates", () => {
    const pairs = duplicateDetect([
      { id: "a", text: "The biggest mistake founders make today", overall: 90 },
      { id: "b", text: "My trip to the grocery store was great", overall: 85 },
      { id: "c", text: "How AI is transforming education forever", overall: 80 },
    ], 0.5);
    expect(pairs).toHaveLength(0);
  });

  it("keeps the higher-scored candidate", () => {
    const pairs = duplicateDetect([
      { id: "a", text: "Starting a company is very hard and challenging", overall: 70 },
      { id: "b", text: "Starting a company is very hard and challenging", overall: 90 },
    ], 0.5);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.kept).toBe("b");
  });
});
