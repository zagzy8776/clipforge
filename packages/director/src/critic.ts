import type { DirectorPlan, DirectorEffect, EmphasisMoment } from "@clipforge/types";
import type { CandidateMoment } from "@clipforge/types";

export interface CriticVerdict {
  accepted: boolean;
  issues: CriticIssue[];
  revisionCount: number;
  revisedPlan?: DirectorPlan;
}

export interface CriticIssue {
  dimension: string;
  severity: "critical" | "major" | "minor";
  message: string;
  fix: string;
}

/**
 * Creative Critic — reviews a DirectorPlan and identifies issues.
 * If issues are found, suggests a revised plan.
 * Maximum 2 revision passes.
 */
export function critiquePlan(plan: DirectorPlan, candidate: CandidateMoment, maxRevisions = 2): CriticVerdict {
  const issues: CriticIssue[] = [];
  const text = candidate.text;
  const dur = candidate.end - candidate.start;

  // 1. Check hook quality
  if (plan.hook.length < 5) {
    issues.push({ dimension: "hook", severity: "critical", message: "Hook is empty or too short", fix: "Extract a more compelling opening from the transcript" });
  }
  if (plan.hook === plan.effects[0]?.reason) {
    issues.push({ dimension: "hook", severity: "minor", message: "Hook duplicates an effect reason", fix: "Differentiate the hook from the first effect" });
  }

  // 2. Check pacing vs duration
  if (plan.pacing === "fast" && dur > 60) {
    issues.push({ dimension: "pacing", severity: "major", message: `Fast pacing on ${dur.toFixed(0)}s clip may feel rushed`, fix: "Consider natural pacing for longer clips" });
  }
  if (plan.pacing === "slow" && dur < 30) {
    issues.push({ dimension: "pacing", severity: "major", message: `Slow pacing on ${dur.toFixed(0)}s clip may feel draggy`, fix: "Consider faster pacing for short clips" });
  }

  // 3. Check effects count
  if (plan.effects.length > 3) {
    issues.push({ dimension: "effects", severity: "major", message: `${plan.effects.length} effects may overwhelm content`, fix: "Reduce to 2-3 most impactful effects" });
  }

  // 4. Check emphasis count
  if (plan.emphasisMoments.length > 5) {
    issues.push({ dimension: "emphasis", severity: "major", message: `${plan.emphasisMoments.length} emphasis points — too many visual changes`, fix: "Keep emphasis to top 3 most impactful words" });
  }

  // 5. Check caption strategy vs content
  if (plan.captionStrategy === "none" && dur > 30) {
    issues.push({ dimension: "captions", severity: "major", message: "No captions on a 30+ second clip", fix: "Add at least standard captions for longer clips" });
  }

  // 6. Check framing strategy
  if (plan.framingStrategy === "dynamic-zoom" && plan.effects.length === 0) {
    issues.push({ dimension: "framing", severity: "minor", message: "Dynamic-zoom selected but no effects defined", fix: "Add zoom effects or switch to center/speaker framing" });
  }

  // 7. Check emotion alignment
  const hasEmotionalContent = /\b(terrified|amazing|incredible|love|hate|but looking back|that's when)\b/i.test(text);
  if (plan.visualStyle === "minimal" && hasEmotionalContent) {
    issues.push({ dimension: "visual-style", severity: "minor", message: "Minimal style may understate emotional content", fix: "Consider dramatic or energetic style for emotional content" });
  }

  // If no issues, accept
  if (issues.length === 0) {
    return { accepted: true, issues: [], revisionCount: 0 };
  }

  // If critical or major issues, revise
  const hasMajor = issues.some((i) => i.severity === "critical" || i.severity === "major");
  if (!hasMajor || maxRevisions <= 0) {
    return { accepted: !hasMajor, issues, revisionCount: 0 };
  }

  // Revise the plan
  const revised = revisePlan(plan, issues);
  return { accepted: false, issues, revisionCount: 1, revisedPlan: revised };
}

/** Apply critic fixes to produce a revised DirectorPlan. */
function revisePlan(plan: DirectorPlan, issues: CriticIssue[]): DirectorPlan {
  const revised = { ...plan };
  const effects = [...plan.effects];
  const emphasis = [...plan.emphasisMoments];

  for (const issue of issues) {
    switch (issue.dimension) {
      case "pacing":
        revised.pacing = "natural"; // Default to natural if fast/slow was problematic
        break;
      case "effects":
        // Reduce effects to top 2 by importance
        effects.sort((a, b) => b.intensity - a.intensity);
        effects.length = Math.min(2, effects.length);
        break;
      case "emphasis":
        // Keep only first 3 emphasis moments
        emphasis.length = Math.min(3, emphasis.length);
        break;
      case "captions":
        revised.captionStrategy = "standard";
        break;
      case "framing":
        revised.framingStrategy = "center";
        break;
      case "visual-style":
        revised.visualStyle = "dramatic";
        break;
    }
  }

  revised.effects = effects;
  revised.emphasisMoments = emphasis;
  revised.confidence = Math.min(100, plan.confidence + 10); // Revision adds confidence
  revised.reasoning += " [Revised by critic]";

  return revised;
}
