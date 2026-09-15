import { describe, expect, it } from 'vitest';
import { getInboxAttention } from '../utils/attention';
import { GameState } from '../types';

describe('Inbox attention', () => {
  it('counts unread news and only incoming pending trades', () => {
    const state = {userTeamId: 'mine', notifications: [{read: false}, {read: true}], tradeOffers: [
      {toTeamId: 'mine', status: 'PENDING'}, {toTeamId: 'other', status: 'PENDING'}, {toTeamId: 'mine', status: 'ACCEPTED'},
    ]} as GameState;
    expect(getInboxAttention(state)).toEqual({news: 1, trades: 1});
    state.notifications[0].read = true;
    state.tradeOffers[0].status = 'DECLINED';
    expect(getInboxAttention(state)).toEqual({news: 0, trades: 0});
  });
  it('does not create a trade action for an observer', () => {
    expect(getInboxAttention({notifications: [], tradeOffers: [{toTeamId: null, status: 'PENDING'}]} as unknown as GameState)).toEqual({news: 0, trades: 0});
  });
});
