import { Match, MatchEvent, Player, Team } from '../types';

export type Match2DActionType =
  | 'shape'
  | 'carry'
  | 'pass'
  | 'dribble'
  | 'shot'
  | 'save'
  | 'goal'
  | 'blocked'
  | 'woodwork'
  | 'foul'
  | 'card'
  | 'var'
  | 'mistake'
  | 'celebration';

export type Match2DPoint = {
  x: number;
  y: number;
};

export type Match2DPlayerDot = {
  id: string;
  label: string;
  teamId: string;
  role?: string;
  point: Match2DPoint;
  active?: boolean;
};

export type Match2DStep = {
  action: Match2DActionType;
  label: string;
  ball: Match2DPoint;
  home: Match2DPlayerDot[];
  away: Match2DPlayerDot[];
  focusPlayerId?: string;
  fromPlayerId?: string;
  toPlayerId?: string;
};

export type Match2DHighlight = {
  id: string;
  minute: number;
  type: MatchEvent['type'];
  title: string;
  description: string;
  teamId: string;
  homeScore: number;
  awayScore: number;
  event: MatchEvent;
  steps: Match2DStep[];
};

const MAIN_EVENT_TYPES: MatchEvent['type'][] = [
  'GOAL',
  'CHANCE',
  'WOODWORK',
  'BLOCKED',
  'COUNTER',
  'FOUL',
  'CARD_YELLOW',
  'CARD_RED',
  'VAR',
  'MISTAKE',
  'OFFSIDE',
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hash = (value: string) => {
  let next = 0;
  for (let i = 0; i < value.length; i += 1) {
    next = ((next << 5) - next + value.charCodeAt(i)) | 0;
  }
  return Math.abs(next);
};

const jitter = (seed: string, amount: number) => ((hash(seed) % 1000) / 1000 - 0.5) * amount;

const getTeamColor = (team: Team, fallback: string) =>
  team.logo?.primary || team.colors?.primary || fallback;

const playerLabel = (player?: Player) =>
  (player?.nickname || player?.name || '?').slice(0, 3).toUpperCase();

const pickPlayers = (team: Team, players: Record<string, Player>, count: number) =>
  (team.squad || [])
    .map(id => players[id])
    .filter(Boolean)
    .slice(0, count);

const baseFormation = (
  team: Team,
  players: Record<string, Player>,
  side: 'home' | 'away'
): Match2DPlayerDot[] => {
  const selected = pickPlayers(team, players, 11);
  const homeX = [12, 25, 39, 54];
  const awayX = [88, 75, 61, 46];
  const xs = side === 'home' ? homeX : awayX;
  const slots = [
    { x: xs[0], y: 50 },
    { x: xs[1], y: 24 },
    { x: xs[1], y: 40 },
    { x: xs[1], y: 60 },
    { x: xs[1], y: 76 },
    { x: xs[2], y: 30 },
    { x: xs[2], y: 50 },
    { x: xs[2], y: 70 },
    { x: xs[3], y: 28 },
    { x: xs[3], y: 50 },
    { x: xs[3], y: 72 },
  ];

  return selected.map((player, index) => ({
    id: player.id,
    label: playerLabel(player),
    teamId: team.id,
    role: player.role,
    point: slots[index] || { x: xs[2], y: 50 },
  }));
};

const roleMobility = (role?: string) => {
  if (role === 'GOL') return 0.18;
  if (role === 'ZAG') return 0.58;
  if (role === 'MEI') return 0.86;
  if (role === 'ATA') return 1.0;
  return 0.72;
};

const roleDepthBias = (role: string | undefined, inPossession: boolean) => {
  if (role === 'GOL') return inPossession ? 1.5 : -1.5;
  if (role === 'ZAG') return inPossession ? 3 : -3;
  if (role === 'MEI') return inPossession ? 5 : -1;
  if (role === 'ATA') return inPossession ? 7 : 2;
  return 0;
};

const shapeTeam = (
  team: Team,
  dots: Match2DPlayerDot[],
  side: 'home' | 'away',
  ball: Match2DPoint,
  inPossession: boolean,
  seed: string
) => {
  const direction = side === 'home' ? 1 : -1;
  const line = clamp(team.tactics?.linePosition ?? 50, 0, 100);
  const width = clamp(team.tactics?.width ?? 50, 0, 100);
  const intensity = clamp(team.tactics?.intensity ?? team.tactics?.aggressiveness ?? 50, 0, 100);
  const attackCompression = inPossession ? 1 : 0.72;
  const widthScale = (0.72 + (width / 100) * 0.62) * attackCompression;
  const lineBias = ((line - 50) / 50) * 6 * direction;
  const pressureBias = ((intensity - 50) / 50) * (inPossession ? 2.5 : 5.5);
  const ballXPull = ((ball.x - 50) / 50) * (inPossession ? 7 : 10);
  const ballYPull = (ball.y - 50) * (inPossession ? 0.12 : 0.24);

  return dots.map((dot, index) => {
    const mobility = roleMobility(dot.role);
    const roleBias = roleDepthBias(dot.role, inPossession) * direction;
    const naturalY = 50 + (dot.point.y - 50) * widthScale;
    const stagger = jitter(`${seed}:${dot.id}:${index}`, inPossession ? 2.8 : 2.0);
    const x = dot.point.x + lineBias + roleBias + (ballXPull + pressureBias * direction) * mobility;
    const y = naturalY + ballYPull * mobility + stagger;

    return {
      ...dot,
      point: {
        x: clamp(x, side === 'home' ? 6 : 38, side === 'home' ? 62 : 94),
        y: clamp(y, 12, 88),
      },
      active: false,
    };
  });
};

const moveDot = (dots: Match2DPlayerDot[], playerId: string | undefined, point: Match2DPoint) =>
  dots.map(dot => dot.id === playerId ? { ...dot, point, active: true } : { ...dot, active: false });

const setActive = (dots: Match2DPlayerDot[], playerIds: Array<string | undefined>) =>
  dots.map(dot => ({ ...dot, active: playerIds.includes(dot.id) }));

const activeIds = (dots: Match2DPlayerDot[], ids: Array<string | undefined>) =>
  dots.map(dot => ids.includes(dot.id) ? { ...dot, active: true } : dot);

const pushTeamWave = (
  dots: Match2DPlayerDot[],
  side: 'home' | 'away',
  target: Match2DPoint,
  seed: string,
  mood: 'support' | 'recover' | 'celebrate'
) => {
  const direction = side === 'home' ? 1 : -1;
  const pull = mood === 'celebrate' ? 0.5 : mood === 'support' ? 0.34 : 0.2;
  const depth = mood === 'recover' ? -5 * direction : mood === 'celebrate' ? 7 * direction : 3.5 * direction;

  return dots.map((dot, index) => {
    const mobility = roleMobility(dot.role);
    const sideOffset = ((index % 4) - 1.5) * (mood === 'celebrate' ? 2.4 : 1.4);
    return {
      ...dot,
      point: {
        x: clamp(dot.point.x + (target.x - dot.point.x) * pull * mobility + depth * mobility, 4, 96),
        y: clamp(dot.point.y + (target.y - dot.point.y) * pull * mobility + sideOffset + jitter(`${seed}:${dot.id}:wave`, 2.2), 9, 91),
      },
      active: mood === 'celebrate' ? mobility > 0.55 : dot.active,
    };
  });
};

const attackingLane = (event: MatchEvent, side: 'home' | 'away') => {
  const lane = 32 + (hash(event.id) % 4) * 12 + jitter(`${event.id}:lane`, 7);
  const direction = side === 'home' ? 1 : -1;
  const startX = side === 'home' ? 42 : 58;
  const recycleX = startX - 8 * direction;
  const supportX = startX + 9 * direction;
  const midX = side === 'home' ? 61 : 39;
  const boxX = side === 'home' ? 78 : 22;
  const shotX = side === 'home' ? 88 : 12;
  const saveX = side === 'home' ? 91 : 9;
  const goalX = side === 'home' ? 96 : 4;
  return {
    start: { x: startX, y: clamp(lane + jitter(`${event.id}:s`, 10), 18, 82) },
    recycle: { x: recycleX, y: clamp(50 + jitter(`${event.id}:r`, 24), 22, 78) },
    support: { x: supportX, y: clamp(lane + jitter(`${event.id}:sup`, 18), 16, 84) },
    mid: { x: midX, y: clamp(lane + jitter(`${event.id}:m`, 14), 16, 84) },
    box: { x: boxX, y: clamp(lane + jitter(`${event.id}:b`, 10), 16, 84) },
    shot: { x: shotX, y: clamp(lane + jitter(`${event.id}:shot`, 12), 22, 78) },
    save: { x: saveX, y: clamp(50 + jitter(`${event.id}:save`, 20), 35, 65) },
    goal: { x: goalX, y: clamp(50 + jitter(`${event.id}:g`, 24), 32, 68) },
    net: { x: side === 'home' ? 99 : 1, y: clamp(50 + jitter(`${event.id}:net`, 18), 39, 61) },
  };
};

const scoreBeforeEvent = (events: MatchEvent[], event: MatchEvent, homeTeamId: string, awayTeamId: string) => {
  const previousGoals = events.filter(item =>
    item.type === 'GOAL'
    && (item.realTimeSecond < event.realTimeSecond || (item.realTimeSecond === event.realTimeSecond && item.id < event.id))
  );
  return {
    homeScore: previousGoals.filter(item => item.teamId === homeTeamId).length,
    awayScore: previousGoals.filter(item => item.teamId === awayTeamId).length,
  };
};

const buildSteps = (
  event: MatchEvent,
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>
): Match2DStep[] => {
  const attackingSide = event.teamId === homeTeam.id ? 'home' : 'away';
  const defendingSide = attackingSide === 'home' ? 'away' : 'home';
  const homeBase = baseFormation(homeTeam, players, 'home');
  const awayBase = baseFormation(awayTeam, players, 'away');
  const lane = attackingLane(event, attackingSide);
  const actorId = event.playerId || (event.teamId === homeTeam.id ? homeBase[9]?.id : awayBase[9]?.id);
  const assistantId = event.assistantId || (event.teamId === homeTeam.id ? homeBase[6]?.id : awayBase[6]?.id);
  const defenderId = defendingSide === 'home' ? homeBase[2]?.id : awayBase[2]?.id;
  const keeperId = defendingSide === 'home' ? homeBase[0]?.id : awayBase[0]?.id;

  const attackingTeamName = event.teamId === homeTeam.id ? homeTeam.name : awayTeam.name;

  const frame = (ball: Match2DPoint) => ({
    home: shapeTeam(homeTeam, homeBase, 'home', ball, attackingSide === 'home', `${event.id}:${ball.x}:${ball.y}:home`),
    away: shapeTeam(awayTeam, awayBase, 'away', ball, attackingSide === 'away', `${event.id}:${ball.x}:${ball.y}:away`),
  });

  const moveActor = (
    home: Match2DPlayerDot[],
    away: Match2DPlayerDot[],
    playerId: string | undefined,
    point: Match2DPoint
  ) => ({
    home: event.teamId === homeTeam.id ? moveDot(home, playerId, point) : home,
    away: event.teamId === awayTeam.id ? moveDot(away, playerId, point) : away,
  });

  const moveAny = (
    home: Match2DPlayerDot[],
    away: Match2DPlayerDot[],
    playerId: string | undefined,
    point: Match2DPoint,
    teamSide: 'home' | 'away'
  ) => ({
    home: teamSide === 'home' ? moveDot(home, playerId, point) : home,
    away: teamSide === 'away' ? moveDot(away, playerId, point) : away,
  });

  const makeStep = (
    action: Match2DActionType,
    label: string,
    ball: Match2DPoint,
    home: Match2DPlayerDot[],
    away: Match2DPlayerDot[],
    extra: Partial<Match2DStep> = {}
  ): Match2DStep => ({ action, label, ball, home, away, ...extra });

  const startFrame = frame(lane.start);
  const startMoved = moveActor(startFrame.home, startFrame.away, actorId, lane.start);
  const recycleFrame = frame(lane.recycle);
  const recycleMoved = attackingSide === 'home'
    ? {
      home: activeIds(pushTeamWave(moveDot(recycleFrame.home, assistantId, lane.recycle), 'home', lane.recycle, `${event.id}:recycle:h`, 'recover'), [assistantId]),
      away: pushTeamWave(recycleFrame.away, 'away', lane.recycle, `${event.id}:recycle:a`, 'recover'),
    }
    : {
      home: pushTeamWave(recycleFrame.home, 'home', lane.recycle, `${event.id}:recycle:h`, 'recover'),
      away: activeIds(pushTeamWave(moveDot(recycleFrame.away, assistantId, lane.recycle), 'away', lane.recycle, `${event.id}:recycle:a`, 'recover'), [assistantId]),
    };
  const supportFrame = frame(lane.support);
  const supportMoved = attackingSide === 'home'
    ? {
      home: activeIds(pushTeamWave(moveDot(supportFrame.home, actorId, lane.support), 'home', lane.support, `${event.id}:support:h`, 'support'), [actorId, assistantId]),
      away: pushTeamWave(supportFrame.away, 'away', lane.support, `${event.id}:support:a`, 'support'),
    }
    : {
      home: pushTeamWave(supportFrame.home, 'home', lane.support, `${event.id}:support:h`, 'support'),
      away: activeIds(pushTeamWave(moveDot(supportFrame.away, actorId, lane.support), 'away', lane.support, `${event.id}:support:a`, 'support'), [actorId, assistantId]),
    };
  const midFrame = frame(lane.mid);
  const passFrame = attackingSide === 'home'
    ? {
      home: activeIds(pushTeamWave(moveDot(moveDot(midFrame.home, assistantId, lane.mid), actorId, lane.mid), 'home', lane.mid, `${event.id}:mid:h`, 'support'), [assistantId, actorId]),
      away: pushTeamWave(midFrame.away, 'away', lane.mid, `${event.id}:mid:a`, 'support'),
    }
    : {
      home: pushTeamWave(midFrame.home, 'home', lane.mid, `${event.id}:mid:h`, 'support'),
      away: activeIds(pushTeamWave(moveDot(moveDot(midFrame.away, assistantId, lane.mid), actorId, lane.mid), 'away', lane.mid, `${event.id}:mid:a`, 'support'), [assistantId, actorId]),
    };
  const boxFrame = frame(lane.box);
  const boxBase = {
    home: pushTeamWave(boxFrame.home, 'home', lane.box, `${event.id}:box:h`, 'support'),
    away: pushTeamWave(boxFrame.away, 'away', lane.box, `${event.id}:box:a`, 'support'),
  };
  const boxMoved = moveActor(boxBase.home, boxBase.away, actorId, lane.box);
  const shotFrame = frame(lane.shot);
  const shotBase = {
    home: pushTeamWave(shotFrame.home, 'home', lane.shot, `${event.id}:shot:h`, 'support'),
    away: pushTeamWave(shotFrame.away, 'away', lane.shot, `${event.id}:shot:a`, 'support'),
  };
  const preShot = moveActor(shotBase.home, shotBase.away, actorId, lane.shot);
  const goalFrame = frame(lane.goal);
  const goalBase = {
    home: pushTeamWave(goalFrame.home, 'home', lane.goal, `${event.id}:goal:h`, 'support'),
    away: pushTeamWave(goalFrame.away, 'away', lane.goal, `${event.id}:goal:a`, 'support'),
  };
  const shotActor = moveActor(goalBase.home, goalBase.away, actorId, lane.box);
  const shotKeeper = moveAny(shotActor.home, shotActor.away, keeperId, lane.goal, defendingSide);
  const shotHome = setActive(shotKeeper.home, [actorId, keeperId]);
  const shotAway = setActive(shotKeeper.away, [actorId, keeperId]);

  const steps: Match2DStep[] = [
    makeStep('shape', `${attackingTeamName} prepara o lance`, lane.start, startMoved.home, startMoved.away, { focusPlayerId: actorId }),
  ];

  if (['FOUL', 'CARD_YELLOW', 'CARD_RED', 'MISTAKE', 'VAR'].includes(event.type)) {
    const collision = lane.mid;
    const collisionFrame = frame(collision);
    const home = event.teamId === homeTeam.id
      ? moveDot(moveDot(collisionFrame.home, actorId, collision), defenderId, { x: collision.x + 4, y: collision.y + 4 })
      : moveDot(moveDot(collisionFrame.home, defenderId, { x: collision.x - 4, y: collision.y + 4 }), actorId, collision);
    const away = event.teamId === awayTeam.id
      ? moveDot(moveDot(collisionFrame.away, actorId, collision), defenderId, { x: collision.x - 4, y: collision.y + 4 })
      : moveDot(moveDot(collisionFrame.away, defenderId, { x: collision.x + 4, y: collision.y + 4 }), actorId, collision);
    const action = event.type === 'VAR' ? 'var' : event.type === 'MISTAKE' ? 'mistake' : event.type === 'FOUL' ? 'foul' : 'card';
    steps.push(makeStep(action, event.title, collision, home, away, { focusPlayerId: actorId }));
    return steps;
  }

  if (event.type === 'COUNTER') {
    steps.push(makeStep('carry', 'Transicao rapida', lane.mid, passFrame.home, passFrame.away, { focusPlayerId: actorId }));
  } else {
    const pattern = hash(event.id) % 3;
    if (pattern === 0) {
      steps.push(makeStep('carry', 'Conducao curta para atrair pressao', lane.support, supportMoved.home, supportMoved.away, { focusPlayerId: actorId }));
      steps.push(makeStep('pass', 'Passe vertical', lane.mid, passFrame.home, passFrame.away, { fromPlayerId: assistantId, toPlayerId: actorId }));
    } else if (pattern === 1) {
      steps.push(makeStep('pass', 'Volta a bola para reorganizar', lane.recycle, recycleMoved.home, recycleMoved.away, { fromPlayerId: actorId, toPlayerId: assistantId }));
      steps.push(makeStep('pass', 'Aceleracao pelo corredor', lane.mid, passFrame.home, passFrame.away, { fromPlayerId: assistantId, toPlayerId: actorId }));
    } else {
      steps.push(makeStep('carry', 'Ataque em bloco aproxima por dentro', lane.support, supportMoved.home, supportMoved.away, { focusPlayerId: actorId }));
      steps.push(makeStep('carry', 'Conducao progressiva', lane.mid, passFrame.home, passFrame.away, { focusPlayerId: actorId }));
    }
  }

  steps.push(makeStep('dribble', 'Ataque no ultimo terco', lane.box, boxMoved.home, boxMoved.away, { focusPlayerId: actorId }));

  if (event.type === 'GOAL') {
    steps.push(makeStep('shot', 'Finalizacao', lane.goal, preShot.home, preShot.away, { focusPlayerId: actorId }));
    steps.push(makeStep('goal', 'A bola cruza a linha', lane.net, shotHome, shotAway, { focusPlayerId: actorId }));
    const celebrationHome = attackingSide === 'home'
      ? pushTeamWave(shotHome, 'home', lane.net, `${event.id}:cel:h`, 'celebrate')
      : shotHome.map(dot => ({ ...dot, active: false }));
    const celebrationAway = attackingSide === 'away'
      ? pushTeamWave(shotAway, 'away', lane.net, `${event.id}:cel:a`, 'celebrate')
      : shotAway.map(dot => ({ ...dot, active: false }));
    steps.push(makeStep('celebration', 'Explosao neon da torcida', lane.net, celebrationHome, celebrationAway, { focusPlayerId: actorId }));
  } else if (event.type === 'WOODWORK') {
    steps.push(makeStep('shot', 'Chute forte', lane.shot, preShot.home, preShot.away, { focusPlayerId: actorId }));
    steps.push(makeStep('woodwork', 'Na trave', lane.goal, shotHome, shotAway, { focusPlayerId: actorId }));
  } else if (event.type === 'BLOCKED') {
    const blockPoint = { x: (lane.box.x + lane.shot.x) / 2, y: lane.box.y };
    const home = defendingSide === 'home' ? moveDot(shotHome, defenderId, blockPoint) : shotHome;
    const away = defendingSide === 'away' ? moveDot(shotAway, defenderId, blockPoint) : shotAway;
    steps.push(makeStep('blocked', 'Bloqueio', blockPoint, home, away, { focusPlayerId: defenderId }));
  } else {
    steps.push(makeStep('shot', 'Chance criada', lane.shot, preShot.home, preShot.away, { focusPlayerId: actorId }));
    steps.push(makeStep('save', 'Defesa ou erro no toque final', lane.save, shotHome, shotAway, { focusPlayerId: keeperId }));
  }

  return steps;
};

export const buildMatch2DHighlights = (
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>
): Match2DHighlight[] => {
  const events = [...(match.result?.events || [])]
    .filter(event => MAIN_EVENT_TYPES.includes(event.type))
    .sort((a, b) => a.realTimeSecond - b.realTimeSecond || a.minute - b.minute);

  return events.slice(0, 18).map(event => {
    const before = scoreBeforeEvent(events, event, homeTeam.id, awayTeam.id);
    const isGoal = event.type === 'GOAL';
    const homeGoal = isGoal && event.teamId === homeTeam.id ? 1 : 0;
    const awayGoal = isGoal && event.teamId === awayTeam.id ? 1 : 0;

    return {
      id: event.id,
      minute: event.minute,
      type: event.type,
      title: event.title,
      description: event.description,
      teamId: event.teamId,
      homeScore: before.homeScore + homeGoal,
      awayScore: before.awayScore + awayGoal,
      event,
      steps: buildSteps(event, match, homeTeam, awayTeam, players),
    };
  });
};

export const getMatch2DTeamColor = getTeamColor;
