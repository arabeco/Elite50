import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeTab } from '../components/dashboard/HomeTab';
import { GameProvider, useGame } from '../store/GameContext';
import { generateInitialState } from '../engine/generator';
import { GameState, Manager } from '../types';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signOut: vi.fn(async () => ({})),
    },
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
}));

const attachUserClub = (state: GameState, teamId = 't_1') => {
  const managerId = 'qa_manager';
  const team = state.teams[teamId];

  const manager: Manager = {
    id: managerId,
    name: 'QA Manager',
    district: team.district,
    reputation: 50,
    attributes: {
      evolution: 50,
      negotiation: 50,
      scout: 50,
    },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: teamId,
      historyTeamIds: [],
    },
    achievements: [],
  };

  state.managers[managerId] = manager;
  state.teams[teamId].managerId = managerId;
  state.userManagerId = managerId;
  state.userTeamId = teamId;
  state.isCreator = true;
};

const makeDraftState = () => {
  const state = generateInitialState();
  attachUserClub(state);

  state.world.status = 'LOBBY';
  state.world.currentDay = 0;
  state.teams[state.userTeamId!].squad = [];
  state.teams[state.userTeamId!].lineup = {};

  return state;
};

const makeActiveSeasonState = () => {
  const state = generateInitialState();
  attachUserClub(state);

  const team = state.teams[state.userTeamId!];
  team.lineup = Object.fromEntries(team.squad.slice(0, 11).map((playerId, index) => [`slot_${index}`, playerId]));
  team.tactics = {
    ...team.tactics,
    playStyle: 'Equilibrado',
    mentality: 'Calculista',
  };

  state.world.status = 'ACTIVE';
  state.world.currentDay = 3;
  state.world.currentDate = state.world.seasonStartReal || state.world.currentDate;

  return state;
};

const StateInjector = ({ state }: { state: GameState }) => {
  const { setState } = useGame();

  React.useEffect(() => {
    setState(state);
  }, [setState, state]);

  return null;
};

const renderHome = (state: GameState) => render(
  <GameProvider>
    <StateInjector state={state} />
    <HomeTab
      onOpenDraft={() => undefined}
      onOpenTeam={() => undefined}
      onOpenLineup={() => undefined}
      onOpenTactics={() => undefined}
      onOpenLeague={() => undefined}
    />
  </GameProvider>
);

describe('HomeTab gameplay GPS smoke', () => {
  it('shows the draft GPS when the user squad is not complete', async () => {
    const { container } = renderHome(makeDraftState());

    expect(await screen.findByText(/Monte seu elenco inicial/i)).toBeInTheDocument();
    expect(screen.getByText(/DRAFT ABERTO/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir Draft/i })).toBeInTheDocument();
    expect(screen.getByText(/Elenco completo/i)).toBeInTheDocument();
    expect(screen.getByText('0/15')).toBeInTheDocument();
    expect(screen.getByText(/Depois disso: a liga resolve disputas/i)).toBeInTheDocument();

    const gps = container.querySelector('[data-onboarding="home-gps"]');
    const primaryAction = container.querySelector('[data-onboarding="today-primary-action"]');
    expect(gps).toBeInTheDocument();
    expect(primaryAction).toHaveTextContent(/Abrir Draft/i);
  });

  it('moves the GPS to season prep once squad, lineup and tactics are ready', async () => {
    const { container } = renderHome(makeActiveSeasonState());

    expect(await screen.findByText(/Prepare o proximo compromisso/i)).toBeInTheDocument();
    expect(screen.getByText(/TEMPORADA/i)).toBeInTheDocument();
    expect(screen.getByText(/Elenco completo/i)).toBeInTheDocument();
    expect(screen.getByText(/Escalacao minima/i)).toBeInTheDocument();
    expect(screen.getByText(/Tatica definida/i)).toBeInTheDocument();
    expect(screen.getByText(/Depois disso: quando o relogio chegar/i)).toBeInTheDocument();

    await waitFor(() => {
      const primaryAction = container.querySelector('[data-onboarding="today-primary-action"]');
      expect(primaryAction).toBeInTheDocument();
      expect(primaryAction).toHaveTextContent(/Preparar Time|Revisar Escalacao/i);
    });
  });
});
