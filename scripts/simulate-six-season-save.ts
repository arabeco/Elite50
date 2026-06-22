import { SEASON_DAYS } from '../src/constants/gameConstants';
import { advanceGameDay, calculateTeamPower, startNewSeason } from '../src/engine/gameLogic';
import { generateInitialState } from '../src/engine/generator';
import type { District, GameState, LeagueTeamStats, Manager, Team } from '../src/types';

const TARGET_TEAM_ID = 't_29';
const SEASONS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

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

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const sortStandings = (rows: LeagueTeamStats[]) => [...rows].sort((a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId.localeCompare(b.teamId);
});

const attachHumanCreator = (state: GameState, teamId: string) => {
  const team = state.teams[teamId];
  if (!team) throw new Error(`Missing team ${teamId}`);

  team.name = 'Becos Lab FC';
  team.city = 'Becos Prime';
  team.managerId = 'manager_creator';
  team.tactics.playStyle = 'Equilibrado';
  team.tactics.mentality = 'Calculista';
  team.tactics.linePosition = 52;
  team.tactics.aggressiveness = 48;
  team.tactics.intensity = 54;
  team.tactics.width = 50;
  team.tactics.passing = 56;

  const manager: Manager = {
    id: 'manager_creator',
    name: 'Afonso Becos',
    originDistrict: team.originDistrict || team.district,
    district: team.district,
    reputation: 50,
    preferredPlayStyle: 'Equilibrado',
    ownedTraitIds: [],
    equippedTraitIds: [],
    isNPC: false,
    attributes: {
      evolution: 58,
      negotiation: 52,
      scout: 55,
    },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: teamId,
      historyTeamIds: [],
      worldIds: ['six_season_save'],
    },
    achievements: [],
  };

  state.managers[manager.id] = manager;
  state.userId = 'user_creator';
  state.userTeamId = teamId;
  state.userManagerId = manager.id;
  state.isCreator = true;
  state.worldId = 'six_season_save';
  state.world.id = 'six_season_save';
  state.world.name = 'Save 6 Seasons';
  state.world.status = 'LOBBY';
  state.world.currentDay = 0;
  state.world.access = {
    visibility: 'PRIVATE',
    allowObservers: true,
    allowMidSeasonJoin: true,
    allowTakeover: true,
    joinCode: 'SIX2050',
  };
  state.training.playstyleTraining.currentStyle = team.tactics.playStyle;
  state.training.playstyleTraining.understanding[team.tactics.playStyle] = 76;

  const focusPlayer = team.squad
    .map(id => state.players[id])
    .filter(Boolean)
    .sort((a, b) => b.potential - a.potential)[0];
  const stabilizePlayer = team.squad
    .map(id => state.players[id])
    .filter(Boolean)
    .sort((a, b) => b.totalRating - a.totalRating)[0];

  state.training.individualFocus.evolutionSlot = focusPlayer?.id || null;
  state.training.individualFocus.stabilizationSlot = stabilizePlayer?.id || null;

  state.participants = [
    {
      userId: 'user_creator',
      teamId,
      managerId: manager.id,
      isCreator: true,
      isObserver: false,
      updatedAt: new Date().toISOString(),
    },
    {
      userId: 'user_guest_01',
      teamId: null,
      managerId: null,
      isCreator: false,
      isObserver: true,
      updatedAt: new Date().toISOString(),
    },
  ];
};

const fillVacantClubsWithNpc = (state: GameState) => {
  Object.values(state.teams)
    .filter(team => team.id.startsWith('t_') && !team.managerId)
    .forEach((team, index) => {
      const managerId = `manager_autofill_${index + 1}`;
      const manager: Manager = {
        id: managerId,
        name: `NPC Auto ${index + 1}`,
        originDistrict: team.originDistrict || team.district,
        district: team.district,
        reputation: 35 + index * 4,
        preferredPlayStyle: team.tactics.playStyle,
        ownedTraitIds: [],
        equippedTraitIds: [],
        isNPC: true,
        attributes: {
          evolution: 45,
          negotiation: 45,
          scout: 45,
        },
        career: {
          titlesWon: 0,
          totalLeagueTitles: 0,
          totalCupTitles: 0,
          hallOfFameEntries: 0,
          consecutiveTitles: 0,
          currentTeamId: team.id,
          historyTeamIds: [],
        },
        achievements: [],
      };
      state.managers[managerId] = manager;
      team.managerId = managerId;
    });
};

const touchCreator = (state: GameState, day: number, seasonIndex: number) => {
  const participant = state.participants?.find(item => item.userId === 'user_creator');
  if (participant) {
    participant.updatedAt = new Date(Date.now() + (seasonIndex * 40 + day) * DAY_MS).toISOString();
  }
};

const teamLabel = (state: GameState, teamId?: string | null) => {
  if (!teamId) return 'sem vencedor';
  const team = state.teams[teamId];
  return team ? `${team.name} (${team.district})` : teamId;
};

const teamScores = (state: GameState) => Object.fromEntries(
  Object.values(state.teams)
    .filter(team => team.id.startsWith('t_'))
    .map(team => [team.id, calculateTeamPower(team, state.players)])
);

const districtMap = (state: GameState) => Object.fromEntries(
  Object.values(state.teams)
    .filter(team => team.id.startsWith('t_'))
    .map(team => [team.id, team.district])
) as Record<string, District>;

const teamScoreMovers = (state: GameState, before: Record<string, number>) => Object.values(state.teams)
  .filter(team => team.id.startsWith('t_'))
  .map(team => {
    const after = calculateTeamPower(team, state.players);
    return {
      id: team.id,
      name: team.name,
      district: team.district,
      before: before[team.id] || 0,
      after,
      delta: after - (before[team.id] || 0),
    };
  })
  .sort((a, b) => b.delta - a.delta);

const leagueSummaries = (state: GameState) => Object.entries(state.world.leagues).map(([, league]) => {
  const sorted = sortStandings(league.standings);
  const champion = sorted[0];
  const userIndex = sorted.findIndex(row => row.teamId === TARGET_TEAM_ID);
  return {
    league: league.name,
    champion: teamLabel(state, champion?.teamId),
    championRecord: champion ? `${champion.won}W-${champion.drawn}D-${champion.lost}L` : '-',
    championPoints: champion?.points || 0,
    userPosition: userIndex >= 0 ? userIndex + 1 : null,
  };
});

const compareDistrictChanges = (
  beforeState: GameState,
  afterState: GameState,
  beforeDistricts: Record<string, District>
) => Object.values(afterState.teams)
  .filter(team => team.id.startsWith('t_') && beforeDistricts[team.id] && beforeDistricts[team.id] !== team.district)
  .map(team => ({
    team: team.name,
    from: beforeDistricts[team.id],
    to: team.district,
    score: calculateTeamPower(team, afterState.players),
    note: beforeState.teams[team.id]?.name || team.id,
  }));

const topPlayers = (state: GameState, initialRatings: Record<string, number>) => Object.values(state.players)
  .sort((a, b) => b.totalRating - a.totalRating)
  .slice(0, 5)
  .map(player => {
    const team = player.contract.teamId ? state.teams[player.contract.teamId] : null;
    return {
      name: player.name,
      role: player.role,
      rating: player.totalRating,
      sixSeasonDelta: player.totalRating - (initialRatings[player.id] || player.totalRating),
      team: team?.name || 'Livre',
      district: player.originDistrict || player.district,
      gamesCareerNow: player.history.careerGamesPlayed + player.history.gamesPlayed,
      lastAvg: round(player.history.averageRating || player.history.careerAverageRating || 0, 2),
    };
  });

const previousLog = console.log;
console.log = () => undefined;

const result = withSeed(106006, () => {
  let state = generateInitialState();
  attachHumanCreator(state, TARGET_TEAM_ID);
  fillVacantClubsWithNpc(state);

  const initialRatings = Object.fromEntries(
    Object.values(state.players).map(player => [player.id, player.totalRating])
  );
  const initialTeamScores = teamScores(state);
  const seasons: unknown[] = [];

  for (let seasonIndex = 0; seasonIndex < SEASONS; seasonIndex += 1) {
    const season = state.world.currentSeason || 2050;
    const seasonStartScores = teamScores(state);
    const beforeDistricts = districtMap(state);

    for (let day = 0; day < SEASON_DAYS; day += 1) {
      touchCreator(state, day, seasonIndex);
      state = advanceGameDay(state);
    }

    const movers = teamScoreMovers(state, seasonStartScores);
    const userScoreAfter = calculateTeamPower(state.teams[TARGET_TEAM_ID], state.players);
    const userStanding = leagueSummaries(state)
      .find(item => item.userPosition !== null);

    const beforeRotationState = state;
    const afterRotationState = startNewSeason(state);
    const districtChanges = compareDistrictChanges(beforeRotationState, afterRotationState, beforeDistricts);

    seasons.push({
      season,
      leagueChampions: leagueSummaries(beforeRotationState).map(item => ({
        league: item.league,
        champion: item.champion,
        record: item.championRecord,
        points: item.championPoints,
      })),
      eliteCupWinner: teamLabel(beforeRotationState, beforeRotationState.world.eliteCup.winnerId),
      districtCupWinner: teamLabel(beforeRotationState, beforeRotationState.world.districtCup.winnerId),
      userClub: {
        position: userStanding?.userPosition,
        score: `${seasonStartScores[TARGET_TEAM_ID]} -> ${userScoreAfter}`,
        delta: userScoreAfter - seasonStartScores[TARGET_TEAM_ID],
      },
      scoreMovers: {
        best: movers.slice(0, 3),
        worst: movers.slice(-3).reverse(),
      },
      districtChanges,
    });

    state = afterRotationState;
  }

  const finalScores = teamScores(state);
  const sixSeasonTeamMovers = Object.values(state.teams)
    .filter((team): team is Team => team.id.startsWith('t_'))
    .map(team => ({
      id: team.id,
      name: team.name,
      district: team.district,
      start: initialTeamScores[team.id],
      finish: finalScores[team.id],
      delta: finalScores[team.id] - initialTeamScores[team.id],
    }))
    .sort((a, b) => b.delta - a.delta);

  return {
    save: {
      world: state.world.name,
      currentSeason: state.world.currentSeason,
      userClub: teamLabel(state, TARGET_TEAM_ID),
      participants: state.participants?.length || 0,
    },
    seasons,
    sixSeasonScoreMovers: {
      best: sixSeasonTeamMovers.slice(0, 5),
      worst: sixSeasonTeamMovers.slice(-5).reverse(),
      userClub: sixSeasonTeamMovers.find(team => team.id === TARGET_TEAM_ID),
    },
    finalTop5Players: topPlayers(state, initialRatings),
  };
});

console.log = previousLog;
console.log(JSON.stringify(result, null, 2));
