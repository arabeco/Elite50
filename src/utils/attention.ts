import { GameState } from '../types';

export function getInboxAttention(state: GameState) {
  return {
    news: (state.notifications || []).filter(item => !item.read).length,
    trades: state.userTeamId ? (state.tradeOffers || []).filter(offer => offer.toTeamId === state.userTeamId && offer.status === 'PENDING').length : 0,
  };
}
