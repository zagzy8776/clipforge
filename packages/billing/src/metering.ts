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
  free: { minutesPerMonth: 30, maxSourceDurationSeconds: 20 * 60, maxClipsPerProject: 5, concurrentJobs: 1, teamSeats: 1, apiAccess: false, watermark: true },
  starter: { minutesPerMonth: 200, maxSourceDurationSeconds: 60 * 60, maxClipsPerProject: 15, concurrentJobs: 2, teamSeats: 1, apiAccess: false, watermark: false },
  pro: { minutesPerMonth: 600, maxSourceDurationSeconds: 3 * 60 * 60, maxClipsPerProject: 30, concurrentJobs: 4, teamSeats: 5, apiAccess: true, watermark: false },
  agency: { minutesPerMonth: 3000, maxSourceDurationSeconds: 6 * 60 * 60, maxClipsPerProject: 50, concurrentJobs: 10, teamSeats: 20, apiAccess: true, watermark: false },
  enterprise: { minutesPerMonth: 999999, maxSourceDurationSeconds: 12 * 60 * 60, maxClipsPerProject: 100, concurrentJobs: 50, teamSeats: 999, apiAccess: true, watermark: false },
};

export function canProcess(plan: PlanId, minutesUsedThisPeriod: number, sourceDurationSeconds: number): { allowed: boolean; reason?: string } {
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const needed = sourceDurationSeconds / 60;
  if (sourceDurationSeconds > limits.maxSourceDurationSeconds) {
    return { allowed: false, reason: `Source exceeds ${Math.round(limits.maxSourceDurationSeconds / 60)} min limit for ${plan} plan` };
  }
  if (minutesUsedThisPeriod + needed > limits.minutesPerMonth) {
    return { allowed: false, reason: `Insufficient minutes remaining (${Math.round(limits.minutesPerMonth - minutesUsedThisPeriod)} left)` };
  }
  return { allowed: true };
}
