
import { createClient } from '@supabase/supabase-js';
import { GameState } from '../types';

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
    teams: masterGame.teams_data as any,
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

  const isCreator = masterRecord.user_id === user.id || masterRecord.is_creator === true;

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
    teams: mergedTeams,
    players: mergedPlayers,
    managers: mergedManagers,
    userTeamId: userRecord.user_team_id,
    userManagerId: userRecord.user_manager_id,
    notifications: userRecord.notifications || [],
    lastHeadline: userRecord.last_headline,
    training: userRecord.training_data || {
      cardLaboratory: { slots: [] },
      individualFocus: { evolutionSlot: null, stabilizationSlot: null },
      playstyleTraining: { currentStyle: null, understanding: {} }
    }
  };
  return gameState;
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
