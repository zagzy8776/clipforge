/**
 * Benchmark dataset — multi-content-type test fixtures.
 * Each entry represents a content type to validate against.
 */

export interface BenchmarkEntry {
  id: string;
  contentType: "podcast" | "interview" | "speech" | "educational" | "storytelling" | "gaming" | "music" | "conversation";
  /** Description of this benchmark case. */
  description: string;
  /** Expected editing style. */
  expectedStyle: string;
  /** What a good clip from this content should have. */
  expectedSignals: {
    hasHook?: boolean;
    hasNarrativeArc?: boolean;
    hasEmotion?: boolean;
    hasCuriosity?: boolean;
    minDuration?: number;
    maxDuration?: number;
  };
  /** Human notes on what makes a good clip from this content. */
  humanNotes: string;
}

export const BENCHMARK_DATASET: BenchmarkEntry[] = [
  {
    id: "podcast-long-form",
    contentType: "podcast",
    description: "Single speaker delivering a 60+ minute monologue on a personal topic",
    expectedStyle: "podcast",
    expectedSignals: { hasHook: true, hasNarrativeArc: true, hasEmotion: true, minDuration: 30, maxDuration: 90 },
    humanNotes: "Look for moments where the speaker tells a complete story. Avoid intros and tangents.",
  },
  {
    id: "two-person-interview",
    contentType: "interview",
    description: "Two-person interview with alternating speakers",
    expectedStyle: "podcast",
    expectedSignals: { hasHook: true, hasCuriosity: true, minDuration: 25, maxDuration: 75 },
    humanNotes: "Best clips capture a question + answer pair. Avoid cuts mid-sentence.",
  },
  {
    id: "speech-presentation",
    contentType: "speech",
    description: "Formal speech or presentation to an audience",
    expectedStyle: "cinematic",
    expectedSignals: { hasHook: true, hasNarrativeArc: true, hasEmotion: true, minDuration: 30, maxDuration: 60 },
    humanNotes: "Capture the strongest audience-relevant moment. Opening statements are often strong.",
  },
  {
    id: "educational-tutorial",
    contentType: "educational",
    description: "Educational content explaining a concept",
    expectedStyle: "educational",
    expectedSignals: { hasHook: true, minDuration: 20, maxDuration: 60 },
    humanNotes: "Best clips contain a self-contained explanation. Avoid clips that require prerequisites.",
  },
  {
    id: "storytelling-narrative",
    contentType: "storytelling",
    description: "Story with clear beginning, middle, end",
    expectedStyle: "cinematic",
    expectedSignals: { hasHook: true, hasNarrativeArc: true, hasEmotion: true, minDuration: 30, maxDuration: 90 },
    humanNotes: "The best clips contain a complete arc. Look for tension + resolution.",
  },
  {
    id: "gaming-highlight",
    contentType: "gaming",
    description: "Gaming stream highlight with commentary",
    expectedStyle: "hype",
    expectedSignals: { hasHook: true, hasEmotion: true, minDuration: 15, maxDuration: 45 },
    humanNotes: "Short, punchy. Capture the moment of excitement. Fast pacing.",
  },
  {
    id: "music-performance",
    contentType: "music",
    description: "Musical performance or music-focused content",
    expectedStyle: "music",
    expectedSignals: { hasEmotion: true, minDuration: 15, maxDuration: 60 },
    humanNotes: "Beat-sync editing. Capture the most energetic section.",
  },
  {
    id: "two-person-conversation",
    contentType: "conversation",
    description: "Casual conversation between two people",
    expectedStyle: "podcast",
    expectedSignals: { hasCuriosity: true, minDuration: 20, maxDuration: 60 },
    humanNotes: "Look for surprising reactions or turning points in the conversation.",
  },
];
