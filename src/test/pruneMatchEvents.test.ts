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

  it('nao poda a copa que esta acontecendo agora (escalas de round diferentes)', () => {
    // REGRESSAO: match.round das copas usa escala propria (1..4), enquanto
    // world.currentRound e global (1..11). Comparar direto fazia a final da Copa
    // Elite (round 4) parecer ter 11-4=7 rodadas de idade e ser podada no mesmo
    // dia em que foi jogada.
    const finalElite = makeMatch({ id: 'ec_final', round: 4 });   // global 7+4 = 11
    const semiElite = makeMatch({ id: 'ec_semi', round: 3 });     // global 7+3 = 10
    const state = makeState([], 11);
    (state.world as any).eliteCup = { bracket: { semis: [semiElite], final: finalElite } };

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
    expect(finalElite.result!.events).toHaveLength(2);
    expect(semiElite.result!.events).toHaveLength(2);
  });

  it('poda copa antiga so quando ela fica fora da janela, ja na escala global', () => {
    // Oitavas da Copa Elite: round 1 -> global 8. Com currentRound 11 sao 3
    // rodadas de idade, entao sai. A final (global 11) continua.
    const oitavas = makeMatch({ id: 'ec_r1', round: 1 });
    const finalElite = makeMatch({ id: 'ec_final', round: 4 });
    const state = makeState([], 11);
    (state.world as any).eliteCup = { bracket: { round1: [oitavas], final: finalElite } };

    expect(pruneOldMatchEvents(state, 2)).toBe(2);
    expect(oitavas.result!.events).toEqual([]);
    expect(finalElite.result!.events).toHaveLength(2);
  });

  it('aplica o offset da Copa dos Distritos', () => {
    // districtRound 1 -> global 11+1 = 12. Com currentRound 12, e a rodada atual.
    const dc = makeMatch({ id: 'dc_1', round: 1 });
    const state = makeState([], 12);
    (state.world as any).districtCup = { matches: [dc] };

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
    expect(dc.result!.events).toHaveLength(2);
  });

  it('preserva os events da janela em que o Live Replay abre sozinho', () => {
    // O Dashboard abre o replay ao vivo de partidas jogadas ha menos de 2 dias
    // de jogo (Dashboard.tsx, "Detect newly played matches to show Live Replay").
    // Com MATCH_INTERVAL_DAYS = 2, duas rodadas equivalem a ~4 dias de jogo, entao
    // a janela de retencao e o DOBRO da janela do replay. Se este teste quebrar,
    // o jogador vai abrir o app e assistir a uma partida sem narracao nenhuma.
    const rodadaAtual = 7;
    const dentroDoReplay = [
      makeMatch({ id: 'r7', round: 7 }),
      makeMatch({ id: 'r6', round: 6 }),
    ];
    const state = makeState(dentroDoReplay, rodadaAtual);

    expect(pruneOldMatchEvents(state, 2)).toBe(0);
    dentroDoReplay.forEach(match => {
      expect(match.result!.events).toHaveLength(2);
    });
  });
});
