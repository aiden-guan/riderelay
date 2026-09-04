export const ANALYTICS_EVENTS = [
  "landing_viewed",
  "provider_selected",
  "referral_assigned",
  "referral_copied",
  "referral_opened",
  "referral_outcome_reported",
  "signup_started",
  "signup_completed",
  "referral_submitted",
  "dashboard_viewed",
  "board_viewed",
  "site_share_credited",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}
