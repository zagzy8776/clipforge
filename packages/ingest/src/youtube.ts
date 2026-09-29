import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, basename, extname } from "node:path";
import { tmpdir } from "node:os";

/** Supported source platforms for URL ingestion. */
const ALLOWED_DOMAINS: RegExp[] = [
  /^(https?:\/\/)?(www\.)?youtube\.com$/i,
  /^(https?:\/\/)?(www\.)?youtu\.be$/i,
  /^(https?:\/\/)?(www\.)?vimeo\.com$/i,
  /^(https?:\/\/)?(www\.)?tiktok\.com$/i,
  /^(https?:\/\/)?(www\.)?instagram\.com$/i,
  /^(https?:\/\/)?(www\.)?facebook\.com$/i,
  /^(https?:\/\/)?(www\.)?fb\.watch$/i,
  /^(https?:\/\/)?(www\.)?linkedin\.com$/i,
  /^(https?:\/\/)?(www\.)?x\.com$/i,
  /^(https?:\/\/)?(www\.)?twitter\.com$/i,
  /^(https?:\/\/)?(www\.)?reddit\.com$/i,
];

const MAX_DURATION_SECONDS = 4 * 3600; // 4 hours hard cap

export interface IngestResult {
  filePath: string;
  metadata: {
    title: string;
    duration: number;
    sourcePlatform: string;
    originalUrl?: string;
  };
}

export interface ValidateResult {
  valid: boolean;
  platform: string;
  reason?: string;
  hostname?: string;
}

/**
 * Validate that a URL is from a supported platform before attempting download.
 * Returns { valid, platform } or { valid: false, reason }.
 */
export function validateUrl(url: string): ValidateResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, platform: "unknown", reason: "Malformed URL" };
  }

  const hostname = parsed.hostname.replace(/^www\./, "");
  const isDirect = isDirectVideoLink(url, parsed);

  if (!isDirect) {
    const allowed = ALLOWED_DOMAINS.some((re) => re.test(parsed.hostname));
    if (!allowed) {
      return { valid: false, platform: "unknown", reason: `Platform "${hostname}" is not supported. Allowed: YouTube, Vimeo, TikTok, Instagram, Facebook, LinkedIn, X/Twitter, Reddit.` };
    }
  }

  const platform = detectPlatform(parsed, hostname, isDirect);
  return { valid: true, platform, hostname };
}

function isDirectVideoLink(url: string, parsed: URL): boolean {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mkv") ||
    lower.endsWith(".avi") ||
    lower.endsWith(".m3u8") ||
    lower.endsWith(".m4s") ||
    !!parsed.pathname.match(/\.(mp4|mov|webm|mkv|avi|m3u8|m4s)$/i)
  );
}

function detectPlatform(parsed: URL, hostname: string, isDirect: boolean): string {
  if (isDirect) return "direct";
  if (/youtube\.com|youtu\.be/i.test(hostname)) return "youtube";
  if (/vimeo\.com/i.test(hostname)) return "vimeo";
  if (/tiktok\.com/i.test(hostname)) return "tiktok";
  if (/instagram\.com/i.test(hostname)) return "instagram";
  if (/facebook\.com|fb\.watch/i.test(hostname)) return "facebook";
  if (/linkedin\.com/i.test(hostname)) return "linkedin";
  if (/x\.com|twitter\.com/i.test(hostname)) return "x";
  if (/reddit\.com/i.test(hostname)) return "reddit";
  return hostname;
}

/** Check duration before downloading (yt-dlp --get-duration). Throws on cap exceeded. */
async function checkDuration(url: string, platform: string): Promise<number | null> {
  if (platform === "direct") return null;
  try {
    const out = await runYtDlp(["--get-duration", url]);
    const dur = parseFloat(out.trim());
    if (!isNaN(dur)) {
      if (dur > MAX_DURATION_SECONDS) {
        throw new Error(`Source duration ${Math.round(dur)}s exceeds the ${MAX_DURATION_SECONDS / 3600}h cap. Please provide a shorter video.`);
      }
      return dur;
    }
  } catch (err) {
    // --get-duration can fail for some sites; proceed to download and rely on source validation.
    console.warn(`  ⚠ Could not probe duration for ${platform} (${(err as Error).message.slice(0, 80)}); proceeding to download.`);
  }
  return null;
}

function findYtDlp(): string {
  for (const candidate of ["yt-dlp", "yt-dlp.exe", "yt_dlp"]) {
    try {
      const r = spawn(candidate, ["--version"], { stdio: "ignore" });
      r.kill();
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error("yt-dlp not found on PATH. Install it or set WORKER_YTDLP env var.");
}

function runYtDlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = process.env.WORKER_YTDLP ?? findYtDlp();
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`yt-dlp exit ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

/**
 * Download a video from a URL using yt-dlp.
 * Validates the URL against an allowlist, enforces a duration cap, and returns
 * the local file path plus basic metadata.
 */
export async function downloadFromUrl(url: string, outputDir: string): Promise<IngestResult> {
  const { valid, platform, reason } = validateUrl(url);
  if (!valid) throw new Error(`Ingest rejected: ${reason ?? "invalid URL"}`);

  const preDur = await checkDuration(url, platform);

  mkdirSync(outputDir, { recursive: true });

  // Generate a deterministic output filename from the URL.
  const safeName = `${platform}-${Date.now()}`;
  const outFile = join(outputDir, `${safeName}.mp4`);

  // yt-dlp --print-json gives us metadata; -f picks best video+audio <=1080p.
  const jsonOut = await runYtDlp([
    "-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best",
    "-o", outFile,
    "--print-json",
    "--no-warnings",
    url,
  ]);

  const meta = parseYtDlpJson(jsonOut);
  return {
    filePath: outFile,
    metadata: {
      title: meta.title,
      duration: meta.duration ?? (preDur ?? 0),
      sourcePlatform: platform,
      originalUrl: url,
    },
  };
}

interface YtDlpMeta {
  title: string;
  duration?: number;
  extractor?: string;
}

function parseYtDlpJson(output: string): YtDlpMeta {
  const lines = output.trim().split("\n");
  let meta: YtDlpMeta = { title: "Downloaded Video" };
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj._type === "url" || obj.url || obj.title) {
        meta = {
          title: obj.title ?? meta.title,
          duration: typeof obj.duration === "number" ? obj.duration : meta.duration,
          extractor: obj.extractor ?? obj.extractor_key,
        };
      }
    } catch { /* skip non-JSON lines */ }
  }
  return meta;
}

/**
 * Upload a local file to artifact storage via streaming.
 * Uses the storage abstraction so it works with S3/R2 or local dev storage.
 */
export async function uploadFile(
  storage: { put(key: string, data: Buffer | string, opts?: { contentType?: string }): Promise<string> },
  localPath: string,
  key: string,
): Promise<string> {
  const { readFileSync } = await import("node:fs");
  const buf = readFileSync(localPath);
  const contentType = guessContentType(localPath);
  return storage.put(key, buf, { contentType });
}

export function guessContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".json": "application/json",
    ".ass": "application/x-subrip",
  };
  return map[ext] ?? "application/octet-stream";
}

export { tmpdir, basename };

export function validateUpload(filePath: string, maxBytes = 4 * 1024 * 1024 * 1024): { valid: boolean; reason?: string } {
  try {
    const stat = statSync(filePath);
    if (stat.size > maxBytes) {
      return { valid: false, reason: `File is ${(stat.size / 1e9).toFixed(2)}GB, exceeds the ${(maxBytes / 1e9).toFixed(0)}GB cap.` };
    }
    const ext = filePath.toLowerCase().split(".").pop() ?? "";
    if (!["mp4", "mov", "webm", "mkv", "avi"].includes(ext)) {
      return { valid: false, reason: `Unsupported file extension .${ext}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "File not found" };
  }
}
