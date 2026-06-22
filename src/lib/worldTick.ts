import { GameState } from '../types';
import { supabase } from './supabase';

type TickClaimResult = {
  ok: boolean;
  degraded?: boolean;
  error?: unknown;
};

const pad = (value: number) => String(value).padStart(2, '0');

export const buildWorldDayTickKey = (state: GameState) => {
  const date = new Date(state.world.currentDate);
  const hasValidDate = Number.isFinite(date.getTime());
  const dateKey = hasValidDate
    ? `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
    : 'unknown-date';
  const season = state.world.currentSeason || 2050;
  const day = state.world.currentDay ?? 0;

  return `season-${season}:day-${day}:${dateKey}`;
};

const isMissingRpcError = (error: any) =>
  error?.code === 'PGRST202' ||
  String(error?.message || '').toLowerCase().includes('could not find the function');

export const claimWorldTick = async (
  worldId: string | null,
  tickKey: string,
  gameDate: string
): Promise<TickClaimResult & { tickKey: string | null }> => {
  if (!worldId) {
    return { ok: true, degraded: true, tickKey: null };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { ok: true, degraded: true, tickKey };
  }

  const { data, error } = await supabase.rpc('claim_world_day_tick', {
    p_world_id: worldId,
    p_tick_key: tickKey,
    p_game_date: gameDate,
  });

  if (error) {
    console.warn('World tick lock unavailable:', error);
    return {
      ok: isMissingRpcError(error),
      degraded: isMissingRpcError(error),
      error,
      tickKey,
    };
  }

  return { ok: data === true, tickKey };
};

export const claimWorldDayTick = async (
  worldId: string | null,
  state: GameState
) => claimWorldTick(worldId, buildWorldDayTickKey(state), state.world.currentDate);

export const completeWorldDayTick = async (
  worldId: string | null,
  tickKey: string | null,
  success: boolean,
  errorMessage?: string
) => {
  if (!worldId || !tickKey) return;

  const { error } = await supabase.rpc('complete_world_day_tick', {
    p_world_id: worldId,
    p_tick_key: tickKey,
    p_success: success,
    p_error: errorMessage || null,
  });

  if (error) {
    console.warn('World tick completion failed:', error);
  }
};

export const commitWorldTickState = async (
  worldId: string | null,
  tickKey: string | null,
  state: GameState
) => {
  if (!worldId || !tickKey) return { ok: true, degraded: true };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: true, degraded: true };

  const { data, error } = await supabase.rpc('commit_world_tick_state', {
    p_world_id: worldId,
    p_tick_key: tickKey,
    p_world_state: state.world,
    p_teams_data: state.teams,
    p_players_data: state.players,
    p_managers_data: state.managers,
    p_notifications: state.notifications || [],
    p_last_headline: state.lastHeadline || {},
  });

  if (error) {
    console.warn('World tick master commit failed:', error);
    return {
      ok: isMissingRpcError(error),
      degraded: isMissingRpcError(error),
      error,
    };
  }

  return { ok: data === true };
};
