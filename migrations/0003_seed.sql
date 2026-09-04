-- Provider catalog only. Listings come from real members — no demo codes.

insert into providers (
  id, slug, display_name, accent, accent_fg, icon_key, enabled,
  referral_instructions, terms_url, referral_program_url, signup_url,
  allowed_hosts, code_pattern, markets, metadata
) values
(
  'lime',
  'lime',
  'Lime',
  '#B5D63A',
  '#1A2200',
  'scooter',
  true,
  'Open Lime, tap Account, then Invite friends. Copy the referral link — it looks like lime.bike/referral_signin/…',
  'https://www.li.me/legal',
  'https://help.li.me/hc/en-us/articles/115004746987-Does-Lime-have-a-referral-program',
  'https://www.li.me/',
  '["li.me","www.li.me","lime.bike","www.lime.bike","lime.app.link"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$',
  '["us","global"]'::jsonb,
  '{"shortHint":"Redeem the Lime invite link in the app.","entry":"link"}'::jsonb
),
(
  'veo',
  'veo',
  'Veo',
  '#1F8A7A',
  '#F4F1EA',
  'bike',
  true,
  'Open the Veo app, open the side menu, then Earn Credits / Invite friends. Copy your code.',
  'https://www.veoride.com/',
  'https://veoride.zendesk.com/hc/en-us/articles/360050365231-Promo-Codes',
  'https://www.veoride.com/download-app/',
  '["veoride.com","www.veoride.com","ridewithveo.com","www.ridewithveo.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$',
  '["us"]'::jsonb,
  '{"shortHint":"Redeem from Wallet or the invite screen in Veo."}'::jsonb
)
on conflict (id) do nothing;

insert into provider_rules (
  provider_id, program_active, new_users_only, geographic_notes,
  expiration_notes, code_format_hint, max_known_benefit, official_terms_url,
  last_verified_on, unavailable_message
) values
(
  'lime',
  true,
  true,
  'Availability and credit amounts vary by city.',
  'Codes can stop working if a member leaves the program.',
  'Paste the lime.bike/referral_signin/… link from the Lime app.',
  null,
  'https://help.li.me/hc/en-us/articles/115004746987-Does-Lime-have-a-referral-program',
  '2026-09-01',
  'Lime referrals are paused in RideRelay right now.'
),
(
  'veo',
  true,
  true,
  'Campus and city programs differ. Credits are not guaranteed.',
  'Invite codes can expire or be city-specific.',
  'Usually 5–10 letters from the Veo invite screen.',
  null,
  'https://veoride.zendesk.com/hc/en-us/articles/360050365231-Promo-Codes',
  '2026-09-01',
  'Veo referrals are paused in RideRelay right now.'
)
on conflict (provider_id) do nothing;
