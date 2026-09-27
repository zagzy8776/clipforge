import type { CandidateMoment, EngineConfig } from "@clipforge/types";
import type { DirectorPlan, DirectorEffect, EmphasisMoment } from "@clipforge/types";
import { EDITING_STYLES, type EditingStyleName } from "@clipforge/types";
import { detectNarrativeArc, scoreText } from "@clipforge/ai";

export interface DirectorInput {
  candidate: CandidateMoment;
  config: EngineConfig;
  style?: EditingStyleName;
}

/**
 * AI Director — makes creative decisions about HOW a clip should be edited.
 * Multi-pass: understand → strategy → effects → emphasis → plan
 */
export function directClip(input: DirectorInput): DirectorPlan {
  const { candidate, config } = input;
  const styleName = input.style ?? "podcast";
  const text = candidate.text;
  const duration = candidate.end - candidate.start;
  const arc = detectNarrativeArc(text);
  const score = scoreText(text);
  const preset = EDITING_STYLES[styleName] ?? EDITING_STYLES.podcast;

  const hasStrongOpening = /^(nobody|everyone|the biggest|here's the thing|truth be told|today i|i'm honored|i want to tell)/i.test(text);
  const hasEmotionalPeak = /\b(terrified|amazing|but looking back|that's when i realized|the best|the worst)\b/i.test(text);
  const hasCuriosity = /[?]/.test(text) || /\b(three stories|what if|nobody knows)\b/i.test(text);

  const effects = generateEffects(text, candidate, preset.effects.zoomIntensity, preset.effects.punchInFrequency, arc);
  const emphasisMoments = findEmphasis(text, duration);
  const hook = extractHook(text);

  const parts: string[] = [];
  if (arc.hasArc) parts.push(`Narrative arc: ${arc.phases.join(" → ")}`);
  if (hasStrongOpening) parts.push("Strong hook");
  if (hasEmotionalPeak) parts.push("Emotional peak");
  if (hasCuriosity) parts.push("Curiosity gap");
  parts.push(`${effects.length} effects, ${emphasisMoments.length} emphasis moments`);

  let conf = 30 + (arc.hasArc ? 20 : 0) + (arc.strength > 0.5 ? 10 : 0) + (score.overall > 30 ? 10 : 0) + (duration >= 20 && duration <= 90 ? 10 : 0);

  return {
    hook,
    pacing: styleName === "hype" ? "fast" : styleName === "documentary" ? "slow" : styleName === "cinematic" ? "dramatic" : "natural",
    visualStyle: styleName === "hype" ? "energetic" : styleName === "cinematic" ? "dramatic" : score.emotion > 50 ? "dramatic" : "clean",
    musicStrategy: styleName === "music" ? "beat-sync" : arc.hasArc && arc.strength > 0.5 ? "emotional-arc" : "none",
    captionStrategy: preset.captions.style === "dynamic" ? "dynamic" : arc.hasArc ? "word-emphasis" : "standard",
    framingStrategy: hasEmotionalPeak ? "dynamic-zoom" : preset.framing.strategy,
    effects,
    transitions: effects.length > 0 ? [{ type: styleName === "cinematic" ? "fade" : "cut", at: 0, duration: 0.3 }] : [],
    emphasisMoments,
    reasoning: parts.join(". "),
    confidence: Math.min(100, conf),
  };
}


function generateEffects(text: string, candidate: CandidateMoment, intensity: number, freq: string, arc: { hasArc: boolean; strength: number; phases: string[] }): DirectorEffect[] {
  const effects: DirectorEffect[] = [];
  const dur = candidate.end - candidate.start;
  const max = freq === "aggressive" ? 4 : freq === "moderate" ? 2 : 1;

  if (/^(nobody|everyone|the biggest|here's the thing|truth be told|today i|i'm honored|i want to tell)/i.test(text) && effects.length < max) {
    effects.push({ type: "punch-in", at: 0, duration: Math.min(1.5, dur * 0.1), intensity, reason: "Strong opening hook" });
  }

  const emoWords = text.match(/\b(but looking back|that's when i realized|it turned out|the best|the worst|amazing|terrified)\b/gi);
  if (emoWords && emoWords.length > 0 && effects.length < max) {
    const idx = text.indexOf(emoWords[0]!);
    const at = idx >= 0 ? (idx / text.length) * dur : dur * 0.5;
    effects.push({ type: "punch-in", at: Math.max(0, at - 0.3), duration: Math.min(1.2, dur * 0.08), intensity, reason: `Emotional peak: "${emoWords[0]}"` });
  }

  if (arc.hasArc && effects.length < max) {
    const turnIdx = arc.phases.indexOf("turn");
    if (turnIdx >= 0) {
      effects.push({ type: "zoom-in", at: (turnIdx / arc.phases.length) * dur, duration: 2.0, intensity: intensity * 0.7, reason: `Narrative ${arc.phases[turnIdx]} moment` });
    }
  }

  if (arc.hasArc && arc.phases.includes("payoff") && freq !== "none") {
    effects.push({ type: "letterbox", at: Math.max(0, dur - 3), duration: 3, intensity: 0.3, reason: "Dramatic closing" });
  }
  return effects;
}

function findEmphasis(text: string, duration: number): EmphasisMoment[] {
  const moments: EmphasisMoment[] = [];
  const patterns = [
    { re: /^(nobody|everyone|never|always|biggest|best|worst|secret|truth|actually)$/i, type: "bold" as const },
    { re: /^(terrified|amazing|incredible|impossible|insane|beautiful|horrible|dream|nightmare)$/i, type: "color" as const },
  ];
  for (const sentence of text.split(/[.!?]+/)) {
    for (const word of sentence.trim().split(/\s+/)) {
      for (const p of patterns) {
        if (p.re.test(word)) {
          const idx = text.indexOf(word);
          if (idx >= 0) moments.push({ time: (idx / text.length) * duration, text: word, emphasisType: p.type, duration: 0.5 });
        }
      }
    }
  }
  return moments.slice(0, 5);
}

function extractHook(text: string): string {
  const f = text.split(/[.!?]/)[0]?.trim() ?? "";
  return f.length > 100 ? f.slice(0, 97) + "..." : f;
}
export { critiquePlan, type CriticVerdict, type CriticIssue } from "./critic.js";
