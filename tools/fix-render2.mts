import { readFileSync, writeFileSync } from "node:fs";

const f = "e:/video/packages/ffmpeg/src/render.ts";
let c = readFileSync(f, "utf-8");

// Replace the entire buildFfmpegArgs function
const fn = `function buildFfmpegArgs(plan: RenderPlan): string[] {
  const trimDur = plan.trimEnd - plan.trimStart;

  // --- Video filter chain ---
  const vf: string[] = [];
  vf.push(\`trim=start=\${plan.trimStart}:duration=\${trimDur},setpts=PTS-STARTPTS\`);

  // Reframe: scale to fill target aspect, then center-crop
  const srcAR = plan.sourceWidth / plan.sourceHeight;
  const tgtAR = plan.width / plan.height;
  if (srcAR > tgtAR) {
    vf.push(\`scale=-2:\${plan.height}\`);
  } else {
    vf.push(\`scale=\${plan.width}:-2\`);
  }
  vf.push(\`crop=\${plan.width}:\${plan.height}\`);
  vf.push("format=yuv420p,setsar=1");

  // Burn in ASS captions
  if (plan.captions.length > 0) {
    const assPath = plan.outputPath.replace(/\\\\.mp4$/, ".ass");
    const escaped = assPath.replace(/\\\\\\\\/g, "/").replace(/:/g, "\\\\\\\\:");
    vf.push(\`subtitles='\${escaped}'\`);
  }

  // --- Audio filter chain ---
  const af: string[] = [];
  af.push(\`atrim=start=\${plan.trimStart}:duration=\${trimDur},asetpts=PTS-STARTPTS\`);
  af.push("aresample=48000");

  return [
    "-y", "-i", plan.sourcePath,
    "-filter_complex",
    \`[0:v]\${vf.join(",")}[outv];[0:a]\${af.join(",")}[outa]\`,
    "-map", "[outv]", "-map", "[outa]",
    "-c:v", plan.videoCodec, "-crf", String(plan.crf),
    "-preset", plan.preset,
    "-c:a", "aac", "-b:a", plan.audioBitrate,
    "-ar", "48000", "-movflags", "+faststart",
    plan.outputPath,
  ];
}`;

// Find and replace the function
const startIdx = c.indexOf("function buildFfmpegArgs");
if (startIdx === -1) { console.error("buildFfmpegArgs not found"); process.exit(1); }

// Find the next function after it
const nextFnIdx = c.indexOf("\nfunction ", startIdx + 1);
const endIdx = nextFnIdx > -1 ? nextFnIdx : c.indexOf("\n}\n", c.lastIndexOf("buildSelectExpr") + 200);

// Just replace between the function declaration and the next top-level declaration
c = c.substring(0, startIdx) + fn + c.substring(c.indexOf("\n}\n", startIdx + 300) + 3);

writeFileSync(f, c, "utf-8");
console.log("Replaced buildFfmpegArgs");
