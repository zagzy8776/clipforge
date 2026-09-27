import type { CreativeEvaluation } from "@clipforge/types";
import type { DirectorPlan } from "@clipforge/types";
import type { CandidateMoment } from "@clipforge/types";
import { detectNarrativeArc, scoreText } from "@clipforge/ai";

export interface CreativeEvalInput {
  candidate: CandidateMoment;
  directorPlan: DirectorPlan;
  renderValid: boolean;
  renderDuration?: number;
  renderSizeMB?: number;
}

/**
 * Deterministic creative evaluator.
 * Produces a CreativeEvaluation without any LLM calls.
 */
export function evaluateCreative(input: CreativeEvalInput): CreativeEvaluation {
  const { candidate, directorPlan } = input;
  const text = candidate.text;
  const score = scoreText(text);
  const arc = detectNarrativeArc(text);

  // ── Engagement Potential ──
  const hookStrength = Math.round(
    (score.hook * 0.6 + (directorPlan.effects.some((e) => e.at === 0 && e.type === "punch-in") ? 20 : 0) + (directorPlan.hook.length > 10 ? 15 : 0))
  );

  const narrativeCoherence = Math.round(
    (score.coherence * 0.5 + (arc.hasArc ? 30 : 0) + (arc.strength * 20))
  );

  const curiosityFactor = Math.round(score.curiosity);

  const emotionalResonance = Math.round(
    (score.emotion * 0.5 + (arc.phases.includes("tension") ? 20 : 0) + (arc.phases.includes("payoff") ? 20 : 0))
  );

  const informationDensity = Math.round(score.information);

  // ── Creative Quality ──
  const pacing = scorePacing(directorPlan, candidate);
  const visualQuality = input.renderValid ? 80 : 20;
  const captionQuality = scoreCaptionQuality(directorPlan);
  const effectRelevance = scoreEffectRelevance(directorPlan);
  const audioSync = input.renderValid ? 85 : 10;
  const editConsistency = scoreConsistency(directorPlan);

  // ── Overall scores ──
  const overallEngagement = Math.round(
    hookStrength * 0.25 + narrativeCoherence * 0.20 + curiosityFactor * 0.15 +
    emotionalResonance * 0.25 + informationDensity * 0.15
  );
  const overallQuality = Math.round(
    pacing * 0.20 + visualQuality * 0.20 + captionQuality * 0.15 +
    effectRelevance * 0.15 + audioSync * 0.15 + editConsistency * 0.15
  );

  // ── Strengths & Issues ──
  const strengths: string[] = [];
  const issues: string[] = [];

  if (hookStrength > 60) strengths.push("Strong opening hook");
  if (narrativeCoherence > 60) strengths.push("Self-contained narrative");
  if (emotionalResonance > 60) strengths.push("Emotional resonance");
  if (directorPlan.effects.length > 0) strengths.push(`${directorPlan.effects.length} purposeful effects`);
  if (directorPlan.emphasisMoments.length > 0) strengths.push(`${directorPlan.emphasisMoments.length} emphasis moments`);

  const dur = candidate.end - candidate.start;
  if (dur < 20) issues.push("Clip may be too short for full context");
  if (dur > 120) issues.push("Clip may be too long for short-form");
  if (hookStrength < 30) issues.push("Weak opening — may lose viewers quickly");
  if (directorPlan.effects.length > 4) issues.push("Too many effects — may feel over-edited");
  if (!input.renderValid) issues.push("Render validation failed");

  return {
    engagementPotential: { hookStrength, narrativeCoherence, curiosityFactor, emotionalResonance, informationDensity },
    creativeQuality: { pacing, visualQuality, captionQuality, effectRelevance, audioSync, editConsistency },
    strengths,
    issues,
    overallEngagement,
    overallQuality,
    method: "deterministic",
    confidence: directorPlan.confidence,
  };
}

function scorePacing(plan: DirectorPlan, candidate: CandidateMoment): number {
  const dur = candidate.end - candidate.start;
  const effectCount = plan.effects.length;
  // Good pacing: effects spaced out, duration appropriate
  if (dur >= 25 && dur <= 90 && effectCount <= 3) return 80;
  if (dur >= 15 && dur <= 120 && effectCount <= 5) return 60;
  return 40;
}

function scoreCaptionQuality(plan: DirectorPlan): number {
  if (plan.captionStrategy === "none") return 50;
  if (plan.captionStrategy === "word-emphasis" || plan.captionStrategy === "dynamic") return 75;
  return 65;
}

function scoreEffectRelevance(plan: DirectorPlan): number {
  if (plan.effects.length === 0) return 50;
  const withReason = plan.effects.filter((e) => e.reason.length > 5);
  const relevance = withReason.length / Math.max(1, plan.effects.length);
  return Math.round(50 + relevance * 40);
}

function scoreConsistency(plan: DirectorPlan): number {
  let score = 60;
  if (plan.effects.length > 0 && plan.transitions.length > 0) score += 10;
  if (plan.emphasisMoments.length > 0 && plan.captionStrategy !== "none") score += 10;
  if (plan.pacing && plan.visualStyle) score += 10;
  return Math.min(100, score);
}
