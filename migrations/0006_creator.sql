-- Lime is link-first. Creator listings stay pinned at #1 on each board.

alter table referral_codes
  add column if not exists featured boolean not null default false;

create index if not exists referral_codes_featured
  on referral_codes (provider_id, featured desc)
  where status = 'active';

update providers
set
  referral_instructions = 'Open Lime, tap Account, then Invite friends. Copy the referral link — it looks like lime.bike/referral_signin/…',
  metadata = coalesce(metadata, '{}'::jsonb) || '{"shortHint":"Redeem the Lime invite link in the app.","entry":"link"}'::jsonb,
  updated_at = now()
where id = 'lime';

update provider_rules
set
  code_format_hint = 'Paste the lime.bike/referral_signin/… link from the Lime app.',
  updated_at = now()
where provider_id = 'lime';

insert into profiles (user_id, username, display_name, role, invite_token, share_count)
values (
  'creator-riderelay',
  'creator',
  'RideRelay',
  'member',
  'creator000001',
  0
)
on conflict (user_id) do nothing;

insert into referral_codes (
  id, user_id, provider_id, code, code_normalized, referral_url, url_normalized,
  status, featured, assignment_count, successful_reports, failed_reports,
  confidence_score, rotation_weight
) values
(
  'creator-lime',
  'creator-riderelay',
  'lime',
  'RIP3PXL4TC3',
  'rip3pxl4tc3',
  'https://lime.bike/referral_signin/RIP3PXL4TC3',
  'https://lime.bike/referral_signin/rip3pxl4tc3',
  'active',
  true,
  0, 0, 0, 0.5, 1.0
),
(
  'creator-veo',
  'creator-riderelay',
  'veo',
  'DPAIVJ1',
  'dpaivj1',
  'https://www.veoride.com/download-app',
  'https://www.veoride.com/download-app',
  'active',
  true,
  0, 0, 0, 0.5, 1.0
)
on conflict (id) do nothing;
