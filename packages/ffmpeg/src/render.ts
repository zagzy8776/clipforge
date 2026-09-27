import { writeFileSync as wf, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execFfmpeg } from "./exec.js";
import { buildAssFile, type AssCue } from "./captions.js";
import { generateThumbnail } from "./thumbnail.js";

export interface RenderPlan {
  sourcePath: string;
  outputPath: string;
  thumbnailPath: string;
  width: number;
  height: number;
  fps: number;
  trimStart: number;
  trimEnd: number;
  silenceSpans: Array<{ start: number; end: number }>;
  captions: AssCue[];
  captionStyle: string;
  crf: number;
  preset: string;
  audioBitrate: string;
  videoCodec: string;
  backgroundColor: string;
  thumbnailTimeOffset: number;
  sourceWidth: number;
  sourceHeight: number;
}

export function renderClip(plan: RenderPlan): { videoPath: string; thumbnailPath: string } {
  mkdirSync(dirname(plan.outputPath), { recursive: true });
  mkdirSync(dirname(plan.thumbnailPath), { recursive: true });
  if (plan.captions.length > 0) {
    const assPath = plan.outputPath.replace(/\.mp4$/, ".ass");
    wf(assPath, buildAssFile(plan.captions, plan.captionStyle, plan.width, plan.height), "utf-8");
  }
  const args = buildFfmpegArgs(plan);
  execFfmpeg(args, { timeoutMs: 15 * 60_000 });
  try {
    generateThumbnail(plan.outputPath, plan.thumbnailPath, plan.thumbnailTimeOffset, plan.width, plan.height);
  } catch { /* non-fatal */ }
  return { videoPath: plan.outputPath, thumbnailPath: plan.thumbnailPath };
}

function buildFfmpegArgs(plan: RenderPlan): string[] {
  const trimDur = plan.trimEnd - plan.trimStart;
  const vf: string[] = [];
  vf.push(`trim=start=${plan.trimStart}:duration=${trimDur},setpts=PTS-STARTPTS`);
  const srcAR = plan.sourceWidth / plan.sourceHeight;
  const tgtAR = plan.width / plan.height;
  if (srcAR > tgtAR) { vf.push(`scale=-2:${plan.height}`); }
  else { vf.push(`scale=${plan.width}:-2`); }
  vf.push(`crop=${plan.width}:${plan.height}`);
  vf.push("format=yuv420p,setsar=1");
  if (plan.captions.length > 0) {
    const assPath = plan.outputPath.replace(/\.mp4$/, ".ass");
    const escaped = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    vf.push(`subtitles='${escaped}'`);
  }
  const af: string[] = [];
  af.push(`atrim=start=${plan.trimStart}:duration=${trimDur},asetpts=PTS-STARTPTS`);
  af.push("aresample=48000");
  return [
    "-y", "-i", plan.sourcePath,
    "-filter_complex",
    `[0:v]${vf.join(",")}[outv];[0:a]${af.join(",")}[outa]`,
    "-map", "[outv]", "-map", "[outa]",
    "-c:v", plan.videoCodec, "-crf", String(plan.crf),
    "-preset", plan.preset,
    "-c:a", "aac", "-b:a", plan.audioBitrate,
    "-ar", "48000", "-movflags", "+faststart",
    plan.outputPath,
  ];
}
