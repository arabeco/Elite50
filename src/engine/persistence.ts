import { GameState } from '../types';

type StoredWorldSummary = {
  id: string;
  name: string;
  updatedAt: string;
  userId: string;
  isLocalOnly: boolean;
};

type StoredWorldEnvelope = {
  state: GameState;
  updatedAt: string;
  worldId: string;
  worldName: string;
  userId: string;
  isLocalOnly: boolean;
};

const STORAGE_PREFIX = 'elite50.world.';
const INDEX_KEY = 'elite50.worldIndex';
const LAST_WORLD_KEY = 'elite50.lastWorldId';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

const getWorldStorageKey = (worldId: string) => `${STORAGE_PREFIX}${worldId}`;

const readIndex = (): StoredWorldSummary[] => {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredWorldSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read local world index', error);
    return [];
  }
};

const writeIndex = (items: StoredWorldSummary[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(items));
};

export const getSavedWorldSummary = (worldId: string): StoredWorldSummary | null => {
  return readIndex().find(item => item.id === worldId) || null;
};

export const saveGameState = (
  state: GameState,
  worldId: string = 'default',
  userId: string = 'local',
  options?: { isLocalOnly?: boolean; updatedAt?: string }
): void => {
  if (!canUseStorage()) return;

  const worldName = state.world?.name || `Mundo ${worldId}`;
  const updatedAt = options?.updatedAt || new Date().toISOString();
  const isLocalOnly = options?.isLocalOnly ?? true;
  const envelope: StoredWorldEnvelope = {
    state,
    updatedAt,
    worldId,
    worldName,
    userId,
    isLocalOnly,
  };

  try {
    window.localStorage.setItem(getWorldStorageKey(worldId), JSON.stringify(envelope));
    window.localStorage.setItem(LAST_WORLD_KEY, worldId);

    const nextSummary: StoredWorldSummary = {
      id: worldId,
      name: worldName,
      updatedAt,
      userId,
      isLocalOnly,
    };

    const existing = readIndex().filter(item => item.id !== worldId);
    writeIndex([nextSummary, ...existing].slice(0, 20));
  } catch (error) {
    console.error('Failed to save local world state', error);
  }
};

export const loadGameState = (worldId?: string): GameState | null => {
  if (!canUseStorage()) return null;

  const resolvedWorldId = worldId || window.localStorage.getItem(LAST_WORLD_KEY);
  if (!resolvedWorldId) return null;

  try {
    const raw = window.localStorage.getItem(getWorldStorageKey(resolvedWorldId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredWorldEnvelope;
    return parsed?.state || null;
  } catch (error) {
    console.error('Failed to load local world state', error);
    return null;
  }
};

export const loadStoredWorldEnvelope = (worldId?: string): StoredWorldEnvelope | null => {
  if (!canUseStorage()) return null;

  const resolvedWorldId = worldId || window.localStorage.getItem(LAST_WORLD_KEY);
  if (!resolvedWorldId) return null;

  try {
    const raw = window.localStorage.getItem(getWorldStorageKey(resolvedWorldId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredWorldEnvelope;
  } catch (error) {
    console.error('Failed to load local world envelope', error);
    return null;
  }
};

export const listSavedWorlds = (): StoredWorldSummary[] => readIndex();

export const getLastSavedWorldId = (): string | null => {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(LAST_WORLD_KEY);
};

export const deleteSavedState = (worldId: string): void => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(getWorldStorageKey(worldId));
    const nextIndex = readIndex().filter(item => item.id !== worldId);
    writeIndex(nextIndex);

    if (window.localStorage.getItem(LAST_WORLD_KEY) === worldId) {
      const fallbackWorldId = nextIndex[0]?.id || null;
      if (fallbackWorldId) {
        window.localStorage.setItem(LAST_WORLD_KEY, fallbackWorldId);
      } else {
        window.localStorage.removeItem(LAST_WORLD_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to delete local world state', error);
  }
};
