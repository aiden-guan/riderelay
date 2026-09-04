-- Legacy bid columns kept so older environments migrate cleanly.
-- Rank is no longer bid-based.

alter table referral_codes
  add column if not exists bid_cents integer not null default 0,
  add column if not exists last_bid_at timestamptz;

create table if not exists bid_payments (
  id text primary key,
  user_id text not null,
  referral_code_id text not null,
  provider_id text not null,
  amount_cents integer not null,
  resulting_bid_cents integer not null,
  previous_rank integer,
  new_rank integer,
  created_at timestamptz not null default now()
);

create index if not exists bid_payments_created
  on bid_payments (created_at desc);

create index if not exists referral_codes_board
  on referral_codes (provider_id, created_at asc)
  where status = 'active';
