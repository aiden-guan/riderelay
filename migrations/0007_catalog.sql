-- Broader college-focused provider catalog. Lime and Veo stay; everything else is additive.

alter table providers add column if not exists category text not null default 'more';
alter table providers add column if not exists sort_order integer not null default 100;

update providers
set category = 'rides',
    sort_order = case slug when 'lime' then 10 when 'veo' then 20 else sort_order end
where slug in ('lime', 'veo');

insert into providers (
  id, slug, display_name, accent, accent_fg, icon_key, enabled,
  referral_instructions, terms_url, referral_program_url, signup_url,
  allowed_hosts, code_pattern, markets, metadata, category, sort_order
) values
(
  'uber', 'uber', 'Uber', '#000000', '#F4F1EA', 'car', true,
  'Open Uber, tap Account, then Wallet or Promos. Copy your invite code.',
  'https://www.uber.com/legal/terms',
  'https://www.uber.com/us/en/u/referrals/',
  'https://www.uber.com/',
  '["uber.com","www.uber.com","riders.uber.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Redeem in Uber Promos. New riders only.","entry":"code"}'::jsonb,
  'rides', 30
),
(
  'lyft', 'lyft', 'Lyft', '#FF00BF', '#FFFFFF', 'car', true,
  'Open Lyft, tap the menu, then Gifts or Invite friends. Copy your code.',
  'https://www.lyft.com/terms',
  'https://www.lyft.com/invite',
  'https://www.lyft.com/',
  '["lyft.com","www.lyft.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Apply the code in Lyft before your first ride.","entry":"code"}'::jsonb,
  'rides', 40
),
(
  'bird', 'bird', 'Bird', '#000000', '#F4F1EA', 'scooter', true,
  'Open Bird, open your profile, then Invite friends. Copy your code.',
  'https://www.bird.co/terms/',
  'https://help.bird.co/',
  'https://www.bird.co/',
  '["bird.co","www.bird.co"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Redeem in the Bird wallet.","entry":"code"}'::jsonb,
  'rides', 50
),
(
  'doordash', 'doordash', 'DoorDash', '#EB1700', '#FFFFFF', 'food', true,
  'Open DoorDash, tap Account, then Invite friends. Copy your code.',
  'https://help.doordash.com/legal/document?type=dd-terms-of-service',
  'https://help.doordash.com/consumers/s/article/How-does-the-referral-program-work',
  'https://www.doordash.com/',
  '["doordash.com","www.doordash.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Usually for a first DoorDash order.","entry":"code"}'::jsonb,
  'food', 100
),
(
  'ubereats', 'ubereats', 'Uber Eats', '#06C167', '#0B1F14', 'food', true,
  'Open Uber Eats, tap Account, then Promotions or Invite friends. Copy your code.',
  'https://www.uber.com/legal/terms',
  'https://www.uber.com/us/en/eats/',
  'https://www.ubereats.com/',
  '["ubereats.com","www.ubereats.com","uber.com","www.uber.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Apply in Uber Eats Promotions.","entry":"code"}'::jsonb,
  'food', 110
),
(
  'grubhub', 'grubhub', 'Grubhub', '#F63440', '#FFFFFF', 'food', true,
  'Open Grubhub, tap Account, then Refer a friend. Copy your code.',
  'https://www.grubhub.com/legal/terms-of-use',
  'https://www.grubhub.com/',
  'https://www.grubhub.com/',
  '["grubhub.com","www.grubhub.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Redeem from Grubhub Account → Promos.","entry":"code"}'::jsonb,
  'food', 120
),
(
  'instacart', 'instacart', 'Instacart', '#0AAD0A', '#FFFFFF', 'cart', true,
  'Open Instacart, tap Account, then Invite friends. Copy your code or link.',
  'https://www.instacart.com/terms',
  'https://www.instacart.com/',
  'https://www.instacart.com/',
  '["instacart.com","www.instacart.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Usually for a first Instacart order.","entry":"code"}'::jsonb,
  'food', 130
),
(
  'gopuff', 'gopuff', 'Gopuff', '#5A31F4', '#FFFFFF', 'bag', true,
  'Open Gopuff, tap Account, then Invite friends. Copy your code.',
  'https://gopuff.com/terms',
  'https://gopuff.com/',
  'https://gopuff.com/',
  '["gopuff.com","www.gopuff.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Redeem in Gopuff Promos.","entry":"code"}'::jsonb,
  'food', 140
),
(
  'chipotle', 'chipotle', 'Chipotle', '#451400', '#F4F1EA', 'food', true,
  'Open the Chipotle app, open Rewards, then Invite friends. Copy your code.',
  'https://www.chipotle.com/legal',
  'https://www.chipotle.com/',
  'https://www.chipotle.com/',
  '["chipotle.com","www.chipotle.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Apply in Chipotle Rewards.","entry":"code"}'::jsonb,
  'food', 150
),
(
  'hellofresh', 'hellofresh', 'HelloFresh', '#91C11E', '#1A2200', 'food', true,
  'Open HelloFresh, tap Account, then Refer a friend. Copy your code or link.',
  'https://www.hellofresh.com/about/termsandconditions',
  'https://www.hellofresh.com/',
  'https://www.hellofresh.com/',
  '["hellofresh.com","www.hellofresh.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Usually for a first HelloFresh box.","entry":"code"}'::jsonb,
  'food', 160
),
(
  'cashapp', 'cashapp', 'Cash App', '#00D632', '#052E12', 'wallet', true,
  'Open Cash App, tap your profile, then Referrals or your $Cashtag. Share the cashtag.',
  'https://cash.app/legal/tos',
  'https://cash.app/',
  'https://cash.app/',
  '["cash.app","www.cash.app"]'::jsonb,
  '^[A-Za-z0-9_]{3,20}$', '["us"]'::jsonb,
  '{"shortHint":"Share your $Cashtag. New users only.","entry":"code"}'::jsonb,
  'money', 200
),
(
  'venmo', 'venmo', 'Venmo', '#008CFF', '#FFFFFF', 'wallet', true,
  'Open Venmo, tap Me, then your QR or Invite friends. Copy your username.',
  'https://venmo.com/legal/us-user-agreement/',
  'https://venmo.com/',
  'https://venmo.com/',
  '["venmo.com","www.venmo.com"]'::jsonb,
  '^[A-Za-z0-9_-]{3,20}$', '["us"]'::jsonb,
  '{"shortHint":"New Venmo users can use an invite username.","entry":"code"}'::jsonb,
  'money', 210
),
(
  'robinhood', 'robinhood', 'Robinhood', '#00C805', '#052E12', 'bank', true,
  'Open Robinhood, tap Account, then Referrals. Copy your code.',
  'https://robinhood.com/us/en/support/articles/privacy-policy/',
  'https://robinhood.com/us/en/support/articles/referral-program/',
  'https://robinhood.com/',
  '["robinhood.com","www.robinhood.com","join.robinhood.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Redeem when you fund a new Robinhood account.","entry":"code"}'::jsonb,
  'money', 220
),
(
  'sofi', 'sofi', 'SoFi', '#00A3E0', '#FFFFFF', 'bank', true,
  'Open SoFi, tap Profile, then Invite friends. Copy your code.',
  'https://www.sofi.com/legal/',
  'https://www.sofi.com/invite/',
  'https://www.sofi.com/',
  '["sofi.com","www.sofi.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Usually after a new SoFi account is funded.","entry":"code"}'::jsonb,
  'money', 230
),
(
  'chime', 'chime', 'Chime', '#1ECAD3', '#052E12', 'bank', true,
  'Open Chime, tap Profile, then Referrals. Copy your code.',
  'https://www.chime.com/policies/',
  'https://www.chime.com/',
  'https://www.chime.com/',
  '["chime.com","www.chime.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Apply during Chime sign-up.","entry":"code"}'::jsonb,
  'money', 240
),
(
  'coinbase', 'coinbase', 'Coinbase', '#0052FF', '#FFFFFF', 'bank', true,
  'Open Coinbase, tap Referrals. Copy your code or invite link.',
  'https://www.coinbase.com/legal/user_agreement',
  'https://www.coinbase.com/referrals',
  'https://www.coinbase.com/',
  '["coinbase.com","www.coinbase.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"New Coinbase accounts, after a qualifying trade.","entry":"code"}'::jsonb,
  'money', 250
),
(
  'paypal', 'paypal', 'PayPal', '#003087', '#FFFFFF', 'wallet', true,
  'Open PayPal, search Referrals or Invite friends. Paste the official invite link.',
  'https://www.paypal.com/us/legalhub/paypal/useragreement-full',
  'https://www.paypal.com/',
  'https://www.paypal.com/',
  '["paypal.com","www.paypal.com","www.paypal.me","paypal.me"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Paste the official PayPal invite link.","entry":"link"}'::jsonb,
  'money', 260
),
(
  'amazon', 'amazon', 'Amazon', '#FF9900', '#161614', 'bag', true,
  'Open Amazon, search Refer and Earn or Prime Student. Copy your code.',
  'https://www.amazon.com/gp/help/customer/display.html?nodeId=508088',
  'https://www.amazon.com/prime',
  'https://www.amazon.com/',
  '["amazon.com","www.amazon.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Prime Student and other Amazon invites vary.","entry":"code"}'::jsonb,
  'shopping', 300
),
(
  'rakuten', 'rakuten', 'Rakuten', '#BF0000', '#FFFFFF', 'bag', true,
  'Open Rakuten, tap Refer a friend. Paste the official invite link.',
  'https://www.rakuten.com/help/article/terms-of-use-360000000000',
  'https://www.rakuten.com/',
  'https://www.rakuten.com/',
  '["rakuten.com","www.rakuten.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Paste the Rakuten invite link.","entry":"link"}'::jsonb,
  'shopping', 310
),
(
  'airbnb', 'airbnb', 'Airbnb', '#FF5A5F', '#FFFFFF', 'plane', true,
  'Open Airbnb, tap Profile, then Invite friends. Copy your code or link.',
  'https://www.airbnb.com/terms',
  'https://www.airbnb.com/invite',
  'https://www.airbnb.com/',
  '["airbnb.com","www.airbnb.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Usually for a first Airbnb trip.","entry":"code"}'::jsonb,
  'travel', 400
),
(
  'booking', 'booking', 'Booking.com', '#003580', '#FFFFFF', 'plane', true,
  'Open Booking.com, tap Genius Rewards, then Invite friends. Copy your code.',
  'https://www.booking.com/content/terms.html',
  'https://www.booking.com/',
  'https://www.booking.com/',
  '["booking.com","www.booking.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Redeem on a qualifying first booking.","entry":"code"}'::jsonb,
  'travel', 410
),
(
  'chegg', 'chegg', 'Chegg', '#FF6B00', '#161614', 'book', true,
  'Open Chegg, tap Account, then Refer a friend. Copy your code.',
  'https://www.chegg.com/termsofuse',
  'https://www.chegg.com/',
  'https://www.chegg.com/',
  '["chegg.com","www.chegg.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Usually for a new Chegg Study signup.","entry":"code"}'::jsonb,
  'campus', 500
),
(
  'grammarly', 'grammarly', 'Grammarly', '#15C39A', '#052E12', 'campus', true,
  'Open Grammarly, tap Account, then Refer a friend. Paste the invite link.',
  'https://www.grammarly.com/terms',
  'https://www.grammarly.com/',
  'https://www.grammarly.com/',
  '["grammarly.com","www.grammarly.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Paste the Grammarly invite link.","entry":"link"}'::jsonb,
  'campus', 510
),
(
  'canva', 'canva', 'Canva', '#00C4CC', '#052E12', 'campus', true,
  'Open Canva, tap your profile, then Refer a friend. Paste the invite link.',
  'https://www.canva.com/policies/terms-of-use/',
  'https://www.canva.com/',
  'https://www.canva.com/',
  '["canva.com","www.canva.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Paste the Canva invite link.","entry":"link"}'::jsonb,
  'campus', 520
),
(
  'notion', 'notion', 'Notion', '#161614', '#F4F1EA', 'book', true,
  'Open Notion, tap Settings, then Earn credit. Paste the invite link.',
  'https://www.notion.com/terms',
  'https://www.notion.so/product/referral',
  'https://www.notion.com/',
  '["notion.so","www.notion.so","notion.com","www.notion.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Paste the Notion invite link.","entry":"link"}'::jsonb,
  'campus', 530
),
(
  'dropbox', 'dropbox', 'Dropbox', '#0061FF', '#FFFFFF', 'bag', true,
  'Open Dropbox, tap Referrals. Paste the official invite link.',
  'https://www.dropbox.com/terms',
  'https://www.dropbox.com/referrals',
  'https://www.dropbox.com/',
  '["dropbox.com","www.dropbox.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us","global"]'::jsonb,
  '{"shortHint":"Paste the Dropbox invite link.","entry":"link"}'::jsonb,
  'campus', 540
),
(
  'mintmobile', 'mintmobile', 'Mint Mobile', '#2DCCD3', '#052E12', 'phone', true,
  'Open Mint Mobile, tap Refer a friend. Copy your code.',
  'https://www.mintmobile.com/terms-conditions/',
  'https://www.mintmobile.com/',
  'https://www.mintmobile.com/',
  '["mintmobile.com","www.mintmobile.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Apply during Mint Mobile checkout.","entry":"code"}'::jsonb,
  'phone', 600
),
(
  'visible', 'visible', 'Visible', '#D52B1E', '#FFFFFF', 'phone', true,
  'Open Visible, tap Refer a friend. Copy your code.',
  'https://www.visible.com/legal/terms-of-service',
  'https://www.visible.com/',
  'https://www.visible.com/',
  '["visible.com","www.visible.com"]'::jsonb,
  '^[A-Za-z0-9_-]{4,24}$', '["us"]'::jsonb,
  '{"shortHint":"Apply when you start Visible service.","entry":"code"}'::jsonb,
  'phone', 610
)
on conflict (id) do nothing;

insert into provider_rules (
  provider_id, program_active, new_users_only, geographic_notes,
  expiration_notes, code_format_hint, max_known_benefit, official_terms_url,
  last_verified_on, unavailable_message
)
select id, true, true,
  'Availability and amounts vary by city and account.',
  'Codes can expire or stop working if a member leaves the program.',
  null, null, terms_url, '2026-09-09',
  display_name || ' referrals are paused in RideRelay right now.'
from providers
where id not in (select provider_id from provider_rules)
on conflict (provider_id) do nothing;
