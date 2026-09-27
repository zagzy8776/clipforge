var fs = require("fs");
var code = `import type { CandidateMoment, EngineConfig, EditingStyleName, EditPlan, EditEffect } from "@clipforge/types";
import { EDITING_STYLES } from "@clipforge/types";

export interface EditPlanInput {
  candidate: CandidateMoment;
  config: EngineConfig;
  contextText: string;
  style?: EditingStyleName;
  beatData?: { bpm: number; beats: number[]; energy: Array<{ time: number; value: number }> };
}

export function generateEditPlan(input: EditPlanInput): EditPlan {
  const { candidate, config } = input;
  const styleName = (input.style as EditingStyleName) ?? "podcast";
  const preset = EDITING_STYLES[styleName] ?? EDITING_STYLES.podcast;
  const text = candidate.text;
  const duration = candidate.end - candidate.start;
  const effects: EditEffect[] = [];

  // Content-based punch-ins
  if (preset.effects.punchInFrequency !== "none") {
    effects.push(...contentPunchIns(text, candidate, preset.effects.zoomIntensity, preset.effects.punchInFrequency));
  }

  // Beat-synced effects
  if (input.beatData && input.beatData.beats.length > 0) {
    effects.push(...beatSyncedEffects(candidate, input.beatData, preset.effects.zoomIntensity));
  }

  return {
    source: { start: candidate.start, end: candidate.end },
    framing: { aspectRatio: config.aspectRatio, strategy: decideFraming(text, config, styleName) },
    captions: { enabled: config.captionsEnabled, style: preset.captions.style, position: decideCaptionPos(text, candidate.score.overall, styleName) },
    audio: { normalize: true, removeSilence: preset.audio.removeSilence, silenceThreshold: preset.audio.silenceThreshold, keepPause: preset.audio.keepPause, syncToBeat: preset.audio.syncToBeat },
    effects,
    transitions: effects.length > 0 ? [{ type: preset.effects.transitionStyle, at: 0, duration: 0.3 }] : [],
    branding: { ...preset.branding },
    metadata: { title: "", hook: "", description: "", hashtags: [], platforms: ["YouTube Shorts", "TikTok", "Instagram Reels"] },
  };
}

function decideFraming(text: string, config: EngineConfig, style: string): EditPlan["framing"]["strategy"] {
  if (style === "hype" || style === "music") return "speaker";
  return config.reframe === "face-track" ? "speaker" : "center";
}

function decideCaptionPos(text: string, score: number, style: string): EditPlan["captions"]["position"] {
  if (style === "cinematic" || style === "hype") return "center";
  if (score > 70 && /^(nobody|everyone|the biggest|here's the thing|truth be told)/i.test(text)) return "center";
  return "bottom";
}

function contentPunchIns(text: string, candidate: CandidateMoment, intensity: number, freq: string): EditEffect[] {
  const effects: EditEffect[] = [];
  const dur = candidate.end - candidate.start;
  const maxEffects = freq === "aggressive" ? 4 : freq === "moderate" ? 2 : 1;

  // Strong opener punch-in
  if (/^(nobody|everyone|the biggest|here's the thing|truth be told|today i|i'm honored|i want to tell)/i.test(text) && effects.length < maxEffects) {
    effects.push({ type: "punch-in", at: 0, duration: Math.min(1.5, dur * 0.1), intensity });
  }

  // Emotional peak punch-in
  const emotionalWords = text.match(/\\b(but looking back|that's when i realized|it turned out|the best|the worst|amazing|incredible|terrified)\\b/gi);
  if (emotionalWords && emotionalWords.length > 0 && effects.length < maxEffects) {
    const idx = text.indexOf(emotionalWords[0]!);
    const at = idx >= 0 ? (idx / text.length) * dur : dur * 0.5;
    effects.push({ type: "punch-in", at: Math.max(0, at - 0.3), duration: Math.min(1.2, dur * 0.08), intensity });
  }

  // Narrative turn zoom
  const turnMatch = text.match(/\\b(but |however |actually |the truth is|rather than)\\b/i);
  if (turnMatch && turnMatch.index && effects.length < maxEffects) {
    const charsPerSec = text.length / dur;
    const turnAt = turnMatch.index / charsPerSec;
    effects.push({ type: "zoom-in", at: Math.max(0, turnAt - 0.5), duration: 2.0, intensity: intensity * 0.7 });
  }

  return effects;
}

function beatSyncedEffects(candidate: CandidateMoment, beatData: { bpm: number; beats: number[]; energy: Array<{ time: number; value: number }> }, intensity: number): EditEffect[] {
  const effects: EditEffect[] = [];
  const dur = candidate.end - candidate.start;
  const clipStart = candidate.start;

  // Find high-energy moments within the clip
  for (const e of beatData.energy) {
    if (e.time < clipStart || e.time > candidate.end) continue;
    if (e.value > 0.7) {
      const at = e.time - clipStart;
      if (at > 0.5 && at < dur - 1) {
        effects.push({ type: "punch-in", at, duration: 0.8, intensity: intensity * 0.5 });
      }
    }
  }

  // Limit to 3 beat-synced effects
  return effects.slice(0, 3);
}

export { EditPlanInput };
`;
fs.writeFileSync("e:/video/packages/rendering/src/editplan.ts", code, "utf-8");
console.log("Wrote editplan.ts:", code.length, "bytes");
