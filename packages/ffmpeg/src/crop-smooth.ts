import type { CropKeyframe } from "./facetrack.js";

/**
 * Smooth crop keyframes using exponential moving average.
 * Prevents jarring jumps when face detection moves between frames.
 *
 * @param keyframes Raw keyframes from face detection
 * @param smoothing Factor 0..1 (0 = no smoothing, 1 = max smoothing)
 */
export function smoothCropKeyframes(
  keyframes: CropKeyframe[],
  smoothing = 0.3,
): CropKeyframe[] {
  if (keyframes.length <= 1) return keyframes;

  const result: CropKeyframe[] = [{ ...keyframes[0]! }];

  for (let i = 1; i < keyframes.length; i++) {
    const prev = result[i - 1]!;
    const curr = keyframes[i]!;
    result.push({
      t: curr.t,
      cx: Math.round(prev.cx * smoothing + curr.cx * (1 - smoothing)),
      cy: Math.round(prev.cy * smoothing + curr.cy * (1 - smoothing)),
    });
  }

  return result;
}

/**
 * Build an ffmpeg crop expression from smoothed keyframes.
 * Produces a piecewise-linear expression for x(t) and y(t).
 *
 * Example output for ffmpeg:
 *   crop=1080:1920:x(t):y(t)
 *   where x(t) = 'if(lt(t,4.2), 150, if(lt(t,7.8), 180, ...))'
 */
export function buildCropExpression(
  keyframes: CropKeyframe[],
  cropWidth: number,
  cropHeight: number,
  videoWidth: number,
  videoHeight: number,
): { xExpr: string; yExpr: string; filterStr: string } {
  if (keyframes.length === 0) {
    // Center crop fallback
    const cx = Math.round(videoWidth / 2);
    const cy = Math.round(videoHeight / 2);
    return {
      xExpr: String(cx - cropWidth / 2),
      yExpr: String(cy - cropHeight / 2),
      filterStr: `crop=${cropWidth}:${cropHeight}:${cx - cropWidth / 2}:${cy - cropHeight / 2}`,
    };
  }

  // Build nested if() expressions for x and y
  const xParts: string[] = [];
  const yParts: string[] = [];

  for (let i = keyframes.length - 1; i >= 0; i--) {
    const kf = keyframes[i]!;
    const halfW = cropWidth / 2;
    const halfH = cropHeight / 2;
    // Clamp to ensure crop stays within bounds
    const cx = Math.max(halfW, Math.min(videoWidth - halfW, kf.cx));
    const cy = Math.max(halfH, Math.min(videoHeight - halfH, kf.cy));
    const x = Math.round(cx - halfW);
    const y = Math.round(cy - halfH);

    if (i === keyframes.length - 1) {
      xParts.push(String(x));
      yParts.push(String(y));
    } else {
      const next = keyframes[i + 1]!;
      xParts.push(`if(lt(t,${next.t}),${x},${xParts.pop()})`);
      yParts.push(`if(lt(t,${next.t}),${y},${yParts.pop()})`);
    }
  }

  const xExpr = xParts[0]!;
  const yExpr = yParts[0]!;

  return {
    xExpr,
    yExpr,
    filterStr: `crop=${cropWidth}:${cropHeight}:${xExpr}:${yExpr}`,
  };
}
