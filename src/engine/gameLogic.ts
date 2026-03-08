import { GameState, Team, Player, PlayerRole, LeagueTeamStats, GameNotification, District, MatchResult, TeamStats, Match, TacticalCard } from '../types';
import { simulateMatch, TeamStats as MatchTeamStats } from './MatchEngine';
import { calculateEvolution } from './simulation';
import { generateCalendar } from './CalendarGenerator';
import { generateBadges, generatePlayer } from './generator';
import { calculatePostMatchProgression, processNightMarket, calculateSatisfactionUpdate } from './economyLogic';
import { initDistrictCup, finalizeDistrictCup } from './districtCupLogic';
import { newsHeadlines, generateSeasonReport } from './newsService';
import { shuffleBottomTeams } from './migrationLogic';

import {
  MAX_TEAM_POWER,
  MAX_TEAM_POWER_TIER_1,
  SEASON_ROUNDS,
  ELITE_CUP_ROUNDS,
  DISTRICT_CUP_ROUNDS,
  SEASON_DAYS,
  MATCH_INTERVAL_DAYS,
  TOTAL_ROUNDS,
  SAFETY_NET_TOTAL,
  SAFETY_NET_MIN_PLAYERS,
  SAFETY_NET_FREE_AGENT_RATING,
  SQUAD_SIZE_MAX
} from '../constants/gameConstants';

// --- Helpers ---

export const getSeasonDayNumber = (dateStr: string, seasonStartRealStr?: string | null, worldDay?: number) => {
  if (worldDay !== undefined) return worldDay;
  if (!seasonStartRealStr) return 0;
  const seasonStart = new Date(seasonStartRealStr);
  const current = new Date(dateStr);

  if (current < seasonStart) return 0;

  const diffDays = Math.floor((current.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
  return (diffDays % SEASON_DAYS) + 1;
};

const isSeasonMatchDay = (dayNumber: number) => {
  if (dayNumber < 3) return false;

  if (dayNumber <= 29) return dayNumber % 2 !== 0;

  // Elite Cup (Oitavas, Quartas, Semis, Final - with 1 rest day in between)
  // Day 30, 32, 34, 36
  if (dayNumber >= 30 && dayNumber <= 36) return (dayNumber - 30) % 2 === 0;

  // District Cup (Rodada 1, 2, 3, Final - consecutive)
  // Day 37, 38, 39, 40
  if (dayNumber >= 37 && dayNumber <= 40) return true;

  return false;
};

const getRoundFromDay = (dayNumber: number) => {
  if (dayNumber < 3) return 0;

  if (dayNumber <= 29) {
    if (dayNumber % 2 !== 0) return Math.floor(dayNumber / 2);
    else return 0; // Rest days between league matches
  }

  if (dayNumber >= 30 && dayNumber <= 36) {
    if ((dayNumber - 30) % 2 === 0) {
      return 14 + ((dayNumber - 30) / 2) + 1;
    } else {
      return 0; // Rest day during Elite Cup
    }
  }

  if (dayNumber >= 37 && dayNumber <= 40) {
    return 18 + (dayNumber - 36);
  }

  return 0; // No round
};

const sortStandings = (standings: LeagueTeamStats[]) =>
  [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    return gdB - gdA;
  });

const shuffle = <T,>(items: T[]) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const calculateTeamAttribute = (team: Team, players: Record<string, Player>, attr: 'attack' | 'midfield' | 'defense' | 'goalkeeper'): number => {
  const squadPlayers = team.squad.map(id => players[id]).filter(p => !!p).sort((a, b) => b.totalRating - a.totalRating);
  if (squadPlayers.length === 0) return 50;
  const top11 = squadPlayers.slice(0, 11);
  const sum = top11.reduce((sum, p) => sum + p.totalRating, 0);
  // We keep a scaled value for match engine logic, but it's based on the sum
  // Since 11 players * 1000 max = 11000, we scale to 0-100 for the engine
  return Math.round(sum / 110);
};

export const calculateTeamPower = (team: Team, players: Record<string, Player>): number => {
  if (!team.squad || team.squad.length === 0) return 0;
  return team.squad.reduce((sum, playerId) => {
    const player = players[playerId];
    return sum + (player ? player.totalRating : 0);
  }, 0);
};

export const checkPowerCap = (team: Team, players: Record<string, Player>): boolean => {
  const total = calculateTeamPower(team, players);

  // Use the persistent powerCap if it exists, otherwise use base values
  if (team.powerCap !== undefined) {
    return total <= team.powerCap;
  }

  // Cyan (Elite) = 12k, Orange/Purple (Mid) = 10k, Green (Low) = 8k
  let cap = 12000;
  if (team.league === 'Orange' || team.league === 'Purple') cap = 10000;
  else if (team.league === 'Green') cap = 8000;
  return total <= cap;
};

export const applySafetyNet = (state: GameState, teamId: string) => {
  const team = state.teams[teamId];
  if (!team) return;

  const totalBefore = calculateTeamPower(team, state.players);
  const missingPlayers = Math.max(0, SAFETY_NET_MIN_PLAYERS - team.squad.length);
  let addedPlayers = 0;

  if (missingPlayers > 0) {
    const freeAgents = Object.values(state.players).filter(p => !p.contract.teamId);
    for (const agent of freeAgents) {
      if (addedPlayers >= missingPlayers) break;
      team.squad.push(agent.id);
      state.players[agent.id].contract.teamId = team.id;
      state.players[agent.id].totalRating = SAFETY_NET_FREE_AGENT_RATING;
      if (state.players[agent.id].potential < SAFETY_NET_FREE_AGENT_RATING) {
        state.players[agent.id].potential = SAFETY_NET_FREE_AGENT_RATING;
      }
      addedPlayers++;
    }
  }

  if (addedPlayers > 0) {
    const message = `Piso de segurança ativado. ${addedPlayers} jogadores recrutados para o elenco.`;
    const notification: GameNotification = {
      id: `n_${Date.now()}_safetynet_${team.id}`,
      date: state.world.currentDate,
      title: 'Liga dos Renegados',
      message,
      type: 'info',
      read: false
    };
    state.notifications = [notification, ...state.notifications];
  }
};

export const updateStandings = (standings: LeagueTeamStats[], homeId: string, awayId: string, homeScore: number, awayScore: number) => {
  const homeStats = standings.find(s => s.teamId === homeId);
  const awayStats = standings.find(s => s.teamId === awayId);

  if (homeStats && awayStats) {
    homeStats.played++;
    awayStats.played++;
    homeStats.goalsFor += homeScore;
    homeStats.goalsAgainst += awayScore;
    awayStats.goalsFor += awayScore;
    awayStats.goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      homeStats.won++;
      homeStats.points += 3;
      awayStats.lost++;
    } else if (awayScore > homeScore) {
      awayStats.won++;
      awayStats.points += 3;
      homeStats.lost++;
    } else {
      homeStats.drawn++;
      homeStats.points += 1;
      awayStats.drawn++;
      awayStats.points += 1;
    }
  }
};

export const updatePlayerSatisfaction = (state: GameState, teamId: string, result: MatchResult | null) => {
  const team = state.teams[teamId];
  if (!team || !team.squad) return;

  const lineupIds = Object.values(team.lineup).filter(Boolean);
  const isHome = result?.homeTeamId === teamId;
  const teamWon = result ? (isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore) : false;

  team.squad.forEach(playerId => {
    const player = state.players[playerId];
    if (!player) return;

    const isStarter = lineupIds.includes(playerId);
    const matchRating = result?.ratings?.[playerId] || null;

    player.satisfaction = calculateSatisfactionUpdate(player, matchRating, teamWon, isStarter);
  });
};

const updatePlayerEvolutions = (
  state: GameState,
  result: MatchResult,
  homePlayers: Player[],
  awayPlayers: Player[],
  homePower: number,
  awayPower: number
) => {
  const homeDifficulty = awayPower / Math.max(1, homePower);
  const awayDifficulty = homePower / Math.max(1, awayPower);

  homePlayers.forEach(player => {
    updateSinglePlayerEvolution(state, player, result, homeDifficulty);
  });

  awayPlayers.forEach(player => {
    updateSinglePlayerEvolution(state, player, result, awayDifficulty);
  });
};

const updateSinglePlayerEvolution = (state: GameState, player: Player, result: MatchResult, difficulty: number) => {
  // 1. Basic Stats
  player.history.gamesPlayed++;

  // 2. Goals & Assists
  const goals = result.scorers.filter(s => s.playerId === player.id).length;
  const assists = result.assists.filter(a => a.playerId === player.id).length;
  player.history.goals += goals;
  player.history.assists += assists;

  // 3. Rating Evolution
  let matchRating = result.ratings?.[player.id];

  // If no rating (no events), give average 6.0 with variance
  if (matchRating === undefined) {
    matchRating = 6.0 + (Math.random() - 0.5); // 5.5 - 6.5

    // Team performance bonus (participation in the win)
    const teamId = player.contract.teamId;
    if (teamId) {
      const isHome = result.homeTeamId === teamId;
      const teamWon = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
      const teamDraw = result.homeScore === result.awayScore;

      if (teamWon) matchRating += 0.8;
      else if (teamDraw) matchRating += 0.3;
      else matchRating -= 0.5; // Penalty for losing even if not involved in events
    }
  }

  // Ensure rating is within bounds
  matchRating = Math.max(3, Math.min(10, matchRating));

  const delta = calculatePostMatchProgression(player, matchRating);
  const newRating = player.totalRating + delta;

  // Dynamic Power Cap Logic:
  if (player.contract.teamId) {
    const team = state.teams[player.contract.teamId];
    if (team) {
      if (team.powerCap === undefined) {
        team.powerCap = team.league === 'Cyan' ? 12000 : (team.league === 'Orange' || team.league === 'Purple') ? 10000 : 8000;
      }

      // Profit Logic: Only increase powerCap if player gained rating
      if (delta > 0) {
        team.powerCap += delta;
      }
    }
  }
  // Hall of Fame Logic: If hits 900+ while under a manager
  if (newRating >= 900 && !player.achievements.some(a => a.title === 'Membro do Hall da Fama')) {
    player.achievements.push({
      season: state.world.currentSeason || 2050,
      title: 'Membro do Hall da Fama',
      type: 'Clube'
    });

    if (player.contract.teamId) {
      const team = state.teams[player.contract.teamId];
      if (team && team.managerId && state.managers[team.managerId]) {
        state.managers[team.managerId].career.hallOfFameEntries += 1;
      }
    }
  }

  player.totalRating = newRating;

  // Shadow Pool Rotation: If falls below 400, swap with an Exiled player
  if (newRating < 400) {
    const exiled = Object.values(state.players).find(p => p.district === 'EXILADO' && p.totalRating === 400);
    if (exiled) {
      const oldTeamId = player.contract.teamId;
      if (oldTeamId) {
        state.teams[oldTeamId].squad = state.teams[oldTeamId].squad.filter(id => id !== player.id);
      }
      player.contract.teamId = '';
      player.district = 'EXILADO';
      player.totalRating = 400; // Reset for his exile time

      newsHeadlines.exile(state, player);

      exiled.district = 'NORTE'; // Back to active (random district)
      exiled.contract.teamId = ''; // Becomes FREE AGENT
    }
    player.totalRating = 400;
  } else {
    player.totalRating = Math.min(1000, newRating);
  }

  player.history.seasonRatingDelta = (player.history.seasonRatingDelta || 0) + delta;

  // Pentágono e Form
  player.history.lastMatchRatings = [matchRating, ...(player.history.lastMatchRatings || [])].slice(0, 5);

  const oldGames = player.history.gamesPlayed - 1;
  player.history.averageRating = Number(((player.history.averageRating * oldGames + matchRating) / player.history.gamesPlayed).toFixed(2));
};

export const calculateAttr = (sel: { gk: Player, def: Player[], mid: Player[], att: Player[] }, attr: string, hypePlayerId?: string | null) => {
  if (attr === 'goalkeeper') {
    const hypeBonus = sel.gk.id === hypePlayerId ? 1.03 : 1.0;
    return Math.round((sel.gk.totalRating * hypeBonus) * (sel.gk.role === 'GOL' ? 1.0 : 0.5) / 10);
  }
  let players: Player[] = [];
  let targetRole: PlayerRole = 'ZAG';
  if (attr === 'defense') { players = sel.def; targetRole = 'ZAG'; }
  if (attr === 'midfield') { players = sel.mid; targetRole = 'MEI'; }
  if (attr === 'attack') { players = sel.att; targetRole = 'ATA'; }

  if (players.length === 0) return 0;

  const sum = players.reduce((acc, p) => {
    const isTarget = p.role === targetRole;
    const penalty = isTarget ? 1.0 : 0.6;
    const hypeBonus = p.id === hypePlayerId ? 1.03 : 1.0;
    return acc + (p.totalRating * penalty * hypeBonus);
  }, 0);

  // Scaling to 0-100 range for MatchEngine
  return Math.round(sum / (players.length || 1) / 10);
};

export const getMatchSquad = (team: Team, players: Record<string, Player>): { gk: Player, def: Player[], mid: Player[], att: Player[], all: Player[] } => {
  // 1. Try to use manual lineup if strictly defined (11 players)
  const lineup = team.lineup || {};
  const lineupIds = Object.values(lineup).filter(Boolean);

  if (lineupIds.length >= 11) {
    const starters = lineupIds.map(id => players[id]).filter(p => !!p);

    // Categorize by SLOT ID prefix to respect "out of position" choices
    let gk: Player | null = null;
    const def: Player[] = [];
    const mid: Player[] = [];
    const att: Player[] = [];

    Object.entries(lineup).forEach(([slotId, playerId]) => {
      const p = players[playerId];
      if (!p) return;

      if (slotId.startsWith('GOL')) gk = p;
      else if (slotId.startsWith('ZAG')) def.push(p);
      else if (slotId.startsWith('MEI')) mid.push(p);
      else if (slotId.startsWith('ATA')) att.push(p);
    });

    // Fallback if slot naming is weird or GK missing
    if (!gk) gk = starters.find(p => p.role === 'GOL') || starters[0];
    const all = [gk, ...def, ...mid, ...att];

    return { gk, def, mid, att, all };
  }

  // 2. Fallback to Auto-selection (Old behavior for AI teams)
  const squad = team.squad.map(id => players[id]).filter(p => !!p);

  // EMPTY SQUAD FIX: If team has absolutely no players, supply a dummy squad to avoid engine crash (W.O. will be evaluated before match logic anyway, but engine might run routines on this)
  if (squad.length === 0) {
    const dummyObj = { id: 'dummy', role: 'ATA', totalRating: 10, contract: { teamId: team.id } } as Player;
    return { gk: dummyObj, def: [dummyObj], mid: [dummyObj], att: [dummyObj], all: [dummyObj] };
  }

  let gk = squad.find(p => p.role === 'GOL');
  if (!gk) {
    const sorted = [...squad].sort((a, b) => b.totalRating - a.totalRating);
    gk = sorted[0];
  }

  if (!gk) {
    // Ultimate fallback
    const dummyObj = { id: 'dummy', role: 'ATA', totalRating: 10, contract: { teamId: team.id } } as Player;
    return { gk: dummyObj, def: [dummyObj], mid: [dummyObj], att: [dummyObj], all: [dummyObj] };
  }

  let pool = squad.filter(p => p.id !== gk!.id);
  pool.sort((a, b) => b.totalRating - a.totalRating);

  const def: Player[] = [];
  const mid: Player[] = [];
  const att: Player[] = [];

  const fill = (target: Player[], roles: string[], count: number) => {
    for (let i = 0; i < count; i++) {
      if (target.length >= count) break;
      const idx = pool.findIndex(p => roles.includes(p.role));
      if (idx !== -1) {
        target.push(pool[idx]);
        pool.splice(idx, 1);
      }
    }
  };

  fill(def, ['ZAG'], 4);
  fill(mid, ['MEI'], 3);
  fill(att, ['ATA'], 3);

  while (def.length < 4 && pool.length > 0) def.push(pool.shift()!);
  while (mid.length < 3 && pool.length > 0) mid.push(pool.shift()!);
  while (att.length < 3 && pool.length > 0) att.push(pool.shift()!);

  return { gk: gk!, def, mid, att, all: [gk!, ...def, ...mid, ...att] };
};

export const simulateAndRecordMatch = (state: GameState, match: Match, standings: LeagueTeamStats[] | null): MatchResult => {
  const homeTeam = state.teams[match.homeTeamId];
  const awayTeam = state.teams[match.awayTeamId];

  if (!homeTeam || !awayTeam) {
    console.error(`Teams not found: ${match.homeTeamId} vs ${match.awayTeamId}`);
    return { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, homeScore: 0, awayScore: 0, scorers: [], assists: [], ratings: {}, events: [], stats: { possession: { home: 50, away: 50 }, shots: { home: 0, away: 0 }, shotsOnTarget: { home: 0, away: 0 } } };
  }

  const homeSelection = getMatchSquad(homeTeam, state.players);
  const awaySelection = getMatchSquad(awayTeam, state.players);

  const homeUnderstanding = (state.userTeamId === homeTeam.id)
    ? (state.training?.playstyleTraining?.understanding[homeTeam.tactics.playStyle] || 0)
    : 70; // AI teams usually have good understanding

  const awayUnderstanding = (state.userTeamId === awayTeam.id)
    ? (state.training?.playstyleTraining?.understanding[awayTeam.tactics.playStyle] || 0)
    : 70;

  const hypePlayerId = state.training?.individualFocus?.evolutionSlot;
  const stabilizationPlayerId = state.training?.individualFocus?.stabilizationSlot;

  const homeStats: MatchTeamStats = {
    id: homeTeam.id,
    name: homeTeam.name,
    attack: calculateAttr(homeSelection, 'attack', hypePlayerId),
    midfield: calculateAttr(homeSelection, 'midfield', hypePlayerId),
    defense: calculateAttr(homeSelection, 'defense', hypePlayerId),
    goalkeeper: calculateAttr(homeSelection, 'goalkeeper', hypePlayerId),
    playStyle: homeTeam.tactics.playStyle,
    mentality: homeTeam.tactics.mentality,
    linePosition: homeTeam.tactics.linePosition,
    aggressiveness: homeTeam.tactics.aggressiveness,
    slots: homeTeam.tactics.slots,
    chemistry: Math.round((homeTeam.chemistry || 50) * (0.5 + (homeUnderstanding / 200))), // Max 1.0x at 100% understanding
    hypePlayerId,
    stabilizationPlayerId
  };

  // Home advantage (5% bonus to all attributes)
  homeStats.attack = Math.round(homeStats.attack * 1.05);
  homeStats.midfield = Math.round(homeStats.midfield * 1.05);
  homeStats.defense = Math.round(homeStats.defense * 1.05);
  homeStats.goalkeeper = Math.round(homeStats.goalkeeper * 1.05);

  const awayStats: MatchTeamStats = {
    id: awayTeam.id,
    name: awayTeam.name,
    attack: calculateAttr(awaySelection, 'attack', hypePlayerId),
    midfield: calculateAttr(awaySelection, 'midfield', hypePlayerId),
    defense: calculateAttr(awaySelection, 'defense', hypePlayerId),
    goalkeeper: calculateAttr(awaySelection, 'goalkeeper', hypePlayerId),
    playStyle: awayTeam.tactics.playStyle,
    mentality: awayTeam.tactics.mentality,
    linePosition: awayTeam.tactics.linePosition,
    aggressiveness: awayTeam.tactics.aggressiveness,
    slots: awayTeam.tactics.slots,
    chemistry: Math.round((awayTeam.chemistry || 50) * (0.5 + (awayUnderstanding / 200))),
    hypePlayerId,
    stabilizationPlayerId
  };

  const result = simulateMatch(homeStats, awayStats, homeSelection.all, awaySelection.all);

  match.result = result;
  match.homeScore = result.homeScore;
  match.awayScore = result.awayScore;
  // Note: we don't set played = true here yet because it might be LOCKED status

  const homePower = calculateTeamPower(homeTeam, state.players);
  const awayPower = calculateTeamPower(awayTeam, state.players);

  updatePlayerEvolutions(state, result, homeSelection.all, awaySelection.all, homePower, awayPower);

  // Update Satisfaction
  updatePlayerSatisfaction(state, match.homeTeamId, result);
  updatePlayerSatisfaction(state, match.awayTeamId, result);

  if (standings) {
    updateStandings(standings, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
  }

  return result;
};


const getEliteCupTeams = (state: GameState) => {
  const leagues = ['norte', 'sul', 'leste', 'oeste'] as const;
  const teams: string[] = [];
  leagues.forEach((key) => {
    const standings = sortStandings(state.world.leagues[key].standings);
    standings.slice(0, 4).forEach((row) => teams.push(row.teamId));
  });
  return teams;
};

const getDistrictCupTeams = (state: GameState) => {
  const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];
  const districtTeamIds: string[] = [];

  districts.forEach(district => {
    const districtTeamId = `d_${district.toLowerCase()}`;
    const districtTeam = state.teams[districtTeamId];

    if (districtTeam) {
      districtTeam.squad = [];
      const allPlayers = Object.values(state.players);
      const districtPlayers = allPlayers.filter(p => p.district === district);
      const topPlayers = districtPlayers.sort((a, b) => b.totalRating - a.totalRating).slice(0, 18);

      districtTeam.squad = topPlayers.map(p => p.id);
      districtTeamIds.push(districtTeamId);
    }
  });

  return districtTeamIds;
};

const buildTopMovers = (prevState: GameState, newState: GameState, count: number) => {
  const movers: { name: string, delta: number }[] = [];

  Object.keys(newState.players).forEach(id => {
    const prev = prevState.players[id];
    const curr = newState.players[id];
    if (prev && curr) {
      const delta = curr.totalRating - prev.totalRating;
      if (delta !== 0) {
        movers.push({ name: curr.name, delta });
      }
    }
  });

  movers.sort((a, b) => b.delta - a.delta);

  const rises = movers.slice(0, count);
  const falls = movers.slice(movers.length - count).reverse();

  return { rises, falls };
};

// --- SIMULATE AI BEHAVIOR LOGIC ---
const simulateAITeamDay = (state: GameState, teamId: string) => {
  const team = state.teams[teamId];
  if (!team) return;

  // AI should only make transfers during Open Windows to avoid spam
  if (!state.world.transferWindowOpen) return;

  const squadPlayers = team.squad.map(id => state.players[id]).filter(p => !!p);

  // 1. Check satisfaction & release (5% chance if satisfaction < 40)
  // Need to ensure squad doesnt drop below 15 for safety
  squadPlayers.forEach(player => {
    if (team.squad.length > SAFETY_NET_MIN_PLAYERS && player.satisfaction < 40) {
      if (Math.random() < 0.05) {
        // Release player
        player.contract.teamId = '';
        team.squad = team.squad.filter(id => id !== player.id);

        // Remove from lineup if present
        Object.keys(team.lineup).forEach(pos => {
          if (team.lineup[pos as any] === player.id) {
            delete team.lineup[pos as any];
          }
        });

        state.notifications.unshift({
          id: `ai_release_${Date.now()}_${player.id}`,
          date: state.world.currentDate,
          title: 'Jogador Dispensado pela IA',
          message: `O ${team.name} dispensou ${player.nickname} devido a baixa satisfação.`,
          type: 'transfer',
          read: false
        });
      }
    }
  });

  // 2. Sign Free Agents if squad < 16
  if (team.squad.length < 16) {
    const freeAgents = Object.values(state.players)
      .filter(p => p.contract.teamId === '')
      .sort((a, b) => b.totalRating - a.totalRating);

    if (freeAgents.length > 0) {
      const bestAvailable = freeAgents[0];
      const newTotalPower = calculateTeamPower(team, state.players) + bestAvailable.totalRating;

      // Safety check: ensure AI doesn't break powerCap limits during normal signing
      if (newTotalPower <= (team.powerCap || MAX_TEAM_POWER_TIER_1)) {
        bestAvailable.contract.teamId = team.id;
        team.squad.push(bestAvailable.id);

        state.notifications.unshift({
          id: `ai_sign_${Date.now()}_${bestAvailable.id}`,
          date: state.world.currentDate,
          title: 'Mercado Agitado',
          message: `Sem muito alarde, o ${team.name} contratou o agente livre ${bestAvailable.nickname}.`,
          type: 'transfer',
          read: false
        });
      }
    }
  }

  // 3. Adapt Playstyle after losses. Since we don't have consecutiveLosses tracking,
  // we do a simple check over the league's played matches for this team.
  // We look backwards from currentRound downward.
  const leagueId = team.district.toLowerCase();
  const league = state.world.leagues[leagueId as keyof typeof state.world.leagues];
  if (league && league.matches) {
    const myMatches = league.matches.filter(m => m.played && (m.homeTeamId === team.id || m.awayTeamId === team.id));
    // Sort by round desc
    myMatches.sort((a, b) => b.round - a.round);

    if (myMatches.length >= 3) {
      const last3 = myMatches.slice(0, 3);
      const isLoss = (m: any) => {
        const scoreA = m.homeTeamId === team.id ? m.homeScore : m.awayScore;
        const scoreB = m.homeTeamId === team.id ? m.awayScore : m.homeScore;
        return scoreA < scoreB;
      };
      if (last3.every(isLoss)) {
        // Change playstyle to 'Retranca Armada' if they are taking too many goals, or random otherwise
        const current = team.tactics.playStyle;
        const alternatives: any[] = ['Retranca Armada', 'Equilibrado', 'Vertical'];
        team.tactics.playStyle = alternatives.find(s => s !== current) || 'Retranca Armada';
      }
    }
  }
};

const processTrainingDay = (state: GameState) => {
  // --- Progress Card Laboratory ---
  if (state.training?.cardLaboratory?.slots) {
    state.training.cardLaboratory.slots.forEach(slot => {
      if (slot.cardId && slot.finishTime) {
        const finish = new Date(slot.finishTime);
        const now = new Date(state.world.currentDate);
        if (now >= finish) {
          // Card finished! Add to user team inventory
          const userTeam = state.teams[state.userTeamId!];
          if (userTeam) {
            // Card Templates
            const cardTemplates: Record<string, Partial<TacticalCard>> = {
              'ataque': {
                name: 'Ataque Total',
                description: 'Aumenta o bônus ofensivo da equipe em 10%.',
                effect: 'Ataque +10%'
              },
              'defesa': {
                name: 'Muralha',
                description: 'Aumenta o bônus defensivo da equipe em 15%.',
                effect: 'Defesa +15%'
              },
              'meio': {
                name: 'Meio Criativo',
                description: 'Aumenta o controle de jogo no meio-campo em 10%.',
                effect: 'Meio-Campo +10%'
              }
            };

            const template = cardTemplates[slot.cardId] || {
              name: 'Carta Desconhecida',
              description: 'Efeito misterioso.',
              effect: '???'
            };

            const newCard: TacticalCard = {
              id: `card_${Date.now()}_${slot.cardId}`,
              name: template.name!,
              description: template.description!,
              effect: template.effect!
            };

            userTeam.inventory = userTeam.inventory || [];
            userTeam.inventory.push(newCard);

            state.notifications.unshift({
              id: `n_${Date.now()}_card_lab`,
              date: state.world.currentDate,
              title: 'Laboratório de Cartas',
              message: `A pesquisa da carta "${newCard.name}" foi concluída e adicionada ao seu inventário!`,
              type: 'success',
              read: false
            });
          }
          slot.cardId = null;
          slot.finishTime = null;
        }
      }
    });
  }

  // --- Progress Playstyle Training ---
  if (state.training?.playstyleTraining?.currentStyle) {
    const currentStyle = state.training.playstyleTraining.currentStyle;
    const currentUnderstanding = state.training.playstyleTraining.understanding[currentStyle] || 0;

    // Increment understanding by 1-3% per day
    const increment = Math.floor(Math.random() * 3) + 1;
    const newUnderstanding = Math.min(100, currentUnderstanding + increment);

    state.training.playstyleTraining.understanding[currentStyle] = newUnderstanding;
  }
};

const processTransferDay = (state: GameState) => {
  // --- Process AI Daily Routines ---
  Object.keys(state.teams).forEach(teamId => {
    if (teamId !== state.userTeamId) {
      simulateAITeamDay(state, teamId);
    }
  });

  // 4. Night Market (Logic in economyLogic.ts)
  if (state.transferProposals && state.transferProposals.length > 0) {
    const { notifications, proposals } = processNightMarket(state, state.transferProposals, state.teams, state.players);
    state.transferProposals = proposals;
    state.notifications = [...notifications, ...state.notifications];
  }
};

const processMatchDay = (state: GameState, round: number) => {
  const world = state.world;
  if (round <= SEASON_ROUNDS) {
    // --- LEAGUE PHASE ---
    state.notifications.unshift({
      id: `n_${Date.now()}_round_${round}`,
      date: world.currentDate,
      title: `Rodada ${round} Finalizada`,
      message: 'Os jogos da liga foram realizados.',
      type: 'match',
      read: false
    });

    const leagues = ['norte', 'sul', 'leste', 'oeste'] as const;
    leagues.forEach(leagueKey => {
      const league = world.leagues[leagueKey];
      if (league && league.matches) {
        const roundMatches = league.matches.filter(m => m.round === round);
        roundMatches.forEach(match => {
          if (!match.played) {
            const result = simulateAndRecordMatch(state, match, league.standings);
            match.played = true;
            match.status = 'FINISHED';

            // Update Headline if it's user's team
            if (state.userTeamId && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
              match.revealed = false; // Blind report
              const isHome = match.homeTeamId === state.userTeamId;
              const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
              const opponent = state.teams[opponentId];

              state.lastHeadline = {
                title: result.headline || "Fim de Jogo",
                message: `O ${state.teams[state.userTeamId]?.name} ${result.homeScore > result.awayScore ? (isHome ? 'venceu' : 'perdeu para') : result.homeScore < result.awayScore ? (isHome ? 'perdeu para' : 'venceu') : 'empatou com'} o ${opponent?.name} por ${result.homeScore}-${result.awayScore}.`
              };

              // Add notification
              state.notifications.unshift({
                id: `n_${Date.now()}_match_${match.id}`,
                date: state.world.currentDate,
                title: result.headline || "Resultado da Partida",
                message: `Sua equipe jogou contra ${opponent?.name}. Placar: ${match.homeScore}-${match.awayScore}.`,
                type: 'match',
                read: false
              });
            }
          }
        });

        // 5. Announce District Champion at Round 14
        if (round === SEASON_ROUNDS) {
          const sorted = sortStandings(league.standings);
          const champion = state.teams[sorted[0].teamId];
          if (champion) {
            newsHeadlines.champion(state, champion, leagueKey.toUpperCase() as District);

            // Award Achievement to Squad
            champion.squad.forEach(pid => {
              const p = state.players[pid];
              if (p) {
                p.achievements.push({
                  season: world.currentSeason || 2050,
                  title: `Campeão da Liga ${league.name}`,
                  type: 'Clube'
                });
              }
            });

            // Award to Manager
            const managerId = champion.managerId;
            if (managerId && state.managers[managerId]) {
              const m = state.managers[managerId];
              m.career.titlesWon += 1;
              m.career.totalLeagueTitles += 1;
              m.achievements.push({
                season: world.currentSeason || 2050,
                title: `Campeão da Liga ${league.name}`,
                type: 'Clube'
              });

              // Human Legend Logic: A ERA ZEE
              if (managerId === state.userManagerId) {
                m.career.consecutiveTitles += 1;
                if (m.career.consecutiveTitles >= 3) {
                  world.news.unshift({
                    id: `n_${Date.now()}_era_zee`,
                    title: `A ERA ${m.name.toUpperCase()}!`,
                    content: `O manager alcança o status de Lenda após o tricampeonato consecutivo.`,
                    type: 'CHAMPION',
                    date: world.currentDate,
                    importance: 3
                  });
                }
              }
            }
          }
        }
      }
    });

  } else if (round <= SEASON_ROUNDS + ELITE_CUP_ROUNDS) {
    // --- ELITE CUP ---
    const eliteRound = round - SEASON_ROUNDS; // 1..4

    if (eliteRound === 1 && world.eliteCup.teams.length === 0) {
      world.eliteCup.teams = getEliteCupTeams(state);
    }

    const stageName = eliteRound === 1 ? 'Oitavas de Final' :
      eliteRound === 2 ? 'Quartas de Final' :
        eliteRound === 3 ? 'Semifinal' : 'Final';

    state.notifications.unshift({
      id: `n_${Date.now()}_elite_${eliteRound}`,
      date: world.currentDate,
      title: `Copa Elite - ${stageName}`,
      message: `Jogos da fase ${stageName} realizados.`,
      type: 'match',
      read: false
    });

    // Manage Bracket & Generate Matches
    let matchesToPlay: Match[] = [];

    if (eliteRound === 1) { // Octaves
      if (world.eliteCup.bracket.round1.length === 0) {
        const shuffled = shuffle(world.eliteCup.teams);
        for (let i = 0; i < shuffled.length; i += 2) {
          world.eliteCup.bracket.round1.push({
            id: `ec_r1_${i}`, round: eliteRound, homeTeamId: shuffled[i], awayTeamId: shuffled[i + 1],
            homeScore: 0, awayScore: 0, played: false, date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.round1;
    } else if (eliteRound === 2) { // Quarters
      if (world.eliteCup.bracket.quarters.length === 0) {
        const prev = world.eliteCup.bracket.round1;
        const winners = prev.map(m => m.homeScore! >= m.awayScore! ? m.homeTeamId : m.awayTeamId);
        for (let i = 0; i < winners.length; i += 2) {
          world.eliteCup.bracket.quarters.push({
            id: `ec_qf_${i}`, round: eliteRound, homeTeamId: winners[i], awayTeamId: winners[i + 1],
            homeScore: 0, awayScore: 0, played: false, date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.quarters;
    } else if (eliteRound === 3) { // Semis
      if (world.eliteCup.bracket.semis.length === 0) {
        const prev = world.eliteCup.bracket.quarters;
        const winners = prev.map(m => m.homeScore! >= m.awayScore! ? m.homeTeamId : m.awayTeamId);
        for (let i = 0; i < winners.length; i += 2) {
          world.eliteCup.bracket.semis.push({
            id: `ec_sf_${i}`, round: eliteRound, homeTeamId: winners[i], awayTeamId: winners[i + 1],
            homeScore: 0, awayScore: 0, played: false, date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.semis;
    } else if (eliteRound === 4) { // Final
      if (!world.eliteCup.bracket.final) {
        const prev = world.eliteCup.bracket.semis;
        const winners = prev.map(m => m.homeScore! >= m.awayScore! ? m.homeTeamId : m.awayTeamId);
        world.eliteCup.bracket.final = {
          id: `ec_final`, round: eliteRound, homeTeamId: winners[0], awayTeamId: winners[1],
          homeScore: 0, awayScore: 0, played: false, date: world.currentDate
        };
      }
      matchesToPlay = [world.eliteCup.bracket.final!];
    }

    if (matchesToPlay && matchesToPlay.length > 0) {
      matchesToPlay.forEach(match => {
        if (!match.played) {
          const result = simulateAndRecordMatch(state, match, null);
          match.played = true;
          match.status = 'FINISHED';

          // Update Headline if it's user's team
          if (state.userTeamId && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
            match.revealed = false; // Blind report
            const isHome = match.homeTeamId === state.userTeamId;
            const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
            const opponent = state.teams[opponentId];

            state.lastHeadline = {
              title: result.headline || "Copa Elite",
              message: `O ${state.teams[state.userTeamId]?.name} ${result.homeScore > result.awayScore ? (isHome ? 'venceu' : 'perdeu para') : result.homeScore < result.awayScore ? (isHome ? 'perdeu para' : 'venceu') : 'empatou com'} o ${opponent?.name} por ${result.homeScore}-${result.awayScore}.`
            };

            // Add notification
            state.notifications.unshift({
              id: `n_${Date.now()}_match_${match.id}`,
              date: state.world.currentDate,
              title: result.headline || "Resultado Copa Elite",
              message: `Sua equipe jogou contra ${opponent?.name}. Placar: ${match.homeScore}-${match.awayScore}.`,
              type: 'match',
              read: false
            });
          }
        }
      });
    }
    world.eliteCup.round = eliteRound;

    if (eliteRound === 4 && world.eliteCup.bracket.final) {
      const final = world.eliteCup.bracket.final;
      // In final, if draw, decide by penalty (random for now)
      if (final.homeScore === final.awayScore) {
        const penaltyWinner = Math.random() > 0.5 ? 'home' : 'away';
        if (penaltyWinner === 'home') final.homeScore! += 1; // Representation of winning on penalties
        else final.awayScore! += 1;
      }

      const winnerId = final.homeScore! > final.awayScore! ? final.homeTeamId : final.awayTeamId;
      world.eliteCup.winnerId = winnerId;
      const winnerTeam = state.teams[winnerId];

      // Award Achievement to Squad
      winnerTeam.squad.forEach(pid => {
        const p = state.players[pid];
        if (p) {
          p.achievements.push({
            season: world.currentSeason || 2050,
            title: 'Campeão da Copa Elite',
            type: 'Clube'
          });
        }
      });

      // Award to Manager
      const managerId = winnerTeam.managerId;
      if (managerId && state.managers[managerId]) {
        const m = state.managers[managerId];
        m.career.titlesWon += 1;
        m.career.totalCupTitles += 1;
        m.achievements.push({
          season: world.currentSeason || 2050,
          title: 'Campeão da Copa Elite',
          type: 'Clube'
        });
      }

      state.notifications.unshift({
        id: `n_${Date.now()}_elite_winner`,
        date: world.currentDate,
        title: 'Campeão da Copa Elite!',
        message: `${winnerTeam.name} conquistou a Copa Elite em uma final emocionante!`,
        type: 'success',
        read: false
      });
    }

  } else if (round <= TOTAL_ROUNDS) {
    // --- DISTRICT CUP ---
    const districtRound = round - (SEASON_ROUNDS + ELITE_CUP_ROUNDS); // 1..4

    if (districtRound === 1 && world.districtCup.teams.length === 0) {
      const teamIds = getDistrictCupTeams(state);
      world.districtCup.teams = teamIds;
      world.districtCup.standings = teamIds.map(id => ({
        teamId: id, team: state.teams[id]?.name || id, played: 0, points: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
      }));
    }

    state.notifications.unshift({
      id: `n_${Date.now()}_district_${districtRound}`,
      date: world.currentDate,
      title: `Copa dos Distritos - Rodada ${districtRound}`,
      message: districtRound === 4 ? 'Grande Final dos Distritos' : `Fase de Grupos - Rodada ${districtRound}`,
      type: 'match',
      read: false
    });

    if (districtRound === 1 && world.districtCup.teams.length === 0) {
      // Use the virtual district teams created in initDistrictCup
      world.districtCup.teams = ['team_dist_norte', 'team_dist_sul', 'team_dist_leste', 'team_dist_oeste'];
    }

    if (districtRound <= 3) {
      // Group Phase (Round Robin for 4 teams: 3 rounds)
      const pairings = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]]
      ];
      const todaysPairings = pairings[districtRound - 1];

      todaysPairings.forEach(([idx1, idx2], i) => {
        const home = world.districtCup.teams[idx1];
        const away = world.districtCup.teams[idx2];
        const match: Match = {
          id: `dc_r${districtRound}_${i}`, round: districtRound, homeTeamId: home, awayTeamId: away,
          homeScore: 0, awayScore: 0, played: false, date: world.currentDate, status: 'FINISHED'
        };
        world.districtCup.matches.push(match);
        simulateAndRecordMatch(state, match, world.districtCup.standings);
        match.played = true;

        // Manual evolution for participants (don't update Club Cap yet)
        // This is handled inside simulateAndRecordMatch -> updatePlayerEvolutions
      });
      world.districtCup.round = districtRound;

    } else {
      // Final (Top 2)
      const sorted = sortStandings(world.districtCup.standings);
      const finalists = sorted.slice(0, 2).map(s => s.teamId);

      const match: Match = {
        id: `dc_final`, round: districtRound, homeTeamId: finalists[0], awayTeamId: finalists[1],
        homeScore: 0, awayScore: 0, played: false, date: world.currentDate, status: 'FINISHED'
      };
      world.districtCup.final = match;

      simulateAndRecordMatch(state, match, null);
      match.played = true;

      // Penalty logic for final
      if (match.homeScore === match.awayScore) {
        const penaltyWinner = Math.random() > 0.5 ? 'home' : 'away';
        if (penaltyWinner === 'home') match.homeScore! += 1;
        else match.awayScore! += 1;
      }

      const winnerId = match.homeScore! > match.awayScore! ? match.homeTeamId : match.awayTeamId;
      world.districtCup.winnerId = winnerId;
      world.districtCup.round = districtRound;

      const winnerTeam = state.teams[winnerId];
      newsHeadlines.cupWinner(state, winnerTeam);

      state.notifications.unshift({
        id: `n_${Date.now()}_district_winner`,
        date: world.currentDate,
        title: 'Campeão dos Distritos!',
        message: `${winnerTeam.name} venceu a Copa dos Distritos e unificou a região!`,
        type: 'success',
        read: false
      });
    }
  }

  // --- Generate Top 5 Movers Report ---
  // Note: we can't reliably pass prevState for buildTopMovers here easily 
  // without plumbing it through. We will just re-fetch it in `advanceGameDay` directly after this.
};

const processEndOfDayChecks = (state: GameState, dayNumber: number) => {
  // DNA Slot 4 Training Progress (Cure/Learn)
  Object.values(state.players).forEach(player => {
    if (player.badges.trainingSlot4) {
      player.badges.trainingSlot4.daysLeft -= 1;

      console.log(`Dia ${state.world.currentDay}: ${player.nickname} progrediu no treino (${player.badges.trainingSlot4.daysLeft} dias restantes)`);

      if (player.badges.trainingSlot4.daysLeft <= 0) {
        const { trait, type } = player.badges.trainingSlot4;

        if (type === 'CURE') {
          player.badges.slot4 = null; // Fardo curado!
          state.notifications.unshift({
            id: `n_${Date.now()}_cure_${player.id}`,
            date: state.world.currentDate,
            title: 'Cura Concluída',
            message: `${player.nickname} superou seu fardo e agora tem o DNA limpo!`,
            type: 'success',
            read: false
          });
        } else {
          player.badges.slot4 = trait; // Trait aprendido!
          state.notifications.unshift({
            id: `n_${Date.now()}_learn_${player.id}`,
            date: state.world.currentDate,
            title: 'DNA Evoluído',
            message: `${player.nickname} aprendeu o trait [${trait}] em seu slot de legado!`,
            type: 'success',
            read: false
          });
        }

        delete player.badges.trainingSlot4;
      }
    }
  });

  // Weekly Power Cap Check
  if (dayNumber % 7 === 0) {
    Object.keys(state.teams).forEach(teamId => {
      const team = state.teams[teamId];
      if (!checkPowerCap(team, state.players)) {
        // Warning notification could be added here
      }
      if (calculateTeamPower(team, state.players) < SAFETY_NET_TOTAL) {
        applySafetyNet(state, teamId);
      }
    });
  }
};


// --- Genesis Draft Flow ---
export const submitProposals = (state: GameState, managerId: string, playerIds: string[]): GameState => {
  const manager = state.managers[managerId];
  if (!manager || !manager.career.currentTeamId) return state;

  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  if (!newState.world.draftProposals) {
    newState.world.draftProposals = [];
  }

  // Avoid duplicates: filter out any existing proposal for THESE specifically if needed, 
  // but usually we append or replace the whole list for that manager.
  // The user wants to "click to recruit", so we'll treat playerIds as the list to ADD.

  const currentProposals = newState.world.draftProposals;

  playerIds.forEach((playerId) => {
    const alreadyExists = currentProposals.some(p => p.playerId === playerId && p.managerId === managerId);
    if (!alreadyExists) {
      currentProposals.push({
        playerId,
        managerId,
        teamId: manager.career.currentTeamId!,
        priority: currentProposals.filter(p => p.managerId === managerId).length + 1
      });
    }
  });

  return newState;
};

export const cancelDraftProposal = (state: GameState, managerId: string, playerId: string): GameState => {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  if (!newState.world.draftProposals) return state;

  newState.world.draftProposals = newState.world.draftProposals.filter(
    p => !(p.playerId === playerId && p.managerId === managerId)
  );

  return newState;
};

export const resolveDraftConflict = (state: GameState) => {
  const proposals = state.world.draftProposals || [];
  if (proposals.length === 0) return;

  const playerProposals: Record<string, typeof proposals> = {};
  proposals.forEach(p => {
    if (!playerProposals[p.playerId]) playerProposals[p.playerId] = [];
    playerProposals[p.playerId].push(p);
  });

  Object.keys(playerProposals).forEach(playerId => {
    const props = playerProposals[playerId];
    let bestProposal = props[0];
    let maxAttractiveness = -1;

    props.forEach(p => {
      const manager = state.managers[p.managerId];
      const team = state.teams[p.teamId];
      if (!manager || !team) return;

      const managerRating = 500 + (manager.reputation * 10);
      const vagasDisponiveis = Math.max(0, SQUAD_SIZE_MAX - team.squad.length);
      const attractiveness = (managerRating * 0.7) + (vagasDisponiveis * 40 * 0.3); // Reduced vacancy weight, removed extra scale

      if (attractiveness > maxAttractiveness) {
        maxAttractiveness = attractiveness;
        bestProposal = p;
      }
    });

    if (bestProposal) {
      const player = state.players[bestProposal.playerId];
      const team = state.teams[bestProposal.teamId];
      if (player && team) {
        player.contract.teamId = team.id;
        if (!team.squad.includes(player.id)) {
          team.squad.push(player.id);
        }
        console.log(`DRAFT: Player ${player.nickname} joined ${team.name}`);
      }
    }
  });

  state.world.draftProposals = []; // Limpa para o próximo dia
  if (state.lastHeadline) {
    state.lastHeadline = {
      title: `DRAFT DIA ${state.world.currentDay - 1} CONCLUÍDO`,
      message: "A Inteligência Artificial resolveu as disputas pelas contratações na calada da noite."
    };
  }
};

export const autoCompleteDraft = (state: GameState) => {
  const teamsNeedingPlayers = Object.values(state.teams).filter(t => t.id.startsWith('t_') && t.squad.length < SQUAD_SIZE_MAX);
  if (teamsNeedingPlayers.length === 0) return;

  const freeAgents = Object.values(state.players).filter(p => !p.contract.teamId);

  // Sort free agents by rating descending
  freeAgents.sort((a, b) => b.totalRating - a.totalRating);

  teamsNeedingPlayers.forEach(team => {
    while (team.squad.length < SQUAD_SIZE_MAX) {
      // Analyze current roles in squad
      const rolesCount: Record<string, number> = { GOL: 0, ZAG: 0, MEI: 0, ATA: 0 };
      const currentPower = team.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);

      team.squad.forEach(pid => {
        const p = state.players[pid];
        if (p) rolesCount[p.role]++;
      });

      // Determine the most needed role
      const targets = [
        { role: 'GOL', min: 1, current: rolesCount.GOL },
        { role: 'ZAG', min: 4, current: rolesCount.ZAG },
        { role: 'MEI', min: 4, current: rolesCount.MEI },
        { role: 'ATA', min: 2, current: rolesCount.ATA }
      ];

      // Find a role that is below its minimum requirement
      let neededRole = (targets.find(t => t.current < t.min)?.role) as PlayerRole | undefined;

      // Search for the best player for that role that fits the cap
      let playerIndex = -1;
      if (neededRole) {
        playerIndex = freeAgents.findIndex(p => p.role === neededRole && (currentPower + p.totalRating <= (team.powerCap || 15000)));
      }

      // If no player fits for specifically needed role, try ANY role that fits
      if (playerIndex === -1) {
        playerIndex = freeAgents.findIndex(p => currentPower + p.totalRating <= (team.powerCap || 15000));
      }

      if (playerIndex !== -1) {
        const player = freeAgents.splice(playerIndex, 1)[0];
        if (player) {
          player.contract.teamId = team.id;
          team.squad.push(player.id);
          console.log(`DRAFT AUTO-FILL: Agent ${player.nickname} joined ${team.name} as ${player.role}`);
        }
      } else {
        // Fallback: Generate a "Base Recruit" if no free agent fits or exists
        const fallbackRole = neededRole || 'ZAG';
        const newPlayerId = `p_jr_${team.id}_${fallbackRole}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const recruitRating = 350 + Math.random() * 150; // Recruits are 350-500
        const recruit = generatePlayer(newPlayerId, team.district, recruitRating, fallbackRole);
        recruit.contract.teamId = team.id;
        state.players[newPlayerId] = recruit;
        team.squad.push(newPlayerId);
        console.log(`DRAFT AUTO-FILL: Generated Recruit ${recruit.nickname} for ${team.name} as ${fallbackRole}`);
      }
    }
  });

  // FINAL RECRUITMENT: Ensure any remaining Legendary players (Rating > 850) are contracted
  const remainingLegendsItems = Object.values(state.players).filter(p => !p.contract.teamId && p.totalRating >= 850);
  if (remainingLegendsItems.length > 0) {
    const allTeamsList = Object.values(state.teams).filter(t => t.id.startsWith('t_'));
    remainingLegendsItems.forEach(legend => {
      // Find team with lowest power that has space OR can swap its weakest player
      allTeamsList.sort((a, b) => calculateTeamPower(a, state.players) - calculateTeamPower(b, state.players));
      for (const team of allTeamsList) {
        if (team.squad.length < SQUAD_SIZE_MAX) {
          legend.contract.teamId = team.id;
          team.squad.push(legend.id);
          break;
        } else {
          // Find weakest player to swap
          const squadPlayersList = team.squad.map(id => state.players[id]).filter(Boolean).sort((a, b) => a.totalRating - b.totalRating);
          const weakestOne = squadPlayersList[0];
          if (weakestOne && weakestOne.totalRating < legend.totalRating) {
            // Swap!
            team.squad = team.squad.filter(id => id !== weakestOne.id);
            weakestOne.contract.teamId = null;
            legend.contract.teamId = team.id;
            team.squad.push(legend.id);
            console.log(`DRAFT LEGEND SWAP: ${legend.nickname} replaced ${weakestOne.nickname} in ${team.name}`);
            break;
          }
        }
      }
    });
  }

  if (state.lastHeadline) {
    state.lastHeadline = { title: "ELENCOS FECHADOS", message: "A Liga realizou o preenchimento automático. Todos os times possuem elencos equilibrados para a estreia!" };
  }
};

// --- Main Advance Function ---

export const advanceGameDay = (prevState: GameState, skipDateIncrement = false): GameState => {
  // --- LOBBY LOCK (Day -1) ---
  // If the world is at Day -1, we don't advance the game state
  // until the creator/manager explicitly starts the season (moving to Day 0).
  if (prevState.world.currentDay === -1) {
    return prevState;
  }

  const state = JSON.parse(JSON.stringify(prevState)) as GameState;
  const { world } = state;

  if (!skipDateIncrement) {
    const date = new Date(world.currentDate);
    date.setDate(date.getDate() + 1);
    // Reset to start of day for consistency when manually skipping
    date.setHours(8, 0, 0, 0);
    world.currentDate = date.toISOString();

    // Time Machine: Increment currentDay
    world.currentDay = (world.currentDay || 0) + 1;
    console.log(`>>> MÁQUINA DO TEMPO: Avançando para o Dia ${world.currentDay} <<<`);

    // Sync seasonStartReal if it's Day 0/1 to ensure matches align
    if (!world.seasonStartReal || new Date(world.currentDate) < new Date(world.seasonStartReal)) {
      const nextDay = new Date(world.currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      world.seasonStartReal = nextDay.toISOString();
    }
  }

  // --- Genesis Draft Phase Checks ---
  if (world.currentDay === 1) {
    resolveDraftConflict(state);
  } else if (world.currentDay === 2) {
    resolveDraftConflict(state);
    autoCompleteDraft(state);
    world.status = 'ACTIVE';
  } else if (world.currentDay >= 3 && world.status === 'LOBBY') {
    world.status = 'ACTIVE';
  }

  const dayNumber = getSeasonDayNumber(world.currentDate, world.seasonStartReal, world.currentDay);
  const isMatchDay = isSeasonMatchDay(dayNumber);
  const round = getRoundFromDay(dayNumber);

  // Phase Management
  if (round >= 1 && round <= 14) world.phase = 'REGULAR_SEASON';
  else if (round >= 15 && round <= 18) world.phase = 'ELITE_CUP';
  else if (round >= 19 && round <= 22) {
    if (world.phase !== 'DISTRICT_CUP') {
      initDistrictCup(state);
    }
    world.phase = 'DISTRICT_CUP';
  } else if (dayNumber >= 40) {
    if (world.phase === 'DISTRICT_CUP') {
      finalizeDistrictCup(state);
    }
  }

  processTrainingDay(state);

  // Time Machine / Daily Shift: Training progress happens at the start of the day simulation
  processEndOfDayChecks(state, dayNumber);

  // Market is closed during District Cup for strategic focus
  world.transferWindowOpen = !isMatchDay && world.phase !== 'DISTRICT_CUP';

  if (world.transferWindowOpen) processTransferDay(state);

  if (isMatchDay) {
    const round = getRoundFromDay(dayNumber);
    world.currentRound = round;
    processMatchDay(state, round);
  }

  if (state.world.isInitialSeed) {
    state.world.isInitialSeed = false;
  }

  return state;
};
export const startNewSeason = (state: GameState): GameState => {
  const currentSeason = state.world.currentSeason || 2050;
  const nextSeason = currentSeason + 1;

  // 0. Inter-District Migration
  const reallocations = shuffleBottomTeams(state);

  // Generate Season Report (The Pulse)
  generateSeasonReport(state, reallocations);

  // 1. Reset Leagues and Regenerate Calendars
  const leagues = { ...state.world.leagues };

  // Pivot date: 1 week after the current date for the new season start
  const currentWorldDate = new Date(state.world.currentDate);
  const newSeasonStartDate = new Date(currentWorldDate);
  newSeasonStartDate.setDate(newSeasonStartDate.getDate() + 7);
  newSeasonStartDate.setHours(0, 0, 0, 0);

  Object.keys(leagues).forEach(key => {
    const league = { ...leagues[key] };

    // Reset Standings
    league.standings = league.standings.map(s => ({
      ...s,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      gd: 0
    }));

    // Regenerate Matches
    const leagueTeamIds = league.standings.map(s => s.teamId);
    const teamObjs = leagueTeamIds.map(id => state.teams[id]);
    league.matches = generateCalendar(teamObjs, league.id, newSeasonStartDate.toISOString());

    leagues[key] = league;
  });

  // 2. Trait Re-evaluation and History Reset
  const players = { ...state.players };
  Object.keys(players).forEach(id => {
    const player = { ...players[id] };

    // Recalculate Badges based on potentially new Rating
    player.badges = generateBadges(player.totalRating);

    // Reset Seasonal Stats
    player.history = {
      ...player.history,
      goals: 0,
      assists: 0,
      gamesPlayed: 0,
      averageRating: 0,
      // lastMatchRatings should probably stay for form? 
      // Let's clear it for a "clean" season start
      lastMatchRatings: []
    };

    players[id] = player;
  });

  const finalState: GameState = {
    ...state,
    players,
    world: {
      ...state.world,
      currentSeason: nextSeason,
      currentRound: 1,
      currentDate: newSeasonStartDate.toISOString(),
      seasonStartReal: newSeasonStartDate.toISOString(),
      status: 'LOBBY',
      leagues,
      eliteCup: { ...state.world.eliteCup, round: 0, teams: [], winnerId: null, bracket: { round1: [], quarters: [], semis: [], final: null } },
      districtCup: { ...state.world.districtCup, round: 0, teams: [], matches: [], standings: [], winnerId: null, final: null }
    },
    lastHeadline: {
      title: `Temporada ${nextSeason} Iniciada`,
      message: `Bem-vindos ao ano de ${nextSeason}. As lendas do passado agora enfrentam novos desafios. Traços técnicos foram recalibrados.`
    }
  };

  return finalState;
};
