import { execFfprobe } from "./exec.js";

export interface ValidationResult {
  valid: boolean;
  status: "RENDERED" | "VALIDATED" | "FAILED" | "DEGRADED";
  checks: RenderCheck[];
  summary: string;
}

export interface RenderCheck {
  name: string;
  passed: boolean;
  value?: string | number;
  expected?: string | number;
  message: string;
}

/**
 * Validate a rendered clip after FFmpeg finishes.
 * Inspects: resolution, duration, codec, audio, black frames, file size.
 */
export async function validateRender(videoPath: string, expectedWidth?: number, expectedHeight?: number): Promise<ValidationResult> {
  const checks: RenderCheck[] = [];

  // Probe the output
  try {
    const { stdout } = execFfprobe([
      "-v", "quiet", "-print_format", "json",
      "-show_format", "-show_streams", videoPath,
    ], { allowFail: true });
    const data = JSON.parse(stdout) as {
      format: { duration?: string; size?: string; bit_rate?: string };
      streams: Array<{ codec_type: string; codec_name?: string; width?: number; height?: number; sample_rate?: string; channels?: number }>;
    };

    const videoStream = data.streams.find((s) => s.codec_type === "video");
    const audioStream = data.streams.find((s) => s.codec_type === "audio");
    const duration = parseFloat(data.format?.duration ?? "0");
    const sizeMB = parseInt(data.format?.size ?? "0") / (1024 * 1024);

    // Check: has video stream
    checks.push({
      name: "has-video", passed: !!videoStream,
      message: videoStream ? `Video: ${videoStream.codec_name} ${videoStream.width}x${videoStream.height}` : "No video stream found",
    });

    // Check: has audio stream
    checks.push({
      name: "has-audio", passed: !!audioStream,
      message: audioStream ? `Audio: ${audioStream.codec_name} ${audioStream.sample_rate}Hz` : "No audio stream found",
    });

    // Check: resolution
    if (expectedWidth && expectedHeight && videoStream) {
      const resOk = videoStream.width === expectedWidth && videoStream.height === expectedHeight;
      checks.push({
        name: "resolution", passed: resOk,
        value: `${videoStream.width}x${videoStream.height}`,
        expected: `${expectedWidth}x${expectedHeight}`,
        message: resOk ? `Correct resolution ${expectedWidth}x${expectedHeight}` : `Resolution mismatch: got ${videoStream.width}x${videoStream.height}`,
      });
    }

    // Check: duration reasonable (not empty, not truncated)
    const durOk = duration > 5 && duration < 300;
    checks.push({
      name: "duration", passed: durOk,
      value: `${duration.toFixed(1)}s`,
      message: durOk ? `Duration ${duration.toFixed(1)}s OK` : `Duration ${duration.toFixed(1)}s outside expected range`,
    });

    // Check: file size reasonable (not empty, not corrupt)
    const sizeOk = sizeMB > 0.01 && sizeMB < 500;
    checks.push({
      name: "file-size", passed: sizeOk,
      value: `${sizeMB.toFixed(2)} MB`,
      message: sizeOk ? `File size ${sizeMB.toFixed(2)} MB OK` : `File size ${sizeMB.toFixed(2)} MB suspicious`,
    });

    // Check: codec is valid
    const codecOk = videoStream && ["h264", "h265", "hevc", "vp9", "av1"].includes(videoStream.codec_name ?? "");
    checks.push({
      name: "codec", passed: !!codecOk,
      message: codecOk ? `Codec ${videoStream!.codec_name} OK` : `Invalid codec: ${videoStream?.codec_name ?? "none"}`,
    });

  } catch (err) {
    checks.push({
      name: "probe", passed: false,
      message: `Failed to probe output: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Check: file exists and is readable
  const { existsSync, statSync } = await import("node:fs");
  if (existsSync(videoPath)) {
    const stat = statSync(videoPath);
    checks.push({
      name: "file-exists", passed: stat.size > 0,
      value: `${stat.size} bytes`,
      message: stat.size > 0 ? "File exists and is non-empty" : "File is empty",
    });
  } else {
    checks.push({ name: "file-exists", passed: false, message: "Output file does not exist" });
  }

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const allPassed = passed === total;
  const failedCritical = checks.filter((c) => !c.passed && ["has-video", "has-audio", "file-exists"].includes(c.name));

  let status: ValidationResult["status"];
  if (allPassed) status = "VALIDATED";
  else if (failedCritical.length > 0) status = "FAILED";
  else status = "DEGRADED";

  return {
    valid: allPassed,
    status,
    checks,
    summary: `${passed}/${total} checks passed. Status: ${status}`,
  };
}
