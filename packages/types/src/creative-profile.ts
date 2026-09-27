import { z } from "zod";

/**
 * CreativeProfile — composable editing parameters.
 *
 * Instead of 100 hard-coded styles, users compose profiles from
 * independent dimensions. The Director interprets the profile.
 */
export type PacingSpeed = "slow" | "medium" | "fast";
export type FramingMode = "center" | "speaker" | "face-track" | "dynamic-zoom";
export type MusicBehavior = "none" | "ambient" | "beat-sync" | "emotional-arc" | "energy-build";
export type EmphasisBehavior = "none" | "minimal" | "moderate" | "aggressive";

export interface CreativeProfile {
  name: string;
  description: string;

  /** Pacing: slow = documentary, medium = podcast, fast = hype. */
  pacing: PacingSpeed;

  /** Caption intensity 0-1: 0 = no captions, 0.3 = minimal, 0.7 = standard, 1.0 = word-level emphasis. */
  captionIntensity: number;

  /** Effect intensity 0-1: 0 = no effects, 0.3 = occasional zoom, 0.7 = moderate punch-ins, 1.0 = aggressive. */
  effectIntensity: number;

  /** Transition intensity 0-1: 0 = hard cuts only, 1.0 = fade transitions. */
  transitionIntensity: number;

  /** Framing strategy. */
  framing: FramingMode;

  /** Music behavior. */
  musicBehavior: MusicBehavior;

  /** Emphasis behavior for captions. */
  emphasisBehavior: EmphasisBehavior;

  /** Visual style: how the clip should look. */
  visualStyle: "clean" | "dramatic" | "energetic" | "minimal" | "text-heavy";

  /** Background color for letterboxing / padding. */
  backgroundColor: string;

  /** Caption style: modern | dynamic | bold | minimal | karaoke. */
  captionStyle: string;
}

export const creativeProfileSchema = z.object({
  name: z.string(),
  description: z.string(),
  pacing: z.enum(["slow", "medium", "fast"]),
  captionIntensity: z.number().min(0).max(1),
  effectIntensity: z.number().min(0).max(1),
  transitionIntensity: z.number().min(0).max(1),
  framing: z.enum(["center", "speaker", "face-track", "dynamic-zoom"]),
  musicBehavior: z.enum(["none", "ambient", "beat-sync", "emotional-arc", "energy-build"]),
  emphasisBehavior: z.enum(["none", "minimal", "moderate", "aggressive"]),
  visualStyle: z.enum(["clean", "dramatic", "energetic", "minimal", "text-heavy"]),
  backgroundColor: z.string(),
  captionStyle: z.string(),
});

/** Predefined profiles that map from old style names. */
export const PROFILES: Record<string, CreativeProfile> = {
  podcast: {
    name: "Podcast", description: "Clean, professional podcast clips",
    pacing: "medium", captionIntensity: 0.6, effectIntensity: 0.2, transitionIntensity: 0.1,
    framing: "center", musicBehavior: "none", emphasisBehavior: "minimal",
    visualStyle: "clean", backgroundColor: "#000000", captionStyle: "modern",
  },
  cinematic: {
    name: "Cinematic", description: "Dramatic editing with deliberate pacing",
    pacing: "medium", captionIntensity: 0.7, effectIntensity: 0.5, transitionIntensity: 0.6,
    framing: "center", musicBehavior: "emotional-arc", emphasisBehavior: "moderate",
    visualStyle: "dramatic", backgroundColor: "#000000", captionStyle: "bold",
  },
  hype: {
    name: "Hype", description: "High-energy, fast-paced for maximum engagement",
    pacing: "fast", captionIntensity: 0.8, effectIntensity: 0.8, transitionIntensity: 0.3,
    framing: "speaker", musicBehavior: "energy-build", emphasisBehavior: "aggressive",
    visualStyle: "energetic", backgroundColor: "#000000", captionStyle: "dynamic",
  },
  documentary: {
    name: "Documentary", description: "Thoughtful, measured editing",
    pacing: "slow", captionIntensity: 0.4, effectIntensity: 0.1, transitionIntensity: 0.5,
    framing: "center", musicBehavior: "ambient", emphasisBehavior: "minimal",
    visualStyle: "minimal", backgroundColor: "#111111", captionStyle: "minimal",
  },
  educational: {
    name: "Educational", description: "Clear, readable captions, information-first",
    pacing: "medium", captionIntensity: 0.8, effectIntensity: 0.3, transitionIntensity: 0.2,
    framing: "center", musicBehavior: "none", emphasisBehavior: "moderate",
    visualStyle: "text-heavy", backgroundColor: "#000000", captionStyle: "bold",
  },
  music: {
    name: "Music", description: "Beat-synced editing with visual rhythm",
    pacing: "fast", captionIntensity: 0.5, effectIntensity: 0.6, transitionIntensity: 0.4,
    framing: "speaker", musicBehavior: "beat-sync", emphasisBehavior: "moderate",
    visualStyle: "energetic", backgroundColor: "#000000", captionStyle: "karaoke",
  },
};
