import { GameState, Player } from '../types';

export const ELITE_PLAYER_CUTOFF = 50;

export const getGlobalPlayerRanking = (state: GameState) => (
  Object.values(state.players).sort((a, b) => {
    if (b.totalRating !== a.totalRating) return b.totalRating - a.totalRating;
    return a.nickname.localeCompare(b.nickname);
  })
);

export const getPlayerGlobalRank = (state: GameState, playerId: string) => {
  const ranking = getGlobalPlayerRanking(state);
  const index = ranking.findIndex(player => player.id === playerId);
  return index >= 0 ? index + 1 : null;
};

export const isElitePlayer = (state: GameState, playerId: string, cutoff = ELITE_PLAYER_CUTOFF) => {
  const rank = getPlayerGlobalRank(state, playerId);
  return rank !== null && rank <= cutoff;
};

export const getEliteBadgeLabel = (rank: number | null, cutoff = ELITE_PLAYER_CUTOFF) => {
  if (!rank || rank > cutoff) return null;
  return `ELITE ${cutoff}`;
};

export const getEliteTier = (rank: number | null) => {
  if (!rank) return null;
  if (rank <= 3) return 'top3';
  if (rank <= 10) return 'top10';
  if (rank <= ELITE_PLAYER_CUTOFF) return 'top50';
  return null;
};

export const getElitePlayers = (state: GameState, cutoff = ELITE_PLAYER_CUTOFF): Player[] => (
  getGlobalPlayerRanking(state).slice(0, cutoff)
);
