import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const require = createRequire(import.meta.url);
const ffmpegPath: string | null = require("ffmpeg-static");
const ffprobePath: string | null = require("ffprobe-static").path ?? null;

export interface BinaryPaths { ffmpeg: string; ffprobe: string; }
let _cache: BinaryPaths | null = null;

export function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  if (ffmpegPath && existsSync(ffmpegPath)) return ffmpegPath;
  if (isOnPath("ffmpeg")) return "ffmpeg";
  throw new Error("ffmpeg not found. Set FFMPEG_PATH env var.");
}

export function resolveFfprobe(): string {
  if (process.env.FFPROBE_PATH && existsSync(process.env.FFPROBE_PATH)) return process.env.FFPROBE_PATH;
  if (ffprobePath && existsSync(ffprobePath)) return ffprobePath;
  if (isOnPath("ffprobe")) return "ffprobe";
  throw new Error("ffprobe not found. Set FFPROBE_PATH env var.");
}

function isOnPath(name: string): boolean {
  try {
    const ext = process.platform === "win32" ? ".exe" : "";
    const cmd = process.platform === "win32" ? "where" : "which";
    execFileSync(cmd, [name + ext], { stdio: "pipe", timeout: 3_000 });
    return true;
  } catch { return false; }
}

export function resolveBinaries(): BinaryPaths {
  if (!_cache) _cache = { ffmpeg: resolveFfmpeg(), ffprobe: resolveFfprobe() };
  return _cache;
}


