import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameProvider, useGame } from '../store/GameContext';
import { useDashboardData, MatchViewModel } from '../hooks/useDashboardData';
import { generateInitialState } from '../engine/generator';
import { GameState, LeagueState, Manager } from '../types';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'qa_user' } } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(async () => ({})),
    },
    from: vi.fn(() => ({ insert: vi.fn(async () => ({ data: null, error: null })) })),
  },
  saveGameState: vi.fn(async () => null),
  loadGameState: vi.fn(async () => null),
  listUserWorlds: vi.fn(async () => []),
  listPublicWorlds: vi.fn(async () => []),
  deleteWorld: vi.fn(async () => true),
  joinSharedWorld: vi.fn(async () => null),
  joinWorldByCode: vi.fn(async () => null),
  subscribeToWorld: vi.fn(),
  unsubscribeFromWorld: vi.fn(),
  claimTeamInWorld: vi.fn(async () => null),
  resignFromTeamInWorld: vi.fn(async () => null),
}));

const TEAM_ID = 't_31';

/**
 * Monta um mundo em que o time do usuario ja jogou uma partida cujo placar
 * ainda NAO foi revelado — exatamente o estado que o motor produz em
 * gameLogic (`match.revealed = false`, "blind report").
 */
const makeWorldWithUnrevealedMatch = (): GameState => {
  const state = generateInitialState();
  const managerId = 'qa_human';
  const team = state.teams[TEAM_ID];

  const manager: Manager = {
    id: managerId,
    name: 'QA Human',
    district: team.district,
    reputation: 50,
    isNPC: false,
    attributes: { evolution: 50, negotiation: 50, scout: 50 },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: TEAM_ID,
      historyTeamIds: [],
    },
    achievements: [],
  };

  state.managers[managerId] = manager;
  state.teams[TEAM_ID].managerId = managerId;
  state.userManagerId = managerId;
  state.userTeamId = TEAM_ID;
  state.isCreator = true;

  const leagues = Object.values(state.world.leagues) as LeagueState[];
  const userLeague = leagues.find(league =>
    league.standings.some(row => row.teamId === TEAM_ID)
  );
  if (!userLeague) throw new Error('fixture invalida: time do usuario sem liga');

  const userMatch = userLeague.matches.find(
    match => match.homeTeamId === TEAM_ID || match.awayTeamId === TEAM_ID
  );
  if (!userMatch) throw new Error('fixture invalida: liga sem partida do usuario');

  userMatch.played = true;
  userMatch.homeScore = 2;
  userMatch.awayScore = 1;
  userMatch.revealed = false;

  return state;
};

const Probe = ({
  seed,
  onData,
}: {
  seed: GameState;
  onData: (matches: MatchViewModel[]) => void;
}) => {
  const { setState } = useGame();
  const { pastMatches } = useDashboardData();

  React.useEffect(() => {
    setState(seed);
  }, [setState, seed]);

  React.useEffect(() => {
    onData(pastMatches);
  }, [onData, pastMatches]);

  return null;
};

describe('useDashboardData match view model', () => {
  it('preserva o flag revealed das partidas do usuario', async () => {
    const seed = makeWorldWithUnrevealedMatch();
    let latest: MatchViewModel[] = [];

    render(
      <GameProvider>
        <Probe seed={seed} onData={matches => { latest = matches; }} />
      </GameProvider>
    );

    await waitFor(() => expect(latest.length).toBeGreaterThan(0));

    const blind = latest.find(match => match.revealed === false);

    // Regressao: o mapper ja omitiu `revealed`, o que fazia `revealed` virar
    // undefined em toda a Home. Como a UI testa `revealed !== false`, o placar
    // aparecia na hora e o CTA "Revelar relatorio" nunca era exibido.
    expect(blind, 'partida nao revelada sumiu do view model').toBeDefined();
    expect(blind?.homeScore).toBe(2);
    expect(blind?.awayScore).toBe(1);
  });

  it('expoe homeTeamId/awayTeamId junto com os nomes historicos homeId/awayId', async () => {
    const seed = makeWorldWithUnrevealedMatch();
    let latest: MatchViewModel[] = [];

    render(
      <GameProvider>
        <Probe seed={seed} onData={matches => { latest = matches; }} />
      </GameProvider>
    );

    await waitFor(() => expect(latest.length).toBeGreaterThan(0));

    // As telas consomem os dois nomes; manter ambos evita o descasamento de tipo
    // que engoliu `revealed` da primeira vez.
    latest.forEach(match => {
      expect(match.homeTeamId).toBe(match.homeId);
      expect(match.awayTeamId).toBe(match.awayId);
      expect(match.homeTeamId).toBeTruthy();
    });
  });
});
