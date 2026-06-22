import { SEASON_DAYS } from '../src/constants/gameConstants';
import { advanceGameDay, calculateTeamPower, startNewSeason } from '../src/engine/gameLogic';
import { generateInitialState } from '../src/engine/generator';
import type { GameState, Manager } from '../src/types';

const RUNS = 10;
const SEASONS = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const TARGET_TEAM_ID = 't_1';

type TeamKey = 'active' | 'idle' | 'npc';

type SeasonRow = {
  key: TeamKey;
  season: number;
  position: number;
  points: number;
  power: number;
  powerDelta: number;
  leagueChampion: boolean;
  eliteCupChampion: boolean;
};

const createRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
};

const withSeed = <T>(seed: number, fn: () => T): T => {
  const previousRandom = Math.random;
  Math.random = createRandom(seed);
  try {
    return fn();
  } finally {
    Math.random = previousRandom;
  }
};

const attachHumanManager = (state: GameState, teamId: string, managerId: string, name: string) => {
  const team = state.teams[teamId];
  if (!team) throw new Error(`Missing team ${teamId}`);

  const manager: Manager = {
    id: managerId,
    name,
    district: team.district,
    reputation: 50,
    isNPC: false,
    attributes: {
      evolution: 50,
      negotiation: 50,
      scout: 50,
    },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: teamId,
      historyTeamIds: [],
    },
    achievements: [],
  };

  state.managers[managerId] = manager;
  team.managerId = managerId;
};

const standingsFor = (state: GameState, teamId: string) => {
  for (const league of Object.values(state.world.leagues)) {
    const sorted = [...league.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    });
    const index = sorted.findIndex(row => row.teamId === teamId);
    if (index >= 0) return { row: sorted[index], position: index + 1 };
  }
  throw new Error(`Missing standings for ${teamId}`);
};

const prepareWorld = (seed: number, mode: TeamKey) => withSeed(seed, () => {
  const state = generateInitialState();
  if (mode !== 'npc') {
    attachHumanManager(state, TARGET_TEAM_ID, `human_${mode}`, mode === 'active' ? 'Humano Ativo' : 'Humano Inativo');
  }

  const team = state.teams[TARGET_TEAM_ID];
  state.userId = mode === 'npc' ? undefined : `u_${mode}`;
  state.userTeamId = mode === 'npc' ? null : TARGET_TEAM_ID;
  state.userManagerId = mode === 'npc' ? null : `human_${mode}`;
  state.isCreator = true;
  state.world.status = 'LOBBY';
  state.world.currentDay = 0;

  if (mode === 'active') {
    state.training.playstyleTraining.currentStyle = team.tactics.playStyle;
    state.training.playstyleTraining.understanding[team.tactics.playStyle] = 70;
  }

  state.participants = mode === 'npc' ? [] : [
    {
      userId: `u_${mode}`,
      teamId: TARGET_TEAM_ID,
      managerId: `human_${mode}`,
      isCreator: true,
      isObserver: false,
      updatedAt: mode === 'active'
        ? new Date().toISOString()
        : new Date(Date.now() - 3 * DAY_MS).toISOString(),
    },
  ];

  return state;
});

const touchActiveParticipant = (state: GameState, mode: TeamKey) => {
  if (mode !== 'active') return;
  const active = state.participants?.find(participant => participant.teamId === TARGET_TEAM_ID);
  if (active) active.updatedAt = new Date().toISOString();
};

const runOneMode = (seed: number, mode: TeamKey) => withSeed(seed, () => {
  let state = prepareWorld(seed, mode);
  const initialPower = calculateTeamPower(state.teams[TARGET_TEAM_ID], state.players);
  const rows: SeasonRow[] = [];

  for (let seasonIndex = 0; seasonIndex < SEASONS; seasonIndex += 1) {
    for (let day = 0; day < SEASON_DAYS; day += 1) {
      touchActiveParticipant(state, mode);
      state = advanceGameDay(state);
    }

    const standing = standingsFor(state, TARGET_TEAM_ID);
    const team = state.teams[TARGET_TEAM_ID];
    const power = calculateTeamPower(team, state.players);
    rows.push({
      key: mode,
      season: state.world.currentSeason || 2050,
      position: standing.position,
      points: standing.row.points,
      power,
      powerDelta: power - initialPower,
      leagueChampion: standing.position === 1,
      eliteCupChampion: state.world.eliteCup.winnerId === TARGET_TEAM_ID,
    });

    state = startNewSeason(state);
  }

  return rows;
});

const runOne = (seed: number) => (['active', 'idle', 'npc'] as TeamKey[])
  .flatMap(mode => runOneMode(seed, mode));

const previousLog = console.log;
console.log = () => undefined;
const allRows = Array.from({ length: RUNS }, (_, index) => runOne(5000 + index)).flat();
console.log = previousLog;

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const byKey = (key: TeamKey) => allRows.filter(row => row.key === key);

const summary = (key: TeamKey) => {
  const rows = byKey(key);
  return {
    team: key,
    seasons: rows.length,
    avgPosition: Number(average(rows.map(row => row.position)).toFixed(2)),
    avgPoints: Number(average(rows.map(row => row.points)).toFixed(2)),
    avgPowerDelta: Number(average(rows.map(row => row.powerDelta)).toFixed(2)),
    top4Rate: Number((rows.filter(row => row.position <= 4).length / rows.length).toFixed(2)),
    championRate: Number((rows.filter(row => row.position === 1).length / rows.length).toFixed(2)),
    leagueTitles: rows.filter(row => row.leagueChampion).length,
    eliteCupTitles: rows.filter(row => row.eliteCupChampion).length,
  };
};

console.log(JSON.stringify({
  runs: RUNS,
  seasonsPerRun: SEASONS,
  teams: {
    target: TARGET_TEAM_ID,
  },
  summary: [summary('active'), summary('idle'), summary('npc')],
}, null, 2));
