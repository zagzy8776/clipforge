export type FailureOrigin = "candidate-selection" | "boundary" | "director-decision" | "rendering" | "caption" | "framing" | "audio" | "transcription";

export interface FailureAttribution {
  clipId: string;
  failures: Array<{ code: string; origin: FailureOrigin; severity: "critical" | "major" | "minor"; description: string; stage: string; confidence: number; }>;
  primaryOrigin: FailureOrigin | null;
  sourceVsPipeline: "source-material" | "pipeline" | "ambiguous";
  analysis: string;
}

export function attributeFailures(input: {
  clipId: string; hookStrength: number; narrativeCoherence: number; curiosityFactor: number;
  emotionalResonance: number; pacing: number; visualQuality: number; captionQuality: number;
  effectRelevance: number; renderValid: boolean; effectCount: number; emphasisCount: number;
  directorConfidence: number; candidateScore: number; clipDuration: number; sourceDuration: number;
}): FailureAttribution {
  const f: FailureAttribution["failures"] = [];

  if (input.hookStrength < 30) f.push({ code: "WEAK_HOOK", origin: "candidate-selection", severity: "major", description: `Hook ${input.hookStrength}/100`, stage: "scoring", confidence: 0.8 });
  if (input.candidateScore < 25) f.push({ code: "LOW_INFORMATION_DENSITY", origin: "candidate-selection", severity: "major", description: `Candidate ${input.candidateScore}/100`, stage: "scoring", confidence: 0.7 });
  if (input.narrativeCoherence < 40) f.push({ code: "INCOMPLETE_CONTEXT", origin: "boundary", severity: "major", description: `Coherence ${input.narrativeCoherence}/100`, stage: "candidates", confidence: 0.7 });
  if (input.clipDuration < 15 || input.clipDuration > 120) f.push({ code: "POOR_BOUNDARY", origin: "boundary", severity: "minor", description: `Duration ${input.clipDuration}s`, stage: "candidates", confidence: 0.6 });
  if (input.effectCount > 4) f.push({ code: "EXCESSIVE_EFFECTS", origin: "director-decision", severity: "major", description: `${input.effectCount} effects`, stage: "director", confidence: 0.75 });
  if (input.pacing < 40) f.push({ code: "PACING", origin: "director-decision", severity: "major", description: `Pacing ${input.pacing}/100`, stage: "director", confidence: 0.65 });
  if (input.directorConfidence < 40) f.push({ code: "DIRECTOR_LOW_CONFIDENCE", origin: "director-decision", severity: "minor", description: `Confidence ${input.directorConfidence}%`, stage: "director", confidence: 0.5 });
  if (!input.renderValid) f.push({ code: "RENDER_FAILURE", origin: "rendering", severity: "critical", description: "Render failed", stage: "render", confidence: 0.95 });
  if (input.visualQuality < 50) f.push({ code: "BAD_FRAMING", origin: "framing", severity: "major", description: `Visual ${input.visualQuality}/100`, stage: "render", confidence: 0.6 });
  if (input.captionQuality < 40) f.push({ code: "CAPTION_TIMING", origin: "caption", severity: "major", description: `Captions ${input.captionQuality}/100`, stage: "render", confidence: 0.6 });

  const sev = { critical: 0, major: 1, minor: 2 } as const;
  f.sort((a, b) => sev[a.severity] - sev[b.severity]);
  const primary = f[0]?.origin ?? null;
  const svp: FailureAttribution["sourceVsPipeline"] = primary === "candidate-selection" || primary === "boundary" ? "source-material" : primary === "director-decision" || primary === "rendering" || primary === "framing" ? "pipeline" : "ambiguous";

  const parts: string[] = [];
  if (primary) parts.push(`Primary: ${svp} (${primary})`);
  if (f.length > 1) parts.push(`${f.length} issues: ${f.map((x) => x.code).join(", ")}`);
  const strengths: string[] = [];
  if (input.hookStrength > 60) strengths.push("hook");
  if (input.narrativeCoherence > 60) strengths.push("narrative");
  if (input.pacing > 60) strengths.push("pacing");
  if (input.visualQuality > 70) strengths.push("visuals");
  if (input.captionQuality > 70) strengths.push("captions");
  if (strengths.length) parts.push(`Strengths: ${strengths.join(", ")}`);

  return { clipId: input.clipId, failures: f, primaryOrigin: primary, sourceVsPipeline: svp, analysis: parts.join(". ") || "No major failures detected." };
}
