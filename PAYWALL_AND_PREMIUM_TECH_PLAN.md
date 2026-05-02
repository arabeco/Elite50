# Paywall, Premium And Circuit Technical Plan

## Objective
Turn the current style/shop foundation into a real premium system with:
- reliable persistence
- real payment flow
- clean paywall boundaries
- circuit progression outside world saves
- no pay-to-win risk

This plan assumes the app already has:
- Supabase auth
- shared worlds
- save/load per world in `games`
- local UI for shop, inventory, circuit and item equip

## Product Decision

### Recommended premium offer
Use `Passe do Circuito` as the first paid product.

Do not start with monthly subscription unless there is a strong reason.

Why:
- easier to explain
- cleaner scope
- matches the game structure better
- less billing complexity in v1
- works well with a 90-day app-wide campaign

## Premium Scope

### Premium-only
- Oraculo Tatico
- premium reward track of the circuit
- final veteran cosmetic reward
- premium-only cosmetics in store

### Free for everyone
- world seasons
- gameplay systems
- Elite 50 prestige visuals
- basic cosmetics bought with earned gold
- free reward track of the circuit

### Never monetized
- stronger tactics
- better training multipliers
- better match engine odds
- better transfer success odds
- raw rating gain

## System Split

### World save data
Belongs in `games`.
Examples:
- current season
- team state
- lineup
- players
- tactics
- world news

### Account meta data
Must be moved outside `games`.
Examples:
- premium status
- owned cosmetics
- equipped cosmetics
- circuit progress
- purchases

Reason:
- world save is per world
- premium and inventory belong to the user account globally

## Recommended Supabase Schema

### 1. `profiles_meta`
One row per user.

Columns:
- `user_id uuid primary key references auth.users`
- `display_name text null`
- `premium_active boolean not null default false`
- `premium_source text null`
- `premium_until timestamptz null`
- `current_circuit_id text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Purpose:
- global premium status
- current circuit link
- top-level account meta

### 2. `circuit_definitions`
Defines each app-wide circuit.

Columns:
- `id text primary key`
- `name text not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `duration_days int not null`
- `target_seasons int not null default 3`
- `premium_product_code text not null`
- `is_active boolean not null default false`
- `reward_catalog jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Purpose:
- lets the app switch circuits without code deploy
- makes timing global and queryable

### 3. `user_circuit_progress`
One row per user per circuit.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users`
- `circuit_id text not null references circuit_definitions(id)`
- `premium_unlocked boolean not null default false`
- `season_runs_completed int not null default 0`
- `matches_played int not null default 0`
- `season_reports_opened int not null default 0`
- `training_actions int not null default 0`
- `tactical_changes int not null default 0`
- `reward_claims jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Unique:
- `(user_id, circuit_id)`

Purpose:
- circuit progress independent from world saves
- supports free and premium tracks

### 4. `catalog_items`
Global catalog table.

Columns:
- `id text primary key`
- `category text not null`
- `name text not null`
- `description text not null`
- `rarity text not null`
- `currency text not null`
- `price int not null`
- `image_path text not null`
- `asset_path text null`
- `premium_only boolean not null default false`
- `circuit_id text null references circuit_definitions(id)`
- `payload jsonb not null default '{}'::jsonb`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`

Purpose:
- lets catalog live in backend
- allows rotating items without shipping code

### 5. `user_inventory`
One row per owned item.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users`
- `item_id text not null references catalog_items(id)`
- `source text not null`
- `source_ref text null`
- `is_equipped boolean not null default false`
- `equipped_context jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Examples of `equipped_context`:
- `{ "type": "player", "playerId": "p_17", "teamId": "t_5", "worldId": "abc" }`
- `{ "type": "team_kit", "teamId": "t_5", "worldId": "abc" }`

Purpose:
- robust ownership tracking
- easier re-equip when UI gets richer

### 6. `payments`
Local payment ledger.

Columns:
- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users`
- `provider text not null`
- `provider_checkout_id text null`
- `provider_customer_id text null`
- `provider_payment_intent_id text null`
- `product_code text not null`
- `status text not null`
- `amount_cents int not null`
- `currency text not null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Purpose:
- audit trail
- support/refund handling
- payment debugging

## Recommended RLS

### `profiles_meta`
- select/update only own row

### `user_circuit_progress`
- select/update only own rows

### `user_inventory`
- select/update only own rows

### `payments`
- select only own rows
- insert/update only through service role or secure function

### `catalog_items`
- public select
- admin write only

### `circuit_definitions`
- public select for active circuits
- admin write only

## Payment Provider Recommendation

### Web
Use Stripe first.

Why:
- easiest for web
- clean checkout sessions
- strong webhook flow
- flexible metadata

### Mobile later
If the app becomes native:
- Google Play Billing
- App Store IAP

Do not block the first version on mobile billing.

## Stripe Flow

### Product setup
Create product:
- `passe_circuito_neon_01`

Stripe price metadata should include:
- `product_code=passe_circuito_neon_01`
- `circuit_id=circuito-neon-01`
- `grant_type=circuit_pass`

### Checkout flow
1. User clicks `Ativar Premium`.
2. Frontend calls a secure backend endpoint.
3. Backend creates Stripe Checkout Session.
4. User pays.
5. Stripe webhook confirms payment.
6. Backend marks premium as active.
7. Backend unlocks `premium_unlocked` in current circuit.
8. Frontend refreshes profile meta and circuit state.

## Required Endpoints / Functions

### 1. `create_checkout_session`
Input:
- `product_code`

Output:
- `checkout_url`

Rules:
- authenticated only
- derive price server-side
- never trust client price

### 2. `stripe_webhook`
Handles:
- `checkout.session.completed`
- `payment_intent.succeeded`
- optional refunds/disputes later

Effects:
- insert or update `payments`
- update `profiles_meta`
- update `user_circuit_progress`

### 3. `get_premium_state`
Returns:
- premium active?
- active circuit?
- premium unlocked in circuit?
- expiry or ownership info

### 4. `sync_meta_after_season`
Called when a season ends.

Effects:
- increment `season_runs_completed`
- maybe increment `season_reports_opened`
- maybe grant rewards if milestones reached

## App-Side State Refactor

### Current problem
The current store state lives inside `GameState`.

That is good for quick UI, but not enough for real premium.

### Target structure

Keep:
- local UI cache in app state if helpful

Source of truth must become:
- Supabase meta tables

### Recommended client services
- `src/lib/metaStore.ts`
- `src/lib/payments.ts`
- `src/lib/circuit.ts`

Suggested functions:
- `loadMetaProfile()`
- `loadInventory()`
- `loadCircuitProgress()`
- `purchaseWithGold()` for free-earned currency items
- `equipInventoryItem()`
- `startPremiumCheckout()`
- `refreshPremiumState()`

## Gold vs Real Money

### Gold purchase
Gold items can stay inside the app economy.

Rules:
- validate user balance server-side if gold becomes backend-owned
- write ownership to `user_inventory`
- deduct balance from a trusted meta balance table later if needed

### Real-money purchase
Never mint premium from the client.

Rules:
- only webhook or secure backend function can unlock premium

## Paywall UX

### Where to show it
- Home card: small `Ativar Premium`
- Career > Circuit: strong CTA
- locked Oraculo cards
- locked reward tiles in circuit track

### What the paywall must explain
- what is included
- what is not gameplay power
- how long it lasts
- what final reward exists

### Good paywall copy
- `Passe do Circuito`
- `Analise melhor, colecione mais, prove que voce esteve aqui.`

## Oraculo Tatico Delivery

### Free teaser
Show one soft insight:
- `Seu adversario tende a atacar pelos lados.`

### Premium full mode
Show:
- matchup pattern
- trend delta
- training recommendation
- tactical efficiency graph

### Paywall trigger points
- click on advanced card
- click on locked chart
- click on premium recommendation

## Circuit Progress Wiring

### Events to track
- season completed
- match played
- season report opened
- training action used
- tactic changed

### Best place to emit
When the real game action already completes successfully.

Examples:
- `startNewSeason` / season wrap-up
- report modal open
- training handlers
- tactic update handler

### Avoid
- counting on UI view only if it can double-fire
- counting before persistence succeeds

## Reward Claiming

### Recommended model
- milestone unlocks server-side
- claim can be explicit or automatic

For v1:
- auto-grant simple cosmetics to inventory

Later:
- explicit `Claim reward` buttons

## Implementation Order

### Phase A: backend meta base
1. Add migration for:
   - `profiles_meta`
   - `circuit_definitions`
   - `user_circuit_progress`
   - `catalog_items`
   - `user_inventory`
   - `payments`
2. Add RLS.
3. Seed active circuit and starter catalog.

### Phase B: client meta read/write
1. Add client library for meta data.
2. Load premium + inventory on login.
3. Replace local-only inventory source with Supabase-backed source.

### Phase C: circuit tracking
1. Hook season completion.
2. Hook training and tactics counters.
3. Render real circuit progress from backend.

### Phase D: Stripe
1. Add checkout endpoint or edge function.
2. Add webhook handler.
3. Add premium unlock logic.
4. Add restore-state refresh on app load.

### Phase E: paywall UX
1. Add locked Oraculo cards.
2. Add premium CTA.
3. Add purchase success and failure states.

## Recommended Next Code Tasks

### Immediate next task
Create a new migration:
- `20260421000000_premium_meta.sql`

With:
- the six tables above
- RLS policies
- seed for `circuito-neon-01`

### After that
Create:
- `src/lib/metaStore.ts`

And wire:
- inventory load
- circuit load
- premium state load

### After that
Create:
- Stripe checkout route / edge function
- Stripe webhook handler

## Honest Risk Notes

### Biggest risk
Mixing premium/account state into world save state forever.

This will create:
- duplication
- sync bugs
- cross-world inconsistency

### Second biggest risk
Letting the client activate premium without backend verification.

### Third biggest risk
Making premium too close to gameplay power.

## Success Definition

The system is "done enough" when:
- the user can buy `Passe do Circuito`
- premium is restored on next login
- circuit progress survives across worlds
- owned cosmetics survive across worlds
- boots still return to inventory when players leave
- Oraculo is locked/unlocked correctly
- nothing paid changes competitive power
