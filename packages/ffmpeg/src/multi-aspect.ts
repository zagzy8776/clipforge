export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";
export const ASPECT_SPECS = {
  "9:16": { ratio: "9:16", width: 1080, height: 1920, label: "Vertical" },
  "1:1": { ratio: "1:1", width: 1080, height: 1080, label: "Square" },
  "4:5": { ratio: "4:5", width: 1080, height: 1350, label: "Portrait" },
  "16:9": { ratio: "16:9", width: 1920, height: 1080, label: "Landscape" },
} as const;
export function getAspectSpec(ratio: string) {
  return (ASPECT_SPECS as any)[ratio] ?? ASPECT_SPECS["9:16"];
}
export function computeCenterCrop(sw: number, sh: number, tw: number, th: number) {
  const srcAR = sw / sh, tgtAR = tw / th;
  let cropW: number, cropH: number;
  if (srcAR > tgtAR) { cropH = sh; cropW = Math.round(cropH * tgtAR); }
  else { cropW = sw; cropH = Math.round(cropW / tgtAR); }
  return { cropW, cropH, cropX: Math.round((sw - cropW) / 2), cropY: Math.round((sh - cropH) / 2) };
}
