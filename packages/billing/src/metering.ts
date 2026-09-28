export type PlanId = "free" | "starter" | "pro" | "agency" | "enterprise";

export interface PlanLimits {
  minutesPerMonth: number;
  maxSourceDurationSeconds: number;
  maxClipsPerProject: number;
  concurrentJobs: number;
  teamSeats: number;
  apiAccess: boolean;
  watermark: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { minutesPerMonth: 30, maxSourceDurationSeconds: 1200, maxClipsPerProject: 5, concurrentJobs: 1, teamSeats: 1, apiAccess: false, watermark: true },
  starter: { minutesPerMonth: 200, maxSourceDurationSeconds: 3600, maxClipsPerProject: 15, concurrentJobs: 2, teamSeats: 1, apiAccess: false, watermark: false },
  pro: { minutesPerMonth: 600, maxSourceDurationSeconds: 10800, maxClipsPerProject: 30, concurrentJobs: 4, teamSeats: 5, apiAccess: true, watermark: false },
  agency: { minutesPerMonth: 3000, maxSourceDurationSeconds: 21600, maxClipsPerProject: 50, concurrentJobs: 10, teamSeats: 20, apiAccess: true, watermark: false },
  enterprise: { minutesPerMonth: 999999, maxSourceDurationSeconds: 43200, maxClipsPerProject: 100, concurrentJobs: 50, teamSeats: 999, apiAccess: true, watermark: false },
};

export function canProcess(plan: PlanId, minutesUsed: number, sourceDurationSeconds: number) {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (sourceDurationSeconds > limits.maxSourceDurationSeconds) {
    return { allowed: false, reason: `Source exceeds plan duration limit` };
  }
  if (minutesUsed + sourceDurationSeconds / 60 > limits.minutesPerMonth) {
    return { allowed: false, reason: `Insufficient minutes remaining` };
  }
  return { allowed: true };
}
