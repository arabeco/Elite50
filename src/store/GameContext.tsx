import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback, useRef, useState } from 'react';
import { GameState } from '../types';
import { generateInitialState, getGameDate2050 } from '../engine/generator';
import { saveGameState, loadGameState, listUserWorlds, listPublicWorlds, supabase, deleteWorld as deleteWorldFromSupabase, joinSharedWorld, joinWorldByCode as joinWorldByCodeFromSupabase, subscribeToWorld, unsubscribeFromWorld, claimTeamInWorld, resignFromTeamInWorld } from '../lib/supabase';
import { deleteSavedState as deleteLocalWorldState, getLastSavedWorldId, listSavedWorlds, loadGameState as loadLocalGameState, loadStoredWorldEnvelope, saveGameState as saveLocalGameState } from '../engine/persistence';
import { DEFAULT_TIME_SPEED } from '../constants/gameConstants';
import { advanceGameDay, isJoinWindowOpen } from '../engine/gameLogic';
import { addNews } from '../engine/newsService';

interface GameStateValue {
  state: GameState;
  isSyncing: boolean;
  isOnline: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  worldId: string | null;
  worlds: Array<{ id: string, name: string, updatedAt: string, userId: string, isLocalOnly?: boolean }>;
  publicWorlds: Array<{ id: string, name: string, updatedAt: string, userId: string }>;
  toasts: Array<{ id: string, message: string, type: 'success' | 'error' | 'info' | 'warning' }>;
  isPaused: boolean;
}

interface GameDispatchValue {
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  saveGame: (newState?: GameState, worldIdOverride?: string) => Promise<void>;
  loadGame: (worldId?: string) => Promise<void>;
  joinGame: (worldId: string) => Promise<void>;
  joinGameByCode: (joinCode: string) => Promise<void>;
  claimTeam: (teamId: string, managerName?: string) => Promise<void>;
  submitClubApplication: (teamId: string, managerName?: string) => Promise<void>;
  respondToClubOffer: (offerId: string, accept: boolean, managerName?: string) => Promise<void>;
  resignFromTeam: () => Promise<void>;
  setIsAuthenticated: (val: boolean) => void;
  setWorldId: (id: string | null) => void;
  logout: () => Promise<void>;
  leaveWorld: () => void;
  deleteWorld: (worldId: string) => Promise<void>;
  refreshWorlds: () => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  togglePause: () => void;
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
  const [worlds, setWorlds] = useState<Array<{ id: string, name: string, updatedAt: string, userId: string, isLocalOnly?: boolean }>>([]);
  const [publicWorlds, setPublicWorlds] = useState<Array<{ id: string, name: string, updatedAt: string, userId: string }>>([]);
  const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpeed, setTimeSpeedState] = useState(DEFAULT_TIME_SPEED);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasAttemptedSessionRestoreRef = useRef(false);
  const timeAnchorRef = useRef<{
    realTimeMs: number;
    gameTimeMs: number;
    speed: number;
    lastWorldDateMs: number;
  } | null>(null);

  const setState = useCallback((payload: GameState | ((prev: GameState) => GameState)) => {
    dispatch({ type: 'SET_STATE', payload });
  }, []);

  const applyLocalHydration = useCallback((targetWorldId?: string) => {
    const cachedState = loadLocalGameState(targetWorldId);
    if (!cachedState) return false;

    const resolvedWorldId = targetWorldId || cachedState.worldId || getLastSavedWorldId();
    setIsInitialLoad(true);
    setState(cachedState);
    if (resolvedWorldId) {
      setWorldId(resolvedWorldId);
    }
    setIsOnline(false);
    setTimeout(() => setIsInitialLoad(false), 300);
    return true;
  }, [setState]);

  useEffect(() => {
    const nextSpeed = state.world.clock?.timeSpeed ?? DEFAULT_TIME_SPEED;
    timeAnchorRef.current = null;
    setTimeSpeedState(prev => prev === nextSpeed ? prev : nextSpeed);
  }, [state.world.clock?.timeSpeed]);

  const getAcceleratedGameDate = useCallback((currentDate?: string) => {
    const nowMs = Date.now();
    const fallbackGameDate = getGameDate2050();
    const parsedCurrentDate = currentDate ? new Date(currentDate) : fallbackGameDate;
    const currentGameMs = Number.isFinite(parsedCurrentDate.getTime())
      ? parsedCurrentDate.getTime()
      : fallbackGameDate.getTime();
    const anchor = timeAnchorRef.current;
    const externalDateJump = anchor && Math.abs(currentGameMs - anchor.lastWorldDateMs) > 10 * 60 * 1000;

    if (!anchor || anchor.speed !== timeSpeed || externalDateJump) {
      timeAnchorRef.current = {
        realTimeMs: nowMs,
        gameTimeMs: currentGameMs,
        speed: timeSpeed,
        lastWorldDateMs: currentGameMs,
      };
      return new Date(currentGameMs);
    }

    const elapsedRealSeconds = (nowMs - anchor.realTimeMs) / 1000;
    const acceleratedGameMs = anchor.gameTimeMs + elapsedRealSeconds * anchor.speed * 60 * 1000;
    anchor.lastWorldDateMs = acceleratedGameMs;

    return new Date(acceleratedGameMs);
  }, [timeSpeed]);

  // Listen for auth changes
  const refreshWorlds = useCallback(async (forceRemote = false) => {
    const localWorlds = listSavedWorlds();

    if (!forceRemote && !isAuthenticated) {
      setWorlds(localWorlds);
      setPublicWorlds([]);
      return;
    }

    const [userWorlds, otherWorlds] = await Promise.all([
      listUserWorlds(),
      listPublicWorlds()
    ]);

    const mergedWorlds = [
      ...userWorlds,
      ...localWorlds.filter(localWorld => !userWorlds.some(remoteWorld => remoteWorld.id === localWorld.id)),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    setWorlds(mergedWorlds);
    setPublicWorlds(otherWorlds);
  }, [isAuthenticated]);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured. Auth skipped.');
      setIsAuthenticated(false);
      const cachedWorlds = listSavedWorlds();
      setWorlds(cachedWorlds);
      applyLocalHydration();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUserId(session?.user.id || null);
      if (hasSession) {
        refreshWorlds(true);
      } else {
        const cachedWorlds = listSavedWorlds();
        setWorlds(cachedWorlds);
        applyLocalHydration();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasSession = !!session;
      setIsAuthenticated(hasSession);
      setUserId(session?.user.id || null);
      if (hasSession) {
        hasAttemptedSessionRestoreRef.current = false;
        refreshWorlds(true);
      } else {
        hasAttemptedSessionRestoreRef.current = false;
        setWorldId(null);
        setWorlds(listSavedWorlds());
        if (!applyLocalHydration()) {
          dispatch({ type: 'RESET_STATE' });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [applyLocalHydration, refreshWorlds]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const buildUserManager = useCallback((managerId: string, displayName: string, district: any, teamId: string | null) => ({
    id: managerId,
    name: displayName,
    district,
    reputation: 50,
    isNPC: false,
    attributes: {
      evolution: 50,
      negotiation: 50,
      scout: 50
    },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: teamId,
      historyTeamIds: teamId ? [teamId] : []
    },
    achievements: []
  }), []);

  const saveGame = useCallback(async (newState?: GameState, worldIdOverride?: string) => {
    const targetWorldId = worldIdOverride || worldId;
    if (!targetWorldId) return;
    const stateToSave = newState || state;
    saveLocalGameState(stateToSave, targetWorldId, userId || 'local', {
      isLocalOnly: true
    });
    setWorlds(listSavedWorlds());
    setIsSyncing(true);
    try {
      console.log('GM: Persistindo estado no Supabase...', {
        world_id: targetWorldId,
        currentDate: stateToSave.world.currentDate,
        matchesCount: Object.values(stateToSave.world.leagues).reduce((acc, l: any) => acc + (l.matches?.length || 0), 0)
      });
      await saveGameState(stateToSave, targetWorldId);
      saveLocalGameState(stateToSave, targetWorldId, userId || 'local', {
        isLocalOnly: false
      });
      setWorlds(listSavedWorlds());
      console.log('Game saved successfully');
      setIsOnline(true);
    } catch (error) {
      console.error('Failed to save game', error);
      setWorlds(listSavedWorlds());
      setIsOnline(false);
      addToast('Erro ao salvar progresso', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [worldId, state, addToast, isAuthenticated, userId]);

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

  const joinGameByCode = useCallback(async (joinCode: string) => {
    setIsSyncing(true);
    try {
      const joinedState = await joinWorldByCodeFromSupabase(joinCode);
      if (joinedState?.worldId) {
        setIsInitialLoad(true);
        setState(joinedState);
        setWorldId(joinedState.worldId);
        await refreshWorlds();
        addToast('Codigo aceito. Voce entrou como observador.', 'success');
      } else {
        addToast('Codigo de mundo invalido', 'error');
      }
    } catch (error: any) {
      console.error('Failed to join by code', error);
      addToast('Codigo de mundo invalido ou indisponivel', 'error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [setState, addToast]);

  const claimTeam = useCallback(async (teamId: string, managerName?: string) => {
    if (!worldId) {
      addToast('Entre em um mundo antes de assumir um clube', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const claimedState = await claimTeamInWorld(worldId, teamId, managerName);
      if (claimedState) {
        setIsInitialLoad(true);
        setState(claimedState);
        addToast('Clube assumido. Agora voce esta dentro da temporada.', 'success');
        await refreshWorlds();
      } else {
        addToast('Nao foi possivel assumir este clube', 'error');
      }
    } catch (error: any) {
      console.error('Failed to claim team', error);
      const message = error?.message === 'TEAM_ALREADY_CLAIMED'
        ? 'Esse clube ja foi assumido por outro humano'
        : 'Erro ao assumir clube';
      addToast(message, 'error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [worldId, setState, addToast]);

  const submitClubApplication = useCallback(async (teamId: string, managerName?: string) => {
    if (!worldId || !userId) {
      addToast('Entre em um mundo antes de negociar com um clube', 'warning');
      return;
    }

    const team = state.teams[teamId];
    if (!team || !team.id.startsWith('t_')) {
      addToast('Clube indisponivel para proposta.', 'error');
      return;
    }

    const activeOffers = state.world.clubOffers || [];
    const alreadyOpen = activeOffers.some(offer =>
      offer.targetUserId === userId &&
      offer.teamId === teamId &&
      (offer.status === 'PENDING' || offer.status === 'ACCEPTED' || offer.status === 'WAITING_NEXT_SEASON')
    );

    if (alreadyOpen) {
      addToast('Ja existe uma negociacao aberta com esse clube.', 'info');
      return;
    }

    const teamManager = team.managerId ? state.managers[team.managerId] : null;
    if (teamManager && teamManager.isNPC === false) {
      addToast('Esse clube esta sob comando humano.', 'warning');
      return;
    }

    const existingManagerName = state.userManagerId ? state.managers[state.userManagerId]?.name : null;
    const managerLabel = managerName?.trim() || existingManagerName || 'Manager Elite';
    const joinOpen = isJoinWindowOpen(state);

    const nextState = JSON.parse(JSON.stringify(state)) as GameState;
    nextState.world.clubOffers = nextState.world.clubOffers || [];
    nextState.world.clubOffers.unshift({
      id: `application_${Date.now()}_${teamId}`,
      teamId,
      targetUserId: userId,
      managerId: nextState.userManagerId || null,
      managerName: managerLabel,
      source: 'APPLICATION',
      status: joinOpen ? 'PENDING' : 'WAITING_NEXT_SEASON',
      createdAt: nextState.world.currentDate,
      availableOnDay: joinOpen ? (nextState.world.currentDay || 0) + 1 : -1,
      note: joinOpen
        ? 'Pedido enviado. Resposta prevista para o proximo dia.'
        : 'Voce entrou na fila da proxima temporada.'
    });
    nextState.notifications.unshift({
      id: `notify_application_${Date.now()}`,
      date: nextState.world.currentDate,
      title: joinOpen ? 'Proposta enviada' : 'Fila aberta',
      message: joinOpen
        ? `Seu staff entrou em contato com ${team.name}. A resposta so sai a partir do proximo dia.`
        : `${team.name} ficou marcado como destino desejado para a proxima temporada.`,
      type: 'info',
      read: false
    });
    addNews(
      nextState,
      joinOpen ? 'TECNICO SE COLOCOU NO MERCADO' : 'FILA DA PROXIMA TEMPORADA',
      joinOpen
        ? `${managerLabel} enviou proposta para ${team.name} e agora aguarda a resposta no timing do mundo.`
        : `${managerLabel} marcou ${team.name} como destino desejado para a proxima temporada.`,
      'SYSTEM',
      1,
      {
        kind: 'TEAM_PROFILE',
        season: nextState.world.currentSeason || 2050,
        teamId: team.id
      }
    );

    setState(nextState);
    await saveGame(nextState);
    addToast(
      joinOpen
        ? 'Proposta enviada. Nada de entrada instantanea.'
        : 'Janela fechada. Seu nome entrou na fila da proxima temporada.',
      'success'
    );
  }, [addToast, saveGame, setState, state, userId, worldId]);

  const respondToClubOffer = useCallback(async (offerId: string, accept: boolean, managerName?: string) => {
    if (!worldId || !userId) {
      addToast('Entre em um mundo antes de responder propostas.', 'warning');
      return;
    }

    const offer = (state.world.clubOffers || []).find(item => item.id === offerId && item.targetUserId === userId);
    if (!offer) {
      addToast('Proposta nao encontrada.', 'error');
      return;
    }

    const nextState = JSON.parse(JSON.stringify(state)) as GameState;
    const targetOffer = (nextState.world.clubOffers || []).find(item => item.id === offerId);
    if (!targetOffer) return;

    if (!accept) {
      targetOffer.status = 'REJECTED';
      targetOffer.respondedAt = nextState.world.currentDate;
      targetOffer.note = 'Voce recusou a proposta.';
      addNews(
        nextState,
        'PROPOSTA RECUSADA',
        `${nextState.managers[nextState.userManagerId || userId]?.name || 'O tecnico'} recusou a conversa com ${nextState.teams[targetOffer.teamId]?.name || 'o clube'}.`,
        'SYSTEM',
        1,
        {
          kind: 'TEAM_PROFILE',
          season: nextState.world.currentSeason || 2050,
          teamId: targetOffer.teamId
        }
      );
      setState(nextState);
      await saveGame(nextState);
      addToast('Proposta recusada.', 'info');
      return;
    }

    if (targetOffer.status !== 'ACCEPTED') {
      addToast('Essa proposta ainda nao pode ser assinada.', 'warning');
      return;
    }

    if ((nextState.world.currentDay || 0) < targetOffer.availableOnDay) {
      addToast('Assinatura liberada so no proximo dia.', 'warning');
      return;
    }

    if (!isJoinWindowOpen(nextState)) {
      addToast('A janela de entrada foi encerrada.', 'warning');
      return;
    }

    const team = nextState.teams[targetOffer.teamId];
    if (!team) {
      addToast('Esse clube nao esta mais disponivel.', 'error');
      return;
    }

    const currentTeamManager = team.managerId ? nextState.managers[team.managerId] : null;
    if (currentTeamManager && currentTeamManager.isNPC === false && team.managerId !== nextState.userManagerId) {
      targetOffer.status = 'EXPIRED';
      targetOffer.respondedAt = nextState.world.currentDate;
      targetOffer.note = 'O clube ficou indisponivel.';
      setState(nextState);
      await saveGame(nextState);
      addToast('O clube ficou indisponivel.', 'warning');
      return;
    }

    const managerId = nextState.userManagerId || userId;
    const displayName =
      managerName?.trim() ||
      nextState.managers[managerId]?.name ||
      targetOffer.managerName ||
      'Manager Elite';

    if (!nextState.managers[managerId]) {
      nextState.managers[managerId] = buildUserManager(managerId, displayName, team.district, team.id) as any;
    }

    if (team.managerId && nextState.managers[team.managerId]) {
      nextState.managers[team.managerId] = {
        ...nextState.managers[team.managerId],
        career: {
          ...nextState.managers[team.managerId].career,
          currentTeamId: null
        }
      };
    }

    nextState.managers[managerId] = {
      ...nextState.managers[managerId],
      name: displayName,
      district: team.district,
      isNPC: false,
      career: {
        ...nextState.managers[managerId].career,
        currentTeamId: team.id,
        historyTeamIds: Array.from(new Set([...(nextState.managers[managerId].career.historyTeamIds || []), team.id]))
      }
    };

    nextState.teams[team.id] = {
      ...team,
      managerId
    };
    nextState.userManagerId = managerId;
    nextState.userTeamId = team.id;
    targetOffer.status = 'SIGNED';
    targetOffer.respondedAt = nextState.world.currentDate;
    targetOffer.note = 'Contrato assinado.';

    (nextState.world.clubOffers || []).forEach(item => {
      if (item.id !== targetOffer.id && item.targetUserId === userId && (item.status === 'PENDING' || item.status === 'ACCEPTED')) {
        item.status = 'EXPIRED';
        item.respondedAt = nextState.world.currentDate;
        item.note = 'Outra assinatura foi concluida.';
      }
    });

    nextState.notifications.unshift({
      id: `notify_sign_${Date.now()}`,
      date: nextState.world.currentDate,
      title: 'Contrato assinado',
      message: `${team.name} agora esta sob seu comando.`,
      type: 'success',
      read: false
    });
    addNews(
      nextState,
      'NOVO TECNICO NO COMANDO',
      `${displayName} assumiu o ${team.name}. O clube segue com a base atual e entra em nova fase.`,
      'SYSTEM',
      2,
      {
        kind: 'TEAM_PROFILE',
        season: nextState.world.currentSeason || 2050,
        teamId: team.id
      }
    );

    setState(nextState);
    await saveGame(nextState);
    addToast(`Contrato assinado com ${team.name}.`, 'success');
  }, [addToast, buildUserManager, saveGame, setState, state, userId, worldId]);

  const resignFromTeam = useCallback(async () => {
    if (!worldId) {
      addToast('Entre em um mundo antes de sair do clube', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const resignedState = await resignFromTeamInWorld(worldId);
      if (resignedState) {
        setIsInitialLoad(true);
        setState(resignedState);
        addToast('Voce saiu do clube e agora acompanha o mundo como observador.', 'info');
        await refreshWorlds();
      } else {
        addToast('Nao foi possivel sair do clube', 'error');
      }
    } catch (error) {
      console.error('Failed to resign from team', error);
      addToast('Erro ao sair do clube', 'error');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [worldId, setState, addToast]);

  const loadGame = useCallback(async (targetWorldId?: string) => {
    const idToLoad = targetWorldId || worldId;
    if (!idToLoad) return;

    setIsSyncing(true);
    try {
      const loadedState = await loadGameState(idToLoad);
      const localEnvelope = loadStoredWorldEnvelope(idToLoad);
      const remoteWorldSummary = worlds.find(world => world.id === idToLoad) || null;
      const shouldPreferLocalCache = !!(
        localEnvelope &&
        (!remoteWorldSummary ||
          new Date(localEnvelope.updatedAt).getTime() > new Date(remoteWorldSummary.updatedAt).getTime())
      );
      const preferredState = shouldPreferLocalCache ? localEnvelope?.state || null : loadedState;

      if (preferredState) {
        // Deep comparison to avoid unnecessary state updates and potential world regeneration
        // We compare critical parts of the state: world clock/status and key counts
        const hasSubstantialChanges = (
            preferredState.world.currentDate !== state.world.currentDate ||
            preferredState.world.status !== state.world.status ||
            Object.keys(preferredState.teams).length !== Object.keys(state.teams).length ||
            Object.keys(preferredState.players).length !== Object.keys(state.players).length
          );

          if (!hasSubstantialChanges && !targetWorldId) {
            console.log('GameContext: Loaded state matches local state, skipping update.');
            return;
          }

          // Migration for legacy saves missing training state
          if (!preferredState.training) {
            console.log('GameContext: Legacy save missing training state, patching...');
            preferredState.training = {
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
          if (!preferredState.training.playstyleTraining) {
            preferredState.training.playstyleTraining = {
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
          if (!preferredState.training.cardLaboratory) {
            preferredState.training.cardLaboratory = {
              slots: [
                { cardId: null, finishTime: null },
                { cardId: null, finishTime: null }
            ]
          };
          }

          // Ensure individualFocus exists
          if (!preferredState.training.individualFocus) {
            preferredState.training.individualFocus = {
              evolutionSlot: null,
              stabilizationSlot: null
            };
          }

          setIsInitialLoad(true);
          setState(preferredState);
          setWorldId(idToLoad);
          console.log('Game loaded successfully');
          setIsOnline(true);
          addToast(
            shouldPreferLocalCache
              ? 'Cache local mais recente restaurado'
              : 'Mundo carregado com sucesso',
            shouldPreferLocalCache ? 'info' : 'success'
          );
        } else if (applyLocalHydration(idToLoad)) {
          addToast('Mundo carregado do cache local', 'info');
        } else {
        addToast('Nenhum save encontrado para este mundo', 'error');
      }
    } catch (error) {
      console.error('Failed to load game', error);
      if (applyLocalHydration(idToLoad)) {
        addToast('Supabase indisponivel. Cache local restaurado.', 'warning');
      } else {
        setIsOnline(false);
        addToast('Erro ao carregar mundo', 'error');
      }
    } finally {
      setIsSyncing(false);
      // Small delay to prevent immediate auto-save on load
      setTimeout(() => setIsInitialLoad(false), 1000);
    }
  }, [worldId, worlds, setState, addToast, state.world.currentDate, state.world.status, state.teams, state.players, applyLocalHydration]);

  useEffect(() => {
    if (!isAuthenticated || worldId || hasAttemptedSessionRestoreRef.current) return;

    const preferredWorldId = getLastSavedWorldId();
    if (!preferredWorldId) {
      hasAttemptedSessionRestoreRef.current = true;
      return;
    }

    hasAttemptedSessionRestoreRef.current = true;
    loadGame(preferredWorldId);
  }, [isAuthenticated, worldId, loadGame]);

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

  useEffect(() => {
    if (isInitialLoad || !worldId) return;

    const flushWorldState = () => {
      console.log('GameContext: Background save triggered...');
      saveGame();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushWorldState();
      }
    };

    window.addEventListener('pagehide', flushWorldState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushWorldState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [worldId, isInitialLoad, saveGame]);

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
        // Only the world creator drives the clock
        if (!prev.isCreator) return prev;

        // --- Map accelerated real time to 2050 game world ---
        const gameNow = getAcceleratedGameDate(prev.world.currentDate);
        const kickoffScheduled = prev.world.currentDay === -1 && !!prev.world.startScheduledAt;
        const kickoffReady = kickoffScheduled && gameNow >= new Date(prev.world.startScheduledAt!);

        // Before the GM schedules the season, keep the world frozen.
        if (prev.world.status === 'LOBBY' && prev.world.currentDay === -1 && !kickoffScheduled) {
          return prev;
        }

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
            seasonStartReal: seasonStartReal,
            currentDay: kickoffReady ? 0 : prev.world.currentDay,
            status: kickoffReady ? 'ACTIVE' as const : prev.world.status,
            startScheduledAt: kickoffReady ? null : prev.world.startScheduledAt
          }
        };

        // --- Day Change Logic ---
        // When the real day changes, run advanceGameDay which handles:
        // - Match simulation for the current round
        // - Player evolution
        // - Training progress
        // - Safety net checks
        // - Cup progression
        if (oldDay !== newDay && !kickoffReady && newState.world.currentDay >= 0) {
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
  }, [isPaused, isInitialLoad, worldId, setState, getAcceleratedGameDate, state.isCreator, state.world.currentDate, state.world.status, state.teams]);

  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      setUserId(null);
      setWorldId(null);
      setWorlds(listSavedWorlds());
      if (!applyLocalHydration()) {
        dispatch({ type: 'RESET_STATE' });
      }
      addToast('Sistema desconectado', 'info');
    } catch (error) {
      console.error('Logout error:', error);
      addToast('Erro ao sair do sistema', 'error');
    }
  }, [addToast, applyLocalHydration]);

  const leaveWorld = useCallback(() => {
    setWorldId(null);
    const fallbackWorldId = getLastSavedWorldId();
    if (!fallbackWorldId || !applyLocalHydration(fallbackWorldId)) {
      dispatch({ type: 'RESET_STATE' });
    }
    addToast('Saindo do mundo...', 'info');
  }, [addToast, applyLocalHydration]);

  const deleteWorld = useCallback(async (id: string) => {
    try {
      deleteLocalWorldState(id);
      const success = await deleteWorldFromSupabase(id);
      if (success) {
        addToast('Mundo deletado com sucesso', 'success');
        await refreshWorlds();
      } else {
        addToast('Save local removido. Falha ao deletar mundo remoto.', 'warning');
      }
    } catch (error) {
      console.error('Delete world error:', error);
      addToast('Save local removido. Falha ao deletar mundo remoto.', 'warning');
      await refreshWorlds();
    }
  }, [addToast, refreshWorlds]);

  const stateValue = useMemo(() => ({
    state, isSyncing, isOnline, isAuthenticated, userId, worldId, worlds, publicWorlds, toasts, isPaused
  }), [state, isSyncing, isOnline, isAuthenticated, userId, worldId, worlds, publicWorlds, toasts, isPaused]);

  const dispatchValue = useMemo(() => ({
    setState, saveGame,
    loadGame,
    joinGame,
    joinGameByCode,
    claimTeam,
    submitClubApplication,
    respondToClubOffer,
    resignFromTeam,
    setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, togglePause
  }), [setState, saveGame, loadGame, joinGame, joinGameByCode, claimTeam, submitClubApplication, respondToClubOffer, resignFromTeam, setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, togglePause]);

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
