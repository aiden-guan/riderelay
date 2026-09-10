import type { ProviderRecord } from "@/lib/providers";
import type { ReferralStatus } from "./types";

export type AssignedReferral = {
  assignmentId: string;
  codeId: string;
  code: string;
  provider: Pick<
    ProviderRecord,
    | "id"
    | "slug"
    | "displayName"
    | "iconKey"
    | "shortHint"
    | "newUsersOnly"
    | "geographicNotes"
    | "referralInstructions"
    | "signupUrl"
  >;
  sharerUsername: string | null;
  assignedAt: string;
  copiedAt: string | null;
  openedAt: string | null;
  outcome: string | null;
};

export type AssignResult =
  | { kind: "assigned"; referral: AssignedReferral; reused: boolean }
  | { kind: "empty"; provider: Pick<ProviderRecord, "slug" | "displayName"> }
  | { kind: "unavailable"; message: string; provider: Pick<ProviderRecord, "slug" | "displayName"> }
  | { kind: "rate_limited"; message: string; retryAfterSec: number };

export type OwnReferral = {
  id: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  code: string;
  referralUrl: string;
  status: ReferralStatus;
  assignmentCount: number;
  successfulReports: number;
  failedReports: number;
  createdAt: string;
  lastAssignedAt: string | null;
  boostPoints: number;
  rank: number | null;
  featured: boolean;
  usesLink: boolean;
};

export type BoardListing = {
  rank: number;
  id: string;
  code: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  iconKey: string;
  shortHint: string | null;
  newUsersOnly: boolean;
  referralInstructions: string;
  signupUrl: string | null;
  username: string | null;
  boostPoints: number;
  copies: number;
  worked: number;
  createdAt: string;
  referralUrl: string;
  featured: boolean;
  usesLink: boolean;
};

export type BoardSnapshot = {
  providerSlug: string | null;
  listings: BoardListing[];
  totalBoost: number;
  listingCount: number;
};

export type ShareActivity = {
  id: string;
  username: string | null;
  createdAt: string;
};

export type ActivityItem = {
  id: string;
  eventType: string;
  providerId: string | null;
  createdAt: string;
  summary: string;
};

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  referralCodeId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type DashboardData = {
  profile: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: string;
    shareCount: number;
    pointsEarned: number;
    pointsUnspent: number;
    pointsAllocated: number;
    inviteToken: string | null;
  };
  referrals: OwnReferral[];
  activity: ActivityItem[];
  notifications: NotificationItem[];
  stats: {
    referralsShared: number;
    selections: number;
    peopleHelped: number;
    contributorLevel: string;
  };
};

export type AdminCodeRow = {
  id: string;
  providerId: string;
  providerName: string;
  username: string | null;
  code: string;
  status: ReferralStatus;
  assignmentCount: number;
  successfulReports: number;
  failedReports: number;
  createdAt: string;
  lastAssignedAt: string | null;
};

export type AdminReportRow = {
  id: string;
  outcome: string;
  weight: number;
  createdAt: string;
  code: string;
  providerName: string;
  username: string | null;
};
