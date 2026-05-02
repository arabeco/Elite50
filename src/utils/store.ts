import { APP_CIRCUIT, STORE_ITEMS_BY_ID } from '../constants/storeCatalog';
import { GameState, StoreItem, StoreState, TeamLogoMetadata } from '../types';

const DEFAULT_BOOT_VISUAL_ID = 1;
const LEGACY_STORE_ITEM_ALIASES: Record<string, string> = {
  boot_velocity_cyan: 'boot_01',
  boot_orbit_orange: 'boot_02',
  boot_metro_white: 'boot_03',
  boot_streetline_red: 'boot_04',
  boot_static_blue: 'boot_05',
  boot_core_silver: 'boot_06',
  boot_dash_mint: 'boot_07',
  boot_pulse_sand: 'boot_08',
  boot_alloy_ember: 'boot_21',
  boot_aero_teal: 'boot_23',
  boot_flux_violet: 'boot_24',
  boot_sonic_graphite: 'boot_25',
  boot_nova_peach: 'boot_26',
  boot_comet_aqua: 'boot_27',
  boot_frost_gold: 'boot_21',
  boot_carbide_black: 'boot_31',
  boot_halo_pink: 'boot_32',
  boot_quantum_lime: 'boot_33',
  boot_rift_copper: 'boot_34',
  boot_neon_phantom: 'boot_35',
  boot_vector_ice: 'boot_36',
  boot_signal_gold: 'boot_31',
  boot_prism_navy: 'boot_32',
  boot_turbo_scarlet: 'boot_35',
  boot_zenith_pearl: 'boot_36',
  boot_mirage_chrome: 'boot_41',
  boot_thunder_orchid: 'boot_42',
  boot_eclipse_carbon: 'boot_43',
  boot_aurora_volt: 'boot_44',
  boot_apex_obsidian: 'boot_43',
};

const normalizeStoreItemId = (itemId?: string | null) => {
  if (!itemId) return null;
  return LEGACY_STORE_ITEM_ALIASES[itemId] || itemId;
};

export const getBootAssetPathByVisualId = (bootVisualId?: number | null) => {
  const normalizedId = String(Math.max(1, bootVisualId || DEFAULT_BOOT_VISUAL_ID)).padStart(2, '0');
  return `/assetas/avatars/boots/boot_${normalizedId}.png`;
};

export const createDefaultStoreState = (): StoreState => ({
  gold: 120,
  fragments: 40,
  ownedItemIds: ['boot_01'],
  equippedBootByPlayerId: {},
  equippedKitByTeamId: {},
  equippedLogoByTeamId: {},
  circuit: {
    id: APP_CIRCUIT.id,
    name: APP_CIRCUIT.name,
    premiumActive: false,
    seasonRunsCompleted: 0,
    targetSeasonRuns: APP_CIRCUIT.targetSeasonRuns,
    endsAt: new Date(Date.now() + APP_CIRCUIT.durationDays * 24 * 60 * 60 * 1000).toISOString(),
  },
});

export const getStoreState = (state: GameState): StoreState => ({
  ...createDefaultStoreState(),
  ...(state.store || {}),
  ownedItemIds: Array.from(new Set([...(state.store?.ownedItemIds || createDefaultStoreState().ownedItemIds)].map(itemId => normalizeStoreItemId(itemId) || '').filter(Boolean))),
  equippedBootByPlayerId: {
    ...createDefaultStoreState().equippedBootByPlayerId,
    ...Object.fromEntries(
      Object.entries(state.store?.equippedBootByPlayerId || {}).map(([playerId, itemId]) => [playerId, normalizeStoreItemId(itemId)])
    ),
  },
  equippedKitByTeamId: {
    ...createDefaultStoreState().equippedKitByTeamId,
    ...(state.store?.equippedKitByTeamId || {}),
  },
  equippedLogoByTeamId: {
    ...createDefaultStoreState().equippedLogoByTeamId,
    ...(state.store?.equippedLogoByTeamId || {}),
  },
  circuit: {
    ...createDefaultStoreState().circuit,
    ...(state.store?.circuit || {}),
  },
});

export const getStoreItem = (itemId?: string | null): StoreItem | null => {
  const normalizedId = normalizeStoreItemId(itemId);
  if (!normalizedId) return null;
  return STORE_ITEMS_BY_ID[normalizedId] || null;
};

export const getEquippedBootItemForPlayer = (playerId: string, state: GameState) => {
  const store = getStoreState(state);
  return getStoreItem(store.equippedBootByPlayerId[playerId]);
};

export const isItemOwned = (state: GameState, itemId: string) => {
  const store = getStoreState(state);
  return store.ownedItemIds.includes(itemId);
};

export const getBootImagePath = (playerId: string, state: GameState) => {
  const bootItem = getEquippedBootItemForPlayer(playerId, state);
  if (bootItem?.imagePath) return bootItem.imagePath;
  const player = state.players[playerId];
  const bootVisualId = Math.max(1, player?.appearance.bootId || DEFAULT_BOOT_VISUAL_ID);
  return getBootAssetPathByVisualId(bootVisualId);
};

export const applyBootProgressionBonus = (state: GameState | undefined, playerId: string, delta: number) => {
  if (!state || delta === 0) return delta;

  const bootItem = getEquippedBootItemForPlayer(playerId, state);
  const bonus = bootItem?.bootBonus;
  if (!bonus) return delta;

  if (delta > 0 && bonus.progressionGainPct) {
    return Math.max(1, Math.round(delta * (1 + bonus.progressionGainPct / 100)));
  }

  if (delta < 0 && bonus.progressionLossMitigationPct) {
    return Math.min(-1, Math.round(delta * (1 - bonus.progressionLossMitigationPct / 100)));
  }

  return delta;
};

export const getResolvedKitAssetPath = (state: GameState, teamId?: string | null) => {
  if (!teamId) return null;
  const store = getStoreState(state);
  const item = getStoreItem(store.equippedKitByTeamId[teamId]);
  return item?.assetPath || null;
};

export const getResolvedLogoPreview = (state: GameState, teamId?: string | null): Partial<TeamLogoMetadata> | null => {
  if (!teamId) return null;
  const store = getStoreState(state);
  const item = getStoreItem(store.equippedLogoByTeamId[teamId]);
  return item?.logoPreview || null;
};

export const purchaseStoreItem = (state: GameState, itemId: string) => {
  const item = getStoreItem(itemId);
  if (!item) {
    return { ok: false as const, state, message: 'Item nao encontrado.' };
  }

  const store = getStoreState(state);
  if (store.ownedItemIds.includes(itemId)) {
    return { ok: false as const, state: { ...state, store }, message: 'Item ja esta no inventario.' };
  }

  if (item.currency === 'GOLD' && store.gold < item.price) {
    return { ok: false as const, state: { ...state, store }, message: 'Ouro insuficiente.' };
  }

  if (item.currency === 'FRAGMENT' && store.fragments < item.price) {
    return { ok: false as const, state: { ...state, store }, message: 'Fragmentos insuficientes.' };
  }

  const nextStore: StoreState = {
    ...store,
    gold: item.currency === 'GOLD' ? store.gold - item.price : store.gold,
    fragments: item.currency === 'FRAGMENT' ? store.fragments - item.price : store.fragments,
    ownedItemIds: [...store.ownedItemIds, item.id],
  };

  return {
    ok: true as const,
    state: { ...state, store: nextStore },
    message: `${item.name} entrou no inventario.`,
  };
};

export const equipBootOnPlayer = (state: GameState, playerId: string, itemId: string | null) => {
  const player = state.players[playerId];
  if (!player) {
    return { ok: false as const, state, message: 'Jogador nao encontrado.' };
  }

  const store = getStoreState(state);
  const nextAssignments = { ...store.equippedBootByPlayerId };

  if (!itemId) {
    delete nextAssignments[playerId];
    return {
      ok: true as const,
      state: {
        ...state,
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            appearance: {
              ...player.appearance,
              bootId: DEFAULT_BOOT_VISUAL_ID,
            },
          },
        },
        store: {
          ...store,
          equippedBootByPlayerId: nextAssignments,
        },
      },
      message: 'Chuteira removida.',
    };
  }

  const item = getStoreItem(itemId);
  if (!item || item.category !== 'BOOT') {
    return { ok: false as const, state: { ...state, store }, message: 'Item de chuteira invalido.' };
  }

  if (!store.ownedItemIds.includes(itemId)) {
    return { ok: false as const, state: { ...state, store }, message: 'Compre a chuteira primeiro.' };
  }

  Object.entries(nextAssignments).forEach(([assignedPlayerId, assignedItemId]) => {
    if (assignedItemId === itemId && assignedPlayerId !== playerId) {
      delete nextAssignments[assignedPlayerId];
      const assignedPlayer = state.players[assignedPlayerId];
      if (assignedPlayer) {
        state = {
          ...state,
          players: {
            ...state.players,
            [assignedPlayerId]: {
              ...assignedPlayer,
              appearance: {
                ...assignedPlayer.appearance,
                bootId: DEFAULT_BOOT_VISUAL_ID,
              },
            },
          },
        };
      }
    }
  });

  nextAssignments[playerId] = itemId;

  return {
    ok: true as const,
    state: {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          appearance: {
            ...state.players[playerId].appearance,
            bootId: item.bootVisualId || DEFAULT_BOOT_VISUAL_ID,
          },
        },
      },
      store: {
        ...getStoreState(state),
        equippedBootByPlayerId: nextAssignments,
      },
    },
    message: `${item.name} equipada em ${player.nickname}.`,
  };
};

export const releasePlayerBootToInventory = (state: GameState, playerId: string) => {
  const player = state.players[playerId];
  if (!player) return state;

  const store = getStoreState(state);
  if (!store.equippedBootByPlayerId[playerId] && player.appearance.bootId === DEFAULT_BOOT_VISUAL_ID) {
    return { ...state, store };
  }

  const nextAssignments = { ...store.equippedBootByPlayerId };
  delete nextAssignments[playerId];

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        appearance: {
          ...player.appearance,
          bootId: DEFAULT_BOOT_VISUAL_ID,
        },
      },
    },
    store: {
      ...store,
      equippedBootByPlayerId: nextAssignments,
    },
  };
};

export const equipTeamKit = (state: GameState, teamId: string, itemId: string) => {
  const item = getStoreItem(itemId);
  const store = getStoreState(state);
  if (!item || item.category !== 'KIT' || !store.ownedItemIds.includes(itemId)) {
    return state;
  }

  return {
    ...state,
    store: {
      ...store,
      equippedKitByTeamId: {
        ...store.equippedKitByTeamId,
        [teamId]: itemId,
      },
    },
  };
};

export const equipTeamLogo = (state: GameState, teamId: string, itemId: string) => {
  const item = getStoreItem(itemId);
  const team = state.teams[teamId];
  const store = getStoreState(state);
  if (!item || item.category !== 'LOGO' || !store.ownedItemIds.includes(itemId) || !team) {
    return state;
  }

  return {
    ...state,
    teams: {
      ...state.teams,
      [teamId]: {
        ...team,
        logo: {
          ...(team.logo || {
            primary: '#0f172a',
            secondary: '#e2e8f0',
            patternId: 'solid',
            symbolId: 'Shield',
          }),
          ...(item.logoPreview || {}),
        },
      },
    },
    store: {
      ...store,
      equippedLogoByTeamId: {
        ...store.equippedLogoByTeamId,
        [teamId]: itemId,
      },
    },
  };
};
