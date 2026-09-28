export type CaptionStyleName = "modern" | "bold" | "dynamic" | "minimal" | "karaoke";

export interface CaptionStyle {
  name: CaptionStyleName;
  fontName: string;
  fontSize: number;
  primaryColour: string;
  outlineColour: string;
  backColour: string;
  bold: 0 | 1;
  italic: 0 | 1;
  outline: number;
  shadow: number;
  alignment: number;
  marginV: number;
  marginL: number;
  marginR: number;
  maxCharsPerLine: number;
  wordsPerGroup?: number;
}

export const CAPTION_STYLES: Record<CaptionStyleName, CaptionStyle> = {
  modern: { name: "modern", fontName: "Arial", fontSize: 64, primaryColour: "&H00FFFFFF", outlineColour: "&H00000000", backColour: "&H80000000", bold: 1, italic: 0, outline: 3, shadow: 1, alignment: 2, marginV: 120, marginL: 40, marginR: 40, maxCharsPerLine: 32 },
  bold: { name: "bold", fontName: "Arial Black", fontSize: 72, primaryColour: "&H00FFFFFF", outlineColour: "&H00000000", backColour: "&H00000000", bold: 1, italic: 0, outline: 4, shadow: 0, alignment: 2, marginV: 100, marginL: 30, marginR: 30, maxCharsPerLine: 28 },
  dynamic: { name: "dynamic", fontName: "Montserrat", fontSize: 68, primaryColour: "&H0000FFFF", outlineColour: "&H00000000", backColour: "&H80000000", bold: 1, italic: 0, outline: 3, shadow: 2, alignment: 2, marginV: 140, marginL: 40, marginR: 40, maxCharsPerLine: 30, wordsPerGroup: 3 },
  minimal: { name: "minimal", fontName: "Helvetica", fontSize: 52, primaryColour: "&H00FFFFFF", outlineColour: "&H00000000", backColour: "&H00000000", bold: 0, italic: 0, outline: 2, shadow: 0, alignment: 2, marginV: 80, marginL: 50, marginR: 50, maxCharsPerLine: 36 },
  karaoke: { name: "karaoke", fontName: "Arial", fontSize: 60, primaryColour: "&H00FFFFFF", outlineColour: "&H00000000", backColour: "&H80000000", bold: 1, italic: 0, outline: 2, shadow: 1, alignment: 2, marginV: 110, marginL: 40, marginR: 40, maxCharsPerLine: 28, wordsPerGroup: 1 },
};

export function getCaptionStyle(name: string): CaptionStyle {
  return CAPTION_STYLES[name as CaptionStyleName] ?? CAPTION_STYLES.modern;
}
