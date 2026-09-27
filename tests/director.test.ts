import { describe, it, expect } from "vitest";
import { directClip } from "../packages/director/src/index";
import { evaluateCreative } from "../packages/evaluation/src/creative-eval";
import { GOLDEN_FIXTURES } from "./golden-fixtures";

function mc(text: string, start: number, end: number) {
  return { id: "t-1", index: 0, projectId: "test", sectionId: null, start, end, duration: end - start, text, segmentIds: [], paragraphIds: [], boundaryBasis: { start: "sentence" as const, end: "sentence" as const }, label: text.slice(0, 40), source: "heuristic" as const, score: { dimensions: { hook: 30, emotion: 20, novelty: 20, information: 40, curiosity: 30, payoff: 20, coherence: 60 }, weights: { hook: .20, emotion: .15, novelty: .15, information: .15, curiosity: .10, payoff: .15, coherence: .10 }, overall: 30, reasons: ["test"], scorer: "heuristic-v1" }, kept: true };
}

function mcfg() {
  return { projectId: "test", outputDir: "/tmp", targetClips: 10, minClipDuration: 20, maxClipDuration: 90, preferredClipDuration: 45, candidateStride: 5, aspectRatio: "9:16" as const, mode: "podcast" as const, captionStyle: "modern" as const, reframe: "center-crop" as const, pausePolicy: { cutPausesLongerThan: 0.45, keepPause: 0.18, minimumCut: 0.12 }, weights: { hook: .20, emotion: .15, novelty: .15, information: .15, curiosity: .10, payoff: .15, coherence: .10 }, transcription: { provider: "t", model: "t", language: null, minimumScore: 0, duplicateThreshold: .5, analysisModel: "t" }, render: { path: "ffmpeg", width: 1080, height: 1920, fps: 30, videoBitrate: "0", audioBitrate: "192k", preset: "veryfast", crf: 23, pixelFormat: "yuv420p", fastStart: true, audioSampleRate: 48000, colorRange: "limited" as const, background: "#000000", videoCodec: "libx264" }, thumbnail: { at: .5, width: 1080, height: 1920, format: "jpg" as const, quality: 3 }, preview: { enabled: false, maxSeconds: 30, scale: .5 }, keepIntermediate: true, captionsEnabled: true, concurrency: 1, seed: 42 };
}

describe("Director+Eval Regression", () => {
  it("produces valid DirectorPlan for good fixtures", () => {
    for (const f of GOLDEN_FIXTURES.filter(f => f.label === "good")) {
      const c = mc(f.transcriptText, f.startSeconds, f.endSeconds);
      const p = directClip({ candidate: c, config: mcfg() });
      expect(p.hook.length).toBeGreaterThan(0);
      expect(p.confidence).toBeGreaterThan(0);
    }
  });
  it("evaluateCreative produces valid scores", () => {
    const c = mc("Nobody tells you this. The biggest mistake founders make.", 0, 30);
    const p = directClip({ candidate: c, config: mcfg() });
    const e = evaluateCreative({ candidate: c, directorPlan: p, renderValid: true });
    expect(e.overallEngagement).toBeGreaterThan(0);
    expect(e.overallQuality).toBeGreaterThan(0);
    expect(e.method).toBe("deterministic");
  });
  it("good fixtures score higher engagement than bad", () => {
    const goods = GOLDEN_FIXTURES.filter(f => f.label === "good").map(f => { const c = mc(f.transcriptText, f.startSeconds, f.endSeconds); const p = directClip({ candidate: c, config: mcfg() }); return evaluateCreative({ candidate: c, directorPlan: p, renderValid: true }); });
    const bads = GOLDEN_FIXTURES.filter(f => f.label === "bad").map(f => { const c = mc(f.transcriptText, f.startSeconds, f.endSeconds); const p = directClip({ candidate: c, config: mcfg() }); return evaluateCreative({ candidate: c, directorPlan: p, renderValid: true }); });
    const avgG = goods.reduce((a, e) => a + e.overallEngagement, 0) / goods.length;
    const avgB = bads.reduce((a, e) => a + e.overallEngagement, 0) / bads.length;
    expect(avgG).toBeGreaterThan(avgB);
  });
  it("different styles produce different plans", () => {
    const c = mc("Nobody tells you this. The biggest mistake.", 0, 30);
    const pp = directClip({ candidate: c, config: mcfg(), style: "podcast" });
    const ph = directClip({ candidate: c, config: mcfg(), style: "hype" });
    expect(pp.pacing).not.toBe(ph.pacing);
    expect(ph.effects.length).toBeGreaterThanOrEqual(pp.effects.length);
  });
  it("failed render reduces quality", () => {
    const c = mc("Nobody tells you this.", 0, 30);
    const p = directClip({ candidate: c, config: mcfg() });
    const v = evaluateCreative({ candidate: c, directorPlan: p, renderValid: true });
    const i = evaluateCreative({ candidate: c, directorPlan: p, renderValid: false });
    expect(v.overallQuality).toBeGreaterThan(i.overallQuality);
  });
});
