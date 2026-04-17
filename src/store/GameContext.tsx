import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback, useState } from 'react';
import { GameState } from '../types';
import { generateInitialState, getGameDate2050 } from '../engine/generator';
import { saveGameState, loadGameState, listUserWorlds, listPublicWorlds, supabase, deleteWorld as deleteWorldFromSupabase, joinSharedWorld, subscribeToWorld, unsubscribeFromWorld } from '../lib/supabase';
import { DEFAULT_TIME_SPEED } from '../constants/gameConstants';
import { advanceGameDay } from '../engine/gameLogic';

interface GameStateValue {
  state: GameState;
  isSyncing: boolean;
  isOnline: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  worldId: string | null;
  worlds: Array<{ id: string, name: string, updatedAt: string, userId: string }>;
  publicWorlds: Array<{ id: string, name: string, updatedAt: string, userId: string }>;
  toasts: Array<{ id: string, message: string, type: 'success' | 'error' | 'info' }>;
  isPaused: boolean;
  timeSpeed: number;
}

interface GameDispatchValue {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  saveGame: (newState?: GameState, worldIdOverride?: string) => Promise<void>;
  loadGame: (worldId?: string) => Promise<void>;
  joinGame: (worldId: string) => Promise<void>;
  setIsAuthenticated: (val: boolean) => void;
  setWorldId: (id: string | null) => void;
  logout: () => Promise<void>;
  leaveWorld: () => void;
  deleteWorld: (worldId: string) => Promise<void>;
  refreshWorlds: () => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  togglePause: () => void;
  setTimeSpeed: (speed: number) => void;
}

type GameContextType = GameStateValue & GameDispatchValue;

type GameAction =
  | { type: 'SET_STATE'; payload: GameState | ((prev: GameState) => GameState) }
  | { type: 'RESET_STATE' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_STATE':
      return typeof action.payload === 'function' ? action.payload(state) : action.payload;
    case 'RESET_STATE':
      return generateInitialState();
    default:
      return state;
  }
}

const GameStateContext = createContext<GameStateValue | undefined>(undefined);
const GameDispatchContext = createContext<GameDispatchValue | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, generateInitialState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [worlds, setWorlds] = useState<Array<{ id: string, name: string, updatedAt: string, userId: string }>>([]);
  const [publicWorlds, setPublicWorlds] = useState<Array<{ id: string, name: string, updatedAt: string, userId: string }>>([]);
  const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'info' }>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(DEFAULT_TIME_SPEED);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const setState = useCallback((payload: GameState | ((prev: GameState) => GameState)) => {
    dispatch({ type: 'SET_STATE', payload });
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured. Auth skipped.');
      setIsAuthenticated(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUserId(session?.user.id || null);
      if (hasSession) {
        refreshWorlds();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUserId(session?.user.id || null);
      if (hasSession) {
        refreshWorlds();
      } else {
        setWorldId(null);
        setWorlds([]);
        dispatch({ type: 'RESET_STATE' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshWorlds = async () => {
    const [userWorlds, otherWorlds] = await Promise.all([
      listUserWorlds(),
      listPublicWorlds()
    ]);
    setWorlds(userWorlds);
    setPublicWorlds(otherWorlds);
  };

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const saveGame = useCallback(async (newState?: GameState, worldIdOverride?: string) => {
    const targetWorldId = worldIdOverride || worldId;
    if (!targetWorldId) return;
    setIsSyncing(true);
    try {
      const stateToSave = newState || state;
      console.log('GM: Persistindo estado no Supabase...', {
        world_id: targetWorldId,
        currentDate: stateToSave.world.currentDate,
        matchesCount: Object.values(stateToSave.world.leagues).reduce((acc, l: any) => acc + (l.matches?.length || 0), 0)
      });
      await saveGameState(stateToSave, targetWorldId);
      console.log('Game saved successfully');
      setIsOnline(true);
      // Only show toast if it's a manual save or a major event
      if (newState) addToast('Jogo salvo automaticamente', 'success');
    } catch (error) {
      console.error('Failed to save game', error);
      setIsOnline(false);
      addToast('Erro ao salvar progresso', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [worldId, state, addToast]);

  const joinGame = useCallback(async (targetWorldId: string) => {
    setIsSyncing(true);
    try {
      const joinedState = await joinSharedWorld(targetWorldId);
      if (joinedState) {
        setIsInitialLoad(true);
        setState(joinedState);
        setWorldId(targetWorldId);
        addToast('Você entrou em um mundo compartilhado!', 'success');
      }
    } catch (error) {
      console.error('Failed to join game', error);
      addToast('Erro ao entrar no mundo', 'error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [setState, addToast]);

  const loadGame = useCallback(async (targetWorldId?: string) => {
    const idToLoad = targetWorldId || worldId;
    if (!idToLoad) return;

    setIsSyncing(true);
    try {
      const loadedState = await loadGameState(idToLoad);
      if (loadedState) {
        // Deep comparison to avoid unnecessary state updates and potential world regeneration
        // We compare critical parts of the state: world clock/status and key counts
        const hasSubstantialChanges = (
          loadedState.world.currentDate !== state.world.currentDate ||
          loadedState.world.status !== state.world.status ||
          Object.keys(loadedState.teams).length !== Object.keys(state.teams).length ||
          Object.keys(loadedState.players).length !== Object.keys(state.players).length
        );

        if (!hasSubstantialChanges && !targetWorldId) {
          console.log('GameContext: Loaded state matches local state, skipping update.');
          return;
        }

        // Migration for legacy saves missing training state
        if (!loadedState.training) {
          console.log('GameContext: Legacy save missing training state, patching...');
          loadedState.training = {
            chemistryBoostLastUsed: undefined,
            playstyleTraining: {
              currentStyle: null,
              understanding: {
                'Blitzkrieg': 0,
                'Tiki-Taka': 0,
                'Retranca Armada': 0,
                'Motor Lento': 0,
                'Equilibrado': 20,
                'Gegenpressing': 0,
                'Catenaccio': 0,
                'Vertical': 0
              }
            },
            cardLaboratory: {
              slots: [
                { cardId: null, finishTime: null },
                { cardId: null, finishTime: null }
              ]
            },
            individualFocus: {
              evolutionSlot: null,
              stabilizationSlot: null
            }
          };
        }

        // Ensure playstyleTraining exists
        if (!loadedState.training.playstyleTraining) {
          loadedState.training.playstyleTraining = {
            currentStyle: null,
            understanding: {
              'Blitzkrieg': 0,
              'Tiki-Taka': 0,
              'Retranca Armada': 0,
              'Motor Lento': 0,
              'Equilibrado': 20,
              'Gegenpressing': 0,
              'Catenaccio': 0,
              'Vertical': 0
            }
          };
        }

        // Ensure cardLaboratory exists
        if (!loadedState.training.cardLaboratory) {
          loadedState.training.cardLaboratory = {
            slots: [
              { cardId: null, finishTime: null },
              { cardId: null, finishTime: null }
            ]
          };
        }

        // Ensure individualFocus exists
        if (!loadedState.training.individualFocus) {
          loadedState.training.individualFocus = {
            evolutionSlot: null,
            stabilizationSlot: null
          };
        }

        setIsInitialLoad(true);
        setState(loadedState);
        setWorldId(idToLoad);
        console.log('Game loaded successfully');
        setIsOnline(true);
        addToast('Mundo carregado com sucesso', 'success');
      }
    } catch (error) {
      console.error('Failed to load game', error);
      setIsOnline(false);
      addToast('Erro ao carregar mundo', 'error');
    } finally {
      setIsSyncing(false);
      // Small delay to prevent immediate auto-save on load
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [worldId, setState, addToast]);

  // Auto-save logic
  useEffect(() => {
    if (isInitialLoad || !worldId) return;

    // We only want to auto-save when "static" state changes (lineup, tactics, etc.)
    // OR periodically if the clock is running.
    // To avoid resetting the timer on every clock tick (every second), 
    // we use a deep comparison or just a separate periodic timer.

    const timer = setTimeout(() => {
      console.log('GameContext: Auto-save triggered by state change...');
      saveGame();
    }, 5000); // Reduced to 5s for better responsiveness during testing

    return () => clearTimeout(timer);
  }, [
    state.teams,
    state.players,
    state.managers,
    state.userTeamId,
    state.notifications,
    state.lastHeadline,
    state.training,
    worldId,
    isInitialLoad,
    saveGame
  ]);

  // Separate periodic save for world state (currentDate, leagues/matches)
  useEffect(() => {
    if (isInitialLoad || !worldId || isPaused) return;

    const periodicTimer = setInterval(() => {
      saveGame();
    }, 60000); // Save every minute while playing

    return () => clearInterval(periodicTimer);
  }, [worldId, isInitialLoad, isPaused, saveGame]);

  // Real-time Clock Logic
  useEffect(() => {
    if (isPaused || isInitialLoad || !worldId) return;

    // --- REALTIME SYNC (CHANNELS) ---
    // Listen for world updates instead of polling
    if (!state.isCreator) {
      subscribeToWorld(worldId, async () => {
        try {
          const loaded = await loadGameState(worldId);
          if (loaded && (
            loaded.world.currentDate !== state.world.currentDate ||
            loaded.world.status !== state.world.status ||
            Object.keys(loaded.teams).length !== Object.keys(state.teams).length
          )) {
            console.log('GameContext: World state updated by creator via Realtime, refreshing local state.');
            setState(loaded);
          }
        } catch (e) {
          console.error('Realtime sync error:', e);
        }
      });
    }

    // --- Main Clock (1s interval) ---
    const interval = setInterval(() => {
      setState(prev => {
        // LOBBY LOCK: Don't advance time while in LOBBY
        if (prev.world.status === 'LOBBY') return prev;

        // Only the world creator drives the clock
        if (!prev.isCreator) return prev;

        // --- Map real time to 2050 game world ---
        const gameNow = getGameDate2050();
        const oldDate = new Date(prev.world.currentDate);
        const oldDay = oldDate.getDate();
        const newDay = gameNow.getDate();

        // Ensure seasonStartReal exists
        let seasonStartReal = prev.world.seasonStartReal;
        if (!seasonStartReal) {
          const nextDay = new Date(gameNow);
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(0, 0, 0, 0);
          seasonStartReal = nextDay.toISOString();
        }

        // Update currentDate to 2050 game-world time
        let newState = {
          ...prev,
          world: {
            ...prev.world,
            currentDate: gameNow.toISOString(),
            seasonStartReal: seasonStartReal
          }
        };

        // --- Day Change Logic ---
        // When the real day changes, run advanceGameDay which handles:
        // - Match simulation for the current round
        // - Player evolution
        // - Training progress
        // - Safety net checks
        // - Cup progression
        if (oldDay !== newDay) {
          console.log('Clock: Day changed, running daily advance...');
          return advanceGameDay(newState, true);
        }

        return newState;
      });
    }, 1000);

    return () => {
      if (!state.isCreator) {
        unsubscribeFromWorld(worldId);
      }
      clearInterval(interval);
    };
  }, [isPaused, isInitialLoad, worldId, setState, state.isCreator, state.world.currentDate, state.world.status, state.teams]);

  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserId(null);
      setWorldId(null);
      setWorlds([]);
      dispatch({ type: 'RESET_STATE' });
      addToast('Sistema desconectado', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      addToast('Erro ao sair do sistema', 'error');
    }
  }, [addToast]);

  const leaveWorld = useCallback(() => {
    setWorldId(null);
    dispatch({ type: 'RESET_STATE' });
    addToast('Saindo do mundo...', 'info');
  }, [addToast]);

  const deleteWorld = useCallback(async (id: string) => {
    try {
      const success = await deleteWorldFromSupabase(id);
      if (success) {
        addToast('Mundo deletado com sucesso', 'success');
        await refreshWorlds();
      } else {
        addToast('Erro ao deletar mundo', 'error');
      }
    } catch (error) {
      console.error('Delete world error:', error);
      addToast('Erro ao deletar mundo', 'error');
    }
  }, [addToast]);

  const stateValue = useMemo(() => ({
    state, isSyncing, isOnline, isAuthenticated, userId, worldId, worlds, publicWorlds, toasts, isPaused, timeSpeed
  }), [state, isSyncing, isOnline, isAuthenticated, userId, worldId, worlds, publicWorlds, toasts, isPaused, timeSpeed]);

  const dispatchValue = useMemo(() => ({
    setState, saveGame,
    loadGame,
    joinGame,
    setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, togglePause, setTimeSpeed
  }), [setState, saveGame, loadGame, setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, togglePause, setTimeSpeed]);

  return (
    <GameDispatchContext.Provider value={dispatchValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
      </GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) throw new Error('useGameState must be used within a GameProvider');
  return context;
};

export const useGameDispatch = () => {
  const context = useContext(GameDispatchContext);
  if (!context) throw new Error('useGameDispatch must be used within a GameProvider');
  return context;
};

// Legacy hook for compatibility
export const useGame = (): GameContextType => {
  const stateCtx = useContext(GameStateContext);
  const dispatchCtx = useContext(GameDispatchContext);
  if (!stateCtx || !dispatchCtx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return { ...stateCtx, ...dispatchCtx };
};
