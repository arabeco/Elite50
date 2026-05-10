insert into public.catalog_items (
  id,
  category,
  name,
  description,
  rarity,
  currency,
  price,
  image_path,
  asset_path,
  premium_only,
  circuit_id,
  payload,
  is_active
)
values
  (
    'accessory_founder_whistle',
    'ACCESSORY',
    'Apito de Fundador',
    'Acessorio de perfil para manager que carrega mundos nas costas.',
    'RARE',
    'GOLD',
    32,
    '/logo.png',
    '/logo.png',
    false,
    null,
    jsonb_build_object(
      'collectionLabel', 'Perfil Global',
      'effectLabel', 'Aura de Manager',
      'effectDescription', 'Marca publica de prestigio. Bonus leve de reputacao visual entre mundos.',
      'managerBonus', jsonb_build_object('reputationAura', 1)
    ),
    true
  ),
  (
    'accessory_scout_lens',
    'ACCESSORY',
    'Lente de Scout',
    'Acessorio transversal para deixar o perfil com cara de observador elite.',
    'EPIC',
    'FRAGMENT',
    12,
    '/logo.png',
    '/logo.png',
    false,
    null,
    jsonb_build_object(
      'collectionLabel', 'Perfil Global',
      'effectLabel', 'Clareza de Scout',
      'effectDescription', 'Futuro bonus leve de leitura e filtros. Nao aumenta rating nem resultado de partida.',
      'managerBonus', jsonb_build_object('scoutingClarityPct', 5)
    ),
    true
  ),
  (
    'badge_elite_original_s1',
    'BADGE',
    'Elite Original S1',
    'Badge de perfil para quem fechou o primeiro circuito com honra.',
    'LEGENDARY',
    'FRAGMENT',
    0,
    '/logo.png',
    '/logo.png',
    true,
    'circuito-neon-01',
    jsonb_build_object(
      'collectionLabel', 'Perfil Global',
      'effectLabel', 'Prova Social',
      'effectDescription', 'Item de perfil atravessando mundos. Valor de historia, nao de poder.'
    ),
    true
  )
on conflict (id) do update
set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  currency = excluded.currency,
  price = excluded.price,
  image_path = excluded.image_path,
  asset_path = excluded.asset_path,
  premium_only = excluded.premium_only,
  circuit_id = excluded.circuit_id,
  payload = excluded.payload,
  is_active = excluded.is_active;
