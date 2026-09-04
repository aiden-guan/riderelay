-- RideRelay core schema. Idempotent. Auth tables live in 0001_auth.sql.

create table if not exists providers (
  id text primary key,
  slug text not null unique,
  display_name text not null,
  accent text not null,
  accent_fg text not null,
  icon_key text not null default 'scooter',
  enabled boolean not null default true,
  referral_instructions text not null default '',
  terms_url text,
  referral_program_url text,
  signup_url text,
  allowed_hosts jsonb not null default '[]'::jsonb,
  code_pattern text,
  markets jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists provider_rules (
  provider_id text primary key references providers(id) on delete cascade,
  program_active boolean not null default true,
  new_users_only boolean not null default true,
  geographic_notes text,
  expiration_notes text,
  code_format_hint text,
  max_known_benefit text,
  official_terms_url text,
  last_verified_on date,
  unavailable_message text,
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id text primary key,
  username text not null unique,
  display_name text,
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists referral_codes (
  id text primary key,
  user_id text not null,
  provider_id text not null references providers(id),
  code text not null,
  code_normalized text not null,
  referral_url text not null,
  url_normalized text not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'quarantined', 'invalid', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_assigned_at timestamptz,
  assignment_count integer not null default 0,
  successful_reports integer not null default 0,
  failed_reports integer not null default 0,
  anonymous_failed_reports integer not null default 0,
  confidence_score double precision not null default 0.5,
  rotation_weight double precision not null default 1,
  market text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists referral_codes_one_active
  on referral_codes (user_id, provider_id)
  where status = 'active';

create unique index if not exists referral_codes_code_unique
  on referral_codes (provider_id, code_normalized)
  where status <> 'archived';

create unique index if not exists referral_codes_url_unique
  on referral_codes (provider_id, url_normalized)
  where status <> 'archived';

create index if not exists referral_codes_rotation_idx
  on referral_codes (provider_id, status, last_assigned_at);

create index if not exists referral_codes_user_idx
  on referral_codes (user_id, provider_id);

create table if not exists referral_assignments (
  id text primary key,
  referral_code_id text not null references referral_codes(id),
  receiving_user_id text,
  visitor_id text not null,
  assigned_at timestamptz not null default now(),
  opened_at timestamptz,
  copied_at timestamptz,
  outcome text check (outcome in ('worked', 'didnt_work', 'later', 'expired')),
  outcome_reported_at timestamptz
);

create index if not exists referral_assignments_visitor_idx
  on referral_assignments (visitor_id, assigned_at desc);

create index if not exists referral_assignments_code_idx
  on referral_assignments (referral_code_id, assigned_at desc);

create index if not exists referral_assignments_user_idx
  on referral_assignments (receiving_user_id, assigned_at desc);

create table if not exists referral_events (
  id text primary key,
  event_type text not null,
  user_id text,
  visitor_id text,
  provider_id text,
  referral_code_id text,
  assignment_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists referral_events_created_idx
  on referral_events (created_at desc);

create index if not exists referral_events_user_idx
  on referral_events (user_id, created_at desc);

create table if not exists referral_reports (
  id text primary key,
  assignment_id text not null references referral_assignments(id),
  referral_code_id text not null references referral_codes(id),
  reporter_user_id text,
  visitor_id text not null,
  outcome text not null check (outcome in ('worked', 'didnt_work')),
  weight double precision not null default 1,
  created_at timestamptz not null default now()
);

create unique index if not exists referral_reports_one_per_assignment
  on referral_reports (assignment_id);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null,
  referral_code_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on notifications (user_id, created_at desc);

create table if not exists rate_limit_events (
  id text primary key,
  rate_key text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_lookup
  on rate_limit_events (rate_key, action, created_at desc);

create table if not exists analytics_events (
  id text primary key,
  event_name text not null,
  visitor_id text,
  user_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_idx
  on analytics_events (event_name, created_at desc);
