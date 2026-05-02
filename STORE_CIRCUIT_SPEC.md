# Store, Premium And Circuit Spec

## Goal
Build a premium and style layer for Elite 2050 that:
- feels native to the app
- does not break competitive balance
- gives social proof and retention
- is easy to understand inside the current dashboard flow

## Product Split

### 1. Local season of the world
This is the football season inside each world:
- league
- cup
- offseason
- next season starts automatically

This season belongs to the world and can start at different moments for different players.

### 2. Global app circuit
This is the premium meta layer of the app:
- runs for 90 days
- shared by everyone
- not tied to one specific world
- progress is made by playing real seasons in any world

Recommended name:
- `Circuito Neon`

## Premium Model

### Main offer
Use `Passe do Circuito` instead of monthly subscription as the first premium model.

Why:
- matches the app cadence better
- feels less aggressive
- easier to explain
- creates a clean free track + premium track

### Premium unlocks
- Oraculo Tatico
- premium reward track
- exclusive cosmetics
- final veteran reward if the user completes the circuit goal

## Non-P2W Rule
Premium must never sell direct match advantage.

Allowed:
- analysis
- suggestions
- reports
- visuals
- prestige
- convenience that does not change power

Forbidden:
- stronger tactics
- better training multipliers sold for cash
- extra rating
- faster progression bought directly
- stronger transfer chances sold in store

## Oraculo Tatico
The premium assistant should teach, not decide.

### What it can show
- matchup read: where the opponent is stronger, likely weak side, recent trend
- build suggestion: best route with current team resources
- efficiency log: your tactical performance versus league average
- form insight: who is trending up or down
- training recommendation: where active management can create edge

### What it must not do
- auto-pick the winning tactic
- reveal hidden unfair data
- simulate a perfect answer button

## Inventory Model

### Core idea
The store sells style items. The inventory owns them permanently.

### Categories
- Boots
- Kits
- Logos
- Badges
- Circuit rewards

### Ownership rules
- items are owned by the manager profile
- boots can be equipped on one player at a time
- if a player leaves the club, the boot returns to inventory automatically
- kits and logos are club cosmetics
- circuit rewards are account trophies

## Boot Equip UX

### In the small player card
- show a small square with the boot PNG
- this acts as a quick visual signal that the player has a cosmetic equipped

### In the large player modal
- show a boot panel with:
  - current boot image
  - current boot name
  - button: `Equipar chuteira`
- clicking opens a simple list
- each row has image + name + rarity
- clicking a row equips immediately
- first row is `Remover chuteira especial`

### Auto return rule
If the player leaves the current club:
- unequip the boot
- return it to inventory
- reset the player visual to default boot

## Store Placement

### Main location
Put the store inside `Carreira`.

Why:
- keeps `Mundo` focused on players, rankings and football context
- keeps premium and prestige in the meta layer
- avoids confusion between transfer market and cosmetic store

### Recommended structure inside Career
- Overview
- Loja
- Inventario
- Circuito
- Hall da Fama

### Shortcut
In `Home > Temporada`, show a small CTA:
- `Ativar Premium`

## Circuit Design

### Duration
- 90 days

### Main goal
- complete 3 world seasons during the circuit window

### Secondary objectives
- play X matches
- open season reports
- use training focus several times
- change tactics and keep a positive performance delta
- maybe assume more than one club during the circuit

### Final premium reward
- veteran skin or badge only for premium users who complete the circuit goal

This creates social proof:
- `Circuito Neon 01`
- `Original 2050`
- visible in profile, manager modal and hall of fame

## Currency Model

### Gold
Earned in play. Used for:
- common boots
- common kits
- common logos
- rename and minor cosmetic convenience later

### Fragments
Premium-facing currency. Used for:
- epic cosmetics
- circuit exclusives
- premium finishers and badges

## Starter Catalog

### Boots
1. `Velocity Cyan`
2. `Orbit Orange`
3. `Carbide Black`
4. `Halo Pink`
5. `Quantum Lime`

### Kits
1. `Circuit Chrome`
2. `Holo Wave`
3. `Carbon Grid`
4. `Pulse White`
5. `Neon Flux`

### Logos
1. `Quantum Vault`
2. `Holo Tiger`
3. `Blackout Crown`
4. `Pulse Hex`
5. `Solar Wire`

## Asset Rules For This First Pass
- use real PNGs where they already exist
- allow placeholder image paths for missing boots and logos
- avoid using team-default logos already assigned to clubs
- keep naming stable so future PNG drops can plug in without code changes

## Competitive Philosophy
The skill gap should come from:
- tactics
- training
- lineup choices
- timing and attention

Not from the store.

That means:
- a passive club remains viable
- an active club gains edge through better decisions
- premium helps the player understand the game better, not overpower others

## Implementation Phases

### Phase 1
- store state in game save
- starter catalog
- buying items
- boot equip in player modal
- boot icon in player card
- auto-return to inventory when player leaves club
- simple store panel in Career

### Phase 2
- dedicated inventory screen
- kit and logo loadout screen
- better logo application across all club surfaces
- premium activation flow

### Phase 3
- Oraculo Tatico cards
- circuit progression UI
- free track + premium track
- veteran rewards in profile and hall of fame
