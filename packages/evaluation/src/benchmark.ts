import { z } from "zod";

export type VideoCategory = "podcast" | "interview" | "speech" | "educational" | "storytelling" | "gaming" | "music" | "conversation";

export interface BenchmarkVideo {
  id: string;
  category: VideoCategory;
  title: string;
  durationRange: { min: number; max: number };
  speakers: number;
  characteristics: { hasStrongHook: boolean; hasNarrativeArc: boolean; hasMultipleSpeakers: boolean; hasEmotionalContent: boolean; hasMusic: boolean; hasLowLight: boolean; isHighEnergy: boolean; };
  sourceRef: string;
  evaluationNotes: string;
  licenseStatus: "public-domain" | "cc-licensed" | "user-owned" | "fair-use-test";
}

export type FailureCode =
  | "WEAK_HOOK" | "INCOMPLETE_CONTEXT" | "POOR_BOUNDARY" | "EXCESSIVE_EFFECTS"
  | "EFFECT_MISPLACED" | "CAPTION_ERROR" | "CAPTION_TIMING" | "BAD_FRAMING"
  | "FACE_TRACK_FAILURE" | "AUDIO_SYNC" | "PACING" | "LOW_INFORMATION_DENSITY"
  | "MUSIC_MISMATCH" | "RENDER_FAILURE" | "TRANSCRIPTION_ERROR" | "DIRECTOR_LOW_CONFIDENCE";

export const FAILURE_DESCRIPTIONS: Record<FailureCode, string> = {
  WEAK_HOOK: "Opening fails to establish reason to keep watching",
  INCOMPLETE_CONTEXT: "Clip requires knowledge of surrounding content",
  POOR_BOUNDARY: "Clip starts/ends at unnatural point",
  EXCESSIVE_EFFECTS: "Too many effects distracting from content",
  EFFECT_MISPLACED: "Effect applied at wrong moment",
  CAPTION_ERROR: "Caption text is inaccurate",
  CAPTION_TIMING: "Captions desynchronized",
  BAD_FRAMING: "Subject poorly framed or cropped",
  FACE_TRACK_FAILURE: "Face tracking lost or jittery",
  AUDIO_SYNC: "Audio/video out of sync",
  PACING: "Clip too rushed or too slow",
  LOW_INFORMATION_DENSITY: "Clip lacks substantive content",
  MUSIC_MISMATCH: "Music doesn't match emotional tone",
  RENDER_FAILURE: "FFmpeg render failed",
  TRANSCRIPTION_ERROR: "Transcription errors affecting quality",
  DIRECTOR_LOW_CONFIDENCE: "Director confidence below threshold",
};

export interface HumanReview {
  reviewId: string;
  clipId: string;
  reviewerId: string;
  ratings: {
    contextIndependence: number;
    hookClarity: number;
    narrativeCoherence: number;
    cutAppropriateness: number;
    captionQuality: number;
    visualFraming: number;
    pacing: number;
    professionalUsability: number;
  };
  failures: FailureCode[];
  notes: string;
  blindId: string;
  isReference: boolean;
  reviewedAt: string;
}
