import { TRUST, type AllocationCandidate, type ReferralStatus } from "./types.ts";

export type ScoreBreakdown = {
  recency: number;
  fairness: number;
  reliability: number;
  newBoost: number;
  weight: number;
  jitter: number;
  total: number;
};

const NEVER_ASSIGNED_HOURS = 168;

export function hoursSince(lastAssignedAt: string | null, nowMs: number): number {
  if (!lastAssignedAt) return NEVER_ASSIGNED_HOURS;
  const then = Date.parse(lastAssignedAt);
  if (Number.isNaN(then)) return NEVER_ASSIGNED_HOURS;
  return Math.max(0, (nowMs - then) / 3_600_000);
}

export function confidenceFromReports(success: number, failed: number): number {
  return (success + 1) / (success + failed + 2);
}

export function shouldQuarantine(candidate: {
  successfulReports: number;
  failedReports: number;
  anonymousFailedReports?: number;
}): boolean {
  const signedFails = Math.max(
    0,
    candidate.failedReports - (candidate.anonymousFailedReports ?? 0),
  );
  const weightedFails =
    signedFails * TRUST.signedInFailWeight +
    (candidate.anonymousFailedReports ?? 0) * TRUST.anonymousFailWeight;
  if (weightedFails < TRUST.quarantineFailedMin) return false;
  return weightedFails >= candidate.successfulReports * TRUST.quarantineFailLead + TRUST.quarantineFailedMin;
}

export function computeRotationScore(
  candidate: AllocationCandidate,
  nowMs: number,
  jitter = 0,
): ScoreBreakdown {
  const recency = hoursSince(candidate.lastAssignedAt, nowMs) * 1.6;
  const fairness = 14 / (1 + candidate.assignmentCount);
  const reliability = candidate.confidenceScore * 5;
  const newBoost = candidate.assignmentCount < TRUST.newCodeBoostUntil ? 7.5 : 0;
  const failureDrag = candidate.failedReports > 1 ? candidate.failedReports * 1.25 : 0;
  const weight = Math.max(0.15, candidate.rotationWeight);
  const total = (recency + fairness + reliability + newBoost - failureDrag + jitter) * weight;
  return { recency, fairness, reliability, newBoost, weight, jitter, total };
}

export function isEligibleStatus(status: ReferralStatus): boolean {
  return status === "active";
}

export function filterEligible(
  candidates: AllocationCandidate[],
  opts: {
    providerId: string;
    receivingUserId: string | null;
    recentCodeIds: string[];
  },
): AllocationCandidate[] {
  const recent = new Set(opts.recentCodeIds);
  return candidates.filter((c) => {
    if (!isEligibleStatus(c.status)) return false;
    if (c.providerId !== opts.providerId) return false;
    if (opts.receivingUserId && c.userId === opts.receivingUserId) return false;
    if (recent.has(c.id)) return false;
    if (shouldQuarantine(c)) return false;
    return true;
  });
}

export function pickCandidate(
  candidates: AllocationCandidate[],
  nowMs: number,
  rng: () => number = Math.random,
): AllocationCandidate | null {
  if (candidates.length === 0) return null;
  let best: AllocationCandidate | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const jitter = (rng() - 0.5) * 1.4;
    const { total } = computeRotationScore(candidate, nowMs, jitter);
    if (total > bestScore) {
      bestScore = total;
      best = candidate;
    }
  }
  return best;
}

export function rankCandidates(
  candidates: AllocationCandidate[],
  nowMs: number,
): Array<AllocationCandidate & { score: number }> {
  return [...candidates]
    .map((c) => ({ ...c, score: computeRotationScore(c, nowMs, 0).total }))
    .sort((a, b) => b.score - a.score);
}
