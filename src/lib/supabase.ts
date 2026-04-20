
import { createClient } from '@supabase/supabase-js';
import { GameState, Manager, TrainingState } from '../types';
import { applyTeamLogoAssets } from '../utils/teamIdentity';

// Supabase configuration - Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY 
// are set in your Vercel Environment Variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key missing. The app requires a valid connection to function.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

const createDefaultTrainingState = (): TrainingState => ({
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
});

export const saveGameState = async (state: GameState, worldId: string = 'default') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const isCreator = state.isCreator === true;
  const isPublic = state.world.isPublic === true;

  const userTeamId = state.userTeamId;
  const userManagerId = state.userManagerId;

  const filteredTeams: Record<string, any> = {};
  if (userTeamId && state.teams[userTeamId]) {
    filteredTeams[userTeamId] = state.teams[userTeamId];
  }

  const filteredPlayers: Record<string, any> = {};
  if (userTeamId && state.teams[userTeamId]) {
    const squadIds = state.teams[userTeamId].squad || [];
    squadIds.forEach(id => {
      if (state.players[id]) {
        filteredPlayers[id] = state.players[id];
      }
    });
  }

  const filteredManagers = userManagerId && state.managers[userManagerId]
    ? { [userManagerId]: state.managers[userManagerId] }
    : {};

  const teamsToSave = isCreator ? state.teams : filteredTeams;
  const playersToSave = isCreator ? state.players : filteredPlayers;
  const managersToSave = isCreator ? state.managers : filteredManagers;

  const { data, error } = await supabase
    .from('games')
    .upsert({
      user_id: user.id,
      world_id: worldId,
      world_state: state.world,
      teams_data: teamsToSave,
      players_data: playersToSave,
      managers_data: managersToSave,
      user_team_id: userTeamId,
      user_manager_id: userManagerId,
      notifications: state.notifications,
      last_headline: state.lastHeadline,
      training_data: state.training,
      is_creator: isCreator,
      is_public: isCreator && isPublic,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,world_id' });

  if (error) {
    console.error('Error saving game state:', error);
    return null;
  }
  return data;
};

export const joinSharedWorld = async (worldId: string): Promise<GameState | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch the master world state (from the creator)
  let { data: masterGame, error: masterError } = await supabase
    .from('games')
    .select('*')
    .eq('world_id', worldId)
    .eq('is_creator', true)
    .limit(1)
    .maybeSingle();

  if (!masterGame) {
    const fallback = await supabase
      .from('games')
      .select('*')
      .eq('world_id', worldId)
      .order('updated_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    masterGame = fallback.data;
    masterError = fallback.error;
  }

  if (masterError || !masterGame) {
    console.error('Error fetching master world state:', masterError);
    return null;
  }

  // 2. Build a GameState based on master world but for the joining user
  const gameState: GameState = {
    world: masterGame.world_state as any,
    worldId: worldId,
    isCreator: false,
    teams: applyTeamLogoAssets(masterGame.teams_data as any),
    players: masterGame.players_data as any,
    managers: masterGame.managers_data || {},
    userTeamId: null, // Joining user hasn't picked a team yet
    userManagerId: null,
    notifications: [],
    training: {
      cardLaboratory: { slots: [{ cardId: null, finishTime: null }, { cardId: null, finishTime: null }] },
      individualFocus: { evolutionSlot: null, stabilizationSlot: null },
      playstyleTraining: { currentStyle: null, understanding: {} }
    }
  };

  // 3. Persist the joining user's record in Supabase
  const { error: joinError } = await supabase
    .from('games')
    .upsert({
      user_id: user.id,
      world_id: worldId,
      world_state: masterGame.world_state,
      teams_data: {},
      players_data: {},
      managers_data: {},
      user_team_id: null,
      user_manager_id: null,
      notifications: [],
      last_headline: {},
      training_data: gameState.training,
      is_creator: false,
      is_public: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,world_id' });

  if (joinError) {
    console.error('Error persisting join record:', joinError);
    // Still return state so user can play locally even if persist fails
  }

  return gameState;
};

export const joinWorldByCode = async (joinCode: string): Promise<GameState | null> => {
  const code = joinCode.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabase.rpc('join_world_by_code', {
    p_join_code: code
  });

  if (error || !data) {
    console.error('Error joining world by code:', error);
    throw new Error(error?.message || 'INVALID_JOIN_CODE');
  }

  return loadGameState(String(data));
};

export const loadGameState = async (worldId: string = 'default'): Promise<GameState | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Fetch ALL records for this world_id to reconstruct shared state
  // We sort by updated_at ASC so later records (newer) can overwrite older ones in the loop
  const { data: allWorldRecords, error: worldError } = await supabase
    .from('games')
    .select('*')
    .eq('world_id', worldId)
    .order('updated_at', { ascending: true });

  if (worldError || !allWorldRecords || allWorldRecords.length === 0) {
    console.error('Error fetching world records:', worldError);
    return null;
  }

  // 2. The creator row is the master. Fallback to oldest for legacy saves.
  const masterRecord = allWorldRecords.find(r => r.is_creator) || allWorldRecords[0];
  const userRecord = allWorldRecords.find(r => r.user_id === user.id);

  if (!userRecord) return null;

  const isCreator = masterRecord.user_id === user.id || userRecord.is_creator === true;
  const participants = allWorldRecords.map(record => ({
    userId: record.user_id,
    teamId: record.user_team_id,
    managerId: record.user_manager_id,
    isCreator: record.is_creator === true,
    isObserver: !record.user_team_id,
    updatedAt: record.updated_at
  }));

  // 3. Reconstruct State: Start with master data, then merge human player updates
  const mergedTeams = { ...(masterRecord.teams_data as any) };
  const mergedPlayers = { ...(masterRecord.players_data as any) };
  const mergedManagers = { ...(masterRecord.managers_data as any) };

  allWorldRecords.forEach(record => {
    // Skip if it's the master record (already used as base)
    if (record.user_id === masterRecord.user_id) return;

    // Merge Team updates (Tactics, Lineup, etc.)
    // RULE: If a record matches a user who owns a team, that user's version of the team is the truth.
    const recordUserTeamId = record.user_team_id;
    if (recordUserTeamId && record.teams_data && (record.teams_data as any)[recordUserTeamId]) {
      mergedTeams[recordUserTeamId] = (record.teams_data as any)[recordUserTeamId];
    }

    // Merge Player updates
    // RULE: If a player's stats or contract changed in a newer record, we accept it.
    if (record.players_data) {
      const recordPlayers = record.players_data as any;
      Object.keys(recordPlayers).forEach(playerId => {
        const p = recordPlayers[playerId];
        const masterP = mergedPlayers[playerId];

        if (!masterP) {
          mergedPlayers[playerId] = p;
          return;
        }

        // Check if this user had a reason to update this player (e.g. training, transfer)
        // Since records are sorted by time, the newer ones naturally win in this loop.
        const isDifferent = JSON.stringify(p) !== JSON.stringify(masterP);
        if (isDifferent) {
          mergedPlayers[playerId] = p;
        }
      });
    }

    // Merge Manager updates
    const recordUserManagerId = record.user_manager_id;
    if (recordUserManagerId && record.managers_data && (record.managers_data as any)[recordUserManagerId]) {
      mergedManagers[recordUserManagerId] = (record.managers_data as any)[recordUserManagerId];
    }
  });

  const gameState: GameState = {
    world: masterRecord.world_state as any, // Master defines the world clock
    worldId: masterRecord.world_id,
    isCreator,
    participants,
    teams: applyTeamLogoAssets(mergedTeams),
    players: mergedPlayers,
    managers: mergedManagers,
    userTeamId: userRecord.user_team_id,
    userManagerId: userRecord.user_manager_id,
    notifications: userRecord.notifications || [],
    lastHeadline: userRecord.last_headline,
    training: userRecord.training_data || createDefaultTrainingState()
  };
  return gameState;
};

export const claimTeamInWorld = async (
  worldId: string,
  teamId: string,
  managerName?: string
): Promise<GameState | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: allWorldRecords, error } = await supabase
    .from('games')
    .select('*')
    .eq('world_id', worldId)
    .order('updated_at', { ascending: true });

  if (error || !allWorldRecords || allWorldRecords.length === 0) {
    console.error('Error fetching world before claiming team:', error);
    return null;
  }

  const alreadyClaimedByOther = allWorldRecords.some(record =>
    record.user_id !== user.id && record.user_team_id === teamId
  );

  if (alreadyClaimedByOther) {
    throw new Error('TEAM_ALREADY_CLAIMED');
  }

  const masterRecord = allWorldRecords.find(record => record.is_creator) || allWorldRecords[0];
  const teams = { ...(masterRecord.teams_data as any) };
  const players = { ...(masterRecord.players_data as any) };
  const selectedTeam = teams[teamId];

  if (!selectedTeam || !String(teamId).startsWith('t_')) {
    throw new Error('TEAM_NOT_AVAILABLE');
  }

  const managerId = user.id;
  const displayName =
    managerName?.trim() ||
    user.email?.split('@')[0] ||
    'Manager Elite';

  const userManager: Manager = {
    id: managerId,
    name: displayName,
    district: selectedTeam.district,
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
      historyTeamIds: [teamId]
    },
    achievements: []
  };

  const updatedTeam = {
    ...selectedTeam,
    managerId
  };

  const filteredPlayers: Record<string, any> = {};
  (updatedTeam.squad || []).forEach((playerId: string) => {
    if (players[playerId]) {
      filteredPlayers[playerId] = players[playerId];
    }
  });

  const training = createDefaultTrainingState();

  const { error: upsertError } = await supabase
    .from('games')
    .upsert({
      user_id: user.id,
      world_id: worldId,
      world_state: masterRecord.world_state,
      teams_data: { [teamId]: updatedTeam },
      players_data: filteredPlayers,
      managers_data: { [managerId]: userManager },
      user_team_id: teamId,
      user_manager_id: managerId,
      notifications: [],
      last_headline: {},
      training_data: training,
      is_creator: false,
      is_public: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,world_id' });

  if (upsertError) {
    console.error('Error claiming team:', upsertError);
    return null;
  }

  return loadGameState(worldId);
};

export const resignFromTeamInWorld = async (worldId: string): Promise<GameState | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: allWorldRecords, error } = await supabase
    .from('games')
    .select('*')
    .eq('world_id', worldId)
    .order('updated_at', { ascending: true });

  if (error || !allWorldRecords || allWorldRecords.length === 0) {
    console.error('Error fetching world before resigning:', error);
    return null;
  }

  const userRecord = allWorldRecords.find(record => record.user_id === user.id);
  if (!userRecord?.user_team_id || !userRecord?.user_manager_id) {
    return loadGameState(worldId);
  }

  const teamId = userRecord.user_team_id;
  const managerId = userRecord.user_manager_id;
  const userTeams = { ...((userRecord.teams_data as any) || {}) };
  const userManagers = { ...((userRecord.managers_data as any) || {}) };
  const team = userTeams[teamId];
  const manager = userManagers[managerId];

  if (team) {
    userTeams[teamId] = {
      ...team,
      managerId: null
    };
  }

  if (manager) {
    userManagers[managerId] = {
      ...manager,
      career: {
        ...manager.career,
        currentTeamId: null
      }
    };
  }

  const { error: upsertError } = await supabase
    .from('games')
    .upsert({
      ...userRecord,
      teams_data: userTeams,
      managers_data: userManagers,
      user_team_id: null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,world_id' });

  if (upsertError) {
    console.error('Error resigning from team:', upsertError);
    return null;
  }

  return loadGameState(worldId);
};

export const listUserWorlds = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('games')
    .select('world_id, updated_at, world_state, user_id, is_public, is_creator')
    .eq('user_id', user.id);

  if (error) {
    console.error('Error listing worlds:', error);
    return [];
  }

  return data.map(d => ({
    id: d.world_id,
    updatedAt: d.updated_at,
    userId: d.user_id,
    name: (d.world_state as any).name || `Mundo ${d.world_id}`
  }));
};

export const deleteWorld = async (worldId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('games')
    .delete()
    .eq('user_id', user.id)
    .eq('world_id', worldId);

  if (error) {
    console.error('Error deleting world:', error);
    return false;
  }
  return true;
};

export const listPublicWorlds = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch all worlds except the user's own (to show as "Community" worlds)
  let query = supabase
    .from('games')
    .select('world_id, updated_at, world_state, user_id, is_public, is_creator')
    .eq('is_public', true)
    .eq('is_creator', true)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (user) {
    query = query.neq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing public worlds:', error);
    return [];
  }

  return data.map(d => ({
    id: d.world_id,
    updatedAt: d.updated_at,
    userId: d.user_id,
    name: (d.world_state as any).name || `Mundo ${d.world_id}`
  }));
};

// --- Realtime Sync ---
export const subscribeToWorld = (worldId: string, onUpdate: () => void) => {
  const channelName = `world:${worldId}`;
  const channel = supabase.channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `world_id=eq.${worldId}` },
      (payload) => {
        console.log('Realtime update received for world:', worldId, payload);
        onUpdate();
      }
    )
    .subscribe();

  return channel;
};

export const unsubscribeFromWorld = async (worldId: string) => {
  const channelName = `world:${worldId}`;
  await supabase.removeChannel(supabase.channel(channelName));
};
