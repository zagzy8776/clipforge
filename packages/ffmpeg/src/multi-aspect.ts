export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9";

export interface AspectSpec {
  ratio: AspectRatio;
  width: number;
  height: number;
  label: string;
}

export const ASPECT_SPECS: Record<AspectRatio, AspectSpec> = {
  "9:16": { ratio: "9:16", width: 1080, height: 1920, label: "Vertical (TikTok / Reels / Shorts)" },
  "1:1": { ratio: "1:1", width: 1080, height: 1080, label: "Square" },
  "4:5": { ratio: "4:5", width: 1080, height: 1350, label: "Portrait (IG)" },
  "16:9": { ratio: "16:9", width: 1920, height: 1080, label: "Landscape" },
};

export function getAspectSpec(ratio: string): AspectSpec {
  return ASPECT_SPECS[ratio as AspectRatio] ?? ASPECT_SPECS["9:16"];
}

export function computeCenterCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const srcAR = sourceWidth / sourceHeight;
  const tgtAR = targetWidth / targetHeight;
  let cropW: number, cropH: number;
  if (srcAR > tgtAR) {
    cropH = sourceHeight;
    cropW = Math.round(cropH * tgtAR);
  } else {
    cropW = sourceWidth;
    cropH = Math.round(cropW / tgtAR);
  }
  const cropX = Math.round((sourceWidth - cropW) / 2);
  const cropY = Math.round((sourceHeight - cropH) / 2);
  return { cropW, cropH, cropX, cropY };
}
