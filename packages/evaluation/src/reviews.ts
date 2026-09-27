import type { HumanReview, FailureCode } from "./benchmark.js";

/**
 * Human evaluation review system.
 * Manages anonymous reviews with aggregation.
 */

export interface ReviewBatch {
  batchId: string;
  clipIds: string[];
  /** Anonymized clip IDs — reviewers never see source identity. */
  blindIds: Map<string, string>;
  createdAt: string;
}

const reviewStore = new Map<string, HumanReview[]>();

/** Create a review batch with anonymous IDs. */
export function createReviewBatch(clipIds: string[]): ReviewBatch {
  const blindIds = new Map<string, string>();
  const shuffled = [...clipIds].sort(() => Math.random() - 0.5);
  shuffled.forEach((id, i) => blindIds.set(id, `clip-${String(i + 1).padStart(3, "0")}`));

  return {
    batchId: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    clipIds,
    blindIds,
    createdAt: new Date().toISOString(),
  };
}

/** Submit a review. */
export function submitReview(review: HumanReview): void {
  const existing = reviewStore.get(review.clipId) ?? [];
  existing.push(review);
  reviewStore.set(review.clipId, existing);
}

/** Get all reviews for a clip. */
export function getReviews(clipId: string): HumanReview[] {
  return reviewStore.get(clipId) ?? [];
}

/** Aggregate reviews for a clip. */
export function aggregateReviews(clipId: string): {
  reviewCount: number;
  avgRatings: Record<string, number>;
  topFailures: FailureCode[];
  medianUsability: number;
} | null {
  const reviews = reviewStore.get(clipId);
  if (!reviews || reviews.length === 0) return null;

  const dims = ["contextIndependence", "hookClarity", "narrativeCoherence", "cutAppropriateness", "captionQuality", "visualFraming", "pacing", "professionalUsability"] as const;
  const avgRatings: Record<string, number> = {};

  for (const d of dims) {
    const sum = reviews.reduce((a, r) => a + (r.ratings[d] ?? 0), 0);
    avgRatings[d] = Math.round((sum / reviews.length) * 10) / 10;
  }

  // Count failure codes
  const failCounts = new Map<string, number>();
  for (const r of reviews) for (const f of r.failures) failCounts.set(f, (failCounts.get(f) ?? 0) + 1);
  const topFailures = [...failCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([code]) => code as FailureCode);

  // Median usability
  const usabilityScores = reviews.map((r) => r.ratings.professionalUsability).sort((a, b) => a - b);
  const mid = Math.floor(usabilityScores.length / 2);
  const medianUsability = usabilityScores.length % 2 === 0 ? (usabilityScores[mid - 1]! + usabilityScores[mid]!) / 2 : usabilityScores[mid]!;

  return { reviewCount: reviews.length, avgRatings, topFailures, medianUsability };
}
