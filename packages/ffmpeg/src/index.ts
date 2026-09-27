/**
 * @clipforge/ffmpeg — thin wrappers around the system or installer-resolved
 * ffmpeg / ffprobe binaries.  Every function is side-effect free and
 * resolves the binary lazily on first call.
 */

export { resolveFfmpeg, resolveFfprobe, type BinaryPaths } from "./binary.js";
export { probe, probeSafe } from "./probe.js";
export { extractAudio } from "./extract.js";
export { detectSilences, type SilenceSpan } from "./silence.js";
export { execFfmpeg, execFfprobe, type ExecResult } from "./exec.js";
export { buildAssFile, type AssCue } from "./captions.js";
export { generateThumbnail } from "./thumbnail.js";
export { renderClip, type RenderPlan } from "./render.js";
export { detectFaces, getCropTimeline, type FaceTrackResult, type CropKeyframe } from "./facetrack.js";

export { detectBeats, nearestBeat, energyAt, type BeatData } from "./beats.js";
export { smoothCropKeyframes, buildCropExpression } from "./crop-smooth.js";
export { detectWordEmphasis, emphasisToAssTags, type WordEmphasis, type EmphasizedWord } from "./dynamic-captions.js";

export { validateRender, type ValidationResult, type RenderCheck } from "./validate.js";
