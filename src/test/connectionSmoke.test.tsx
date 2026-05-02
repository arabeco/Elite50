import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateInitialState } from '../engine/generator';
import { loadGameState as loadLocalGameState, saveGameState as saveLocalGameState } from '../engine/persistence';
import { GameProvider, useGame } from '../store/GameContext';
import { GameState } from '../types';

const getSessionMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const onAuthStateChangeMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn(async () => ({})));
const listUserWorldsMock = vi.hoisted(() => vi.fn(async () => []));
const listPublicWorldsMock = vi.hoisted(() => vi.fn(async () => []));
const loadRemoteGameStateMock = vi.hoisted(() => vi.fn(async () => null));
const saveRemoteGameStateMock = vi.hoisted(() => vi.fn(async () => null));
const subscribeToWorldMock = vi.hoisted(() => vi.fn());
const unsubscribeFromWorldMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      getUser: getUserMock,
      onAuthStateChange: onAuthStateChangeMock,
      signOut: signOutMock,
    },
  },
  saveGameState: saveRemoteGameStateMock,
  loadGameState: loadRemoteGameStateMock,
  listUserWorlds: listUserWorldsMock,
  listPublicWorlds: listPublicWorldsMock,
  deleteWorld: vi.fn(async () => true),
  joinSharedWorld: vi.fn(async () => null),
  joinWorldByCode: vi.fn(async () => null),
  subscribeToWorld: subscribeToWorldMock,
  unsubscribeFromWorld: unsubscribeFromWorldMock,
  claimTeamInWorld: vi.fn(async () => null),
  resignFromTeamInWorld: vi.fn(async () => null),
}));

const sessionlessAuth = () => {
  getSessionMock.mockResolvedValue({ data: { session: null } });
  getUserMock.mockResolvedValue({ data: { user: null } });
  onAuthStateChangeMock.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  });
};

const authenticatedSession = (userId = 'qa_user', email = 'qa@elite50.local') => {
  const session = {
    user: {
      id: userId,
      email,
    },
  };

  getSessionMock.mockResolvedValue({ data: { session } });
  getUserMock.mockResolvedValue({ data: { user: session.user } });
  onAuthStateChangeMock.mockReturnValue({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  });
};

const StateProbe = ({ autoLoadFirstWorld = false }: { autoLoadFirstWorld?: boolean }) => {
  const { state, worlds, isOnline, loadGame, logout, isAuthenticated, saveGame, setState, setWorldId } = useGame();

  React.useEffect(() => {
    if (!autoLoadFirstWorld) return;
    const targetWorld = worlds[0]?.id;
    if (targetWorld) {
      loadGame(targetWorld);
    }
  }, [autoLoadFirstWorld, loadGame, worlds]);

  const handleSave = async () => {
    const nextState = generateInitialState();
    nextState.world.name = 'Sync Probe';
    nextState.worldId = 'sync_probe_world';
    setState(nextState);
    setWorldId('sync_probe_world');
    await saveGame(nextState, 'sync_probe_world');
  };

  return (
    <div>
      <div data-testid="world-name">{state.world.name || 'sem-nome'}</div>
      <div data-testid="world-id">{state.worldId || 'sem-id'}</div>
      <div data-testid="world-count">{worlds.length}</div>
      <div data-testid="world-sync">{worlds[0]?.isLocalOnly === false ? 'synced' : worlds[0]?.isLocalOnly === true ? 'local' : 'unknown'}</div>
      <div data-testid="online">{String(isOnline)}</div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="is-creator">{String(state.isCreator === true)}</div>
      <div data-testid="user-team">{state.userTeamId || 'sem-time'}</div>
      <div data-testid="user-manager">{state.userManagerId || 'sem-manager'}</div>
      <button type="button" onClick={() => handleSave()}>save</button>
      <button type="button" onClick={() => logout()}>logout</button>
    </div>
  );
};

const createCachedWorld = (worldId: string, worldName: string): GameState => {
  const state = generateInitialState();
  state.world.name = worldName;
  state.worldId = worldId;
  return state;
};

describe('connection smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    sessionlessAuth();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('hydrates the latest local world when there is no session', async () => {
    const cached = createCachedWorld('offline_world', 'Offline Alpha');
    saveLocalGameState(cached, 'offline_world', 'qa_local');

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Offline Alpha');
      expect(screen.getByTestId('world-id')).toHaveTextContent('offline_world');
      expect(screen.getByTestId('world-count')).toHaveTextContent('1');
    });
  });

  it('falls back to local cache when remote load fails', async () => {
    const cached = createCachedWorld('fallback_world', 'Fallback Bravo');
    saveLocalGameState(cached, 'fallback_world', 'qa_local');
    loadRemoteGameStateMock.mockRejectedValueOnce(new Error('network down'));

    render(
      <GameProvider>
        <StateProbe autoLoadFirstWorld />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Fallback Bravo');
      expect(screen.getByTestId('world-id')).toHaveTextContent('fallback_world');
      expect(screen.getByTestId('online')).toHaveTextContent('false');
    });
  });

  it('restores the preferred world automatically when a session exists', async () => {
    authenticatedSession();
    const cached = createCachedWorld('remote_world', 'Remote Prime');
    saveLocalGameState(cached, 'remote_world', 'qa_user');
    listUserWorldsMock.mockResolvedValueOnce([
      { id: 'remote_world', name: 'Remote Prime', updatedAt: new Date().toISOString(), userId: 'qa_user' },
    ]);
    loadRemoteGameStateMock.mockResolvedValueOnce(cached);

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Remote Prime');
      expect(screen.getByTestId('world-id')).toHaveTextContent('remote_world');
      expect(screen.getByTestId('world-count')).toHaveTextContent('1');
      expect(screen.getByTestId('online')).toHaveTextContent('true');
    });
  });

  it('prefers the newer local cache when remote world metadata is older', async () => {
    authenticatedSession();
    const localState = createCachedWorld('priority_world', 'Local Newer');
    const remoteState = createCachedWorld('priority_world', 'Remote Older');

    saveLocalGameState(localState, 'priority_world', 'qa_user');
    listUserWorldsMock.mockResolvedValueOnce([
      { id: 'priority_world', name: 'Priority World', updatedAt: '2020-01-01T00:00:00.000Z', userId: 'qa_user' },
    ]);
    loadRemoteGameStateMock.mockResolvedValueOnce(remoteState);

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Local Newer');
      expect(screen.getByTestId('world-id')).toHaveTextContent('priority_world');
    });
  });

  it('keeps the local world available after logout', async () => {
    authenticatedSession();
    const cached = createCachedWorld('logout_world', 'Logout Echo');
    saveLocalGameState(cached, 'logout_world', 'qa_user');
    listUserWorldsMock.mockResolvedValueOnce([
      { id: 'logout_world', name: 'Logout Echo', updatedAt: new Date().toISOString(), userId: 'qa_user' },
    ]);
    loadRemoteGameStateMock.mockResolvedValueOnce(cached);

    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Logout Echo');
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
    });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Logout Echo');
      expect(screen.getByTestId('world-id')).toHaveTextContent('logout_world');
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('marks a world as synchronized after authenticated save', async () => {
    authenticatedSession();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveRemoteGameStateMock).toHaveBeenCalled();
      expect(screen.getByTestId('world-sync')).toHaveTextContent('synced');
      expect(screen.getByTestId('world-count')).toHaveTextContent('1');
    });
  });

  it('keeps a world local-only when authenticated remote save fails', async () => {
    authenticatedSession();
    saveRemoteGameStateMock.mockRejectedValueOnce(new Error('write failed'));
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveRemoteGameStateMock).toHaveBeenCalled();
      expect(screen.getByTestId('world-sync')).toHaveTextContent('local');
      expect(screen.getByTestId('online')).toHaveTextContent('false');
    });
  });

  it('survives save, refresh, logout fallback and login restore in one flow', async () => {
    authenticatedSession();
    const user = (await import('@testing-library/user-event')).default.setup();

    const firstRender = render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveRemoteGameStateMock).toHaveBeenCalled();
      expect(screen.getByTestId('world-sync')).toHaveTextContent('synced');
      expect(screen.getByTestId('world-id')).toHaveTextContent('sync_probe_world');
    });

    const savedState = loadLocalGameState('sync_probe_world');
    expect(savedState?.world.name).toBe('Sync Probe');
    firstRender.unmount();

    authenticatedSession();
    listUserWorldsMock.mockResolvedValue([
      { id: 'sync_probe_world', name: 'Sync Probe', updatedAt: new Date().toISOString(), userId: 'qa_user', isLocalOnly: false },
    ]);
    loadRemoteGameStateMock.mockResolvedValue(savedState);

    const secondRender = render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('world-name')).toHaveTextContent('Sync Probe');
      expect(screen.getByTestId('world-id')).toHaveTextContent('sync_probe_world');
    });

    await user.click(screen.getByRole('button', { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Sync Probe');
      expect(screen.getByTestId('world-id')).toHaveTextContent('sync_probe_world');
    });
    expect(signOutMock).toHaveBeenCalled();
    secondRender.unmount();

    authenticatedSession();
    listUserWorldsMock.mockResolvedValue([
      { id: 'sync_probe_world', name: 'Sync Probe', updatedAt: new Date().toISOString(), userId: 'qa_user', isLocalOnly: false },
    ]);
    loadRemoteGameStateMock.mockResolvedValue(savedState);

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth')).toHaveTextContent('true');
      expect(screen.getByTestId('world-name')).toHaveTextContent('Sync Probe');
      expect(screen.getByTestId('world-id')).toHaveTextContent('sync_probe_world');
      expect(screen.getByTestId('world-sync')).toHaveTextContent('synced');
    });
  });

  it('restores the same world with different creator and participant perspectives', async () => {
    const worldId = 'shared_world';
    const creatorState = createCachedWorld(worldId, 'Shared Arena');
    creatorState.isCreator = true;
    creatorState.userId = 'creator_user';
    creatorState.userTeamId = 't_1';
    creatorState.userManagerId = 'creator_user';

    const participantState = {
      ...creatorState,
      isCreator: false,
      userId: 'participant_user',
      userTeamId: 't_2',
      userManagerId: 'participant_user',
    } as GameState;

    saveLocalGameState(creatorState, worldId, 'creator_user', { isLocalOnly: false });

    authenticatedSession('creator_user', 'creator@elite50.local');
    listUserWorldsMock.mockResolvedValue([
      { id: worldId, name: 'Shared Arena', updatedAt: new Date().toISOString(), userId: 'creator_user', isLocalOnly: false },
    ]);
    loadRemoteGameStateMock.mockResolvedValueOnce(creatorState);

    const creatorRender = render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Shared Arena');
      expect(screen.getByTestId('world-id')).toHaveTextContent(worldId);
      expect(screen.getByTestId('is-creator')).toHaveTextContent('true');
      expect(screen.getByTestId('user-team')).toHaveTextContent('t_1');
      expect(screen.getByTestId('user-manager')).toHaveTextContent('creator_user');
    });
    creatorRender.unmount();

    authenticatedSession('participant_user', 'participant@elite50.local');
    listUserWorldsMock.mockResolvedValue([
      { id: worldId, name: 'Shared Arena', updatedAt: new Date().toISOString(), userId: 'participant_user', isLocalOnly: false },
    ]);
    loadRemoteGameStateMock.mockResolvedValueOnce(participantState);

    render(
      <GameProvider>
        <StateProbe />
      </GameProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('world-name')).toHaveTextContent('Shared Arena');
      expect(screen.getByTestId('world-id')).toHaveTextContent(worldId);
      expect(screen.getByTestId('is-creator')).toHaveTextContent('false');
      expect(screen.getByTestId('user-team')).toHaveTextContent('t_2');
      expect(screen.getByTestId('user-manager')).toHaveTextContent('participant_user');
      expect(screen.getByTestId('world-sync')).toHaveTextContent('synced');
    });
  });
});
