import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface BinaryPaths { ffmpeg: string; ffprobe: string; }
let _cache: BinaryPaths | null = null;

function moduleDir(): string {
  try { return dirname(fileURLToPath(import.meta.url)); }
  catch { return process.cwd(); }
}

function walkUpFind(startDir: string, relativePath: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "node_modules", relativePath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "";
}

export function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  const bin = walkUpFind(moduleDir(), join("@ffmpeg-installer", "win32-x64", "ffmpeg.exe"));
  if (bin) return bin;
  const fromCwd = walkUpFind(process.cwd(), join("@ffmpeg-installer", "win32-x64", "ffmpeg.exe"));
  if (fromCwd) return fromCwd;
  
  if (isOnPath("ffmpeg")) return "ffmpeg";
  throw new Error("ffmpeg not found. Set FFMPEG_PATH env var.");
}

export function resolveFfprobe(): string {
  if (process.env.FFPROBE_PATH && existsSync(process.env.FFPROBE_PATH)) return process.env.FFPROBE_PATH;
  const bin = walkUpFind(moduleDir(), join("@ffprobe-installer", "win32-x64", "ffprobe.exe"));
  if (bin) return bin;
  const fromCwd = walkUpFind(process.cwd(), join("@ffprobe-installer", "win32-x64", "ffprobe.exe"));
  if (fromCwd) return fromCwd;
  
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


