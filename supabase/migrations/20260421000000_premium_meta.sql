create table if not exists public.profiles_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  premium_active boolean not null default false,
  premium_source text,
  premium_until timestamptz,
  current_circuit_id text,
  gold_balance integer not null default 0,
  fragment_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circuit_definitions (
  id text primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_days integer not null,
  target_seasons integer not null default 3,
  premium_product_code text not null,
  is_active boolean not null default false,
  reward_catalog jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_circuit_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  circuit_id text not null references public.circuit_definitions(id) on delete cascade,
  premium_unlocked boolean not null default false,
  season_runs_completed integer not null default 0,
  matches_played integer not null default 0,
  season_reports_opened integer not null default 0,
  training_actions integer not null default 0,
  tactical_changes integer not null default 0,
  reward_claims jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_circuit_progress_user_id_circuit_id_key unique (user_id, circuit_id)
);

create table if not exists public.catalog_items (
  id text primary key,
  category text not null,
  name text not null,
  description text not null,
  rarity text not null,
  currency text not null,
  price integer not null,
  image_path text not null,
  asset_path text,
  premium_only boolean not null default false,
  circuit_id text references public.circuit_definitions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.catalog_items(id) on delete cascade,
  source text not null,
  source_ref text,
  is_equipped boolean not null default false,
  equipped_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mobile_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google_play',
  product_code text not null,
  purchase_token text,
  order_id text,
  package_name text,
  platform text not null default 'android',
  status text not null default 'PENDING',
  purchase_state text,
  acknowledged boolean not null default false,
  consumed boolean not null default false,
  amount_micros bigint,
  currency_code text,
  purchased_at timestamptz,
  expires_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_meta_current_circuit_id
  on public.profiles_meta(current_circuit_id);

create index if not exists idx_user_circuit_progress_user_id
  on public.user_circuit_progress(user_id);

create index if not exists idx_catalog_items_category
  on public.catalog_items(category);

create index if not exists idx_catalog_items_is_active
  on public.catalog_items(is_active);

create index if not exists idx_user_inventory_user_id
  on public.user_inventory(user_id);

create index if not exists idx_user_inventory_item_id
  on public.user_inventory(item_id);

create index if not exists idx_mobile_purchases_user_id
  on public.mobile_purchases(user_id);

create index if not exists idx_mobile_purchases_product_code
  on public.mobile_purchases(product_code);

create index if not exists idx_mobile_purchases_purchase_token
  on public.mobile_purchases(purchase_token);

alter table public.profiles_meta enable row level security;
alter table public.circuit_definitions enable row level security;
alter table public.user_circuit_progress enable row level security;
alter table public.catalog_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.mobile_purchases enable row level security;

drop policy if exists "profiles_meta_select_own" on public.profiles_meta;
create policy "profiles_meta_select_own"
  on public.profiles_meta
  for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_meta_insert_own" on public.profiles_meta;
create policy "profiles_meta_insert_own"
  on public.profiles_meta
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_meta_update_own" on public.profiles_meta;
create policy "profiles_meta_update_own"
  on public.profiles_meta
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "circuit_definitions_public_read" on public.circuit_definitions;
create policy "circuit_definitions_public_read"
  on public.circuit_definitions
  for select
  using (true);

drop policy if exists "catalog_items_public_read" on public.catalog_items;
create policy "catalog_items_public_read"
  on public.catalog_items
  for select
  using (is_active = true);

drop policy if exists "user_circuit_progress_select_own" on public.user_circuit_progress;
create policy "user_circuit_progress_select_own"
  on public.user_circuit_progress
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_circuit_progress_insert_own" on public.user_circuit_progress;
create policy "user_circuit_progress_insert_own"
  on public.user_circuit_progress
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_circuit_progress_update_own" on public.user_circuit_progress;
create policy "user_circuit_progress_update_own"
  on public.user_circuit_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_inventory_select_own" on public.user_inventory;
create policy "user_inventory_select_own"
  on public.user_inventory
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_inventory_insert_own" on public.user_inventory;
create policy "user_inventory_insert_own"
  on public.user_inventory
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_inventory_update_own" on public.user_inventory;
create policy "user_inventory_update_own"
  on public.user_inventory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "mobile_purchases_select_own" on public.mobile_purchases;
create policy "mobile_purchases_select_own"
  on public.mobile_purchases
  for select
  using (auth.uid() = user_id);

drop policy if exists "mobile_purchases_insert_own" on public.mobile_purchases;
create policy "mobile_purchases_insert_own"
  on public.mobile_purchases
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "mobile_purchases_update_own" on public.mobile_purchases;
create policy "mobile_purchases_update_own"
  on public.mobile_purchases
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.circuit_definitions (
  id,
  name,
  starts_at,
  ends_at,
  duration_days,
  target_seasons,
  premium_product_code,
  is_active,
  reward_catalog
)
values (
  'circuito-neon-01',
  'Circuito Neon 01',
  '2026-04-21T00:00:00Z',
  '2026-07-20T23:59:59Z',
  90,
  3,
  'passe_circuito_neon_01',
  true,
  jsonb_build_object(
    'freeTrack', jsonb_build_array(
      jsonb_build_object('level', 1, 'reward', 'gold_50'),
      jsonb_build_object('level', 2, 'reward', 'boot_velocity_cyan')
    ),
    'premiumTrack', jsonb_build_array(
      jsonb_build_object('level', 1, 'reward', 'kit_pulse_white'),
      jsonb_build_object('level', 3, 'reward', 'badge_elite_original_s1')
    ),
    'finalReward', 'badge_elite_original_s1'
  )
)
on conflict (id) do update
set
  name = excluded.name,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  duration_days = excluded.duration_days,
  target_seasons = excluded.target_seasons,
  premium_product_code = excluded.premium_product_code,
  is_active = excluded.is_active,
  reward_catalog = excluded.reward_catalog;

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
    'boot_velocity_cyan',
    'BOOT',
    'Velocity Cyan',
    'Chuteira basica neon para abrir o inventario de estilo.',
    'COMMON',
    'GOLD',
    12,
    '/assetas/avatars/boots/boot_1.png',
    null,
    false,
    null,
    jsonb_build_object('bootVisualId', 1),
    true
  ),
  (
    'boot_orbit_orange',
    'BOOT',
    'Orbit Orange',
    'Visual energizado para atacantes e alas.',
    'COMMON',
    'GOLD',
    14,
    '/assetas/avatars/boots/boot_2.png',
    null,
    false,
    null,
    jsonb_build_object('bootVisualId', 2),
    true
  ),
  (
    'boot_carbide_black',
    'BOOT',
    'Carbide Black',
    'Placeholder pronto para a terceira chuteira basica.',
    'RARE',
    'GOLD',
    18,
    '/assetas/store/boots/boot_carbide_black.png',
    null,
    false,
    null,
    jsonb_build_object('bootVisualId', 1),
    true
  ),
  (
    'boot_halo_pink',
    'BOOT',
    'Halo Pink',
    'Placeholder pronto para a quarta chuteira basica.',
    'RARE',
    'GOLD',
    19,
    '/assetas/store/boots/boot_halo_pink.png',
    null,
    false,
    null,
    jsonb_build_object('bootVisualId', 2),
    true
  ),
  (
    'boot_quantum_lime',
    'BOOT',
    'Quantum Lime',
    'Placeholder pronto para a quinta chuteira basica.',
    'RARE',
    'GOLD',
    20,
    '/assetas/store/boots/boot_quantum_lime.png',
    null,
    false,
    null,
    jsonb_build_object('bootVisualId', 1),
    true
  ),
  (
    'kit_circuit_chrome',
    'KIT',
    'Circuit Chrome',
    'Uniforme especial cromado para o clube atual.',
    'RARE',
    'GOLD',
    24,
    '/assetas/avatars/uniforms/special1.png',
    '/assetas/avatars/uniforms/special1.png',
    false,
    null,
    '{}'::jsonb,
    true
  ),
  (
    'kit_holo_wave',
    'KIT',
    'Holo Wave',
    'Skin holografica para usar fora dos kits de distrito.',
    'RARE',
    'GOLD',
    26,
    '/assetas/avatars/uniforms/special2.png',
    '/assetas/avatars/uniforms/special2.png',
    false,
    null,
    '{}'::jsonb,
    true
  ),
  (
    'kit_carbon_grid',
    'KIT',
    'Carbon Grid',
    'Visual escuro com linhas tecnicas.',
    'RARE',
    'GOLD',
    27,
    '/assetas/avatars/uniforms/special3.png',
    '/assetas/avatars/uniforms/special3.png',
    false,
    null,
    '{}'::jsonb,
    true
  ),
  (
    'kit_pulse_white',
    'KIT',
    'Pulse White',
    'Uniforme claro com cara de clube premium.',
    'EPIC',
    'FRAGMENT',
    18,
    '/assetas/avatars/uniforms/sspecial4.png',
    '/assetas/avatars/uniforms/sspecial4.png',
    true,
    'circuito-neon-01',
    '{}'::jsonb,
    true
  ),
  (
    'kit_neon_flux',
    'KIT',
    'Neon Flux',
    'Skin chamativa para quem quer marcar presenca.',
    'EPIC',
    'FRAGMENT',
    20,
    '/assetas/avatars/uniforms/special5.png',
    '/assetas/avatars/uniforms/special5.png',
    true,
    'circuito-neon-01',
    '{}'::jsonb,
    true
  ),
  (
    'logo_quantum_vault',
    'LOGO',
    'Quantum Vault',
    'Logo especial fora da pool padrao dos clubes.',
    'RARE',
    'GOLD',
    22,
    '/assetas/store/logos/logo_quantum_vault.png',
    '/assetas/store/logos/logo_quantum_vault.png',
    false,
    null,
    jsonb_build_object(
      'logoPreview',
      jsonb_build_object(
        'primary', '#0f172a',
        'secondary', '#22d3ee',
        'accent', '#f8fafc',
        'patternId', 'radial',
        'symbolId', 'asset:/assetas/store/logos/logo_quantum_vault.png',
        'assetPath', '/assetas/store/logos/logo_quantum_vault.png'
      )
    ),
    true
  ),
  (
    'logo_holo_tiger',
    'LOGO',
    'Holo Tiger',
    'Placeholder para logo premium de energia alta.',
    'RARE',
    'GOLD',
    23,
    '/assetas/store/logos/logo_holo_tiger.png',
    '/assetas/store/logos/logo_holo_tiger.png',
    false,
    null,
    jsonb_build_object(
      'logoPreview',
      jsonb_build_object(
        'primary', '#1d4ed8',
        'secondary', '#ec4899',
        'accent', '#facc15',
        'patternId', 'diagonal_split',
        'symbolId', 'asset:/assetas/store/logos/logo_holo_tiger.png',
        'assetPath', '/assetas/store/logos/logo_holo_tiger.png'
      )
    ),
    true
  ),
  (
    'logo_blackout_crown',
    'LOGO',
    'Blackout Crown',
    'Placeholder para logo de streak de vitorias.',
    'EPIC',
    'FRAGMENT',
    16,
    '/assetas/store/logos/logo_blackout_crown.png',
    '/assetas/store/logos/logo_blackout_crown.png',
    true,
    'circuito-neon-01',
    jsonb_build_object(
      'logoPreview',
      jsonb_build_object(
        'primary', '#020617',
        'secondary', '#e2e8f0',
        'accent', '#38bdf8',
        'patternId', 'solid',
        'symbolId', 'asset:/assetas/store/logos/logo_blackout_crown.png',
        'assetPath', '/assetas/store/logos/logo_blackout_crown.png'
      )
    ),
    true
  ),
  (
    'logo_pulse_hex',
    'LOGO',
    'Pulse Hex',
    'Placeholder para logo com cara de tec arena.',
    'EPIC',
    'FRAGMENT',
    17,
    '/assetas/store/logos/logo_pulse_hex.png',
    '/assetas/store/logos/logo_pulse_hex.png',
    true,
    'circuito-neon-01',
    jsonb_build_object(
      'logoPreview',
      jsonb_build_object(
        'primary', '#14532d',
        'secondary', '#a3e635',
        'accent', '#f8fafc',
        'patternId', 'stripes_vertical',
        'symbolId', 'asset:/assetas/store/logos/logo_pulse_hex.png',
        'assetPath', '/assetas/store/logos/logo_pulse_hex.png'
      )
    ),
    true
  ),
  (
    'logo_solar_wire',
    'LOGO',
    'Solar Wire',
    'Placeholder para logo raro de assinatura visual.',
    'EPIC',
    'FRAGMENT',
    18,
    '/assetas/store/logos/logo_solar_wire.png',
    '/assetas/store/logos/logo_solar_wire.png',
    true,
    'circuito-neon-01',
    jsonb_build_object(
      'logoPreview',
      jsonb_build_object(
        'primary', '#7c2d12',
        'secondary', '#fb923c',
        'accent', '#fde68a',
        'patternId', 'stripes_horizontal',
        'symbolId', 'asset:/assetas/store/logos/logo_solar_wire.png',
        'assetPath', '/assetas/store/logos/logo_solar_wire.png'
      )
    ),
    true
  ),
  (
    'badge_elite_original_s1',
    'BADGE',
    'Elite Original S1',
    'Trofeu social do primeiro circuito premium completo.',
    'LEGENDARY',
    'FRAGMENT',
    0,
    '/assetas/store/badges/badge_elite_original_s1.png',
    '/assetas/store/badges/badge_elite_original_s1.png',
    true,
    'circuito-neon-01',
    '{}'::jsonb,
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
