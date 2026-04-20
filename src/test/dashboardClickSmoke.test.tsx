import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dashboard } from '../components/Dashboard';
import { GameProvider, useGame } from '../store/GameContext';
import { generateInitialState } from '../engine/generator';
import { GameState, Manager } from '../types';

const feedbackInsertMock = vi.hoisted(() => vi.fn(async () => ({ data: null, error: null })));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'qa_user' } } })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signOut: vi.fn(async () => ({})),
    },
    from: vi.fn(() => ({
      insert: feedbackInsertMock,
    })),
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

const attachUserClub = (state: GameState, teamId = 't_31') => {
  const managerId = 'qa_human';
  const team = state.teams[teamId];
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
      currentTeamId: teamId,
      historyTeamIds: [],
    },
    achievements: [],
  };

  state.managers[managerId] = manager;
  state.teams[teamId].managerId = managerId;
  state.teams[teamId].squad = [];
  state.teams[teamId].lineup = {};
  state.teams[teamId].powerCap = 12000;
  state.userManagerId = managerId;
  state.userTeamId = teamId;
  state.isCreator = true;
  state.world.status = 'LOBBY';
  state.world.currentDay = 0;
};

const makeDraftWorld = () => {
  const state = generateInitialState();
  attachUserClub(state);
  return state;
};

const StateInjector = ({ state }: { state: GameState }) => {
  const { setState } = useGame();

  React.useEffect(() => {
    setState(state);
  }, [setState, state]);

  return null;
};

const renderDashboard = (state: GameState) => render(
  <GameProvider>
    <StateInjector state={state} />
    <Dashboard />
  </GameProvider>
);

describe('Dashboard click smoke', () => {
  it('lets the player move from Home to Draft, World and back without dead UI', async () => {
    const user = userEvent.setup();
    renderDashboard(makeDraftWorld());

    expect(await screen.findByText(/Monte seu elenco inicial/i)).toBeInTheDocument();

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByRole('button', { name: /Elenco/i }));
    expect(await screen.findByRole('heading', { name: /DRAFT\s+GENESIS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar Draft/i })).toBeInTheDocument();
    expect(screen.getByText(/Mercado de Draft/i)).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /Mundo/i }));
    expect(await screen.findByText(/Not/i)).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /Home/i }));
    expect(await screen.findByText(/Monte seu elenco inicial/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir Draft/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reportar problema/i }));
    expect(await screen.findByText(/Reportar problema/i)).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/O que aconteceu/i), 'Fluxo de teste abriu corretamente.');
    await user.click(screen.getByRole('button', { name: /Enviar/i }));
    expect(feedbackInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      current_tab: 'home',
      category: 'bug',
      message: 'Fluxo de teste abriu corretamente.'
    }));
  }, 10000);
});
