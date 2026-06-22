// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { advanceGameDay } from './engine.mjs';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const CRON_SECRET = Deno.env.get('WORLD_CLOCK_CRON_SECRET') || '';
const MAX_DAYS_PER_RUN = Number(Deno.env.get('WORLD_CLOCK_MAX_DAYS_PER_RUN') || '30');
const DAY_MS = 24 * 60 * 60 * 1000;
const WORLD_TIME_ZONE = 'America/Sao_Paulo';

type GameRecord = {
  user_id: string;
  world_id: string;
  world_state: any;
  teams_data: Record<string, any>;
  players_data: Record<string, any>;
  managers_data: Record<string, any>;
  notifications: any[] | null;
  last_headline: any;
  updated_at: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const validDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const getNextGameMidnight = (currentDate?: string | null) => {
  const base = validDate(currentDate) || new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getCivilDayIndex = (date: Date, timeZone = WORLD_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);

  if (!year || !month || !day) return Math.floor(date.getTime() / DAY_MS);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
};

const addNotification = (state: any, title: string, message: string, type: 'info' | 'success' = 'info') => {
  state.notifications = [
    {
      id: `server_clock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date: state.world.currentDate,
      title,
      message,
      type,
      read: false,
    },
    ...(state.notifications || []),
  ].slice(0, 80);
};

const buildState = (record: GameRecord) => ({
  world: record.world_state || {},
  worldId: record.world_id,
  userId: record.user_id,
  isCreator: true,
  teams: record.teams_data || {},
  players: record.players_data || {},
  managers: record.managers_data || {},
  userTeamId: (record as any).user_team_id || null,
  userManagerId: (record as any).user_manager_id || null,
  notifications: record.notifications || [],
  lastHeadline: record.last_headline || {},
});

const openScheduledKickoff = (state: any, now: Date) => {
  const scheduledAt = validDate(state.world.startScheduledAt);
  if (state.world.status !== 'LOBBY' || state.world.currentDay !== -1 || !scheduledAt) {
    return { state, opened: false, extraDays: 0 };
  }

  const legacySchedule = scheduledAt.getUTCFullYear() >= 2040;
  if (!legacySchedule && scheduledAt.getTime() > now.getTime()) {
    return { state, opened: false, extraDays: 0 };
  }

  const nextState = structuredClone(state);
  const gameStart = validDate(nextState.world.seasonStartReal) || getNextGameMidnight(nextState.world.currentDate);
  nextState.world.currentDay = 0;
  nextState.world.status = 'LOBBY';
  nextState.world.startScheduledAt = null;
  nextState.world.currentDate = gameStart.toISOString();
  nextState.world.seasonStartReal = gameStart.toISOString();
  nextState.world.serverClockLastTickAt = now.toISOString();
  addNotification(
    nextState,
    'Draft Genesis aberto',
    'O servidor abriu o Dia 0 no horario agendado. O mundo continua andando mesmo com o app fechado.',
    'success'
  );

  const extraDays = legacySchedule
    ? 0
    : Math.max(0, getCivilDayIndex(now) - getCivilDayIndex(scheduledAt));
  return { state: nextState, opened: true, extraDays };
};

const getDueDays = (state: any, record: GameRecord, now: Date, extraDays = 0) => {
  if (state.world.currentDay < 0) return 0;
  if (state.world.status === 'FINISHED') return 0;

  const lastTick =
    validDate(state.world.serverClockLastTickAt) ||
    validDate(state.world.lastServerTickAt) ||
    validDate(record.updated_at) ||
    now;

  return Math.max(extraDays, getCivilDayIndex(now) - getCivilDayIndex(lastTick));
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    if (CRON_SECRET) {
      const received = req.headers.get('x-cron-secret') || '';
      if (received !== CRON_SECRET) {
        return json({ error: 'UNAUTHORIZED' }, 401);
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('is_creator', true)
      .order('updated_at', { ascending: true });

    if (error) throw error;

    const results: any[] = [];
    const worlds: any[] = [];

    for (const record of (data || []) as GameRecord[]) {
      let state = buildState(record);
      const kickoff = openScheduledKickoff(state, now);
      state = kickoff.state;

      const dueDays = Math.min(MAX_DAYS_PER_RUN, getDueDays(state, record, now, kickoff.extraDays));
      let advancedDays = 0;

      for (let i = 0; i < dueDays; i += 1) {
        if (state.world.currentDay === -1) break;
        state = advanceGameDay(state, false);
        advancedDays += 1;
      }

      worlds.push({
        worldId: record.world_id,
        name: state.world.name || record.world_id,
        status: state.world.status,
        phase: state.world.phase,
        currentSeason: state.world.currentSeason,
        currentDay: state.world.currentDay,
        currentDate: state.world.currentDate,
        startScheduledAt: state.world.startScheduledAt || null,
        serverClockLastTickAt: state.world.serverClockLastTickAt || null,
        dueDays,
        updatedAt: record.updated_at,
      });

      if (!kickoff.opened && advancedDays === 0) {
        continue;
      }

      state.world.serverClockLastTickAt = now.toISOString();

      const { error: updateError } = await supabase
        .from('games')
        .update({
          world_state: state.world,
          teams_data: state.teams,
          players_data: state.players,
          managers_data: state.managers,
          notifications: state.notifications,
          last_headline: state.lastHeadline || {},
          updated_at: now.toISOString(),
        })
        .eq('user_id', record.user_id)
        .eq('world_id', record.world_id)
        .eq('is_creator', true);

      if (updateError) throw updateError;

      results.push({
        worldId: record.world_id,
        name: state.world.name || record.world_id,
        openedKickoff: kickoff.opened,
        advancedDays,
        currentDay: state.world.currentDay,
        status: state.world.status,
        phase: state.world.phase,
      });
    }

    return json({ ok: true, processed: results.length, now: now.toISOString(), worlds, results });
  } catch (error) {
    console.error('world-clock-runner failed:', error);
    return json({ ok: false, error: error?.message || String(error) }, 500);
  }
});
