export type GeneratorType = "hook" | "story" | "emotion" | "question" | "contrast" | "payoff" | "curiosity";

export interface RawCandidate {
  id: string;
  start: number;
  end: number;
  text: string;
  generator: GeneratorType;
  confidence: number;
  signals: {
    hook: boolean;
    completeThought: boolean;
    narrativeArc: boolean;
    emotionalShift: boolean;
    hasPayoff: boolean;
    hasQuestion: boolean;
    hasContrast: boolean;
  };
}

export interface CandidateGenerator {
  readonly type: GeneratorType;
  generate(segments: Array<{ start: number; end: number; text: string; id: number }>): RawCandidate[];
}
