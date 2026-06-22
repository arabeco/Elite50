import React, { createContext, useContext, useReducer, useEffect, ReactNode, useMemo, useCallback, useRef, useState } from 'react';
import { GameState } from '../types';
import { generateInitialState, getGameDate2050 } from '../engine/generator';
import { saveGameState, loadGameState, listUserWorlds, listPublicWorlds, supabase, deleteWorld as deleteWorldFromSupabase, joinSharedWorld, joinWorldByCode as joinWorldByCodeFromSupabase, subscribeToWorld, claimTeamInWorld, resignFromTeamInWorld } from '../lib/supabase';
import { deleteSavedState as deleteLocalWorldState, getLastSavedWorldId, listSavedWorlds, loadGameState as loadLocalGameState, loadStoredWorldEnvelope, saveGameState as saveLocalGameState } from '../engine/persistence';
import { DEFAULT_TIME_SPEED } from '../constants/gameConstants';
import { advanceGameDay, isJoinWindowOpen } from '../engine/gameLogic';
import { addNews } from '../engine/newsService';
import { loadManagerProfileMeta, loadMetaStoreSnapshot } from '../lib/metaStore';
import { buildWorldDayTickKey, claimWorldTick, commitWorldTickState, completeWorldDayTick } from '../lib/worldTick';
import { getStoreState } from '../utils/store';
import { STORE_ITEMS_BY_ID } from '../constants/storeCatalog';
import { applyManagerProfileMeta } from '../utils/managerProfile';
import { getNextGameMidnight, isKickoffDue } from '../utils/worldSchedule';

interface GameStateValue {
  state: GameState;
  isSyncing: boolean;
  isOnline: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  worldId: string | null;
  worlds: WorldSummary[];
  publicWorlds: WorldSummary[];
  toasts: Array<{ id: string, message: string, type: 'success' | 'error' | 'info' | 'warning' }>;
  isPaused: boolean;
}

type WorldSummary = {
  id: string;
  name: string;
  updatedAt: string;
  userId: string;
  isLocalOnly?: boolean;
  isCreator?: boolean;
  status?: string;
  phase?: string | null;
  currentDay?: number | null;
  currentSeason?: number | null;
  startScheduledAt?: string | null;
};

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
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>;
  togglePause: () => void;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
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

const isDevAuthEnabled = () => {
  if (typeof sessionStorage !== 'undefined' && import.meta.env.DEV && sessionStorage.getItem('elite.devAuth') === 'true') {
    return true;
  }
  if (typeof window === 'undefined') return false;
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocalHost && new URLSearchParams(window.location.search).get('devAuth') === '1';
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, generateInitialState());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => isDevAuthEnabled());
  const [userId, setUserId] = useState<string | null>(() => isDevAuthEnabled() ? 'dev_smoke_user' : null);
  const [worldId, setWorldId] = useState<string | null>(null);
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [publicWorlds, setPublicWorlds] = useState<WorldSummary[]>([]);
  const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  const [pendingConfirm, setPendingConfirm] = useState<(ConfirmOptions & { id: string }) | null>(null);
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [timeSpeed, setTimeSpeedState] = useState(DEFAULT_TIME_SPEED);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const timeAnchorRef = useRef<{
    realTimeMs: number;
    gameTimeMs: number;
    speed: number;
    lastWorldDateMs: number;
  } | null>(null);
  const latestStateRef = useRef(state);
  const clockTickInFlightRef = useRef(false);

  const setState = useCallback((payload: GameState | ((prev: GameState) => GameState)) => {
    dispatch({ type: 'SET_STATE', payload });
  }, []);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

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
      if (isDevAuthEnabled()) {
        setIsAuthenticated(true);
        setUserId('dev_smoke_user');
      } else {
        setIsAuthenticated(false);
      }
      const cachedWorlds = listSavedWorlds();
      setWorlds(cachedWorlds);
      applyLocalHydration();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasSession = !!session;
      const hasDevAuth = isDevAuthEnabled();
      setIsAuthenticated(hasSession || hasDevAuth);
      setUserId(session?.user.id || (hasDevAuth ? 'dev_smoke_user' : null));
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
      const hasDevAuth = isDevAuthEnabled();
      setIsAuthenticated(hasSession || hasDevAuth);
      setUserId(session?.user.id || (hasDevAuth ? 'dev_smoke_user' : null));
      if (hasSession) {
        refreshWorlds(true);
      } else {
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

  const resolveConfirm = useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setPendingConfirm(null);
  }, []);

  const requestConfirm = useCallback((options: ConfirmOptions) => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
    }

    setPendingConfirm({
      id: Math.random().toString(36).substring(2, 9),
      ...options,
    });

    return new Promise<boolean>(resolve => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const buildUserManager = useCallback((managerId: string, displayName: string, district: any, teamId: string | null) => ({
    id: managerId,
    name: displayName,
    originDistrict: district,
    district,
    reputation: 50,
    preferredPlayStyle: 'Equilibrado',
    originTraitId: 'trait_cold_negotiator',
    ownedTraitIds: ['trait_cold_negotiator'],
    equippedTraitIds: ['trait_cold_negotiator'],
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
      historyTeamIds: teamId ? [teamId] : [],
      worldIds: [worldId || state.world.id || 'local_world']
    },
    achievements: []
  }), [state.world.id, worldId]);

  const hydrateStoreFromMeta = useCallback(async (baseState: GameState) => {
    if (!isAuthenticated) return baseState;

    try {
      const snapshot = await loadMetaStoreSnapshot();
      const remoteOwnedItemIds = (snapshot.inventory || []).map(item => item.item_id);
      if (remoteOwnedItemIds.length === 0 && !snapshot.profile && !snapshot.circuit && !snapshot.managerProfile) return baseState;

      const store = getStoreState(baseState);
      const displayedProfileItems = (snapshot.inventory || [])
        .filter(item => {
          const storeItem = STORE_ITEMS_BY_ID[item.item_id];
          return item.is_equipped && !!storeItem && (storeItem.category === 'ACCESSORY' || storeItem.category === 'BADGE');
        })
        .sort((a, b) => Number(a.equipped_context?.slot || 99) - Number(b.equipped_context?.slot || 99))
        .map(item => item.item_id)
        .slice(0, 3);

      const hydratedState = {
        ...baseState,
        store: {
          ...store,
          ownedItemIds: Array.from(new Set([...store.ownedItemIds, ...remoteOwnedItemIds])),
          equippedManagerItemIds: displayedProfileItems.length ? displayedProfileItems : store.equippedManagerItemIds,
          circuit: {
            ...store.circuit,
            premiumActive: snapshot.profile?.premium_active ?? store.circuit.premiumActive,
            seasonRunsCompleted: snapshot.circuit?.season_runs_completed ?? store.circuit.seasonRunsCompleted,
          },
        },
      };

      if (snapshot.managerProfile && hydratedState.userManagerId && hydratedState.managers[hydratedState.userManagerId]) {
        hydratedState.managers = {
          ...hydratedState.managers,
          [hydratedState.userManagerId]: applyManagerProfileMeta(
            hydratedState.managers[hydratedState.userManagerId],
            snapshot.managerProfile
          ),
        };
      }

      return hydratedState;
    } catch (error) {
      console.error('GameContext: failed to hydrate store from global profile', error);
      return baseState;
    }
  }, [isAuthenticated]);

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
        const hydratedState = await hydrateStoreFromMeta(joinedState);
        setIsInitialLoad(true);
        setState(hydratedState);
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
  }, [setState, addToast, hydrateStoreFromMeta]);

  const joinGameByCode = useCallback(async (joinCode: string) => {
    setIsSyncing(true);
    try {
      const joinedState = await joinWorldByCodeFromSupabase(joinCode);
      if (joinedState?.worldId) {
        const hydratedState = await hydrateStoreFromMeta(joinedState);
        setIsInitialLoad(true);
        setState(hydratedState);
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
  }, [setState, addToast, hydrateStoreFromMeta, refreshWorlds]);

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
      const managerProfile = await loadManagerProfileMeta().catch(() => null);
      nextState.managers[managerId] = applyManagerProfileMeta(
        buildUserManager(managerId, displayName, team.district, team.id) as any,
        managerProfile
      ) as any;
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

          const hydratedState = await hydrateStoreFromMeta(preferredState);
          setIsInitialLoad(true);
          setState(hydratedState);
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
  }, [worldId, worlds, setState, addToast, state.world.currentDate, state.world.status, state.teams, state.players, applyLocalHydration, hydrateStoreFromMeta]);

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
    state.store,
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
    // Everyone listens. Non-creators receive clock/state updates; creators receive participant joins/claims.
    const participantSignature = (items = state.participants || []) =>
      items
        .map(participant => `${participant.userId}:${participant.teamId || ''}:${participant.managerId || ''}`)
        .sort()
        .join('|');

    const channel = subscribeToWorld(worldId, async () => {
      try {
        const loaded = await loadGameState(worldId);
        if (!loaded) return;

        const previousParticipants = state.participants || [];
        const previousSignature = participantSignature(previousParticipants);
        const nextSignature = participantSignature(loaded.participants || []);
        const participantsChanged = previousSignature !== nextSignature;
        const previousByUser = new Map(previousParticipants.map(participant => [participant.userId, participant]));
        const newestParticipant = (loaded.participants || []).find(participant => !previousByUser.has(participant.userId));
        const changedParticipant = newestParticipant || (loaded.participants || []).find(participant => {
          const previous = previousByUser.get(participant.userId);
          return previous && (previous.teamId !== participant.teamId || previous.managerId !== participant.managerId);
        });

        if (participantsChanged && state.isCreator) {
          const team = changedParticipant?.teamId ? loaded.teams[changedParticipant.teamId] : null;
          const manager = changedParticipant?.managerId ? loaded.managers[changedParticipant.managerId] : null;
          const humanCount = (loaded.participants || []).filter(participant => participant.teamId).length;
          const title = team ? 'Jogador entrou no mundo' : 'Observador entrou no mundo';
          const message = `${manager?.name || 'Novo jogador'} entrou${team ? ` com ${team.name}` : ' como observador'}. Humanos no mundo: ${humanCount}.`;
          loaded.notifications = [
            {
              id: `participant_${changedParticipant?.userId || Date.now()}_${Date.now()}`,
              date: loaded.world.currentDate,
              title,
              message,
              type: 'info' as const,
              read: false
            },
            ...(loaded.notifications || []),
          ].slice(0, 80);
          addToast(
            message,
            'info'
          );
        }

        if (!state.isCreator || participantsChanged) {
          console.log('GameContext: Realtime world update received, refreshing local state.');
          setState(loaded);
        }
      } catch (e) {
        console.error('Realtime sync error:', e);
      }
    });

    const buildDateKey = (date: Date) =>
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

    const processDueClockTick = async () => {
      if (clockTickInFlightRef.current) return;

      const prev = latestStateRef.current;
      const realNow = new Date();
      const gameNow = getAcceleratedGameDate(prev.world.currentDate);
      const kickoffScheduled = prev.world.currentDay === -1 && !!prev.world.startScheduledAt;
      const kickoffReady = kickoffScheduled && isKickoffDue(prev.world.startScheduledAt, realNow);

      // Before the GM schedules the season, keep the world frozen.
      if (prev.world.status === 'LOBBY' && prev.world.currentDay === -1 && !kickoffScheduled) {
        return;
      }

      const oldDate = new Date(prev.world.currentDate);
      const oldDay = oldDate.getDate();
      const newDay = gameNow.getDate();
      const dailyAdvanceReady = oldDay !== newDay && !kickoffReady && prev.world.currentDay >= 0;

      if (!kickoffReady && !dailyAdvanceReady) return;

      let tickKey = kickoffReady
        ? `season-${prev.world.currentSeason || 2050}:kickoff:${buildDateKey(gameNow)}`
        : buildWorldDayTickKey(prev);

      clockTickInFlightRef.current = true;
      try {
        const tickClaim = await claimWorldTick(worldId, tickKey, gameNow.toISOString());
        tickKey = tickClaim.tickKey || tickKey;

        if (!tickClaim.ok) {
          const loaded = await loadGameState(worldId);
          if (loaded) setState(loaded);
          return;
        }

        let seasonStartReal = prev.world.seasonStartReal;
        if (!seasonStartReal) {
          seasonStartReal = getNextGameMidnight(prev.world.currentDate).toISOString();
        }

        let newState: GameState = {
          ...prev,
          world: {
            ...prev.world,
            currentDate: gameNow.toISOString(),
            seasonStartReal,
            currentDay: kickoffReady ? 0 : prev.world.currentDay,
            status: kickoffReady ? 'LOBBY' as const : prev.world.status,
            startScheduledAt: kickoffReady ? null : prev.world.startScheduledAt
          }
        };

        if (kickoffReady) {
          newState.notifications = [
            {
              id: `season_started_${prev.world.currentSeason || 2050}_${Date.now()}`,
              date: gameNow.toISOString(),
              title: 'Draft Genesis aberto',
              message: 'O mundo chegou em 00:00. O Draft Genesis abriu: Dia 0, Dia 1 e Dia 2 recebem listas; no Dia 3 a liga computa e abre a temporada.',
              type: 'success' as const,
              read: false
            },
            ...(newState.notifications || []),
          ].slice(0, 80);
        }

        if (dailyAdvanceReady) {
          console.log('Clock: Day changed, running shared daily advance...');
          newState = advanceGameDay(newState, true);
        }

        if (prev.isCreator) {
          setState(newState);
          await saveGame(newState);
        } else {
          const commit = await commitWorldTickState(worldId, tickKey, newState);
          if (!commit.ok || commit.degraded) {
            throw new Error('WORLD_TICK_COMMIT_FAILED');
          }
          setState(newState);
          await saveGame(newState);
        }

        await completeWorldDayTick(worldId, tickKey, true);
      } catch (error: any) {
        await completeWorldDayTick(worldId, tickKey, false, error?.message || String(error));
        console.error('Shared world clock tick failed:', error);
      } finally {
        clockTickInFlightRef.current = false;
      }
    };

    // --- Main Clock (1s interval) ---
    const interval = setInterval(() => {
      processDueClockTick();
    }, 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [addToast, isPaused, isInitialLoad, worldId, setState, getAcceleratedGameDate, saveGame, state.isCreator, state.participants]);

  const togglePause = useCallback(() => setIsPaused(prev => !prev), []);

  const logout = useCallback(async () => {
    try {
      if (import.meta.env.DEV && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('elite.devAuth');
      }
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
    setIsInitialLoad(false);
    dispatch({ type: 'RESET_STATE' });
    addToast('Voce saiu do mundo.', 'info');
  }, [addToast]);

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
    setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, requestConfirm, togglePause
  }), [setState, saveGame, loadGame, joinGame, joinGameByCode, claimTeam, submitClubApplication, respondToClubOffer, resignFromTeam, setIsAuthenticated, setWorldId, logout, leaveWorld, deleteWorld, refreshWorlds, addToast, removeToast, requestConfirm, togglePause]);

  return (
    <GameDispatchContext.Provider value={dispatchValue}>
      <GameStateContext.Provider value={stateValue}>
        {children}
        {pendingConfirm && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
            <div className={`relative w-full max-w-[330px] overflow-hidden rounded-lg border bg-[#070b12] shadow-[0_18px_60px_rgba(0,0,0,0.65)] ${
              pendingConfirm.tone === 'danger' ? 'border-rose-300/35' : 'border-cyan-300/30'
            }`}>
              <div className={`absolute inset-y-0 left-0 w-1 ${
                pendingConfirm.tone === 'danger' ? 'bg-rose-400' : 'bg-cyan-300'
              }`} />
              <div className="p-4 pl-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[8px] font-black uppercase tracking-[0.28em] ${
                      pendingConfirm.tone === 'danger' ? 'text-rose-200' : 'text-cyan-200'
                    }`}>
                      Confirmacao
                    </p>
                    <h3 className="mt-2 text-base font-black uppercase italic leading-tight tracking-normal text-white">
                      {pendingConfirm.title}
                    </h3>
                  </div>
                  <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    pendingConfirm.tone === 'danger' ? 'bg-rose-300' : 'bg-cyan-200'
                  }`} />
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase leading-relaxed tracking-wide text-white/60">
                  {pendingConfirm.message}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => resolveConfirm(false)}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.08]"
                  >
                    {pendingConfirm.cancelLabel || 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveConfirm(true)}
                    className={`rounded-md border px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.18em] transition ${
                      pendingConfirm.tone === 'danger'
                        ? 'border-rose-300/40 bg-rose-400 text-black hover:bg-rose-300'
                        : 'border-cyan-300/40 bg-cyan-300 text-black hover:bg-cyan-200'
                    }`}
                  >
                    {pendingConfirm.confirmLabel || 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
