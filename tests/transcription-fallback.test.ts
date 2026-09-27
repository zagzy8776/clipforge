import { describe, it, expect } from "vitest";
import { createTranscriptionProvider, withFallback, whisperAvailable } from "../packages/transcription/src/provider.js";

// A stub fallback that doesn't shell out to ffmpeg — keeps the fallback
// logic test isolated from the environment.
const stubFallback = {
  name: "stub-fallback",
  transcribe: async () => [{ id: 0, start: 0, end: 1, text: "stub" }],
};

describe("Transcription fallback", () => {
  it("respects the configured provider name", () => {
    const mock = createTranscriptionProvider("silence-based-fallback");
    expect(mock.name).toBe("silence-based-fallback");
  });

  it("uses the mock provider when whisper is unavailable", () => {
    if (whisperAvailable()) {
      console.log("  ⚠ Whisper available — skipping unavailable-path assertion");
      return;
    }
    const provider = createTranscriptionProvider("auto");
    expect(provider.name).toContain("silence-based-fallback");
  });

  it("withFallback degrades to the fallback on .transcribe() failure", async () => {
    const failing = {
      name: "failing",
      transcribe: async () => { throw new Error("boom"); },
    };
    const wrapped = withFallback(failing as any, stubFallback);
    const result = await wrapped.transcribe("/nonexistent.wav");
    expect(result).toEqual([{ id: 0, start: 0, end: 1, text: "stub" }]);
    expect(wrapped.name).toBe("failing+stub-fallback");
  });

  it("withFallback passes through on success", async () => {
    const ok = { name: "ok", transcribe: async () => [{ id: 0, start: 0, end: 1, text: "hi" }] };
    const wrapped = withFallback(ok as any, stubFallback);
    const result = await wrapped.transcribe("/x.wav");
    expect(result).toEqual([{ id: 0, start: 0, end: 1, text: "hi" }]);
  });
});