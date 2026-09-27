/**
 * Golden evaluation dataset for ClipForge intelligence engine.
 *
 * Each fixture represents a known-good or known-bad clip moment.
 * The label tells us what the correct output should be.
 *
 * Labels:
 *   "good"            — Strong standalone clip, correct boundaries
 *   "bad"             — Weak moment, should NOT be selected
 *   "good-boundary"   — Good moment but needs different start/end
 *   "duplicate"       — Overlaps with another good clip
 *   "incomplete"      — Missing context, not self-contained
 *
 * Run: pnpm test:intelligence
 */

export interface GoldenFixture {
  id: string;
  sourceVideo: string;
  startSeconds: number;
  endSeconds: number;
  label: "good" | "bad" | "good-boundary" | "duplicate" | "incomplete";
  /** The actual transcript text at this segment. */
  transcriptText: string;
  /** What a human editor would notice about this segment. */
  humanNote: string;
  /** Minimum acceptable quality signals. */
  expectedSignals: {
    hasHook?: boolean;
    hasEmotion?: boolean;
    hasCuriosity?: boolean;
    hasPayoff?: boolean;
    hasNarrativeArc?: boolean;
    minCoherence?: number;
  };
}

export const GOLDEN_FIXTURES: GoldenFixture[] = [
  {
    id: "steve-jobs-stanford-01",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 95.4,
    endSeconds: 140.7,
    label: "good",
    transcriptText: "Really wanted a girl. So my parents who were on a waiting list got a call in the middle of the night asking, we've got an unexpected baby boy. Do you want him? They said, of course. My biological mother found out later that my mother had never graduated from college...",
    humanNote: "Complete mini-story with emotional twist. The 'wanted a girl' contrast + adoption narrative is self-contained.",
    expectedSignals: {
      hasHook: true,
      hasEmotion: true,
      hasNarrativeArc: true,
      minCoherence: 60,
    },
  },
  {
    id: "steve-jobs-stanford-02",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 44.5,
    endSeconds: 88.1,
    label: "good",
    transcriptText: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories. The first story is about connecting the dots. I dropped out of Reed College after the first six months...",
    humanNote: "Classic curiosity hook ('three stories'). Sets up the entire narrative. Strong opening.",
    expectedSignals: {
      hasCuriosity: true,
      hasHook: true,
      hasNarrativeArc: true,
      minCoherence: 60,
    },
  },
  {
    id: "steve-jobs-stanford-03",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 27.1,
    endSeconds: 44.5,
    label: "good-boundary",
    transcriptText: "I'm honored to be with you today for your commencement from one of the finest universities in the world. Truth be told, I never graduated from college and this is the closest I've ever gotten to a college graduation.",
    humanNote: "Great opener but boundaries should probably extend to include the 'three stories' line. Needs wider window.",
    expectedSignals: {
      hasHook: true,
      hasNarrativeArc: false,
      minCoherence: 50,
    },
  },
  {
    id: "steve-jobs-stanford-04",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 157.6,
    endSeconds: 180.0,
    label: "incomplete",
    transcriptText: "spending all of the money my parents had saved their entire life. So I decided to drop out and trust that it would all work out okay. It was pretty scary at the time, but looking back, it was one of the best decisions I ever made. The minute I dropped out, I could stop taking the required classes that didn't interest me.",
    humanNote: "Great content but clip starts mid-thought. Missing the setup. Viewer needs context of why he was at Reed.",
    expectedSignals: {
      hasPayoff: true,
      hasEmotion: true,
      minCoherence: 40,
    },
  },
  {
    id: "steve-jobs-stanford-05",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 6.8,
    endSeconds: 20.0,
    label: "bad",
    transcriptText: "This program is brought to you by Stanford University. Please visit us at stanford.edu. Thank you.",
    humanNote: "Intro boilerplate. No content value. Should never be selected.",
    expectedSignals: {},
  },
  {
    id: "steve-jobs-stanford-06",
    sourceVideo: "steve-jobs-stanford",
    startSeconds: 44.5,
    endSeconds: 69.8,
    label: "duplicate",
    transcriptText: "Today I want to tell you three stories from my life. That's it. No big deal. Just three stories. The first story is about connecting the dots. I dropped out of Reed College after the first six months, but then stayed around as a drop-in for another 18 months or so before I really quit.",
    humanNote: "Overlaps heavily with fixture-02. Same content, slightly different boundaries. Should be deduped.",
    expectedSignals: {
      hasCuriosity: true,
      hasHook: true,
    },
  },
  {
    id: "generic-strong-hook",
    sourceVideo: "test",
    startSeconds: 10.0,
    endSeconds: 40.0,
    label: "good",
    transcriptText: "Nobody tells you this about starting a company. The biggest mistake founders make is thinking they need a perfect plan. Actually, the truth is the opposite. Most people wait too long to launch.",
    humanNote: "Clear hook ('Nobody tells you'), strong statements, information density. Classic short-form opener.",
    expectedSignals: {
      hasHook: true,
      hasEmotion: false,
      hasCuriosity: false,
      hasNarrativeArc: false,
      minCoherence: 50,
    },
  },
  {
    id: "generic-weak-monologue",
    sourceVideo: "test",
    startSeconds: 10.0,
    endSeconds: 30.0,
    label: "bad",
    transcriptText: "So yeah, um, I think that's pretty much it. I don't really know what else to say about that particular topic. Maybe we'll talk about it more later.",
    humanNote: "Vague, unfocused, no hook, no payoff. Should score very low.",
    expectedSignals: {},
  },
];
