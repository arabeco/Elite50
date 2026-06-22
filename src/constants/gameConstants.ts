// ===================================
// ELITE 2050 — Game Constants
// ===================================
// Centralized magic numbers used across the game engine.
// Import from here instead of hardcoding values.

// --- Season Structure ---
export const MAX_TEAM_POWER_TIER_1 = 12000;
export const MAX_TEAM_POWER_TIER_2 = 10000;
export const MAX_TEAM_POWER_TIER_3 = 8000;
export const MAX_TEAM_POWER_TIER_4 = 13000; // Peak dynamic cap example
export const MAX_TEAM_POWER = MAX_TEAM_POWER_TIER_1;
export const SEASON_ROUNDS = 7;
export const ELITE_CUP_ROUNDS = 4;
export const DISTRICT_CUP_ROUNDS = 0;
export const OFFSEASON_DAYS = 3;
export const MIDSEASON_JOIN_MAX_ROUND = 4;
export const GENESIS_DRAFT_LAST_DAY = 2;
export const GENESIS_DRAFT_AUTOFILL_DAY = 3;
export const TOTAL_ROUNDS = SEASON_ROUNDS + ELITE_CUP_ROUNDS + DISTRICT_CUP_ROUNDS; // 11
export const SEASON_DAYS = 22; // 2 dias de Genesis + liga + Copa Elite + offseason curta
export const MATCH_INTERVAL_DAYS = 2; // Dia Sim, Dia Não (Liga)
export const DEFAULT_TIME_SPEED = 1 / 60; // Real time: 1 game second per real second.
export const TEST_TIME_SPEED = 2.4; // Dev acceleration: 1 game day every 10 real minutes.
export const HUMAN_MANAGER_ACTIVE_GRACE_DAYS = 2; // Human teams keep playing, but stop gaining upgrades after this idle window.
export const MAX_CREATED_WORLDS_PER_USER = 5;

// --- Safety Net (ensures AI teams remain competitive) ---
export const SAFETY_NET_TOTAL = 6000;
export const SAFETY_NET_MIN_PLAYERS = 15;
export const SAFETY_NET_FREE_AGENT_RATING = 400;

// --- Player Rating System ---
export const PLAYER_RATING_MIN = 0;
export const PLAYER_RATING_MAX = 1000;
export const PLAYER_PHASE_MIN = 0.0;
export const PLAYER_PHASE_MAX = 10.0;
export const PLAYER_PHASE_HISTORY_SIZE = 5;

// --- Match Engine ---
export const MATCH_DURATION_MINUTES = 90;
export const MATCH_REAL_TIME_SECONDS = 120; // 2 minutes real-time per match
export const COMMENTARY_INTERVAL_SECONDS = 4.8; // Adjusted for 2 min match (120/25 events approx)
export const COMMENTARY_COUNT = 25;

// --- Team Composition ---
export const SQUAD_SIZE_MIN = 15;
export const SQUAD_SIZE_MAX = 15;
export const LINEUP_SIZE = 11;

// --- Training ---
export const CHEMISTRY_MAX = 100;
export const SATISFACTION_MAX = 100;
export const TRAINING_PROGRESS_MAX = 100;

// --- Leagues ---
export const TEAMS_PER_LEAGUE = 8;
export const DISTRICTS: readonly string[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'] as const;
