import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProgressReporter, Transcript, EngineConfig } from "@clipforge/types";
import { extractAudio, probe, renderClip } from "@clipforge/ffmpeg";
import { createProvider } from "@clipforge/ai";
import { createTranscriptionProvider, groupIntoParagraphs } from "@clipforge/transcription";
import { analyzeTranscript, generateCandidates, rankCandidates } from "@clipforge/analysis";
import { buildRenderPlan, generateCaptions } from "@clipforge/rendering";

const ENGINE_VERSION = "0.1.0";

export interface EngineInput {
  videoPath: string;
  config: EngineConfig;
  provider?: "heuristic" | "openai" | "hybrid";
  progress?: ProgressReporter;
}

export interface EngineOutput {
  status: "completed" | "failed";
  outputDir: string;
  clips: Array<{
    index: number; videoPath: string; thumbnailPath: string;
    score: number; title: string; hook: string;
  }>;
  totalRenderMs: number;
  error?: string;
}

export async function runEngine(input: EngineInput): Promise<EngineOutput> {
  const { videoPath, config } = input;
  const report = input.progress ?? (() => {});
  const outputDir = config.outputDir;
  mkdirSync(outputDir, { recursive: true });
  const timings: Record<string, number> = {};

  try {
    // 1. Probe
    report({ stage: "probe", progress: 0, message: "Probing source video..." });
    const t0 = Date.now();
    const probeResult = probe(videoPath);
    timings.probe = Date.now() - t0;

    // 2. Extract audio
    report({ stage: "audio-extract", progress: 0.05, message: "Extracting audio..." });
    const t1 = Date.now();
    const audioPath = join(outputDir, "audio.wav");
    extractAudio(videoPath, audioPath);
    timings["audio-extract"] = Date.now() - t1;

    // 3. Transcribe
    report({ stage: "transcribe", progress: 0.1, message: "Transcribing..." });
    const t2 = Date.now();
    const stt = createTranscriptionProvider();
    const rawSegs = await stt.transcribe(audioPath, {
      onProgress: (p) => report({ stage: "transcribe", progress: 0.1 + p * 0.2, message: `Transcribing... ${Math.round(p * 100)}%` }),
    });
    timings.transcribe = Date.now() - t2;
    const paragraphs = groupIntoParagraphs(rawSegs);

    const transcript: Transcript = {
      language: config.transcription.language ?? "en",
      provider: stt.name, model: config.transcription.model,
      duration: probeResult.duration, segments: rawSegs,
      paragraphs: paragraphs.map((p, i) => ({
        id: i, start: p.start, end: p.end, text: p.text,
        segmentIds: p.segmentIds, speaker: null,
      })),
      sections: [], text: rawSegs.map((s) => s.text).join(" "),
      createdAt: new Date().toISOString(),
    };

    // 4. Understand (Pass 1)
    report({ stage: "understand", progress: 0.35, message: "Analyzing content..." });
    const t3 = Date.now();
    const ai = createProvider(input.provider);
    const analysis = await analyzeTranscript({ provider: ai, segments: rawSegs, duration: probeResult.duration });
    transcript.sections = analysis.sections;
    timings.understand = Date.now() - t3;

    // 5. Find candidates (Pass 2)
    report({ stage: "candidates", progress: 0.5, message: "Finding moments..." });
    const t4 = Date.now();
    const candidates = await generateCandidates({
      provider: ai, sections: analysis.sections, segments: rawSegs,
      projectId: config.projectId, targetClips: config.targetClips,
      minDuration: config.minClipDuration, maxDuration: config.maxClipDuration,
      stride: config.candidateStride,
    });
    timings.candidates = Date.now() - t4;
    report({ stage: "candidates", progress: 0.65, message: `${candidates.length} candidates discovered` });

    // 6. Score + Rank (Pass 3)
    report({ stage: "score", progress: 0.7, message: "Ranking globally..." });
    const t5 = Date.now();
    const { selected, dropped } = rankCandidates({
      candidates, targetClips: config.targetClips,
      minScore: config.transcription.minimumScore,
      duplicateThreshold: config.transcription.duplicateThreshold,
    });
    timings.score = Date.now() - t5;
    report({ stage: "select", progress: 0.75, message: `Selected top ${selected.length} clips` });

    // 7. Render
    report({ stage: "render", progress: 0.8, message: "Rendering clips..." });
    const t6 = Date.now();
    const renderedClips: EngineOutput["clips"] = [];

    for (let i = 0; i < selected.length; i++) {
      const c = selected[i]!;
      report({ stage: "render", progress: 0.8 + (i / selected.length) * 0.18, message: `Rendering ${i + 1}/${selected.length}...` });

      const plan = buildRenderPlan({ candidate: c, segments: rawSegs, config, sourcePath: videoPath, outputDir });
      plan.captions = generateCaptions({ segments: rawSegs, clipStart: c.start, clipEnd: c.end, pausePolicy: config.pausePolicy });

      const result = renderClip(plan);
      const meta = await ai.generateMetadata({ text: c.text, start: c.start, end: c.end, duration: c.duration, fullTranscriptSummary: analysis.summary });
      renderedClips.push({ index: c.index, videoPath: result.videoPath, thumbnailPath: result.thumbnailPath, score: c.score.overall, title: meta.title, hook: meta.hook });
    }
    timings.render = Date.now() - t6;

    // 8. Finalize
    report({ stage: "finalize", progress: 0.98, message: "Writing manifest..." });
    const manifest = {
      schemaVersion: "1.0.0", engine: { name: "clipforge", version: ENGINE_VERSION },
      projectId: config.projectId, status: "completed" as const,
      createdAt: new Date().toISOString(),
      source: { path: videoPath, fileName: videoPath.split(/[/\\]/).pop() ?? "unknown", duration: probeResult.duration, width: probeResult.width, height: probeResult.height, fps: probeResult.fps, hasAudio: probeResult.hasAudio, probe: probeResult },
      config, providers: { transcription: stt.name, analysis: ai.name, scoring: "heuristic-v1" },
      transcript, candidates, clips: selected, droppedCandidates: dropped,
      stats: { durationSeconds: probeResult.duration, segmentCount: rawSegs.length, paragraphCount: paragraphs.length, sectionCount: analysis.sections.length, candidateCount: candidates.length, duplicateCount: dropped.filter((d) => d.reason === "duplicate").length, selectedCount: selected.length, timings },
      warnings: [],
    };
    writeFileSync(join(outputDir, "analysis.json"), JSON.stringify(manifest, null, 2), "utf-8");
    report({ stage: "finalize", progress: 1, message: `Done! ${renderedClips.length} clips.` });
    return { status: "completed", outputDir, clips: renderedClips, totalRenderMs: timings.render ?? 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report({ stage: "finalize", progress: 1, message: `FAILED: ${msg}` });
    return { status: "failed", outputDir, clips: [], totalRenderMs: 0, error: msg };
  }
}
