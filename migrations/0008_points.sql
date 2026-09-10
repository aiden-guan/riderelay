-- Invite points: each credited RideRelay referral is worth 10 points.
-- Rank a listing by boost_points allocated to it. Unspent points sit as
-- share_count * 10 minus the sum of a member's active boosts.

alter table referral_codes
  add column if not exists boost_points integer not null default 0;

create index if not exists referral_codes_boost_idx
  on referral_codes (provider_id, status, boost_points desc, created_at);
