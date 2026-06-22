import { SEASON_DAYS } from '../src/constants/gameConstants';
import { advanceGameDay, calculateTeamPower } from '../src/engine/gameLogic';
import { generateInitialState } from '../src/engine/generator';
import type { GameState, Manager, Match, MatchResult, Player, Team } from '../src/types';

const RUNS = Number(process.env.SEASON_SIM_RUNS || 12);
const TARGET_TEAM_ID = 't_29';
const DAY_MS = 24 * 60 * 60 * 1000;

type Scoreline = `${number}-${number}`;

type PlayedMatch = {
  match: Match;
  result: MatchResult;
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

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

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
      worldIds: ['sim_world_01'],
    },
    achievements: [],
  };

  state.managers[manager.id] = manager;
  state.userId = 'user_creator';
  state.userTeamId = teamId;
  state.userManagerId = manager.id;
  state.isCreator = true;
  state.worldId = 'sim_world_01';
  state.world.id = 'sim_world_01';
  state.world.name = 'Simulacao Motor Elite';
  state.world.status = 'LOBBY';
  state.world.currentDay = 0;
  state.world.access = {
    visibility: 'PRIVATE',
    allowObservers: true,
    allowMidSeasonJoin: true,
    allowTakeover: true,
    joinCode: 'SIM2050',
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
  let created = 0;
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
      created += 1;
    });
  return created;
};

const touchCreator = (state: GameState, day: number) => {
  const participant = state.participants?.find(item => item.userId === 'user_creator');
  if (participant) {
    participant.updatedAt = new Date(Date.now() + day * DAY_MS).toISOString();
  }
};

const standingsFor = (state: GameState, teamId: string) => {
  for (const league of Object.values(state.world.leagues)) {
    const sorted = [...league.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    });
    const index = sorted.findIndex(row => row.teamId === teamId);
    if (index >= 0) {
      return { league: league.name, position: index + 1, row: sorted[index], table: sorted };
    }
  }
  throw new Error(`Missing standings for ${teamId}`);
};

const playedMatches = (state: GameState): PlayedMatch[] => {
  const leagueMatches = Object.values(state.world.leagues)
    .flatMap(league => league.matches);
  const cupMatches = [
    ...Object.values(state.world.eliteCup.bracket || {}).flatMap(value => Array.isArray(value) ? value : value ? [value] : []),
    ...(state.world.districtCup.matches || []),
    ...(state.world.districtCup.final ? [state.world.districtCup.final] : []),
  ];

  return [...leagueMatches, ...cupMatches]
    .filter(match => match.played && match.result)
    .map(match => ({ match, result: match.result! }));
};

const teamMatches = (matches: PlayedMatch[], teamId: string) => matches
  .filter(({ match }) => match.homeTeamId === teamId || match.awayTeamId === teamId);

const scoreline = (result: MatchResult): Scoreline => `${result.homeScore}-${result.awayScore}`;

const scorelineStats = (matches: PlayedMatch[]) => {
  const scorelines = new Map<Scoreline, number>();
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let totalGoals = 0;
  let totalShots = 0;
  let blowouts = 0;
  let highest: PlayedMatch | null = null;
  let biggestWin: PlayedMatch | null = null;

  matches.forEach(item => {
    const { result } = item;
    const goals = result.homeScore + result.awayScore;
    const margin = Math.abs(result.homeScore - result.awayScore);
    totalGoals += goals;
    totalShots += (result.stats?.shots.home || 0) + (result.stats?.shots.away || 0);
    scorelines.set(scoreline(result), (scorelines.get(scoreline(result)) || 0) + 1);
    if (result.homeScore > result.awayScore) homeWins += 1;
    else if (result.awayScore > result.homeScore) awayWins += 1;
    else draws += 1;
    if (goals >= 7 || margin >= 4) blowouts += 1;
    if (!highest || goals > highest.result.homeScore + highest.result.awayScore) highest = item;
    if (!biggestWin || margin > Math.abs(biggestWin.result.homeScore - biggestWin.result.awayScore)) biggestWin = item;
  });

  return {
    played: matches.length,
    avgGoals: round(average(matches.map(item => item.result.homeScore + item.result.awayScore))),
    avgHomeGoals: round(average(matches.map(item => item.result.homeScore))),
    avgAwayGoals: round(average(matches.map(item => item.result.awayScore))),
    avgShots: round(totalShots / Math.max(1, matches.length)),
    homeWinRate: round(homeWins / Math.max(1, matches.length)),
    awayWinRate: round(awayWins / Math.max(1, matches.length)),
    drawRate: round(draws / Math.max(1, matches.length)),
    blowoutRate: round(blowouts / Math.max(1, matches.length)),
    commonScorelines: [...scorelines.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([line, count]) => ({ line, count })),
    highest,
    biggestWin,
  };
};

const teamPower = (state: GameState, teamId: string) => calculateTeamPower(state.teams[teamId], state.players);

const playerMovers = (state: GameState) => {
  const players = Object.values(state.players);
  const byDelta = [...players].sort((a, b) => (b.history.seasonRatingDelta || 0) - (a.history.seasonRatingDelta || 0));
  return {
    best: byDelta.slice(0, 5).map(playerSummary),
    worst: byDelta.slice(-5).reverse().map(playerSummary),
  };
};

const playerSummary = (player: Player) => ({
  name: player.name,
  team: player.contract.teamId,
  role: player.role,
  rating: player.totalRating,
  delta: player.history.seasonRatingDelta || 0,
  games: player.history.gamesPlayed || 0,
  avg: round(player.history.averageRating || 0, 2),
});

const teamPowerMovers = (before: Record<string, number>, state: GameState) => Object.values(state.teams)
  .filter(team => team.id.startsWith('t_'))
  .map(team => ({
    id: team.id,
    name: team.name,
    district: team.district,
    before: before[team.id],
    after: teamPower(state, team.id),
    delta: teamPower(state, team.id) - before[team.id],
  }))
  .sort((a, b) => b.delta - a.delta);

const describeMatch = (state: GameState, item: PlayedMatch | null) => {
  if (!item) return null;
  const home = state.teams[item.match.homeTeamId]?.name || item.match.homeTeamId;
  const away = state.teams[item.match.awayTeamId]?.name || item.match.awayTeamId;
  return `${home} ${item.result.homeScore}-${item.result.awayScore} ${away}`;
};

const prepareWorld = (seed: number) => withSeed(seed, () => {
  const state = generateInitialState();
  attachHumanCreator(state, TARGET_TEAM_ID);
  const npcCreated = fillVacantClubsWithNpc(state);
  return { state, npcCreated };
});

const runSeason = (seed: number) => withSeed(seed, () => {
  let { state, npcCreated } = prepareWorld(seed);
  const initialPowerByTeam = Object.fromEntries(
    Object.values(state.teams)
      .filter(team => team.id.startsWith('t_'))
      .map(team => [team.id, teamPower(state, team.id)])
  );
  const initialUserPower = initialPowerByTeam[TARGET_TEAM_ID];

  for (let day = 0; day < SEASON_DAYS; day += 1) {
    touchCreator(state, day);
    state = advanceGameDay(state);
  }

  const matches = playedMatches(state);
  const allScoreStats = scorelineStats(matches);
  const userMatches = teamMatches(matches, TARGET_TEAM_ID);
  const userScoreStats = scorelineStats(userMatches);
  const standing = standingsFor(state, TARGET_TEAM_ID);
  const movers = teamPowerMovers(initialPowerByTeam, state);
  const playerMovement = playerMovers(state);
  const finalUserPower = teamPower(state, TARGET_TEAM_ID);

  return {
    seed,
    npcCreated,
    state,
    matches,
    userMatches,
    standing,
    initialUserPower,
    finalUserPower,
    userPowerDelta: finalUserPower - initialUserPower,
    allScoreStats,
    userScoreStats,
    teamMovers: {
      best: movers.slice(0, 5),
      worst: movers.slice(-5).reverse(),
    },
    playerMovement,
  };
});

const summarizeRun = (run: ReturnType<typeof runSeason>) => {
  const userTeam = run.state.teams[TARGET_TEAM_ID];
  const participants = run.state.participants || [];
  const npcManagers = Object.values(run.state.managers).filter(manager => manager.isNPC !== false).length;
  const humanManagers = Object.values(run.state.managers).filter(manager => manager.isNPC === false).length;
  const userResults = run.userMatches.map(({ match, result }) => {
    const isHome = match.homeTeamId === TARGET_TEAM_ID;
    const gf = isHome ? result.homeScore : result.awayScore;
    const ga = isHome ? result.awayScore : result.homeScore;
    const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
    return {
      round: match.round,
      opponent: run.state.teams[opponentId]?.name || opponentId,
      score: `${gf}-${ga}`,
      outcome: gf > ga ? 'W' : gf < ga ? 'L' : 'D',
    };
  });

  return {
    flow: {
      world: run.state.world.name,
      joinCode: run.state.world.access?.joinCode,
      creatorTeam: `${userTeam.name} (${userTeam.district})`,
      participants: participants.length,
      humanManagers,
      npcManagers,
      npcAutofilledVacantClubs: run.npcCreated,
      worldStatusAfterSeason: run.state.world.status,
      phaseAfterSeason: run.state.world.phase,
      currentDay: run.state.world.currentDay,
    },
    userClub: {
      league: run.standing.league,
      position: run.standing.position,
      record: `${run.standing.row.won}W-${run.standing.row.drawn}D-${run.standing.row.lost}L`,
      points: run.standing.row.points,
      goals: `${run.standing.row.goalsFor}-${run.standing.row.goalsAgainst}`,
      score: `${run.initialUserPower} -> ${run.finalUserPower} (${run.userPowerDelta >= 0 ? '+' : ''}${run.userPowerDelta})`,
      matches: userResults,
    },
    matchEngine: {
      allMatchesPlayed: run.allScoreStats.played,
      avgGoals: run.allScoreStats.avgGoals,
      avgHomeGoals: run.allScoreStats.avgHomeGoals,
      avgAwayGoals: run.allScoreStats.avgAwayGoals,
      avgShots: run.allScoreStats.avgShots,
      drawRate: run.allScoreStats.drawRate,
      blowoutRate: run.allScoreStats.blowoutRate,
      commonScorelines: run.allScoreStats.commonScorelines,
      highestScore: describeMatch(run.state, run.allScoreStats.highest),
      biggestWin: describeMatch(run.state, run.allScoreStats.biggestWin),
    },
    userMatchEngine: {
      userMatchesPlayed: run.userScoreStats.played,
      avgGoals: run.userScoreStats.avgGoals,
      commonScorelines: run.userScoreStats.commonScorelines,
    },
    scoreMovement: {
      teamBest: run.teamMovers.best,
      teamWorst: run.teamMovers.worst,
      playerBest: run.playerMovement.best,
      playerWorst: run.playerMovement.worst,
    },
  };
};

const previousLog = console.log;
console.log = () => undefined;
const mainRun = runSeason(91001);
const aggregateRuns = Array.from({ length: RUNS }, (_, index) => runSeason(92000 + index));
console.log = previousLog;

const aggregate = {
  runs: RUNS,
  avgAllGoals: round(average(aggregateRuns.map(run => run.allScoreStats.avgGoals))),
  avgDrawRate: round(average(aggregateRuns.map(run => run.allScoreStats.drawRate))),
  avgBlowoutRate: round(average(aggregateRuns.map(run => run.allScoreStats.blowoutRate))),
  avgUserPosition: round(average(aggregateRuns.map(run => run.standing.position))),
  avgUserPoints: round(average(aggregateRuns.map(run => run.standing.row.points))),
  avgUserPowerDelta: round(average(aggregateRuns.map(run => run.userPowerDelta))),
  userTop4Rate: round(aggregateRuns.filter(run => run.standing.position <= 4).length / RUNS),
  userTitleRate: round(aggregateRuns.filter(run => run.standing.position === 1).length / RUNS),
  avgMatchesPlayed: round(average(aggregateRuns.map(run => run.allScoreStats.played))),
};

console.log(JSON.stringify({
  singleSeason: summarizeRun(mainRun),
  aggregate,
}, null, 2));
