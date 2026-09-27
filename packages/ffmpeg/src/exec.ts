import { execFileSync } from "node:child_process";
import { resolveBinaries } from "./binary.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run an ffmpeg command and return structured output.
 * Throws on non-zero exit unless `allowFail` is set.
 */
export function execFfmpeg(
  args: string[],
  opts?: { timeoutMs?: number; allowFail?: boolean; cwd?: string },
): ExecResult {
  const { ffmpeg } = resolveBinaries();
  const timeout = opts?.timeoutMs ?? 30 * 60_000;
  try {
    const stdout = execFileSync(ffmpeg, args, {
      stdio: "pipe",
      timeout,
      maxBuffer: 100 * 1024 * 1024,
      cwd: opts?.cwd,
      env: { ...process.env, FFREPORT: "file=''" }, // suppress ffmpeg report file
    });
    return { stdout: stdout.toString("utf-8"), stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as {
      status?: number;
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    if (opts?.allowFail) {
      return {
        stdout: e.stdout?.toString("utf-8") ?? "",
        stderr: e.stderr?.toString("utf-8") ?? e.message ?? "",
        exitCode: e.status ?? 1,
      };
    }
    throw new Error(
      `ffmpeg failed (exit ${e.status}):\n${e.stderr?.toString("utf-8") ?? e.message}`,
    );
  }
}

/** Convenience wrapper for ffprobe. */
export function execFfprobe(
  args: string[],
  opts?: { timeoutMs?: number; allowFail?: boolean },
): ExecResult {
  const { ffprobe } = resolveBinaries();
  try {
    const stdout = execFileSync(ffprobe, args, {
      stdio: "pipe",
      timeout: opts?.timeoutMs ?? 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });
    return { stdout: stdout.toString("utf-8"), stderr: "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as {
      status?: number;
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    if (opts?.allowFail) {
      return {
        stdout: e.stdout?.toString("utf-8") ?? "",
        stderr: e.stderr?.toString("utf-8") ?? e.message ?? "",
        exitCode: e.status ?? 1,
      };
    }
    throw new Error(
      `ffprobe failed (exit ${e.status}):\n${e.stderr?.toString("utf-8") ?? e.message}`,
    );
  }
}
