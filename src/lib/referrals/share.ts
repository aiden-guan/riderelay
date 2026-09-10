export const SHARE = {
  maxPerInviterPerHour: 12,
  minVisitorIdLength: 16,
} as const;

export const POINTS_PER_REFERRAL = 10;

export type ShareAttempt = {
  inviterUserId: string;
  inviterVisitorId: string | null;
  visitorId: string;
  actorUserId: string | null;
  listingOwnerId: string | null;
};

export type ShareBlock =
  | "self_account"
  | "self_device"
  | "self_listing"
  | "invalid_visitor";

export function newInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function shareBlockReason(attempt: ShareAttempt): ShareBlock | null {
  if (!attempt.visitorId || attempt.visitorId.length < SHARE.minVisitorIdLength) {
    return "invalid_visitor";
  }
  if (attempt.actorUserId && attempt.actorUserId === attempt.inviterUserId) {
    return "self_account";
  }
  if (attempt.inviterVisitorId && attempt.inviterVisitorId === attempt.visitorId) {
    return "self_device";
  }
  if (attempt.listingOwnerId && attempt.actorUserId === attempt.listingOwnerId) {
    return "self_listing";
  }
  return null;
}

export function countsAsListingCopy(input: {
  actorUserId: string | null;
  listingOwnerId: string;
  visitorId: string;
  ownerVisitorId: string | null;
}): boolean {
  if (input.actorUserId && input.actorUserId === input.listingOwnerId) return false;
  if (input.ownerVisitorId && input.ownerVisitorId === input.visitorId) return false;
  return true;
}

export function pointsEarned(shareCount: number): number {
  return Math.max(0, Math.round(shareCount)) * POINTS_PER_REFERRAL;
}

export function unspentPoints(earned: number, allocated: number): number {
  return Math.max(0, Math.round(earned) - Math.max(0, Math.round(allocated)));
}

export function canMoveBoost(input: {
  earned: number;
  othersAllocated: number;
  current: number;
  delta: number;
}): boolean {
  if (!Number.isInteger(input.delta) || input.delta === 0) return false;
  const next = input.current + input.delta;
  if (next < 0) return false;
  return next + input.othersAllocated <= input.earned;
}

export function formatShares(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v === 1 ? "1 friend" : `${v} friends`;
}

export function formatPoints(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v === 1 ? "1 pt" : `${v} pts`;
}

export function formatListings(n: number): string {
  const v = Math.max(0, Math.round(n));
  return v === 1 ? "1 listing" : `${v} listings`;
}
