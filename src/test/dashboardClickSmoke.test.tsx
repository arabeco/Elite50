import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  it('leads from the World dot to unread news and clears it when marked read', async () => {
    const state = makeDraftWorld();
    state.notifications = [{id:'qa-news', title:'Aviso de teste', message:'Novo evento', date:state.world.currentDate, type:'info', read:false}];
    renderDashboard(state);
    const user = userEvent.setup();
    expect(screen.getByTestId('main-tab-world')).toHaveAttribute('data-attention', 'true');
    await user.click(screen.getByTestId('main-tab-world'));
    await user.click(await screen.findByRole('button', {name:/Notícias/}, {timeout:10000}));
    expect(screen.getByRole('img', {name:'Notícia não lida'})).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name:'Marcar como lidas'}));
    await waitFor(() => expect(screen.getByTestId('main-tab-world')).not.toHaveAttribute('data-attention'));
    expect(screen.queryByRole('img', {name:'Notícia não lida'})).not.toBeInTheDocument();
  });

  it('stops the draft attention dot once eleven athletes are planned', async () => {
    const state = makeDraftWorld();
    state.world.draftProposals = Object.values(state.players).slice(0, 11).map((p, i) => ({playerId:p.id, managerId:state.userManagerId!, teamId:state.userTeamId!, priority:i+1}));
    renderDashboard(state);
    await waitFor(() => expect(screen.getByTestId('main-tab-market')).toHaveAttribute('data-draft-open', 'true'));
    expect(screen.getByTestId('main-tab-market')).not.toHaveAttribute('data-attention');
  });

  it('highlights the open draft and opens it from the short Home action', async () => {
    renderDashboard(makeDraftWorld());
    expect(screen.getByTestId('main-tab-market')).toHaveAttribute('data-draft-open', 'true');
    expect(screen.getByTestId('main-tab-market')).toHaveAttribute('data-attention', 'true');
    expect(screen.getByTestId('main-tab-world')).not.toHaveAttribute('data-attention');
    await userEvent.setup().click(screen.getByTestId('main-tab-home'));
    await userEvent.setup().click(await screen.findByRole('button', {name: /Draft aberto.*Montar meu elenco/i}, {timeout: 10000}));
    expect(await screen.findByRole('heading', {name: /Draft Genesis/i})).toBeInTheDocument();
    expect(screen.getByTestId('main-tab-market')).toHaveAttribute('aria-current', 'page');
  });
  it('removes the draft invitation after the draft closes', () => {
    const state = makeDraftWorld(); state.world.currentDay = 3; state.world.status = 'ACTIVE';
    renderDashboard(state);
    expect(screen.getByTestId('main-tab-market')).not.toHaveAttribute('data-draft-open');
    expect(screen.queryByRole('button', {name: /Draft aberto.*Montar meu elenco/i})).not.toBeInTheDocument();
  });

  it('lets the player move from Home to Draft, World and back without dead UI', async () => {
    const user = userEvent.setup();
    const { container } = renderDashboard(makeDraftWorld());

    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByRole('button', { name: /Elenco/i }));

    const teamTabs = await waitFor(() => {
      const element = container.querySelector('[data-onboarding="team-mode-tabs"]');
      expect(element).toBeTruthy();
      return element as HTMLElement;
    });
    await user.click(within(teamTabs).getByRole('button', { name: /Draft/i }));

    expect(await screen.findByRole('heading', { name: /DRAFT\s+GENESIS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Respostas/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar Draft/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher/i })).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /Mundo/i }));
    expect(await screen.findByText(/Not/i)).toBeInTheDocument();

    const northLeagueButton = await screen.findByRole(
      'button',
      { name: /Ver Liga Norte/i },
      { timeout: 5000 }
    );
    await user.click(northLeagueButton);
    await waitFor(() => expect(northLeagueButton).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByText('NaN')).not.toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /Início/i }));
    expect(await screen.findByText(/Monte seu elenco inicial|Continue o Draft/i)).toBeInTheDocument();

    await user.click(within(nav).getByRole('button', { name: /Carreira/i }));
    await user.click(await screen.findByRole(
      'button',
      { name: /Temporadas/i },
      { timeout: 5000 }
    ));
    expect(await screen.findByText(/Campanha atual/i)).toBeInTheDocument();
    const settingsButton = await screen.findByRole(
      'button',
      { name: /Config/i },
      { timeout: 5000 }
    );
    await user.click(settingsButton);
    await user.click(screen.getByRole('button', { name: /Reportar problema/i }));
    expect(await screen.findByRole('heading', { name: /Reportar problema/i })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/O que aconteceu/i), 'Fluxo de teste abriu corretamente.');
    await user.click(screen.getByRole('button', { name: /Enviar/i }));
    expect(feedbackInsertMock).toHaveBeenCalledWith(expect.objectContaining({
      current_tab: 'career',
      category: 'bug',
      message: 'Fluxo de teste abriu corretamente.'
    }));
  }, 30000);

  it('lets a lobby participant choose Founder mode without becoming world creator', async () => {
    const user = userEvent.setup();
    const state = generateInitialState();
    state.isCreator = false;
    state.userId = 'joiner_user';
    state.userTeamId = null;
    state.userManagerId = null;
    state.world.status = 'LOBBY';
    state.world.currentDay = -1;

    renderDashboard(state);

    const founderButton = await screen.findByRole('button', { name: /O FUNDADOR/i });
    expect(founderButton).not.toBeDisabled();

    await user.click(founderButton);
    expect(await screen.findByText(/REGISTRO DE/i)).toBeInTheDocument();
  }, 15000);

  it('keeps the season recap closed until the player opens it from Home', async () => {
    const user = userEvent.setup();
    const state = generateInitialState();
    attachUserClub(state);
    state.world.status = 'ACTIVE';
    state.world.phase = 'OFFSEASON';
    state.world.currentDay = 22;
    state.world.districtCup.managerInvites = [];
    state.world.history = [];

    renderDashboard(state);

    expect(screen.queryByText(`Temporada ${state.world.currentSeason || 2050}`)).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByRole('button', { name: /Elenco/i }));
    await user.click(within(nav).getByRole('button', { name: /Início/i }));
    const recapButton = await screen.findByRole('button', { name: /Abrir recap/i }, { timeout: 10000 });

    await user.click(recapButton);
    expect(await screen.findByText(`Temporada ${state.world.currentSeason || 2050}`)).toBeInTheDocument();
  }, 25000);
});
