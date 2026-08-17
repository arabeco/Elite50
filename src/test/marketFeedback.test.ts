import { describe, expect, it } from 'vitest';
import { getMarketFeedback } from '../utils/marketFeedback';

const buildState = (status: 'PENDING' | 'ACCEPTED' | 'DECLINED') => ({
  worldId: 'world-1',
  userTeamId: 'team-1',
  players: {
    player_1: { id: 'player_1', nickname: 'Kael' },
  },
  transferProposals: [{
    id: 'proposal-1',
    playerId: 'player_1',
    fromTeamId: null,
    toTeamId: 'team-1',
    value: 780,
    status,
    date: '2050-07-12T08:00:00.000Z',
  }],
  tradeOffers: [],
}) as any;

describe('market feedback', () => {
  it('announces an accepted pending proposal once its status changes', () => {
    expect(getMarketFeedback(buildState('PENDING'), buildState('ACCEPTED'))).toEqual([
      { message: 'Contratacao concluida: Kael chegou ao clube.', type: 'success' },
    ]);
  });

  it('does not announce proposals that were already resolved', () => {
    expect(getMarketFeedback(buildState('ACCEPTED'), buildState('ACCEPTED'))).toEqual([]);
  });
});
