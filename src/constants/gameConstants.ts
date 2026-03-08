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
export const SEASON_ROUNDS = 14;
export const ELITE_CUP_ROUNDS = 4;
export const DISTRICT_CUP_ROUNDS = 4;
export const TOTAL_ROUNDS = SEASON_ROUNDS + ELITE_CUP_ROUNDS + DISTRICT_CUP_ROUNDS; // 22
export const SEASON_DAYS = 45; // 45 real-time days per season
export const MATCH_INTERVAL_DAYS = 2; // Dia Sim, Dia Não (Liga)
export const DEFAULT_TIME_SPEED = 1; // 1s real = 1s game (Sync 1:1)

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
