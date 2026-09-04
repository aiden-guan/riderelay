export const REFERRAL_STATUSES = [
  "active",
  "paused",
  "quarantined",
  "invalid",
  "archived",
] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const ASSIGNMENT_OUTCOMES = ["worked", "didnt_work", "later", "expired"] as const;
export type AssignmentOutcome = (typeof ASSIGNMENT_OUTCOMES)[number];

export type AllocationCandidate = {
  id: string;
  userId: string;
  providerId: string;
  assignmentCount: number;
  lastAssignedAt: string | null;
  successfulReports: number;
  failedReports: number;
  anonymousFailedReports: number;
  confidenceScore: number;
  rotationWeight: number;
  createdAt: string;
  status: ReferralStatus;
};

export type AllocationInput = {
  providerId: string;
  receivingUserId: string | null;
  visitorId: string;
  nowMs: number;
  recentCodeIds: string[];
  cooldownMs?: number;
};

export const TRUST = {
  quarantineFailedMin: 3,
  quarantineFailLead: 2,
  anonymousFailWeight: 0.45,
  signedInFailWeight: 1,
  signedInSuccessWeight: 1,
  anonymousSuccessWeight: 0.7,
  newCodeBoostUntil: 3,
  repeatWindowMs: 12 * 60 * 60 * 1000,
} as const;

export const RATE_LIMITS = {
  assignPerHour: 8,
  assignCooldownMs: 90_000,
  reportPerHour: 12,
  submitPerDay: 6,
  analyticsPerMinute: 40,
  sharePerHour: 12,
} as const;
