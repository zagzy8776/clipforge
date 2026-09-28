export function predictEngagement(input: {
  score: number; hookStrength: number; durationSeconds: number;
  hasCaptions: boolean; aspectRatio: string;
}) {
  const factors = [
    { name: "ai_score", weight: 0.4, value: input.score },
    { name: "hook", weight: 0.25, value: input.hookStrength },
    { name: "duration_fit", weight: 0.15, value: input.durationSeconds >= 25 && input.durationSeconds <= 55 ? 100 : 60 },
    { name: "captions", weight: 0.1, value: input.hasCaptions ? 90 : 40 },
    { name: "aspect", weight: 0.1, value: input.aspectRatio === "9:16" ? 95 : 70 },
  ];
  const predicted = factors.reduce((s, f) => s + f.value * f.weight, 0);
  return {
    predictedScore: Math.round(predicted * 10) / 10,
    factors,
    recommendation: predicted > 80 ? "High potential" : predicted < 50 ? "Improve hook" : "Good candidate",
  };
}
