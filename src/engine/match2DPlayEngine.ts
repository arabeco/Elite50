import { Match, MatchEvent, MatchResult, Player, Team } from '../types';
import type { Match2DActionType, Match2DHighlight, Match2DPlayerDot, Match2DPoint, Match2DStep } from '../utils/match2D';

const WATCHED: MatchEvent['type'][] = ['GOAL', 'CHANCE', 'WOODWORK', 'BLOCKED', 'COUNTER', 'FOUL', 'CARD_YELLOW', 'CARD_RED', 'VAR', 'MISTAKE', 'OFFSIDE'];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result);
};

const noise = (seed: string, amount: number) => ((hash(seed) % 1001) / 1000 - 0.5) * amount;
const directionFor = (side: 'home' | 'away') => side === 'home' ? 1 : -1;
const mirrorX = (x: number, side: 'home' | 'away') => side === 'home' ? x : 100 - x;

const labelFor = (player?: Player) => (player?.nickname || player?.name || '?').slice(0, 3).toUpperCase();
const nameOfForEngine = (player?: Player) => player?.nickname || player?.name || 'O marcador';

const selectedIdsFor = (team: Team) => {
  const lineupIds = [...new Set(Object.values(team.lineup || {}).filter(Boolean))];
  return lineupIds.length >= 11 ? lineupIds.slice(0, 11) : (team.squad || []).slice(0, 11);
};

const squadFor = (team: Team, players: Record<string, Player>) => selectedIdsFor(team)
  .map(id => players[id])
  .filter((player): player is Player => Boolean(player))
  .slice(0, 11);

type NativeSector = 'attack' | 'midfield' | 'defense' | 'goalkeeper';

const SECTOR_FUSION_KEYS: Record<NativeSector, Array<keyof Player['fusion']>> = {
  attack: ['FIN', 'DRI', 'PAS', 'DET'],
  midfield: ['PAS', 'MOV', 'DRI', 'DET'],
  defense: ['DET', 'MOV', 'PAS', 'DRI'],
  goalkeeper: ['REF', 'DEF', 'POS'],
};

const EXPECTED_ROLE: Record<NativeSector, Player['role']> = {
  attack: 'ATA', midfield: 'MEI', defense: 'ZAG', goalkeeper: 'GOL',
};

const playerSectorSkill = (player: Player, sector: NativeSector) => {
  const fusion = player.fusion || ({} as Player['fusion']);
  const values = SECTOR_FUSION_KEYS[sector]
    .map(key => fusion[key])
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const fusionRating = values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length) * 5 : player.totalRating;
  return player.totalRating * 0.68 + fusionRating * 0.32;
};

const lineupRoleFit = (team: Team, player: Player, expectedRole: Player['role']) => {
  const lineupEntry = Object.entries(team.lineup || {}).find(([, playerId]) => playerId === player.id);
  if (!lineupEntry) return player.role === expectedRole ? 1 : 0.68;
  const slotRole = lineupEntry[0].split(/[_-]/)[0].toUpperCase();
  if (slotRole === expectedRole && player.role === expectedRole) return 1;
  if (slotRole === expectedRole) return 0.58;
  if (player.role === expectedRole) return 0.78;
  return 0.52;
};

const teamSectorStrength = (team: Team, players: Record<string, Player>, sector: NativeSector) => {
  const squad = squadFor(team, players);
  const expectedRole = EXPECTED_ROLE[sector];
  const specialists = squad.filter(player => {
    const lineupEntry = Object.entries(team.lineup || {}).find(([, playerId]) => playerId === player.id);
    return lineupEntry ? lineupEntry[0].toUpperCase().startsWith(expectedRole) : player.role === expectedRole;
  });
  const selected = specialists.length ? specialists : squad.filter(player => player.role === expectedRole);
  const pool = selected.length ? selected : squad;
  if (!pool.length) return 100;
  const specialistScore = pool.reduce((sum, player) => sum + playerSectorSkill(player, sector) * lineupRoleFit(team, player, expectedRole), 0) / pool.length;
  const supportRoles: Partial<Record<NativeSector, Player['role'][]>> = {
    attack: ['MEI'], midfield: ['ZAG', 'ATA'], defense: ['MEI'], goalkeeper: [],
  };
  const support = squad.filter(player => supportRoles[sector]?.includes(player.role));
  const supportScore = support.length
    ? support.reduce((sum, player) => sum + playerSectorSkill(player, sector), 0) / support.length
    : specialistScore;
  const chemistry = 0.88 + (team.chemistry || 50) / 500;
  return (specialistScore * (sector === 'goalkeeper' ? 1 : 0.84) + supportScore * (sector === 'goalkeeper' ? 0 : 0.16)) * chemistry;
};

const STYLE_PROFILE: Record<Team['tactics']['playStyle'], { possession: number; passRisk: number; progression: number; chance: number; defense: number; press: number; transition: number }> = {
  Equilibrado: { possession: 1, passRisk: 0, progression: 1, chance: 1, defense: 1, press: 1, transition: 1 },
  'Tiki-Taka': { possession: 1.1, passRisk: -0.04, progression: 0.86, chance: 1.02, defense: 0.97, press: 0.96, transition: 0.92 },
  'Motor Lento': { possession: 1.08, passRisk: -0.055, progression: 0.78, chance: 0.96, defense: 1.03, press: 0.9, transition: 0.86 },
  Gegenpressing: { possession: 1.03, passRisk: 0.025, progression: 1.08, chance: 1.06, defense: 0.98, press: 1.17, transition: 1.08 },
  Blitzkrieg: { possession: 0.95, passRisk: 0.075, progression: 1.2, chance: 1.1, defense: 0.9, press: 1.08, transition: 1.16 },
  Vertical: { possession: 0.94, passRisk: 0.085, progression: 1.22, chance: 1.06, defense: 0.92, press: 0.98, transition: 1.14 },
  'Retranca Armada': { possession: 0.9, passRisk: 0.035, progression: 1.08, chance: 0.93, defense: 1.14, press: 0.9, transition: 1.2 },
  Catenaccio: { possession: 0.89, passRisk: 0.025, progression: 1.04, chance: 0.91, defense: 1.18, press: 0.88, transition: 1.17 },
};

const formation = (team: Team, players: Record<string, Player>, side: 'home' | 'away'): Match2DPlayerDot[] => {
  const slots = [
    [8, 50], [24, 20], [25, 39], [25, 61], [24, 80],
    [43, 27], [41, 50], [43, 73], [60, 22], [64, 50], [60, 78],
  ];
  return squadFor(team, players).map((player, index) => ({
    id: player.id,
    label: labelFor(player),
    role: player.role,
    teamId: team.id,
    point: { x: mirrorX(slots[index]?.[0] ?? 45, side), y: slots[index]?.[1] ?? 50 },
  }));
};

const distance = (a: Match2DPoint, b: Match2DPoint) => Math.hypot(b.x - a.x, b.y - a.y);

const moveToward = (from: Match2DPoint, target: Match2DPoint, maxDistance: number): Match2DPoint => {
  const span = distance(from, target);
  if (span <= maxDistance || span === 0) return { ...target };
  const ratio = maxDistance / span;
  return { x: from.x + (target.x - from.x) * ratio, y: from.y + (target.y - from.y) * ratio };
};

const nearest = (dots: Match2DPlayerDot[], point: Match2DPoint, excluded: string[] = []) => [...dots]
  .filter(dot => !excluded.includes(dot.id))
  .sort((a, b) => distance(a.point, point) - distance(b.point, point))[0];

const scoreAt = (events: MatchEvent[], event: MatchEvent, homeId: string, awayId: string) => {
  const goals = events.filter(item => item.type === 'GOAL' && item.realTimeSecond <= event.realTimeSecond);
  return {
    homeScore: goals.filter(item => item.teamId === homeId).length,
    awayScore: goals.filter(item => item.teamId === awayId).length,
  };
};

type FrameState = { home: Match2DPlayerDot[]; away: Match2DPlayerDot[]; ball: Match2DPoint };

const shapeTargets = (
  dots: Match2DPlayerDot[],
  base: Match2DPlayerDot[],
  ball: Match2DPoint,
  side: 'home' | 'away',
  inPossession: boolean,
  carrierId?: string,
  seed = ''
) => {
  const direction = directionFor(side);
  const progress = side === 'home' ? ball.x : 100 - ball.x;
  return dots.map((dot, index) => {
    const origin = base.find(item => item.id === dot.id)?.point || dot.point;
    const isKeeper = dot.role === 'GOL';
    const roleFactor = dot.role === 'ATA' ? 1 : dot.role === 'MEI' ? 0.78 : dot.role === 'ZAG' ? 0.48 : 0.12;
    const blockAdvance = (progress - 48) * (inPossession ? 0.38 : 0.24) * roleFactor * direction;
    const lateralPull = (ball.y - origin.y) * (inPossession ? 0.2 : 0.34) * (isKeeper ? 0.08 : 1);
    const supportPull = inPossession && !isKeeper ? (ball.x - origin.x) * 0.12 * roleFactor : 0;
    const target = {
      x: clamp(origin.x + blockAdvance + supportPull + noise(`${seed}:${dot.id}:x`, 1.2), isKeeper ? 4 : 7, isKeeper ? 96 : 93),
      y: clamp(origin.y + lateralPull + noise(`${seed}:${dot.id}:y`, 1.1), 9, 91),
    };
    if (dot.id === carrierId) return { ...dot, point: { ...ball }, active: true };
    return { ...dot, point: moveToward(dot.point, target, isKeeper ? 1.1 : 3.8), active: false };
  });
};

const makePlay = (
  event: MatchEvent,
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>,
  allEvents: MatchEvent[]
): Match2DHighlight => {
  const attackingSide: 'home' | 'away' = event.teamId === awayTeam.id ? 'away' : 'home';
  const defendingSide: 'home' | 'away' = attackingSide === 'home' ? 'away' : 'home';
  const attackTeam = attackingSide === 'home' ? homeTeam : awayTeam;
  const homeBase = formation(homeTeam, players, 'home');
  const awayBase = formation(awayTeam, players, 'away');
  const lane = clamp(24 + (hash(event.id) % 53), 22, 78);
  const d = directionFor(attackingSide);
  const at = (x: number, y = lane): Match2DPoint => ({ x: mirrorX(x, attackingSide), y });
  const attackingBase = attackingSide === 'home' ? homeBase : awayBase;
  const actor = attackingBase.find(dot => dot.id === event.playerId) || nearest(attackingBase, at(63));
  const assistant = attackingBase.find(dot => dot.id === event.assistantId)
    || nearest(attackingBase, at(47, lane + 13), actor ? [actor.id] : []);
  const outlet = nearest(attackingBase, at(52, lane - 17), [actor?.id, assistant?.id].filter(Boolean) as string[]);
  const defendingBase = defendingSide === 'home' ? homeBase : awayBase;
  const keeper = defendingBase.find(dot => dot.role === 'GOL') || defendingBase[0];
  const defender = nearest(defendingBase, at(78, lane), keeper ? [keeper.id] : []);
  let state: FrameState = { home: homeBase, away: awayBase, ball: at(39, lane + 8) };
  const steps: Match2DStep[] = [];

  const push = (action: Match2DActionType, label: string, ball: Match2DPoint, carrierId?: string, fromPlayerId?: string, toPlayerId?: string) => {
    const homeHasBall = attackingSide === 'home';
    const home = shapeTargets(state.home, homeBase, ball, 'home', homeHasBall, carrierId, `${event.id}:${steps.length}:h`);
    const away = shapeTargets(state.away, awayBase, ball, 'away', !homeHasBall, carrierId, `${event.id}:${steps.length}:a`);
    state = { home, away, ball };
    steps.push({ action, label, ball, home, away, focusPlayerId: carrierId, fromPlayerId, toPlayerId });
  };

  const pass = (label: string, from: Match2DPoint, to: Match2DPoint, fromId?: string, toId?: string) => {
    push('pass', label, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, undefined, fromId, toId);
    push('pass', 'Dominio', to, toId, fromId, toId);
  };

  const actorId = actor?.id;
  const assistantId = assistant?.id;
  const outletId = outlet?.id;
  const style = attackTeam.tactics?.playStyle || 'Equilibrado';
  const start = style === 'Gegenpressing' || style === 'Blitzkrieg' || event.type === 'COUNTER' ? at(54, lane + 7) : state.ball;
  state.ball = start;
  push('shape', style === 'Gegenpressing' ? 'Pressao recupera a posse' : `${attackTeam.name} ocupa o campo`, start, assistantId);

  if (style === 'Tiki-Taka' || style === 'Motor Lento') {
    const support = at(43, lane + 8);
    const recycle = at(35, lane + 19);
    const switchPoint = at(48, lane - 18);
    push('carry', 'Atrai a primeira pressao', support, assistantId);
    pass('Passe de seguranca', support, recycle, assistantId, outletId);
    push('carry', 'O bloco reorganiza', at(39, lane + 16), outletId);
    pass('Inversao de corredor', at(39, lane + 16), switchPoint, outletId, assistantId);
  } else if (style === 'Vertical' || style === 'Blitzkrieg' || event.type === 'COUNTER') {
    const launch = at(63, lane - 8);
    push('carry', event.type === 'COUNTER' ? 'Campo aberto' : 'Progressao vertical', at(57, lane + 3), assistantId);
    pass('Passe rompe a linha', at(57, lane + 3), launch, assistantId, outletId);
  } else if (style === 'Gegenpressing') {
    push('carry', 'Apoio imediato apos a roubada', at(59, lane + 5), assistantId);
    pass('Toque curto sob pressao', at(59, lane + 5), at(66, lane - 6), assistantId, outletId);
  } else if (style === 'Retranca Armada' || style === 'Catenaccio') {
    push('carry', 'Saida cautelosa', at(45, lane + 12), assistantId);
    pass('Ligacao para o corredor', at(45, lane + 12), at(58, lane - 15), assistantId, outletId);
  } else {
    push('carry', 'Conducao com apoio', at(48, lane + 4), assistantId);
    pass('Passe de apoio', at(48, lane + 4), at(57, lane - 8), assistantId, outletId);
  }

  if (['FOUL', 'CARD_YELLOW', 'CARD_RED', 'VAR', 'MISTAKE', 'OFFSIDE'].includes(event.type)) {
    push(event.type === 'VAR' ? 'var' : event.type === 'MISTAKE' ? 'mistake' : event.type === 'FOUL' ? 'foul' : event.type.includes('CARD') ? 'card' : 'blocked', event.title, at(61, lane), actorId, outletId, actorId);
    push('shape', 'Jogo interrompido', at(61, lane), actorId);
  } else {
    pass('Encontra o jogador entre linhas', state.ball, at(66, lane + 3), outletId, actorId);
    push('carry', 'Gira de frente para o gol', at(68, lane + 2), actorId);
    push('dribble', 'O ataque chega em bloco', at(75, lane), actorId);
    push('shape', 'A defesa fecha o espaco', at(79, lane), actorId);
    push('shot', 'Prepara a finalizacao', at(84, lane), actorId);

    const keeperY = clamp(50 + (lane - 50) * 0.24, 42, 58);
    const shotMid = at(91, (lane + keeperY) / 2);
    push('shot', 'A bola sai do pe', shotMid);
    if (event.type === 'GOAL') {
      push('goal', 'A bola cruza a linha', at(98.2, keeperY + (lane > 50 ? 6 : -6)));
      push('goal', 'Gol confirmado', at(99.1, keeperY + (lane > 50 ? 6 : -6)));
      push('celebration', `${attackTeam.name} comemora`, at(99.1, keeperY + (lane > 50 ? 6 : -6)));
    } else if (event.type === 'WOODWORK') {
      push('woodwork', 'A bola explode na trave', at(96.3, lane > 50 ? 63 : 37), actorId);
      push('shape', 'A defesa afasta o rebote', at(83, 50), defender?.id);
    } else if (event.type === 'BLOCKED') {
      push('blocked', 'O defensor trava o chute', at(88, lane), defender?.id);
      push('shape', 'Segunda bola na entrada da area', at(77, lane + 10), outletId);
    } else {
      push('save', 'O goleiro segura', at(94, keeperY), keeper?.id);
      push('shape', 'O bloco sai da area', at(89, keeperY), keeper?.id);
    }
  }

  const score = scoreAt(allEvents, event, homeTeam.id, awayTeam.id);
  return { id: event.id, minute: event.minute, type: event.type, title: event.title, description: event.description, teamId: event.teamId, event, ...score, steps };
};

export const buildNativeMatch2DPlays = (match: Match, homeTeam: Team, awayTeam: Team, players: Record<string, Player>) => {
  const events = [...(match.result?.events || [])]
    .filter(event => WATCHED.includes(event.type))
    .sort((a, b) => a.realTimeSecond - b.realTimeSecond || a.minute - b.minute)
    .slice(0, 24);
  return events.map(event => makePlay(event, match, homeTeam, awayTeam, players, events));
};

const seededRandom = (seed: string) => {
  let value = hash(seed) || 1;
  return () => {
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const weightedPlayer = (team: Team, players: Record<string, Player>, random: () => number, roles: Player['role'][]) => {
  const candidates = squadFor(team, players).filter(player => roles.includes(player.role));
  const pool = candidates.length ? candidates : squadFor(team, players);
  const total = pool.reduce((sum, player) => sum + Math.max(1, player.totalRating), 0);
  let roll = random() * total;
  return pool.find(player => (roll -= Math.max(1, player.totalRating)) <= 0) || pool[0];
};

export type SimulatedMatch2D = { match: Match; highlights: Match2DHighlight[] };

export const simulateNativeMatch2D = (
  baseMatch: Match,
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>,
  seed = baseMatch.id
): SimulatedMatch2D => {
  const random = seededRandom(seed);
  const homeProfile = STYLE_PROFILE[homeTeam.tactics?.playStyle || 'Equilibrado'];
  const awayProfile = STYLE_PROFILE[awayTeam.tactics?.playStyle || 'Equilibrado'];
  const homeMid = teamSectorStrength(homeTeam, players, 'midfield') * homeProfile.possession;
  const awayMid = teamSectorStrength(awayTeam, players, 'midfield') * awayProfile.possession;
  const expectedHomePossession = clamp(Math.round(100 * homeMid / Math.max(1, homeMid + awayMid)), 35, 65);
  const intensity = ((homeTeam.tactics?.intensity || 50) + (awayTeam.tactics?.intensity || 50)) / 2;
  const possessionCount = clamp(Math.round(64 + intensity / 5 + random() * 8), 62, 86);
  const shotEvents: MatchEvent[] = [];
  const incidentEvents: MatchEvent[] = [];
  let homeShots = 0;
  let awayShots = 0;
  let homeOnTarget = 0;
  let awayOnTarget = 0;
  let homeScore = 0;
  let awayScore = 0;
  let homePossessionTime = 0;
  let awayPossessionTime = 0;
  const scorers: MatchResult['scorers'] = [];
  const assists: MatchResult['assists'] = [];

  let previousWasHome = random() < 0.5;
  let previousEndedInTurnover = false;
  for (let possession = 0; possession < possessionCount; possession += 1) {
    const targetBias = expectedHomePossession / 100;
    const continuity = previousWasHome ? 0.12 : -0.12;
    const isHome = random() < clamp(targetBias + continuity, 0.22, 0.78);
    const attackTeam = isHome ? homeTeam : awayTeam;
    const defendTeam = isHome ? awayTeam : homeTeam;
    const minute = clamp(Math.round(1 + possession * (88 / possessionCount) + (random() - 0.5) * 1.4), 1, 89);
    const duration = 18 + Math.round(random() * 58);
    if (isHome) homePossessionTime += duration;
    else awayPossessionTime += duration;
    const attacker = weightedPlayer(attackTeam, players, random, ['ATA', 'MEI']);
    const assistant = weightedPlayer(attackTeam, players, random, ['MEI', 'ATA']);
    const defender = weightedPlayer(defendTeam, players, random, ['ZAG', 'MEI']);
    const attackProfile = STYLE_PROFILE[attackTeam.tactics?.playStyle || 'Equilibrado'];
    const defendProfile = STYLE_PROFILE[defendTeam.tactics?.playStyle || 'Equilibrado'];
    const attack = teamSectorStrength(attackTeam, players, 'attack');
    const midfield = teamSectorStrength(attackTeam, players, 'midfield');
    const opposingMidfield = teamSectorStrength(defendTeam, players, 'midfield');
    const goalkeeper = teamSectorStrength(defendTeam, players, 'goalkeeper');
    const compactness = 1 + (50 - (defendTeam.tactics?.width ?? 50)) / 520;
    const defensiveLine = defendTeam.tactics?.linePosition ?? 50;
    const defense = teamSectorStrength(defendTeam, players, 'defense') * defendProfile.defense * compactness;
    const style = attackTeam.tactics?.playStyle || 'Equilibrado';
    const directStyle = ['Vertical', 'Blitzkrieg', 'Retranca Armada', 'Catenaccio'].includes(style);
    const controlStyle = ['Tiki-Taka', 'Motor Lento'].includes(style);
    const transition = previousEndedInTurnover && previousWasHome !== isHome;
    let progress = transition ? 0.38 : 0.14 + random() * 0.16;
    const actionCount = clamp(Math.round((controlStyle ? 4.8 : directStyle ? 3.1 : 3.9) + random() * 2), 2, 7);
    let terminal: 'turnover' | 'foul' | 'offside' | 'shot' | 'retained' = 'retained';

    for (let action = 0; action < actionCount; action += 1) {
      const passing = attackTeam.tactics?.passing ?? 50;
      const chemistry = attackTeam.chemistry || 50;
      const defendingIntensity = (defendTeam.tactics?.intensity ?? defendTeam.tactics?.aggressiveness ?? 50) * defendProfile.press;
      const passSuccess = clamp(0.73 + passing / 620 + chemistry / 900 + (midfield - opposingMidfield) / 4200 - defendingIntensity / 950 - attackProfile.passRisk, 0.54, 0.93);
      const foulChance = clamp(0.018 + (defendTeam.tactics?.aggressiveness || 50) / 1450 + (progress > 0.62 ? 0.018 : 0), 0.025, 0.095);

      if (random() < foulChance) {
        terminal = 'foul';
        break;
      }
      if (progress > 0.64 && directStyle && random() < 0.055) {
        terminal = 'offside';
        break;
      }
      if (random() > passSuccess) {
        terminal = 'turnover';
        break;
      }

      const backward = random() < (controlStyle ? 0.2 : 0.1);
      const baseGain = directStyle ? 0.16 + random() * 0.17 : controlStyle ? 0.07 + random() * 0.1 : 0.1 + random() * 0.13;
      const sectorEdge = clamp(1 + (midfield - opposingMidfield) / 2400, 0.82, 1.18);
      const gain = baseGain * attackProfile.progression * sectorEdge;
      progress = clamp(progress + (backward ? -(0.04 + random() * 0.08) : gain), 0.05, 0.98);
      const shotChance = progress > 0.8 ? 0.5 : progress > 0.68 ? 0.24 : progress > 0.56 ? 0.07 : 0;
      if (random() < shotChance) {
        terminal = 'shot';
        break;
      }
    }

    if (terminal === 'retained' && progress > 0.7 && random() < 0.28) terminal = 'shot';

    if (terminal === 'turnover' && (progress > 0.54 || random() < 0.09)) {
      incidentEvents.push({
        id: `${seed}_${minute}_${possession}_MISTAKE`, minute, realTimeSecond: Math.round(minute * 4), type: 'MISTAKE',
        teamId: attackTeam.id, title: 'PASSE ERRADO', description: `${attackTeam.name} perde a posse.`, playerId: assistant?.id,
      });
    } else if (terminal === 'foul') {
      const cardRoll = random();
      const type: MatchEvent['type'] = cardRoll < 0.12 ? 'CARD_YELLOW' : 'FOUL';
      incidentEvents.push({
        id: `${seed}_${minute}_${possession}_${type}`, minute, realTimeSecond: Math.round(minute * 4), type,
        teamId: attackTeam.id, title: type === 'CARD_YELLOW' ? 'CARTAO AMARELO' : 'FALTA', description: `${nameOfForEngine(defender)} interrompe a jogada.`, playerId: attacker?.id, assistantId: defender?.id,
      });
    } else if (terminal === 'offside') {
      incidentEvents.push({
        id: `${seed}_${minute}_${possession}_OFFSIDE`, minute, realTimeSecond: Math.round(minute * 4), type: 'OFFSIDE',
        teamId: attackTeam.id, title: 'IMPEDIMENTO', description: `${nameOfForEngine(attacker)} parte antes da hora.`, playerId: attacker?.id, assistantId: assistant?.id,
      });
    } else if (terminal === 'shot') {
      const transitionSpace = transition ? Math.max(0, defensiveLine - 50) / 260 : 0;
      const chanceAttack = attack * attackProfile.chance * (transition ? attackProfile.transition : 1);
      const resistance = defense * 0.72 + goalkeeper * 0.28;
      const shotQuality = clamp(0.3 + (progress - 0.55) * 0.82 + (chanceAttack - resistance) / 2200 + transitionSpace, 0.14, 0.9);
      const goalChance = clamp(0.035 + shotQuality * 0.17 + (chanceAttack - resistance) / 3600, 0.025, 0.25);
      const woodworkChance = 0.045 + shotQuality * 0.035;
      const blockChance = clamp(0.3 - shotQuality * 0.13 + (defense - chanceAttack) / 5000, 0.12, 0.36);
      const roll = random();
      let type: MatchEvent['type'];
      if (roll < goalChance) type = 'GOAL';
      else if (roll < goalChance + woodworkChance) type = 'WOODWORK';
      else if (roll < goalChance + woodworkChance + blockChance) type = 'BLOCKED';
      else type = 'CHANCE';
      const onTarget = type === 'GOAL' || (type === 'CHANCE' && random() < clamp(0.3 + shotQuality * 0.38, 0.32, 0.67));
      if (isHome) {
        homeShots += 1;
        if (onTarget) homeOnTarget += 1;
        if (type === 'GOAL') homeScore += 1;
      } else {
        awayShots += 1;
        if (onTarget) awayOnTarget += 1;
        if (type === 'GOAL') awayScore += 1;
      }
      if (type === 'GOAL' && attacker) {
        scorers.push({ teamId: attackTeam.id, playerId: attacker.id });
        if (assistant && assistant.id !== attacker.id) assists.push({ teamId: attackTeam.id, playerId: assistant.id });
      }
      shotEvents.push({
        id: `${seed}_${minute}_${possession}_${type}`, minute, realTimeSecond: Math.round(minute * 4), type,
        teamId: attackTeam.id,
        title: type === 'GOAL' ? 'GOL' : type === 'WOODWORK' ? 'NA TRAVE' : type === 'BLOCKED' ? 'BLOQUEIO' : 'FINALIZACAO',
        description: `${attackTeam.name} conclui uma cadeia de posse.`, playerId: attacker?.id, assistantId: assistant?.id,
      });
    } else if (transition && progress > 0.48 && random() < 0.24) {
      incidentEvents.push({
        id: `${seed}_${minute}_${possession}_COUNTER`, minute, realTimeSecond: Math.round(minute * 4), type: 'COUNTER',
        teamId: attackTeam.id, title: 'CONTRA-ATAQUE', description: `${attackTeam.name} acelera apos a recuperacao.`, playerId: attacker?.id,
      });
    }

    previousEndedInTurnover = terminal === 'turnover' || terminal === 'shot' || terminal === 'offside' || terminal === 'foul';
    previousWasHome = isHome;
  }

  const selectedIncidents = incidentEvents.filter((_, index) => index % Math.max(1, Math.ceil(incidentEvents.length / 7)) === 0).slice(0, 7);
  const events = [...shotEvents, ...selectedIncidents];
  events.sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));
  const totalPossessionTime = Math.max(1, homePossessionTime + awayPossessionTime);
  const homePossession = clamp(Math.round(homePossessionTime * 100 / totalPossessionTime), 30, 70);
  const result: MatchResult = {
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeScore,
    awayScore,
    scorers,
    assists,
    ratings: {},
    events,
    headline: `${homeTeam.name} ${homeScore} x ${awayScore} ${awayTeam.name}`,
    stats: { possession: { home: homePossession, away: 100 - homePossession }, shots: { home: homeShots, away: awayShots }, shotsOnTarget: { home: homeOnTarget, away: awayOnTarget } },
  };
  const match: Match = { ...baseMatch, played: true, revealed: true, homeScore, awayScore, result };
  return { match, highlights: buildNativeMatch2DPlays(match, homeTeam, awayTeam, players) };
};
