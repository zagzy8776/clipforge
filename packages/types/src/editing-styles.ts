import type { EditPlan } from "./editplan.js";

export type EditingStyleName = "podcast" | "cinematic" | "hype" | "documentary" | "educational" | "music";

export interface EditingStylePreset {
  name: EditingStyleName;
  description: string;
  framing: EditPlan["framing"];
  captions: EditPlan["captions"];
  audio: EditPlan["audio"];
  effects: {
    punchInFrequency: "none" | "subtle" | "moderate" | "aggressive";
    zoomIntensity: number;
    transitionStyle: EditPlan["transitions"][number]["type"];
  };
  branding: EditPlan["branding"];
}

export const EDITING_STYLES: Record<EditingStyleName, EditingStylePreset> = {
  podcast: {
    name: "podcast",
    description: "Clean, professional podcast clips with natural pacing",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "modern", position: "bottom" },
    audio: { normalize: true, removeSilence: false, silenceThreshold: 0.5, keepPause: 0.2 },
    effects: { punchInFrequency: "subtle", zoomIntensity: 0.04, transitionStyle: "cut" },
    branding: { watermarkPosition: "bottom-right" },
  },
  cinematic: {
    name: "cinematic",
    description: "Dramatic editing with deliberate pacing and emphasis",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "bold", position: "center" },
    audio: { normalize: true, removeSilence: true, silenceThreshold: 0.4, keepPause: 0.15 },
    effects: { punchInFrequency: "moderate", zoomIntensity: 0.06, transitionStyle: "fade" },
    branding: { watermarkPosition: "bottom-right" },
  },
  hype: {
    name: "hype",
    description: "High-energy, fast-paced edits for maximum engagement",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "dynamic", position: "center" },
    audio: { normalize: true, removeSilence: true, silenceThreshold: 0.35, keepPause: 0.1 },
    effects: { punchInFrequency: "aggressive", zoomIntensity: 0.08, transitionStyle: "cut" },
    branding: { watermarkPosition: "bottom-right" },
  },
  documentary: {
    name: "documentary",
    description: "Thoughtful, measured editing with space for the content to breathe",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "minimal", position: "bottom" },
    audio: { normalize: true, removeSilence: false, silenceThreshold: 0.6, keepPause: 0.3 },
    effects: { punchInFrequency: "none", zoomIntensity: 0.02, transitionStyle: "fade" },
    branding: { watermarkPosition: "bottom-right" },
  },
  educational: {
    name: "educational",
    description: "Clear, readable captions with emphasis on information delivery",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "bold", position: "bottom" },
    audio: { normalize: true, removeSilence: true, silenceThreshold: 0.45, keepPause: 0.2 },
    effects: { punchInFrequency: "moderate", zoomIntensity: 0.05, transitionStyle: "cut" },
    branding: { watermarkPosition: "bottom-right" },
  },
  music: {
    name: "music",
    description: "Beat-synced editing with visual rhythm matching audio",
    framing: { aspectRatio: "9:16", strategy: "center" },
    captions: { enabled: true, style: "karaoke", position: "bottom" },
    audio: { normalize: true, removeSilence: false, silenceThreshold: 0.5, keepPause: 0.15, syncToBeat: true },
    effects: { punchInFrequency: "moderate", zoomIntensity: 0.06, transitionStyle: "cut" },
    branding: { watermarkPosition: "bottom-right" },
  },
};
