update public.catalog_items
set
  image_path = '/assetas/avatars/pass/badge-elite-original-s1.png',
  asset_path = '/assetas/avatars/pass/badge-elite-original-s1.png'
where id = 'badge_elite_original_s1';

update public.circuit_definitions
set reward_catalog = coalesce(reward_catalog, '{}'::jsonb) || jsonb_build_object(
  'passIconPath', '/assetas/avatars/pass/pass-circuit-neon-01.png',
  'bannerImagePath', '/assetas/avatars/pass/pass-circuit-neon-banner.png',
  'finalRewardImagePath', '/assetas/avatars/pass/badge-elite-original-s1.png'
)
where id = 'circuito-neon-01';
