import { writeFileSync } from "node:fs";

/* -------------------------------------------------------------------------- */
/* ASS caption file builder                                                   */
/* -------------------------------------------------------------------------- */

export interface AssCue {
  index: number;
  start: number;
  end: number;
  text: string;
  words?: Array<{ text: string; start: number; end: number }>;
  speaker: string | null;
}

export interface AssStyle {
  name: string;
  fontName: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  outlineColor: string;
  backColor: string;
  bold: boolean;
  italic: boolean;
  outlineWidth: number;
  shadow: number;
  alignment: number;
  marginV: number;
  marginL: number;
  marginR: number;
}

export const ASS_PRESETS: Record<string, AssStyle> = {
  modern: {
    name: "Modern", fontName: "Arial", fontSize: 56,
    primaryColor: "&H00FFFFFF", highlightColor: "&H0000FFFF",
    outlineColor: "&H00000000", backColor: "&H80000000",
    bold: true, italic: false, outlineWidth: 3, shadow: 0,
    alignment: 2, marginV: 80, marginL: 60, marginR: 60,
  },
  bold: {
    name: "Bold", fontName: "Arial", fontSize: 64,
    primaryColor: "&H00FFFFFF", highlightColor: "&H0000D4FF",
    outlineColor: "&H00000000", backColor: "&H80000000",
    bold: true, italic: false, outlineWidth: 4, shadow: 2,
    alignment: 2, marginV: 100, marginL: 40, marginR: 40,
  },
  dynamic: {
    name: "Dynamic", fontName: "Arial", fontSize: 52,
    primaryColor: "&H00FFFFFF", highlightColor: "&H0000CCFF",
    outlineColor: "&H00333333", backColor: "&H00000000",
    bold: true, italic: false, outlineWidth: 3, shadow: 1,
    alignment: 2, marginV: 90, marginL: 50, marginR: 50,
  },
  minimal: {
    name: "Minimal", fontName: "Calibri", fontSize: 44,
    primaryColor: "&H00FFFFFF", highlightColor: "&H00FFFFFF",
    outlineColor: "&H80000000", backColor: "&H00000000",
    bold: false, italic: false, outlineWidth: 0, shadow: 2,
    alignment: 2, marginV: 70, marginL: 80, marginR: 80,
  },
  karaoke: {
    name: "Karaoke", fontName: "Arial", fontSize: 58,
    primaryColor: "&H00FFFFFF", highlightColor: "&H0000FFFF",
    outlineColor: "&H00000000", backColor: "&H00000000",
    bold: true, italic: false, outlineWidth: 3, shadow: 0,
    alignment: 2, marginV: 80, marginL: 50, marginR: 50,
  },
};

export function buildAssFile(
  cues: AssCue[], styleName: string,
  _videoWidth: number, _videoHeight: number,
): string {
  const style = ASS_PRESETS[styleName] ?? ASS_PRESETS["modern"]!;
  const lines: string[] = [
    "[Script Info]", "Title: ClipForge Captions",
    "PlayResX: 1080", "PlayResY: 1920",
    "ScriptType: v4.00+", "WrapStyle: 0",
    "ScaledBorderAndShadow: yes", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: ${style.name},${style.fontName},${style.fontSize},${style.primaryColor},${style.highlightColor},${style.outlineColor},${style.backColor},${style.bold ? -1 : 0},${style.italic ? -1 : 0},0,0,100,100,0,0,1,${style.outlineWidth},${style.shadow},${style.alignment},${style.marginL},${style.marginR},${style.marginV},1`,
    "", "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];
  for (const cue of cues) {
    const start = formatAssTime(cue.start);
    const end = formatAssTime(cue.end);
    let text: string;
    if (cue.words && cue.words.length > 0 && styleName === "karaoke") {
      text = cue.words.map((w) => `{\\kf${Math.round((w.end - w.start) * 100)}}${w.text}`).join(" ");
    } else {
      text = cue.text.replace(/\n/g, "\\N");
    }
    text = wrapCaptionText(text, 30);
    lines.push(`Dialogue: 0,${start},${end},${style.name},,0,0,0,,${text}`);
  }
  return lines.join("\r\n") + "\r\n";
}

function wrapCaptionText(text: string, maxChars: number): string {
  const clean = text.replace(/\\N/g, " ");
  const words = clean.split(" ");
  const result: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length + word.length + 1 > maxChars && line.length > 0) {
      result.push(line);
      line = word;
    } else {
      line = line.length > 0 ? `${line} ${word}` : word;
    }
  }
  if (line.length > 0) result.push(line);
  return result.join("\\N");
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export function writeAssFile(
  cues: AssCue[], styleName: string,
  videoWidth: number, videoHeight: number, outputPath: string,
): string {
  writeFileSync(outputPath, buildAssFile(cues, styleName, videoWidth, videoHeight), "utf-8");
  return outputPath;
}
