-- Product rename: RideRelay → RewardRelay. Keep creator user_id stable.

update profiles
set display_name = 'RewardRelay'
where user_id = 'creator-riderelay'
  and display_name = 'RideRelay';

update provider_rules
set unavailable_message = replace(unavailable_message, 'RideRelay', 'RewardRelay'),
    updated_at = now()
where unavailable_message like '%RideRelay%';
