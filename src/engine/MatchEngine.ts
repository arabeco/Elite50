import { Player, MatchEvent, MatchResult as MatchResultType, PlayStyle, Mentality, TacticalCard } from '../types';
import { COMMENTARY_COUNT, COMMENTARY_INTERVAL_SECONDS, MATCH_DURATION_MINUTES, MATCH_REAL_TIME_SECONDS } from '../constants/gameConstants';
import { calculateMatchEvent, SectorInput } from './simulation';
import { regenerateDNA } from './generator';

export interface TeamStats {
  id: string;
  name: string;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  playStyle: PlayStyle;
  mentality: Mentality;
  linePosition: number;
  aggressiveness: number;
  intensity?: number;
  width?: number;
  passing?: number;
  slots: (TacticalCard | null)[];
  chemistry: number;
  hypePlayerId?: string | null;
  stabilizationPlayerId?: string | null;
}

const PLAYSTYLE_EFFECTS: Record<PlayStyle, { att: number, mid: number, def: number, staminaDrain: number, tickReduction?: number, lateBonus?: number }> = {
  'Blitzkrieg': { att: 1.25, mid: 1.1, def: 0.8, staminaDrain: 1.5 },
  'Tiki-Taka': { att: 0.9, mid: 1.3, def: 1.0, staminaDrain: 0.8, tickReduction: 0.2 },
  'Retranca Armada': { att: 0.62, mid: 0.92, def: 1.25, staminaDrain: 0.9 },
  'Motor Lento': { att: 1.0, mid: 1.0, def: 1.0, staminaDrain: 1.0, lateBonus: 1.4 },
  'Equilibrado': { att: 1.0, mid: 1.0, def: 1.0, staminaDrain: 1.0 },
  'Gegenpressing': { att: 1.15, mid: 1.15, def: 0.9, staminaDrain: 1.4 },
  'Catenaccio': { att: 0.7, mid: 1.1, def: 1.5, staminaDrain: 0.9 },
  'Vertical': { att: 1.15, mid: 1.0, def: 0.9, staminaDrain: 1.2 }
};

const MENTALITY_EFFECTS: Record<Mentality, { attBonus: number, defPenalty: number, staminaPenalty: number }> = {
  'Calculista': { attBonus: 0, defPenalty: 0, staminaPenalty: 0 },
  'Emocional': { attBonus: 0.25, defPenalty: 0.3, staminaPenalty: 0 },
  'Predadora': { attBonus: 0.15, defPenalty: 0, staminaPenalty: 0.2 }
};

const pickWeightedRandom = (players: Player[], count: number, attributeKey: keyof Player['pentagon'] | 'totalRating' = 'totalRating'): Player[] => {
  const weightedPlayers = players.map(p => {
    // Add 200 for "Chaos/Zebra" factor to ensure everyone has a chance
    const attrValue = attributeKey === 'totalRating' ? p.totalRating : p.pentagon[attributeKey as keyof Player['pentagon']];
    const weight = (attrValue || 0) + 200;
    return { player: p, weight };
  });

  const selected: Player[] = [];
  const tempWeighted = [...weightedPlayers];

  for (let i = 0; i < count && tempWeighted.length > 0; i++) {
    const totalWeight = tempWeighted.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * totalWeight;

    for (let j = 0; j < tempWeighted.length; j++) {
      roll -= tempWeighted[j].weight;
      if (roll <= 0) {
        selected.push(tempWeighted[j].player);
        tempWeighted.splice(j, 1);
        break;
      }
    }
  }
  return selected;
};

// Dynamic templates will be generated inside the simulation loop
// but we keep some structural constants here
const GOAL_DESCRIPTIONS = [
  "Balançou o capim no fundo do gol! Golaço de {player}!",
  "Sabe de quem? {player}! Recebe na área e fuzila para as redes!",
  "É disso que o povo gosta! {player} faz a festa na arquibancada com uma finalização perfeita.",
  "Ripa na chulipa e pimba na gorduchinha! {player} bota lá no fundo!",
  "Lá onde a coruja dorme! {player} tira do goleiro e corre pro abraço."
];

const DEFENSE_DESCRIPTIONS = [
  "Pelo amor dos meus filhinhos! Que defesa inacreditável do goleiro adversário no chute de {player}!",
  "Olho no lance... Espalma pro lado! Defesa gigante após a bomba de {player}.",
  "O goleiro voa como um gato e tira a bola no ângulo! Que chance de {player}.",
  "Cruzamento cortado! A defesa corta o perigo de {player} na pequena área."
];

const WOODWORK_DESCRIPTIONS = [
  "NO POSTE! A bola explode na trave após o chute de {player}!",
  "UUUUUH! {player} solta a bomba e ela carimba o travessão!",
  "Na trave! O goleiro já estava batido, mas o metal salvou o adversário."
];

const BLOCKED_DESCRIPTIONS = [
  "Bloqueio espetacular! O chute de {player} explode no corpo do defensor que se atirou na bola.",
  "Zaga muito sólida! {player} tentou o chute mas foi travado no momento exato.",
  "Desvio providencial! A defesa se desdobra para fechar os espaços e impedir a finalização."
];

const VAR_DESCRIPTIONS = [
  "Opa... O árbitro coloca a mão no ouvido. O VAR está checando a legalidade do lance.",
  "Tensão em Neo-City! O lance de {player} está sendo revisado pela arbitragem de vídeo.",
  "Arbitragem confirma: A decisão de campo está mantida após a revisão."
];

const OFFSIDE_DESCRIPTIONS = [
  "Bandeira erguida! {player} estava ligeiramente à frente no momento do passe.",
  "Impedimento marcado! A linha defensiva subiu bem e deixou o atacante em posição irregular.",
  "Lance anulado. O ataque se precipitou e caiu na armadilha da zaga."
];

const COUNTER_DESCRIPTIONS = [
  "CONTRA-ATAQUE! A bola é recuperada e o time sai em velocidade máxima com {player}!",
  "Transição explosiva! O erro no ataque gera uma oportunidade de ouro no contra-golpe.",
  "Lá vai o time no contra-ataque! Pegaram a defesa desarrumada agora."
];

const MISTAKE_DESCRIPTIONS = [
  "FRANGO! {player} comete uma falha bizarra e entrega o ouro pro adversário!",
  "QUE TRAPALHADA! A defesa se enrola sozinha e {player} quase marca um gol contra.",
  "Erro infantil! {player} tentou o recuo e deu um presente para o ataque inimigo."
];

const FOUL_DESCRIPTIONS = [
  "Falta marcada! {player} chega atrasado e comete a infração no meio-campo.",
  "Jogo parado. O juiz vê a falta de {player} na disputa por baixo.",
  "Entrada mais forte de {player}, o árbitro apenas adverte verbalmente."
];

const COMMENTARY_TEMPLATES = [
  { title: "INÍCIO DE JOGO", desc: "A bola rola! Começa o duelo no tapete sintético de Neo-City!" },
  { title: "ESTRATÉGIA", desc: "Os técnicos gesticulam na área técnica, ajuste rápido após os primeiros toques." },
  { title: "POSSE DE BOLA", desc: "Jogo truncado no meio campo. Ninguém quer abrir alas para o adversário." },
  { title: "FOCO TOTAL", desc: "Olho no lance! A movimentação no último terço do campo é agressiva." },
  { title: "RITMO ACELERADO", desc: "Lá vai a equipe buscando a linha de fundo com velocidade absurda!" },
  { title: "DISPUTA FÍSICA", desc: "Dividida ríspida, mas o árbitro cibernético manda o jogo seguir." },
  { title: "TRANSCRIÇÃO", desc: "Scouts analisando tempo real: precisão de passes alta nesta etapa." },
  { title: "PRESSÃO ALTA", desc: "Marcação lá em cima! Não deixam o adversário respirar na saída de bola." },
  { title: "CADÊNCIA", desc: "Agora o ritmo cai um pouco. A bola gira de um lado pro outro com paciência." },
  { title: "TORCIDA EM FÚRIA", desc: "Os decibéis dos hologramas batem no teto. Que barulho no estádio!" },
  { title: "DEFESA SÓLIDA", desc: "A linha de zagueiros funciona que é uma beleza. Parecem um muro!" },
  { title: "ESTATÍSTICA", desc: "O banco de dados aponta: mais desarmes neste tempo do que na rodada inteira." },
  { title: "SISTEMA TÁTICO", desc: "Triangulações perigosas! A bola roda de pé em pé buscando brechas." },
  { title: "FÔLEGO", desc: "Alguns jogadores começam a mostrar cansaço. A exigência física é alta." },
  { title: "CLIMA", desc: "Chuva fina começa a cair, deixando a bola muito mais rápida neste gramado." },
  { title: "APROXIMAÇÃO", desc: "Bate e rebate na entrada da área! Defesa se estica toda pra afastar!" },
  { title: "FIM DE PAPO", desc: "Apito final do árbitro cibernético! Batalha encerrada." }
];

const calculateDNAEffect = (player: Player, sector: 'attack' | 'midfield' | 'defense' | 'goalkeeper', matchIntensity: number = 50, isDecisiveMatch: boolean = false): { multiplier: number, staminaBonus: number } => {
  let multiplier = 1.0;
  let staminaBonus = 1.0;

  const badges = player.badges || regenerateDNA(player);
  const slots = [badges.slot1, badges.slot2, badges.slot3, badges.slot4];

  slots.forEach(trait => {
    if (!trait) return;

    // Bronze (+1%)
    if (trait.includes('Bronze')) multiplier *= 1.01;
    // Prata (+3%)
    if (trait.includes('Prata')) multiplier *= 1.03;
    // Ouro (+5%)
    if (trait.includes('Ouro')) multiplier *= 1.06;
    // Lendário (Slot 3) (+8%)
    if (trait.includes('Lendária')) multiplier *= 1.10;

    // Épicos
    if (trait === 'Máquina') {
      multiplier *= 1.055;
      staminaBonus *= 0.90; // -10% dreno
    }
    if (trait === 'Catalisador') multiplier *= 1.045; // Aura simple boost for self now, logic can be expanded

    // Especiais
    if (trait === 'Clutch' && isDecisiveMatch) multiplier *= 1.07;
    if (trait === 'Protagonista' && matchIntensity > 80) multiplier *= 1.10;

    // Fardos (-4%)
    const fardos = ['Displicente', 'Pavio Curto', 'Preguiçoso', 'Vidro', 'Inconstante', 'Estático', 'Individualista', 'Boêmio'];
    if (fardos.includes(trait)) multiplier *= 0.96;
  });

  return { multiplier, staminaBonus };
};

const refineEventCopy = (event: MatchEvent): MatchEvent => {
  const descriptions: Partial<Record<MatchEvent['type'], string>> = {
    GOAL: 'A jogada foi bem executada na area e terminou com uma finalizacao limpa.',
    CHANCE: 'A chance apareceu depois de boa aproximacao, mas faltou precisao no ultimo toque.',
    WOODWORK: 'A finalizacao saiu forte e parou na trave por poucos centimetros.',
    BLOCKED: 'A defesa fechou o espaco e bloqueou antes da bola chegar limpa ao gol.',
    COUNTER: 'A recuperacao abriu campo para uma transicao rapida.',
    MISTAKE: 'A decisao na saida de bola saiu ruim e deixou o setor sob pressao.',
    FOUL: 'Contato atrasado na disputa. A arbitragem marcou a falta sem deixar o jogo escapar.',
    OFFSIDE: 'A linha defensiva subiu no tempo certo e deixou o ataque impedido.',
    VAR: 'A jogada foi revisada e a decisao de campo foi mantida.',
  };

  const titleByType: Partial<Record<MatchEvent['type'], string>> = {
    GOAL: 'GOL',
    WOODWORK: 'NA TRAVE',
    BLOCKED: 'BLOQUEIO',
    COUNTER: 'TRANSICAO',
    MISTAKE: 'ERRO NA SAIDA',
  };

  return {
    ...event,
    title: titleByType[event.type] || event.title,
    description: descriptions[event.type] || event.description,
  };
};

const generateMatchHeadline = (home: TeamStats, away: TeamStats, homeScore: number, awayScore: number, homeShots: number, awayShots: number): string => {
  const scoreGap = Math.abs(homeScore - awayScore);
  const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;
  const loser = homeScore > awayScore ? away : awayScore > homeScore ? home : null;
  const winnerShots = homeScore > awayScore ? homeShots : awayShots;
  const loserShots = homeScore > awayScore ? awayShots : homeShots;

  if (!winner) return `${home.name} e ${away.name} empatam em jogo decidido por detalhes`;
  if (scoreGap >= 3) return `${winner.name} controla os momentos-chave e vence ${loser?.name} com autoridade`;
  if (winnerShots <= loserShots) return `${winner.name} sofre, mas aproveita melhor as chances contra ${loser?.name}`;
  return `${winner.name} constrói vitória curta com mais clareza no último terço`;
};

export function simulateMatch(
  home: TeamStats,
  away: TeamStats,
  homePlayers: Player[] = [],
  awayPlayers: Player[] = []
): MatchResultType {
  const events: MatchEvent[] = [];
  let homeScore = 0;
  let awayScore = 0;

  let homePossessionWon = 0;
  let awayPossessionWon = 0;

  let homeShots = 0;
  let awayShots = 0;

  let homeShotsOnTarget = 0;
  let awayShotsOnTarget = 0;

  let homeMomentum = 0;
  let awayMomentum = 0;

  let halfTimeEventPushed = false;

  const playerRatings: Record<string, number[]> = {};
  const scorers: Array<{ playerId: string; teamId: string }> = [];
  const assists: Array<{ playerId: string; teamId: string }> = [];

  const addRatings = (ratings: Record<string, number>) => {
    Object.entries(ratings).forEach(([id, rating]) => {
      if (!playerRatings[id]) playerRatings[id] = [];
      playerRatings[id].push(rating);
    });
  };

  const defaultSector = { chemistry: 100, phase: 6, stamina: 100, tacticalBonus: 1.0, chaosMax: 10 };

  // Initialize match-only stamina for all participating players
  const playerStamina: Record<string, number> = {};
  homePlayers.forEach(p => playerStamina[p.id] = 100);
  awayPlayers.forEach(p => playerStamina[p.id] = 100);

  // Sectors initialized below with full tactical calculation

  const homeEffect = PLAYSTYLE_EFFECTS[home.playStyle] || PLAYSTYLE_EFFECTS['Equilibrado'];
  const awayEffect = PLAYSTYLE_EFFECTS[away.playStyle] || PLAYSTYLE_EFFECTS['Equilibrado'];

  const homeMentality = MENTALITY_EFFECTS[home.mentality] || MENTALITY_EFFECTS['Calculista'];
  const awayMentality = MENTALITY_EFFECTS[away.mentality] || MENTALITY_EFFECTS['Calculista'];
  const clampSlider = (value: number | undefined, fallback = 50) => Math.max(0, Math.min(100, value ?? fallback));
  const homeIntensity = clampSlider(home.intensity, home.aggressiveness);
  const awayIntensity = clampSlider(away.intensity, away.aggressiveness);
  const homeWidth = clampSlider(home.width);
  const awayWidth = clampSlider(away.width);
  const homePassing = clampSlider(home.passing);
  const awayPassing = clampSlider(away.passing);
  const homePressureMod = 1 + (homeIntensity - 50) / 600;
  const awayPressureMod = 1 + (awayIntensity - 50) / 600;
  const homeStaminaDrainMod = 1 + (homeIntensity - 50) / 150;
  const awayStaminaDrainMod = 1 + (awayIntensity - 50) / 150;
  const homeWidthAttackMod = 1 + (homeWidth - 50) / 500;
  const awayWidthAttackMod = 1 + (awayWidth - 50) / 500;
  const homeWidthDefenseMod = 1 + (50 - homeWidth) / 700;
  const awayWidthDefenseMod = 1 + (50 - awayWidth) / 700;
  const homeWidthMidMod = 1 - Math.abs(homeWidth - 50) / 1000;
  const awayWidthMidMod = 1 - Math.abs(awayWidth - 50) / 1000;
  const homePassingAttackMod = 1 + (homePassing - 50) / 650;
  const awayPassingAttackMod = 1 + (awayPassing - 50) / 650;
  const homePassingMidMod = 1 + (50 - homePassing) / 800;
  const awayPassingMidMod = 1 + (50 - awayPassing) / 800;

  // Tactical Card Effects
  const getCardEffects = (slots: (TacticalCard | null)[]) => {
    let att = 1.0, mid = 1.0, def = 1.0, gk = 1.0, chaos = 0;
    if (slots && Array.isArray(slots)) {
      slots.forEach(card => {
        if (!card) return;
        const name = card.name || '';
        // Sector Bonuses (Stackable) - Softer values as requested
        if (name.includes('Ataque')) att += 0.05;
        if (name.includes('Defesa')) def += 0.05;
        if (name.includes('Meio')) mid += 0.05;
        if (name.includes('Goleiro')) gk += 0.05;

        // Specific Named Cards
        if (name === 'Super Chute') att += 0.10;
        if (name === 'Muralha') def += 0.10;
        if (name === 'Maestro') mid += 0.08;
        if (name === 'Bio-Otimização') { att += 0.04; mid += 0.04; def += 0.04; gk += 0.04; }
        if (name === 'Holograma') chaos += 3;
      });
    }
    return { att, mid, def, gk, chaos };
  };

  // --- DNA SECTOR AGGREGATION ---
  const getSectorDNA = (players: Player[], sector: 'attack' | 'midfield' | 'defense' | 'goalkeeper') => {
    let mult = 1.0;
    let stam = 1.0;
    if (!players || players.length === 0) return { mult, stam };

    players.forEach(p => {
      const effect = calculateDNAEffect(p, sector);
      mult *= effect.multiplier;
      stam *= effect.staminaBonus;
    });

    // Smooth the multiplier to prevent too much power creep when 11 players have it
    // We take the cube root of the product of modifiers to normalize it
    const normalizedMult = Math.pow(mult, 1 / Math.max(1, players.length / 3));
    return { mult: normalizedMult, stam };
  };

  const homeAttDNA = getSectorDNA(homePlayers.filter(p => p.role === 'ATA'), 'attack');
  const homeMidDNA = getSectorDNA(homePlayers.filter(p => p.role === 'MEI'), 'midfield');
  const homeDefDNA = getSectorDNA(homePlayers.filter(p => p.role === 'ZAG'), 'defense');
  const awayAttDNA = getSectorDNA(awayPlayers.filter(p => p.role === 'ATA'), 'attack');
  const awayMidDNA = getSectorDNA(awayPlayers.filter(p => p.role === 'MEI'), 'midfield');
  const awayDefDNA = getSectorDNA(awayPlayers.filter(p => p.role === 'ZAG'), 'defense');
  const dnaImpact = (multiplier: number) => 1 + (multiplier - 1) * 0.25;

  const homeCards = getCardEffects(home.slots);
  const awayCards = getCardEffects(away.slots);

  const homeAttackSector: SectorInput = {
    ...defaultSector,
    averageAttribute: home.attack,
    chemistry: home.chemistry,
    chaosMax: 10 + homeCards.chaos,
    tacticalBonus: ((homeEffect.att || 1.0) * (homeCards.att || 1.0) * homeWidthAttackMod * homePassingAttackMod * homePressureMod * (1 + ((home.linePosition || 50) - 50) / 200) + (homeMentality.attBonus || 0) + (home.aggressiveness / 500)) * dnaImpact(homeAttDNA.mult)
  };
  const homeDefenseSector: SectorInput = {
    ...defaultSector,
    averageAttribute: home.defense,
    chemistry: home.chemistry,
    chaosMax: 10 + homeCards.chaos,
    tacticalBonus: ((homeEffect.def || 1.0) * (homeCards.def || 1.0) * homeWidthDefenseMod * (1 + (50 - (home.linePosition || 50)) / 200) - (homeMentality.defPenalty || 0) + (home.aggressiveness / 500)) * dnaImpact(homeDefDNA.mult)
  };

  const awayAttackSector: SectorInput = {
    ...defaultSector,
    averageAttribute: away.attack,
    chemistry: away.chemistry,
    chaosMax: 10 + awayCards.chaos,
    tacticalBonus: ((awayEffect.att || 1.0) * (awayCards.att || 1.0) * awayWidthAttackMod * awayPassingAttackMod * awayPressureMod * (1 + ((away.linePosition || 50) - 50) / 200) + (awayMentality.attBonus || 0) + (away.aggressiveness / 500)) * dnaImpact(awayAttDNA.mult)
  };
  const awayDefenseSector: SectorInput = {
    ...defaultSector,
    averageAttribute: away.defense,
    chemistry: away.chemistry,
    chaosMax: 10 + awayCards.chaos,
    tacticalBonus: ((awayEffect.def || 1.0) * (awayCards.def || 1.0) * awayWidthDefenseMod * (1 + (50 - (away.linePosition || 50)) / 200) - (awayMentality.defPenalty || 0) + (away.aggressiveness / 500)) * dnaImpact(awayDefDNA.mult)
  };

  // --- INJECT COMMENTARY CARDS (Distributed across the match) ---
  for (let i = 0; i < COMMENTARY_COUNT; i++) {
    const second = i * COMMENTARY_INTERVAL_SECONDS;
    const minute = Math.floor((second / MATCH_REAL_TIME_SECONDS) * MATCH_DURATION_MINUTES);

    // Pick appropriate template (start/end anchored, middle randomized)
    let tmpl;
    if (i === 0) tmpl = COMMENTARY_TEMPLATES[0]; // INÍCIO
    else if (i === COMMENTARY_COUNT - 1) tmpl = COMMENTARY_TEMPLATES[COMMENTARY_TEMPLATES.length - 1]; // FIM
    else tmpl = COMMENTARY_TEMPLATES[1 + Math.floor(Math.random() * (COMMENTARY_TEMPLATES.length - 2))];

    events.push({
      id: `comm_${i}_${Date.now()}`,
      minute,
      realTimeSecond: second,
      type: 'COMMENTARY',
      title: tmpl.title,
      description: tmpl.desc,
      teamId: 'system' // Neutral
    });
  }

  for (let minute = 1; minute <= MATCH_DURATION_MINUTES; minute++) {
    // Dynamic bonuses based on time (Motor Lento)
    const homeLateBonus = (minute > 75) ? (homeEffect.lateBonus || 1.0) : 1.0;
    const awayLateBonus = (minute > 75) ? (awayEffect.lateBonus || 1.0) : 1.0;

    const homeMid = home.midfield * homeEffect.mid * homeCards.mid * homeLateBonus * homeWidthMidMod * homePassingMidMod * homePressureMod * dnaImpact(homeMidDNA.mult) * (home.chemistry / 100);
    const awayMid = away.midfield * awayEffect.mid * awayCards.mid * awayLateBonus * awayWidthMidMod * awayPassingMidMod * awayPressureMod * dnaImpact(awayMidDNA.mult) * (away.chemistry / 100);

    const totalMid = homeMid + awayMid;
    const possessionRoll = Math.random() * totalMid;
    const hasPossession = possessionRoll < homeMid ? 'home' : 'away';

    // Update Stamina Drain for all players
    homePlayers.forEach(p => {
      const effect = calculateDNAEffect(p, 'midfield');
      const drain = (homeEffect.staminaDrain || 1.0) * homeStaminaDrainMod * (homeMentality.staminaPenalty ? 1.2 : 1.0) * effect.staminaBonus;
      // drain * 0.3 per minute -> ~27% drop for Equilibrado, ~40% for Blitzkrieg over 90 mins
      playerStamina[p.id] = Math.max(10, (playerStamina[p.id] || 100) - (drain * 0.3));
    });
    awayPlayers.forEach(p => {
      const effect = calculateDNAEffect(p, 'midfield');
      const drain = (awayEffect.staminaDrain || 1.0) * awayStaminaDrainMod * (awayMentality.staminaPenalty ? 1.2 : 1.0) * effect.staminaBonus;
      playerStamina[p.id] = Math.max(10, (playerStamina[p.id] || 100) - (drain * 0.3));
    });

    if (hasPossession === 'home') {
      homePossessionWon++;
      homeMomentum++;
      awayMomentum = 0;
    } else {
      awayPossessionWon++;
      awayMomentum++;
      homeMomentum = 0;
    }

    // Half Time Check
    if (minute === 45 && !halfTimeEventPushed) {
      halfTimeEventPushed = true;
      const baseSecondHalf = Math.floor((45 / MATCH_DURATION_MINUTES) * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `half_time_${Date.now()}`,
        minute: 45,
        realTimeSecond: baseSecondHalf,
        type: 'COMMENTARY',
        title: 'FIM DO 1º TEMPO',
        description: `As equipes vão pro vestiário! Placar no intervalo: ${homeScore} a ${awayScore}.`,
        teamId: 'system'
      });
    }

    // Check Momentum Domination
    if (homeMomentum === 3) {
      const ms = Math.floor((minute / MATCH_DURATION_MINUTES) * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `mom_h_${minute}_${Date.now()}`, minute, realTimeSecond: ms, type: 'COMMENTARY',
        title: 'DOMÍNIO ESTABELECIDO', description: `${home.name} domina o meio-campo e não deixa o adversário respirar!`, teamId: 'system'
      });
    } else if (awayMomentum === 3) {
      const ms = Math.floor((minute / MATCH_DURATION_MINUTES) * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `mom_a_${minute}_${Date.now()}`, minute, realTimeSecond: ms, type: 'COMMENTARY',
        title: 'PRESSÃO ALTA!', description: `Momentum total pro ${away.name}, parece que eles acamparam no campo de ataque!`, teamId: 'system'
      });
    }

    // Calculate second within the 6-minute (360s) window
    const baseSecond = Math.floor((minute / MATCH_DURATION_MINUTES) * MATCH_REAL_TIME_SECONDS);
    const currentEventSecond = Math.max(0, Math.min(MATCH_REAL_TIME_SECONDS - 1, baseSecond + Math.floor(Math.random() * 7) - 3));

    // Event chance: Increased for more realistic goal counts 
    // Base intensity 0.18, peaks at ~0.48 at minute 90
    let intensity = 0.17 + (minute / 330);
    intensity *= hasPossession === 'home'
      ? 1 + (homeIntensity - 50) / 400
      : 1 + (awayIntensity - 50) / 400;
    if (hasPossession === 'home' && awayEffect.tickReduction) intensity *= (1 - awayEffect.tickReduction);
    if (hasPossession === 'away' && homeEffect.tickReduction) intensity *= (1 - homeEffect.tickReduction);

    if (Math.random() > intensity) continue;

    if (hasPossession === 'home') {
      const activeHome = pickWeightedRandom(homePlayers, 3);
      const activeAway = pickWeightedRandom(awayPlayers, 3);

      const avgHomeStamina = activeHome.reduce((sum, p) => sum + (playerStamina[p.id] || 100), 0) / 3;
      const avgAwayStamina = activeAway.reduce((sum, p) => sum + (playerStamina[p.id] || 100), 0) / 3;

      const currentHomeAttack = { ...homeAttackSector, stamina: avgHomeStamina / 100 };
      const currentAwayDefense = { ...awayDefenseSector, stamina: avgAwayStamina / 100 };

      const result = calculateMatchEvent(minute, currentHomeAttack, currentAwayDefense, activeHome, activeAway);
      addRatings(result.ratings);

      const mainAttacker = activeHome[0];
      const defender = activeAway[0];

      if (result.outcome === 'goal') {
        const varRoll = Math.random();
        if (varRoll < 0.08) {
          events.push({
            id: `var_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'VAR',
            title: 'VAR EM AÇÃO',
            description: VAR_DESCRIPTIONS[Math.floor(Math.random() * VAR_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: 'system'
          });
        }

        homeScore++;
        homeShots++;
        homeShotsOnTarget++;
        scorers.push({ playerId: mainAttacker.id, teamId: home.id });

        const assistant = activeHome[1];
        if (assistant) assists.push({ playerId: assistant.id, teamId: home.id });

        const descTmpl = GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)];
        const goalDesc = assistant
          ? `${descTmpl.replace('{player}', mainAttacker.nickname)} Com um passe magistral de ${assistant.nickname}!`
          : descTmpl.replace('{player}', mainAttacker.nickname);

        events.push({
          id: `event_${home.id}_${minute}_${Date.now()}_${Math.random()}`,
          minute, realTimeSecond: currentEventSecond + 1, type: 'GOAL', title: 'GOL!',
          description: goalDesc, playerId: mainAttacker.id, assistantId: assistant?.id, teamId: home.id
        });
      } else if (result.outcome === 'defense') {
        homeShots++;
        const defenseVariant = Math.random();

        if (defenseVariant < 0.2) {
          events.push({
            id: `wood_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'WOODWORK',
            title: 'NA TRAVE!',
            description: WOODWORK_DESCRIPTIONS[Math.floor(Math.random() * WOODWORK_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: home.id, playerId: mainAttacker.id
          });
        } else if (defenseVariant < 0.5) {
          events.push({
            id: `block_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'BLOCKED',
            title: 'BLOQUEADO!',
            description: BLOCKED_DESCRIPTIONS[Math.floor(Math.random() * BLOCKED_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: away.id, playerId: defender.id
          });
        } else {
          if (Math.random() > 0.4) homeShotsOnTarget++;
          const descTmpl = DEFENSE_DESCRIPTIONS[Math.floor(Math.random() * DEFENSE_DESCRIPTIONS.length)];
          const defDesc = descTmpl.replace('{player}', mainAttacker.nickname);

          events.push({
            id: `event_${away.id}_${minute}_${Date.now()}_${Math.random()}`,
            minute, realTimeSecond: currentEventSecond, type: 'CHANCE',
            title: 'DEFESA!', description: defDesc, playerId: defender.id, teamId: away.id
          });
        }
      } else {
        const turnoverRoll = Math.random();
        if (turnoverRoll < 0.10) {
          events.push({
            id: `off_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'OFFSIDE',
            title: 'IMPEDIMENTO',
            description: OFFSIDE_DESCRIPTIONS[Math.floor(Math.random() * OFFSIDE_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: home.id, playerId: mainAttacker.id
          });
        } else if (turnoverRoll < 0.20) {
          events.push({
            id: `cnt_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'COUNTER',
            title: 'CONTRA-ATAQUE!',
            description: COUNTER_DESCRIPTIONS[Math.floor(Math.random() * COUNTER_DESCRIPTIONS.length)].replace('{player}', defender.nickname),
            teamId: away.id, playerId: defender.id
          });
        } else if (turnoverRoll < 0.25) {
          events.push({
            id: `err_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'MISTAKE',
            title: 'FALHA!',
            description: MISTAKE_DESCRIPTIONS[Math.floor(Math.random() * MISTAKE_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: home.id, playerId: mainAttacker.id
          });
        } else {
          const foulRoll = Math.random();
          const foulChance = 0.12 * (((home.aggressiveness || 50) + homeIntensity) / 100);

          if (foulRoll < foulChance) {
            const yellowRoll = Math.random();
            const isYellow = yellowRoll < 0.25;
            const isRed = !isYellow && yellowRoll < 0.30;

            if (isYellow || isRed) {
              events.push({
                id: `event_${home.id}_${minute}_card`,
                minute, realTimeSecond: currentEventSecond,
                type: isRed ? 'CARD_RED' : 'CARD_YELLOW',
                title: isRed ? 'CARTÃO VERMELHO!' : 'CARTÃO AMARELO!',
                description: `${mainAttacker.nickname} recebe o cartão após entrada dura em ${defender.nickname}.`,
                playerId: mainAttacker.id, teamId: home.id
              });
            } else {
              events.push({
                id: `event_${home.id}_${minute}_foul`,
                minute, realTimeSecond: currentEventSecond, type: 'FOUL', title: 'FALTA',
                description: FOUL_DESCRIPTIONS[Math.floor(Math.random() * FOUL_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
                playerId: mainAttacker.id, teamId: home.id
              });
            }
          }
        }
      }
    } else {
      const activeAway = pickWeightedRandom(awayPlayers, 3);
      const activeHome = pickWeightedRandom(homePlayers, 3);

      const avgAwayStamina = activeAway.reduce((sum, p) => sum + (playerStamina[p.id] || 100), 0) / 3;
      const avgHomeStamina = activeHome.reduce((sum, p) => sum + (playerStamina[p.id] || 100), 0) / 3;

      const currentAwayAttack = { ...awayAttackSector, stamina: avgAwayStamina / 100 };
      const currentHomeDefense = { ...homeDefenseSector, stamina: avgHomeStamina / 100 };

      const result = calculateMatchEvent(minute, currentAwayAttack, currentHomeDefense, activeAway, activeHome);
      addRatings(result.ratings);

      const mainAttacker = activeAway[0];
      const defender = activeHome[0];

      if (result.outcome === 'goal') {
        const varRoll = Math.random();
        if (varRoll < 0.08) {
          events.push({
            id: `var_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'VAR',
            title: 'VAR EM AÇÃO',
            description: VAR_DESCRIPTIONS[Math.floor(Math.random() * VAR_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: 'system'
          });
        }

        awayScore++;
        awayShots++;
        awayShotsOnTarget++;
        scorers.push({ playerId: mainAttacker.id, teamId: away.id });

        const assistant = activeAway[1];
        if (assistant) assists.push({ playerId: assistant.id, teamId: away.id });

        const descTmpl = GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)];
        const goalDesc = assistant
          ? `${descTmpl.replace('{player}', mainAttacker.nickname)} Com um passe magistral de ${assistant.nickname}!`
          : descTmpl.replace('{player}', mainAttacker.nickname);

        events.push({
          id: `event_${away.id}_${minute}_goal`,
          minute, realTimeSecond: currentEventSecond + 1, type: 'GOAL', title: 'GOL!',
          description: goalDesc, playerId: mainAttacker.id, assistantId: assistant?.id, teamId: away.id
        });
      } else if (result.outcome === 'defense') {
        awayShots++;
        const defenseVariant = Math.random();

        if (defenseVariant < 0.2) {
          events.push({
            id: `wood_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'WOODWORK',
            title: 'NA TRAVE!',
            description: WOODWORK_DESCRIPTIONS[Math.floor(Math.random() * WOODWORK_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: away.id, playerId: mainAttacker.id
          });
        } else if (defenseVariant < 0.5) {
          events.push({
            id: `block_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'BLOCKED',
            title: 'BLOQUEADO!',
            description: BLOCKED_DESCRIPTIONS[Math.floor(Math.random() * BLOCKED_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: home.id, playerId: defender.id
          });
        } else {
          if (Math.random() > 0.4) awayShotsOnTarget++;
          const descTmpl = DEFENSE_DESCRIPTIONS[Math.floor(Math.random() * DEFENSE_DESCRIPTIONS.length)];
          const defDesc = descTmpl.replace('{player}', mainAttacker.nickname);

          events.push({
            id: `event_${home.id}_${minute}_defense`,
            minute, realTimeSecond: currentEventSecond, type: 'CHANCE',
            title: 'DEFESA!', description: defDesc, playerId: defender.id, teamId: home.id
          });
        }
      } else {
        const turnoverRoll = Math.random();
        if (!mainAttacker || !defender) continue;

        if (turnoverRoll < 0.10) {
          events.push({
            id: `off_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'OFFSIDE',
            title: 'IMPEDIMENTO',
            description: OFFSIDE_DESCRIPTIONS[Math.floor(Math.random() * OFFSIDE_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: away.id, playerId: mainAttacker.id
          });
        } else if (turnoverRoll < 0.20) {
          events.push({
            id: `cnt_${home.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'COUNTER',
            title: 'CONTRA-ATAQUE!',
            description: COUNTER_DESCRIPTIONS[Math.floor(Math.random() * COUNTER_DESCRIPTIONS.length)].replace('{player}', defender.nickname),
            teamId: home.id, playerId: defender.id
          });
        } else if (turnoverRoll < 0.25) {
          events.push({
            id: `err_${away.id}_${minute}_${Date.now()}`, minute, realTimeSecond: currentEventSecond, type: 'MISTAKE',
            title: 'FALHA!',
            description: MISTAKE_DESCRIPTIONS[Math.floor(Math.random() * MISTAKE_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
            teamId: away.id, playerId: mainAttacker.id
          });
        } else {
          const foulRoll = Math.random();
          const foulChance = 0.12 * (((away.aggressiveness || 50) + awayIntensity) / 100);

          if (foulRoll < foulChance) {
            const yellowRoll = Math.random();
            const isYellow = yellowRoll < 0.25;
            const isRed = !isYellow && yellowRoll < 0.30;

            if (isYellow || isRed) {
              events.push({
                id: `event_${away.id}_${minute}_card`,
                minute, realTimeSecond: currentEventSecond,
                type: isRed ? 'CARD_RED' : 'CARD_YELLOW',
                title: isRed ? 'CARTÃO VERMELHO!' : 'CARTÃO AMARELO!',
                description: `${mainAttacker.nickname} foi advertido pelo árbitro.`,
                playerId: mainAttacker.id, teamId: away.id
              });
            } else {
              events.push({
                id: `event_${away.id}_${minute}_foul`,
                minute, realTimeSecond: currentEventSecond, type: 'FOUL', title: 'FALTA',
                description: FOUL_DESCRIPTIONS[Math.floor(Math.random() * FOUL_DESCRIPTIONS.length)].replace('{player}', mainAttacker.nickname),
                playerId: mainAttacker.id, teamId: away.id
              });
            }
          }
        }
      }
    }
  }

  const totalPossession = homePossessionWon + awayPossessionWon;
  const finalRatings: Record<string, number> = {};
  const clampRating = (value: number) => Number(Math.max(3.0, Math.min(10.0, value)).toFixed(1));

  const countGoals = (playerId: string, teamId: string) =>
    scorers.filter(item => item.playerId === playerId && item.teamId === teamId).length;

  const countAssists = (playerId: string, teamId: string) =>
    assists.filter(item => item.playerId === playerId && item.teamId === teamId).length;

  const getEventAverage = (playerId: string) => {
    const ratings = playerRatings[playerId];
    if (!ratings || ratings.length === 0) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  const rateTeamPlayers = (
    team: TeamStats,
    players: Player[],
    isHome: boolean,
    goalsFor: number,
    goalsAgainst: number,
    shotsFor: number,
    shotsAgainst: number,
    possession: number,
    opponentPossession: number
  ) => {
    const resultBonus = goalsFor > goalsAgainst ? 0.45 : goalsFor === goalsAgainst ? 0.12 : -0.35;
    const goalDiff = goalsFor - goalsAgainst;
    const shotBalance = shotsFor - shotsAgainst;
    const possessionEdge = possession - opponentPossession;

    players.forEach(player => {
      let sectorBase = 6.0 + resultBonus;

      if (player.role === 'GOL') {
        sectorBase += Math.max(-1.2, Math.min(1.2, (1.2 - goalsAgainst * 0.55) + (shotsAgainst > 0 ? (shotsAgainst - goalsAgainst) / 12 : 0)));
      } else if (player.role === 'ZAG') {
        sectorBase += Math.max(-1.1, Math.min(1.1, (goalDiff * 0.18) - (goalsAgainst * 0.35) - (shotsAgainst / 35)));
        sectorBase += (team.linePosition <= 35 && goalsAgainst === 0) ? 0.25 : 0;
      } else if (player.role === 'MEI') {
        sectorBase += Math.max(-0.9, Math.min(0.9, possessionEdge / 45 + shotBalance / 28));
        sectorBase += (team.passing !== undefined && team.passing <= 35 && possession >= 52) ? 0.2 : 0;
      } else {
        sectorBase += Math.max(-1.0, Math.min(1.2, (goalsFor * 0.25) + (shotsFor / 24) + (goalDiff * 0.15)));
        sectorBase += (team.passing !== undefined && team.passing >= 70 && shotsFor >= shotsAgainst) ? 0.18 : 0;
      }

      const directContribution = countGoals(player.id, team.id) * 0.85 + countAssists(player.id, team.id) * 0.45;
      const eventAverage = getEventAverage(player.id);
      const isStabilized = team.stabilizationPlayerId === player.id;
      const variance = (Math.random() - 0.5) * (isStabilized ? 0.45 : 0.9);
      const blended = eventAverage === null
        ? sectorBase
        : (sectorBase * 0.42) + (eventAverage * 0.58);

      finalRatings[player.id] = clampRating(blended + directContribution + variance);
    });
  };

  const homePossession = totalPossession > 0 ? Math.round((homePossessionWon / totalPossession) * 100) : 50;
  const awayPossession = totalPossession > 0 ? 100 - homePossession : 50;

  rateTeamPlayers(home, homePlayers, true, homeScore, awayScore, homeShots, awayShots, homePossession, awayPossession);
  rateTeamPlayers(away, awayPlayers, false, awayScore, homeScore, awayShots, homeShots, awayPossession, homePossession);

  Object.entries(playerRatings).forEach(([id, ratings]) => {
    // Start with the real average of what they did on the pitch
    let sum = ratings.reduce((a, b) => a + b, 0);
    let avg = sum / Math.max(1, ratings.length);

    // Check if player's team won
    // We check if the player object exists in the respective arrays passed to the engine
    const isHomePlayer = homePlayers.some(p => p.id === id);
    const isAwayPlayer = awayPlayers.some(p => p.id === id);

    // Stabilization focus: significantly reduce variance if focused
    const isStabilized = (isHomePlayer && home.stabilizationPlayerId === id) || (isAwayPlayer && away.stabilizationPlayerId === id);
    const varianceFactor = isStabilized ? 1.0 : 4.0;
    const randomSwing = (Math.random() - 0.5) * varianceFactor;

    let teamBonus = 0;
    if (isHomePlayer && homeScore > awayScore) teamBonus = 0.5;
    if (isHomePlayer && homeScore < awayScore) teamBonus = -0.5;
    if (isAwayPlayer && awayScore > homeScore) teamBonus = 0.5;
    if (isAwayPlayer && awayScore < homeScore) teamBonus = -0.5;

    avg += teamBonus + randomSwing;

    // Ensure it falls within 3.0 and 10.0 so the delta math in simulation.ts works perfectly
    finalRatings[id] = finalRatings[id] !== undefined
      ? clampRating((finalRatings[id] * 0.65) + (avg * 0.35))
      : clampRating(avg);
  });

  // Generate Headline
  let headline = `Equilíbrio total: ${home.name} e ${away.name} dividem os pontos em clássico eletrizante`;
  if (homeScore > awayScore) {
    if (homeScore - awayScore >= 3) headline = `Que goleada! ${home.name} massacra ${away.name} e avisa a liga!`;
    else headline = `Dever cumprido: Vitória suada e importante do ${home.name} em casa`;
  } else if (awayScore > homeScore) {
    if (awayScore - homeScore >= 3) headline = `Passeio no parque! Visitante indigesto, ${away.name} goleia e cala o estádio.`;
    else headline = `Guerreiros! ${away.name} arranca vitória heroica fora de casa nos minutos finais.`;
  }

  headline = generateMatchHeadline(home, away, homeScore, awayScore, homeShots, awayShots);

  return {
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeScore,
    awayScore,
    headline,
    scorers,
    assists,
    events: events.map(refineEventCopy),
    stats: {
      possession: {
        home: homePossession,
        away: awayPossession
      },
      shots: { home: homeShots, away: awayShots },
      shotsOnTarget: { home: homeShotsOnTarget, away: awayShotsOnTarget }
    },
    ratings: finalRatings
  };
}
