export interface ClipMetrics {
  clipId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  avgWatchPercent: number;
  platform: string;
  recordedAt: string;
}

export interface EngagementPrediction {
  clipId: string;
  predictedScore: number;
  factors: Array<{ name: string; weight: number; value: number }>;
  recommendation: string;
}

export function predictEngagement(input: {
  score: number;
  hookStrength: number;
  durationSeconds: number;
  hasCaptions: boolean;
  aspectRatio: string;
}): EngagementPrediction {
  const factors = [
    { name: "ai_score", weight: 0.4, value: input.score },
    { name: "hook", weight: 0.25, value: input.hookStrength },
    { name: "duration_fit", weight: 0.15, value: durationScore(input.durationSeconds) },
    { name: "captions", weight: 0.1, value: input.hasCaptions ? 90 : 40 },
    { name: "aspect", weight: 0.1, value: input.aspectRatio === "9:16" ? 95 : 70 },
  ];
  const predicted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
  let recommendation = "Good candidate — publish as-is";
  if (predicted < 50) recommendation = "Consider a stronger hook or shorter cut";
  else if (predicted > 80) recommendation = "High potential — prioritize this clip";
  return { clipId: "", predictedScore: Math.round(predicted * 10) / 10, factors, recommendation };
}

function durationScore(sec: number): number {
  if (sec >= 25 && sec <= 55) return 100;
  if (sec >= 15 && sec <= 70) return 80;
  if (sec >= 10 && sec <= 90) return 60;
  return 40;
}
