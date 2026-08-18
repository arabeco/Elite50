import { describe, expect, it } from 'vitest';
import { pruneOldMatchEvents } from '../engine/pruneMatchEvents';
import { GameState, Match } from '../types';

const makeMatch = (over: Partial<Match> & { id: string; round: number }): Match => ({
  homeTeamId: 't_1',
  awayTeamId: 't_2',
  date: '2050-07-01T16:00:00.000Z',
  played: true,
  revealed: true,
  result: {
    homeTeamId: 't_1',
    awayTeamId: 't_2',
    homeScore: 2,
    awayScore: 1,
    scorers: [{ playerId: 'p_1', teamId: 't_1' }],
    assists: [],
    ratings: { p_1: 7.5 },
    events: [
      { type: 'GOAL', minute: 10, realTimeSecond: 60, teamId: 't_1' },
      { type: 'GOAL', minute: 40, realTimeSecond: 240, teamId: 't_2' },
    ],
  },
  ...over,
} as Match);

const makeState = (matches: Match[], currentRound = 7): GameState => ({
  world: {
    currentRound,
    leagues: { purple: { id: 'purple', name: 'Purple', standings: [], matches } },
  },
} as unknown as GameState);

describe('pruneOldMatchEvents', () => {
  it('esvazia events de partidas antigas mas preserva placar e ratings', () => {
    const antiga = makeMatch({ id: 'm_antiga', round: 1 });
    const state = makeState([antiga], 7);

    const freed = pruneOldMatchEvents(state, 2);

    expect(freed).toBe(2);
    expect(antiga.result!.events).toEqual([]);
    // O que a UI precisa para o card e a tabela continua intacto.
    expect(antiga.result!.homeScore).toBe(2);
    expect(antiga.result!.awayScore).toBe(1);
    expect(antiga.result!.scorers).toHaveLength(1);
    expect(antiga.result!.ratings.p_1).toBe(7.5);
  });

  it('mantem as rodadas recentes dentro da janela de retencao', () => {
    const recente = makeMatch({ id: 'm_recente', round: 6 });
    const state = makeState([recente], 7);

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
    expect(recente.result!.events).toHaveLength(2);
  });

  it('nunca poda relatorio cego pendente, por mais antigo que seja', () => {
    // revealed === false significa que o jogador ainda nao abriu o relatorio.
    // A timeline e exatamente o conteudo que ele ainda vai ver.
    const cega = makeMatch({ id: 'm_cega', round: 1, revealed: false });
    const state = makeState([cega], 20);

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
    expect(cega.result!.events).toHaveLength(2);
  });

  it('nao toca em partidas que ainda nao foram jogadas', () => {
    const futura = makeMatch({ id: 'm_futura', round: 1, played: false });
    const state = makeState([futura], 20);

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
  });

  it('e idempotente', () => {
    const antiga = makeMatch({ id: 'm_antiga', round: 1 });
    const state = makeState([antiga], 7);

    expect(pruneOldMatchEvents(state, 2)).toBe(2);
    expect(pruneOldMatchEvents(state, 2)).toBe(0);
  });

  it('tambem poda os mata-matas', () => {
    const state = makeState([], 20);
    (state.world as any).eliteCup = {
      bracket: {
        round1: [makeMatch({ id: 'ec_1', round: 8 })],
        final: makeMatch({ id: 'ec_final', round: 11 }),
      },
    };
    (state.world as any).districtCup = { matches: [makeMatch({ id: 'dc_1', round: 9 })] };

    expect(pruneOldMatchEvents(state, 2)).toBe(6);
  });
});
