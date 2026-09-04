-- Rank is qualified site shares. Invites cannot be self-claimed.

alter table profiles
  add column if not exists invite_token text,
  add column if not exists home_visitor_id text,
  add column if not exists share_count integer not null default 0;

create unique index if not exists profiles_invite_token
  on profiles (invite_token)
  where invite_token is not null;

create table if not exists site_shares (
  id text primary key,
  inviter_user_id text not null,
  visitor_id text not null unique,
  claimed_user_id text unique,
  invite_token text not null,
  created_at timestamptz not null default now()
);

create index if not exists site_shares_inviter
  on site_shares (inviter_user_id, created_at desc);
