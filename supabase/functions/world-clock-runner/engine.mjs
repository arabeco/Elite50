// src/constants/gameConstants.ts
var MAX_TEAM_POWER_TIER_1 = 12e3;
var MAX_TEAM_POWER_TIER_3 = 8e3;
var SEASON_ROUNDS = 7;
var ELITE_CUP_ROUNDS = 4;
var DISTRICT_CUP_ROUNDS = 0;
var MIDSEASON_JOIN_MAX_ROUND = 4;
var GENESIS_DRAFT_AUTOFILL_DAY = 3;
var TOTAL_ROUNDS = SEASON_ROUNDS + ELITE_CUP_ROUNDS + DISTRICT_CUP_ROUNDS;
var SEASON_DAYS = 22;
var MATCH_INTERVAL_DAYS = 2;
var DEFAULT_TIME_SPEED = 1 / 60;
var HUMAN_MANAGER_ACTIVE_GRACE_DAYS = 2;
var SAFETY_NET_TOTAL = 6e3;
var SAFETY_NET_MIN_PLAYERS = 15;
var SAFETY_NET_FREE_AGENT_RATING = 400;
var MATCH_DURATION_MINUTES = 90;
var MATCH_REAL_TIME_SECONDS = 120;
var COMMENTARY_INTERVAL_SECONDS = 4.8;
var COMMENTARY_COUNT = 25;
var SQUAD_SIZE_MAX = 15;

// src/engine/simulation.ts
var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
var applyChaos = (value, chaosMax) => {
  const chaos = Math.random() * chaosMax;
  return value * (1 + chaos / 100);
};
var calculateMatchEvent = (tick, attack, defense, attackers = [], defenders = []) => {
  const baseAttack = attack.averageAttribute * attack.chemistry * attack.phase * attack.stamina * attack.tacticalBonus;
  const baseDefense = defense.averageAttribute * defense.chemistry * defense.phase * defense.stamina * defense.tacticalBonus;
  const attackPower = applyChaos(baseAttack, attack.chaosMax);
  const defensePower = applyChaos(baseDefense, defense.chaosMax);
  const ratio = attackPower / Math.max(1, defensePower);
  const qualityFactor = (attack.averageAttribute + defense.averageAttribute) / 1800;
  const baseProb = 0.105 * Math.max(1, qualityFactor);
  const goalProbability = clamp(baseProb + (ratio - 1) * 0.165, 0.04, 0.36);
  const defenseProbability = clamp(0.18 + (1 / ratio - 1) * 0.105, 0.075, 0.32);
  let outcome = "turnover";
  const roll = Math.random();
  if (roll < goalProbability) {
    outcome = "goal";
  } else if (roll < goalProbability + defenseProbability) {
    outcome = "defense";
  } else {
    outcome = "turnover";
  }
  const ratings = {};
  const attackBonus = outcome === "goal" ? 2.5 : outcome === "defense" ? -0.5 : -1;
  const defenseBonus = outcome === "defense" ? 2 : outcome === "goal" ? -1 : -0.2;
  attackers.forEach((p) => {
    ratings[p.id] = clamp(5.5 + attackBonus + (ratio - 1) * 1.5, 0, 10);
  });
  defenders.forEach((p) => {
    ratings[p.id] = clamp(5.5 + defenseBonus + (1 - ratio) * 1.2, 0, 10);
  });
  return {
    tick,
    outcome,
    probability: outcome === "goal" ? goalProbability : outcome === "defense" ? defenseProbability : 1 - goalProbability - defenseProbability,
    attackPower,
    defensePower,
    ratings
  };
};

// src/engine/CalendarGenerator.ts
var generateCalendar = (teams, leagueId, seasonStartDate) => {
  const matches = [];
  const teamIds = teams.map((t) => t.id);
  const n = teamIds.length;
  const matchesPerRound = n / 2;
  const roundsPerHalf = n - 1;
  const baseDate = seasonStartDate ? new Date(seasonStartDate) : (() => {
    const now = /* @__PURE__ */ new Date();
    const d = new Date(2050, now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    return d;
  })();
  let rotation = [...teamIds];
  for (let roundNum = 1; roundNum <= roundsPerHalf; roundNum++) {
    const roundDate = new Date(baseDate);
    roundDate.setDate(roundDate.getDate() + roundNum * 2);
    const dateStr = roundDate.toISOString().split("T")[0];
    for (let i = 0; i < matchesPerRound; i++) {
      const home = roundNum % 2 === 0 ? rotation[n - 1 - i] : rotation[i];
      const away = roundNum % 2 === 0 ? rotation[i] : rotation[n - 1 - i];
      const hours = [16, 18, 20];
      const timeStr = `${hours[i % hours.length]}:00`;
      matches.push({
        id: `m_${leagueId}_r${roundNum}_${i}`,
        homeTeamId: home,
        awayTeamId: away,
        date: dateStr,
        time: timeStr,
        status: "SCHEDULED",
        result: null,
        round: roundNum
      });
    }
    const last = rotation.pop();
    if (last) {
      rotation.splice(1, 0, last);
    }
  }
  return matches.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
};

// src/constants/avatarAssets.ts
var MALE_HAIR_FILES = [
  "hair_1.png",
  "f6-removebg-preview.png",
  "f9-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__9_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__10_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__11_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__12_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__13_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__14_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__15_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__18_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__19_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__20_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__21_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__22_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__23_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__24_-removebg-preview.png"
];
var FEMALE_HAIR_FILES = [
  "f1-removebg-preview.png",
  "f2-removebg-preview.png",
  "f3-removebg-preview.png",
  "f4-removebg-preview.png",
  "f7-removebg-preview.png",
  "f8-removebg-preview.png",
  "f10-removebg-preview.png",
  "f11-removebg-preview.png",
  "f13-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__5_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__6_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__7_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__8_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__9_-removebg-preview.png",
  "C\xF3pia_de_Design_sem_nome__10_-removebg-preview.png"
];
var HAIR_COUNT_BY_GENDER = {
  M: MALE_HAIR_FILES.length,
  F: FEMALE_HAIR_FILES.length
};

// src/engine/seed_universe.ts
var _seed = 1234567;
var mulberry32 = (a) => {
  return () => {
    let t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var rand = mulberry32(_seed);

// src/utils/teamIdentity.ts
var LOGO_BASE_PATH = "/assetas/avatars/logos";
var teamFile = (teamNumber, kind) => `team-${String(teamNumber).padStart(2, "0")}-${kind}.png`;
var TEAM_VISUAL_ASSETS = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => {
    const teamNumber = index + 1;
    return [
      `t_${teamNumber}`,
      {
        logoFile: teamFile(teamNumber, "logo"),
        uniformFile: teamFile(teamNumber, "uniform")
      }
    ];
  })
);
var TEAM_LOGO_ASSETS = {
  ...Object.fromEntries(
    Object.entries(TEAM_VISUAL_ASSETS).map(([teamId, assets]) => [teamId, `${LOGO_BASE_PATH}/${assets.logoFile}`])
  ),
  d_norte: `${LOGO_BASE_PATH}/district-norte-logo.png`,
  d_sul: `${LOGO_BASE_PATH}/district-sul-logo.png`,
  d_leste: `${LOGO_BASE_PATH}/district-leste-logo.png`,
  d_oeste: `${LOGO_BASE_PATH}/district-oeste-logo.png`
};

// src/engine/generator.ts
var _seed2 = 1234567;
var mulberry322 = (a) => {
  return () => {
    let t = a += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
var rand2 = mulberry322(_seed2);
var randomInt = (min, max) => Math.floor(rand2() * (max - min + 1)) + min;
var randomFloat = () => rand2();
var TRAITS_BRONZE = ["Ofensivo", "Folego", "Passe Bronze", "Finaliz Bronze", "Def Bronze"];
var TRAITS_PRATA = ["Consist\xEAncia", "Versatilidade", "Defesa Prata", "Finaliz Prata", "Passe Prata"];
var TRAITS_OURO = ["Finaliz Ouro", "Passe Ouro", "Defesa Ouro", "Lideran\xE7a", "Folego Ouro"];
var TRAITS_LENDARIO_S3 = ["Finaliz Lend\xE1ria", "Passe Lend\xE1ria", "Defesa Lend\xE1ria", "G\xEAnio", "Clutch", "Protagonista"];
var TRAITS_EPICO_S3 = ["M\xE1quina", "Catalisador"];
var TRAITS_FARDOS = ["Displicente", "Pavio Curto", "Pregui\xE7oso", "Vidro", "Inconstante", "Est\xE1tico", "Individualista", "Bo\xEAmio"];
var regenerateDNA = (player) => {
  const pRand = mulberry322(Array.from(player.id).reduce((a, b) => a + b.charCodeAt(0), 0));
  const getRand = (pool) => pool[Math.floor(pRand() * pool.length)];
  const s1 = pRand() < 0.7 ? getRand(TRAITS_BRONZE) : getRand(TRAITS_PRATA);
  const s2 = pRand() < 0.6 ? getRand(TRAITS_PRATA) : getRand(TRAITS_OURO);
  const s3Roll = pRand();
  let s3 = "";
  if (s3Roll < 0.7) s3 = getRand(TRAITS_OURO);
  else if (s3Roll < 0.95) s3 = getRand(TRAITS_EPICO_S3);
  else s3 = getRand(TRAITS_LENDARIO_S3);
  const s4 = pRand() < 0.25 ? getRand(TRAITS_FARDOS) : null;
  return {
    slot1: s1,
    slot2: s2,
    slot3: s3,
    slot4: s4,
    slot3Hidden: player.totalRating < 800
  };
};
var generateName = () => {
  const gender = randomFloat() < 0.5 ? "M" : "F";
  const firstList = [
    "Kael",
    "Ivo",
    "Noa",
    "Niko",
    "Lio",
    "Teo",
    "Rian",
    "Milo",
    "Soren",
    "Kian",
    "Ari",
    "Eron",
    "Vico",
    "Ryo",
    "Ilan",
    "Rin",
    "Tavi",
    "Ezra",
    "Nilo",
    "Koa",
    "Zara",
    "Mira",
    "Ayla",
    "Nia",
    "Luma",
    "Kira",
    "Suri",
    "Iris",
    "Mina",
    "Vela",
    "Juno",
    "Rina",
    "Yara",
    "Nyra",
    "Lia",
    "Anya"
  ];
  const surnameList = [
    "Voss",
    "Kade",
    "Soren",
    "Vale",
    "Ivar",
    "Fenn",
    "Calder",
    "Vega",
    "Ravel",
    "Drax",
    "Varga",
    "Mako",
    "Sato",
    "Haru",
    "Ren",
    "Akari",
    "Zhen",
    "Onari",
    "Sen",
    "Arken",
    "Nox",
    "Corvin",
    "Vey",
    "Orion",
    "Lior",
    "Rial",
    "Senda",
    "Varyn",
    "Aster",
    "Quill",
    "Vanta",
    "Drift",
    "Morrow",
    "Rift"
  ];
  const first = firstList[randomInt(0, firstList.length - 1)];
  const last = surnameList[randomInt(0, surnameList.length - 1)];
  return {
    name: `${first} ${last}`,
    nickname: randomFloat() < 0.08 ? `${first} ${["Zero", "Flux", "Corte", "Nexus", "Pulse", "Rift"][randomInt(0, 5)]}` : first,
    appearance: {
      gender,
      bodyId: randomInt(1, 3),
      hairId: randomInt(1, HAIR_COUNT_BY_GENDER[gender]),
      bootId: randomInt(1, 2)
    }
  };
};
var generatePentagon = () => {
  const base = randomInt(40, 65);
  return {
    FOR: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    AGI: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    INT: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    TAT: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    TEC: Math.min(100, Math.max(0, base + randomInt(-20, 30)))
  };
};
var calculateFusions = (p, pos) => {
  const fusions = {
    DET: p.FOR + p.INT,
    PAS: p.TAT + p.TEC
  };
  let total = fusions.DET + fusions.PAS;
  if (pos === "Linha") {
    fusions.DRI = p.AGI + p.INT;
    fusions.FIN = p.FOR + p.TEC;
    fusions.MOV = p.AGI + p.TAT;
    total += fusions.DRI + fusions.FIN + fusions.MOV;
  } else {
    fusions.REF = p.AGI + p.INT;
    fusions.DEF = p.FOR + p.TEC;
    fusions.POS = p.AGI + p.TAT;
    total += fusions.REF + fusions.DEF + fusions.POS;
  }
  return { fusions, total };
};
var generateBadges = (totalRating) => {
  return {
    slot1: null,
    slot2: null,
    slot3: null,
    slot4: null,
    slot3Hidden: true
  };
};
var generatePlayer = (id, district, ratingOverride, forcedRole) => {
  const { name, nickname, appearance } = generateName();
  let role;
  if (forcedRole) {
    role = forcedRole;
  } else {
    if (Math.random() < 0.11) role = "GOL";
    else {
      const r = Math.random();
      if (r < 0.38) role = "ZAG";
      else if (r < 0.73) role = "MEI";
      else role = "ATA";
    }
  }
  const position = role === "GOL" ? "Goleiro" : "Linha";
  const pentagon = generatePentagon();
  const { fusions, total } = calculateFusions(pentagon, position);
  const baseRating = Math.max(200, Math.min(1e3, ratingOverride ?? total));
  const badges = generateBadges(baseRating);
  const potential = Math.min(1e3, baseRating + randomInt(40, 250));
  const historyCount = randomInt(3, 5);
  const lastMatchRatings = [];
  for (let i = 0; i < historyCount; i++) {
    lastMatchRatings.push(Number((Math.random() * 5.5 + 4).toFixed(1)));
  }
  const careerGamesPlayed = randomInt(12, 120);
  const careerGoalsBase = role === "ATA" ? 18 : role === "MEI" ? 30 : role === "ZAG" ? 58 : 180;
  const careerAssistsBase = role === "MEI" ? 20 : role === "ATA" ? 34 : role === "ZAG" ? 55 : 160;
  const careerGoals = Math.max(0, Math.round((baseRating - 420) / careerGoalsBase) + randomInt(0, role === "ATA" ? 28 : role === "MEI" ? 14 : 5));
  const careerAssists = Math.max(0, Math.round((baseRating - 430) / careerAssistsBase) + randomInt(0, role === "MEI" ? 30 : role === "ATA" ? 16 : 7));
  const careerAverageRating = Number((5.8 + Math.min(2.4, Math.max(0, (baseRating - 450) / 250))).toFixed(2));
  const legacyTags = ["Joia lapidada", "Veterano de arena", "Especialista tatico", "Criado em base forte", "Nome de vestiario"];
  const ratingSeedA = Math.max(200, baseRating - randomInt(15, 90));
  const ratingSeedB = Math.max(200, baseRating - randomInt(8, 55));
  const ratingSeedC = Math.max(200, baseRating - randomInt(0, 30));
  const seedRatings = [ratingSeedA, ratingSeedB, ratingSeedC, baseRating];
  const seasonSnapshots = [2047, 2048, 2049].map((season, index) => ({
    season,
    teamId: null,
    teamName: index === 0 ? "Circuito Base" : "Clube anterior",
    ratingStart: seedRatings[index],
    ratingEnd: seedRatings[index + 1],
    ratingDelta: seedRatings[index + 1] - seedRatings[index],
    gamesPlayed: Math.max(3, Math.round(careerGamesPlayed / 3) + randomInt(-4, 5)),
    goals: Math.max(0, Math.round(careerGoals / 3) + randomInt(-2, 3)),
    assists: Math.max(0, Math.round(careerAssists / 3) + randomInt(-2, 3)),
    averageRating: Number((careerAverageRating + (randomFloat() - 0.5) * 0.4).toFixed(2)),
    satisfaction: randomInt(48, 94)
  }));
  const player = {
    id,
    name,
    nickname,
    originDistrict: district,
    appearance,
    district,
    position,
    role,
    pentagon,
    fusion: fusions,
    totalRating: baseRating,
    potential,
    currentPhase: 6,
    phaseHistory: lastMatchRatings.slice(0, 3),
    badges: { slot1: null, slot2: null, slot3: null, slot4: null, slot3Hidden: true },
    // Placeholder
    contract: {
      teamId: null
    },
    history: {
      goals: 0,
      assists: 0,
      averageRating: 0,
      gamesPlayed: 0,
      lastMatchRatings,
      benchGamesCount: 0,
      seasonRatingDelta: 0,
      careerGoals,
      careerAssists,
      careerGamesPlayed,
      careerAverageRating,
      peakRating: Math.max(baseRating, baseRating + randomInt(0, 35)),
      legacyTag: legacyTags[randomInt(0, legacyTags.length - 1)],
      formerClubCount: randomInt(0, 3),
      ratingSeasonStart: baseRating,
      seasonSnapshots,
      clubEvents: []
    },
    satisfaction: randomInt(50, 100),
    trainingProgress: 0,
    fatigue: 0,
    achievements: []
  };
  player.badges = regenerateDNA(player);
  return player;
};

// src/engine/MatchEngine.ts
var PLAYSTYLE_EFFECTS = {
  "Blitzkrieg": { att: 1.25, mid: 1.1, def: 0.8, staminaDrain: 1.5 },
  "Tiki-Taka": { att: 0.9, mid: 1.3, def: 1, staminaDrain: 0.8, tickReduction: 0.2 },
  "Retranca Armada": { att: 0.62, mid: 0.92, def: 1.25, staminaDrain: 0.9 },
  "Motor Lento": { att: 1, mid: 1, def: 1, staminaDrain: 1, lateBonus: 1.4 },
  "Equilibrado": { att: 1, mid: 1, def: 1, staminaDrain: 1 },
  "Gegenpressing": { att: 1.15, mid: 1.15, def: 0.9, staminaDrain: 1.4 },
  "Catenaccio": { att: 0.7, mid: 1.1, def: 1.5, staminaDrain: 0.9 },
  "Vertical": { att: 1.15, mid: 1, def: 0.9, staminaDrain: 1.2 }
};
var MENTALITY_EFFECTS = {
  "Calculista": { attBonus: 0, defPenalty: 0, staminaPenalty: 0 },
  "Emocional": { attBonus: 0.25, defPenalty: 0.3, staminaPenalty: 0 },
  "Predadora": { attBonus: 0.15, defPenalty: 0, staminaPenalty: 0.2 }
};
var pickWeightedRandom = (players, count, attributeKey = "totalRating") => {
  const weightedPlayers = players.map((p) => {
    const attrValue = attributeKey === "totalRating" ? p.totalRating : p.pentagon[attributeKey];
    const weight = (attrValue || 0) + 200;
    return { player: p, weight };
  });
  const selected = [];
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
var GOAL_DESCRIPTIONS = [
  "Balan\xE7ou o capim no fundo do gol! Gola\xE7o de {player}!",
  "Sabe de quem? {player}! Recebe na \xE1rea e fuzila para as redes!",
  "\xC9 disso que o povo gosta! {player} faz a festa na arquibancada com uma finaliza\xE7\xE3o perfeita.",
  "Ripa na chulipa e pimba na gorduchinha! {player} bota l\xE1 no fundo!",
  "L\xE1 onde a coruja dorme! {player} tira do goleiro e corre pro abra\xE7o."
];
var DEFENSE_DESCRIPTIONS = [
  "Pelo amor dos meus filhinhos! Que defesa inacredit\xE1vel do goleiro advers\xE1rio no chute de {player}!",
  "Olho no lance... Espalma pro lado! Defesa gigante ap\xF3s a bomba de {player}.",
  "O goleiro voa como um gato e tira a bola no \xE2ngulo! Que chance de {player}.",
  "Cruzamento cortado! A defesa corta o perigo de {player} na pequena \xE1rea."
];
var WOODWORK_DESCRIPTIONS = [
  "NO POSTE! A bola explode na trave ap\xF3s o chute de {player}!",
  "UUUUUH! {player} solta a bomba e ela carimba o travess\xE3o!",
  "Na trave! O goleiro j\xE1 estava batido, mas o metal salvou o advers\xE1rio."
];
var BLOCKED_DESCRIPTIONS = [
  "Bloqueio espetacular! O chute de {player} explode no corpo do defensor que se atirou na bola.",
  "Zaga muito s\xF3lida! {player} tentou o chute mas foi travado no momento exato.",
  "Desvio providencial! A defesa se desdobra para fechar os espa\xE7os e impedir a finaliza\xE7\xE3o."
];
var VAR_DESCRIPTIONS = [
  "Opa... O \xE1rbitro coloca a m\xE3o no ouvido. O VAR est\xE1 checando a legalidade do lance.",
  "Tens\xE3o em Neo-City! O lance de {player} est\xE1 sendo revisado pela arbitragem de v\xEDdeo.",
  "Arbitragem confirma: A decis\xE3o de campo est\xE1 mantida ap\xF3s a revis\xE3o."
];
var OFFSIDE_DESCRIPTIONS = [
  "Bandeira erguida! {player} estava ligeiramente \xE0 frente no momento do passe.",
  "Impedimento marcado! A linha defensiva subiu bem e deixou o atacante em posi\xE7\xE3o irregular.",
  "Lance anulado. O ataque se precipitou e caiu na armadilha da zaga."
];
var COUNTER_DESCRIPTIONS = [
  "CONTRA-ATAQUE! A bola \xE9 recuperada e o time sai em velocidade m\xE1xima com {player}!",
  "Transi\xE7\xE3o explosiva! O erro no ataque gera uma oportunidade de ouro no contra-golpe.",
  "L\xE1 vai o time no contra-ataque! Pegaram a defesa desarrumada agora."
];
var MISTAKE_DESCRIPTIONS = [
  "FRANGO! {player} comete uma falha bizarra e entrega o ouro pro advers\xE1rio!",
  "QUE TRAPALHADA! A defesa se enrola sozinha e {player} quase marca um gol contra.",
  "Erro infantil! {player} tentou o recuo e deu um presente para o ataque inimigo."
];
var FOUL_DESCRIPTIONS = [
  "Falta marcada! {player} chega atrasado e comete a infra\xE7\xE3o no meio-campo.",
  "Jogo parado. O juiz v\xEA a falta de {player} na disputa por baixo.",
  "Entrada mais forte de {player}, o \xE1rbitro apenas adverte verbalmente."
];
var COMMENTARY_TEMPLATES = [
  { title: "IN\xCDCIO DE JOGO", desc: "A bola rola! Come\xE7a o duelo no tapete sint\xE9tico de Neo-City!" },
  { title: "ESTRAT\xC9GIA", desc: "Os t\xE9cnicos gesticulam na \xE1rea t\xE9cnica, ajuste r\xE1pido ap\xF3s os primeiros toques." },
  { title: "POSSE DE BOLA", desc: "Jogo truncado no meio campo. Ningu\xE9m quer abrir alas para o advers\xE1rio." },
  { title: "FOCO TOTAL", desc: "Olho no lance! A movimenta\xE7\xE3o no \xFAltimo ter\xE7o do campo \xE9 agressiva." },
  { title: "RITMO ACELERADO", desc: "L\xE1 vai a equipe buscando a linha de fundo com velocidade absurda!" },
  { title: "DISPUTA F\xCDSICA", desc: "Dividida r\xEDspida, mas o \xE1rbitro cibern\xE9tico manda o jogo seguir." },
  { title: "TRANSCRI\xC7\xC3O", desc: "Scouts analisando tempo real: precis\xE3o de passes alta nesta etapa." },
  { title: "PRESS\xC3O ALTA", desc: "Marca\xE7\xE3o l\xE1 em cima! N\xE3o deixam o advers\xE1rio respirar na sa\xEDda de bola." },
  { title: "CAD\xCANCIA", desc: "Agora o ritmo cai um pouco. A bola gira de um lado pro outro com paci\xEAncia." },
  { title: "TORCIDA EM F\xDARIA", desc: "Os decib\xE9is dos hologramas batem no teto. Que barulho no est\xE1dio!" },
  { title: "DEFESA S\xD3LIDA", desc: "A linha de zagueiros funciona que \xE9 uma beleza. Parecem um muro!" },
  { title: "ESTAT\xCDSTICA", desc: "O banco de dados aponta: mais desarmes neste tempo do que na rodada inteira." },
  { title: "SISTEMA T\xC1TICO", desc: "Triangula\xE7\xF5es perigosas! A bola roda de p\xE9 em p\xE9 buscando brechas." },
  { title: "F\xD4LEGO", desc: "Alguns jogadores come\xE7am a mostrar cansa\xE7o. A exig\xEAncia f\xEDsica \xE9 alta." },
  { title: "CLIMA", desc: "Chuva fina come\xE7a a cair, deixando a bola muito mais r\xE1pida neste gramado." },
  { title: "APROXIMA\xC7\xC3O", desc: "Bate e rebate na entrada da \xE1rea! Defesa se estica toda pra afastar!" },
  { title: "FIM DE PAPO", desc: "Apito final do \xE1rbitro cibern\xE9tico! Batalha encerrada." }
];
var calculateDNAEffect = (player, sector, matchIntensity = 50, isDecisiveMatch = false) => {
  let multiplier = 1;
  let staminaBonus = 1;
  const badges = player.badges || regenerateDNA(player);
  const slots = [badges.slot1, badges.slot2, badges.slot3, badges.slot4];
  slots.forEach((trait) => {
    if (!trait) return;
    if (trait.includes("Bronze")) multiplier *= 1.01;
    if (trait.includes("Prata")) multiplier *= 1.03;
    if (trait.includes("Ouro")) multiplier *= 1.06;
    if (trait.includes("Lend\xE1ria")) multiplier *= 1.1;
    if (trait === "M\xE1quina") {
      multiplier *= 1.055;
      staminaBonus *= 0.9;
    }
    if (trait === "Catalisador") multiplier *= 1.045;
    if (trait === "Clutch" && isDecisiveMatch) multiplier *= 1.07;
    if (trait === "Protagonista" && matchIntensity > 80) multiplier *= 1.1;
    const fardos = ["Displicente", "Pavio Curto", "Pregui\xE7oso", "Vidro", "Inconstante", "Est\xE1tico", "Individualista", "Bo\xEAmio"];
    if (fardos.includes(trait)) multiplier *= 0.96;
  });
  return { multiplier, staminaBonus };
};
var refineEventCopy = (event) => {
  const descriptions = {
    GOAL: "A jogada foi bem executada na area e terminou com uma finalizacao limpa.",
    CHANCE: "A chance apareceu depois de boa aproximacao, mas faltou precisao no ultimo toque.",
    WOODWORK: "A finalizacao saiu forte e parou na trave por poucos centimetros.",
    BLOCKED: "A defesa fechou o espaco e bloqueou antes da bola chegar limpa ao gol.",
    COUNTER: "A recuperacao abriu campo para uma transicao rapida.",
    MISTAKE: "A decisao na saida de bola saiu ruim e deixou o setor sob pressao.",
    FOUL: "Contato atrasado na disputa. A arbitragem marcou a falta sem deixar o jogo escapar.",
    OFFSIDE: "A linha defensiva subiu no tempo certo e deixou o ataque impedido.",
    VAR: "A jogada foi revisada e a decisao de campo foi mantida."
  };
  const titleByType = {
    GOAL: "GOL",
    WOODWORK: "NA TRAVE",
    BLOCKED: "BLOQUEIO",
    COUNTER: "TRANSICAO",
    MISTAKE: "ERRO NA SAIDA"
  };
  return {
    ...event,
    title: titleByType[event.type] || event.title,
    description: descriptions[event.type] || event.description
  };
};
var generateMatchHeadline = (home, away, homeScore, awayScore, homeShots, awayShots) => {
  const scoreGap = Math.abs(homeScore - awayScore);
  const winner = homeScore > awayScore ? home : awayScore > homeScore ? away : null;
  const loser = homeScore > awayScore ? away : awayScore > homeScore ? home : null;
  const winnerShots = homeScore > awayScore ? homeShots : awayShots;
  const loserShots = homeScore > awayScore ? awayShots : homeShots;
  if (!winner) return `${home.name} e ${away.name} empatam em jogo decidido por detalhes`;
  if (scoreGap >= 3) return `${winner.name} controla os momentos-chave e vence ${loser?.name} com autoridade`;
  if (winnerShots <= loserShots) return `${winner.name} sofre, mas aproveita melhor as chances contra ${loser?.name}`;
  return `${winner.name} constr\xF3i vit\xF3ria curta com mais clareza no \xFAltimo ter\xE7o`;
};
function simulateMatch(home, away, homePlayers = [], awayPlayers = []) {
  const events = [];
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
  const playerRatings = {};
  const scorers = [];
  const assists = [];
  const addRatings = (ratings) => {
    Object.entries(ratings).forEach(([id, rating]) => {
      if (!playerRatings[id]) playerRatings[id] = [];
      playerRatings[id].push(rating);
    });
  };
  const defaultSector = { chemistry: 100, phase: 6, stamina: 100, tacticalBonus: 1, chaosMax: 10 };
  const playerStamina = {};
  homePlayers.forEach((p) => playerStamina[p.id] = 100);
  awayPlayers.forEach((p) => playerStamina[p.id] = 100);
  const homeEffect = PLAYSTYLE_EFFECTS[home.playStyle] || PLAYSTYLE_EFFECTS["Equilibrado"];
  const awayEffect = PLAYSTYLE_EFFECTS[away.playStyle] || PLAYSTYLE_EFFECTS["Equilibrado"];
  const homeMentality = MENTALITY_EFFECTS[home.mentality] || MENTALITY_EFFECTS["Calculista"];
  const awayMentality = MENTALITY_EFFECTS[away.mentality] || MENTALITY_EFFECTS["Calculista"];
  const clampSlider = (value, fallback = 50) => Math.max(0, Math.min(100, value ?? fallback));
  const homeIntensity = clampSlider(home.intensity, home.aggressiveness);
  const awayIntensity = clampSlider(away.intensity, away.aggressiveness);
  const homeWidth = clampSlider(home.width);
  const awayWidth = clampSlider(away.width);
  const homePassing = clampSlider(home.passing);
  const awayPassing = clampSlider(away.passing);
  const homePressureMod = 1 + (homeIntensity - 50) / 450;
  const awayPressureMod = 1 + (awayIntensity - 50) / 450;
  const homeStaminaDrainMod = 1 + (homeIntensity - 50) / 140;
  const awayStaminaDrainMod = 1 + (awayIntensity - 50) / 140;
  const homeWidthAttackMod = 1 + (homeWidth - 50) / 420;
  const awayWidthAttackMod = 1 + (awayWidth - 50) / 420;
  const homeWidthDefenseMod = 1 + (50 - homeWidth) / 560;
  const awayWidthDefenseMod = 1 + (50 - awayWidth) / 560;
  const homeWidthMidMod = 1 - Math.abs(homeWidth - 50) / 850;
  const awayWidthMidMod = 1 - Math.abs(awayWidth - 50) / 850;
  const homePassingAttackMod = 1 + (homePassing - 50) / 480;
  const awayPassingAttackMod = 1 + (awayPassing - 50) / 480;
  const homePassingMidMod = 1 + (50 - homePassing) / 650;
  const awayPassingMidMod = 1 + (50 - awayPassing) / 650;
  const homeChemistryLinkMod = 0.92 + home.chemistry / 625;
  const awayChemistryLinkMod = 0.92 + away.chemistry / 625;
  const getCardEffects = (slots) => {
    let att = 1, mid = 1, def = 1, gk = 1, chaos = 0;
    if (slots && Array.isArray(slots)) {
      slots.forEach((card) => {
        if (!card) return;
        const name = card.name || "";
        if (name.includes("Ataque")) att += 0.05;
        if (name.includes("Defesa")) def += 0.05;
        if (name.includes("Meio")) mid += 0.05;
        if (name.includes("Goleiro")) gk += 0.05;
        if (name === "Super Chute") att += 0.1;
        if (name === "Muralha") def += 0.1;
        if (name === "Maestro") mid += 0.08;
        if (name === "Bio-Otimiza\xE7\xE3o") {
          att += 0.04;
          mid += 0.04;
          def += 0.04;
          gk += 0.04;
        }
        if (name === "Holograma") chaos += 3;
      });
    }
    return { att, mid, def, gk, chaos };
  };
  const getSectorDNA = (players, sector) => {
    let mult = 1;
    let stam = 1;
    if (!players || players.length === 0) return { mult, stam };
    players.forEach((p) => {
      const effect = calculateDNAEffect(p, sector);
      mult *= effect.multiplier;
      stam *= effect.staminaBonus;
    });
    const normalizedMult = Math.pow(mult, 1 / Math.max(1, players.length / 3));
    return { mult: normalizedMult, stam };
  };
  const homeAttDNA = getSectorDNA(homePlayers.filter((p) => p.role === "ATA"), "attack");
  const homeMidDNA = getSectorDNA(homePlayers.filter((p) => p.role === "MEI"), "midfield");
  const homeDefDNA = getSectorDNA(homePlayers.filter((p) => p.role === "ZAG"), "defense");
  const awayAttDNA = getSectorDNA(awayPlayers.filter((p) => p.role === "ATA"), "attack");
  const awayMidDNA = getSectorDNA(awayPlayers.filter((p) => p.role === "MEI"), "midfield");
  const awayDefDNA = getSectorDNA(awayPlayers.filter((p) => p.role === "ZAG"), "defense");
  const dnaImpact = (multiplier) => 1 + (multiplier - 1) * 0.25;
  const homeCards = getCardEffects(home.slots);
  const awayCards = getCardEffects(away.slots);
  const homeAttackSector = {
    ...defaultSector,
    averageAttribute: home.attack,
    chemistry: home.chemistry,
    chaosMax: 10 + homeCards.chaos,
    tacticalBonus: ((homeEffect.att || 1) * (homeCards.att || 1) * homeWidthAttackMod * homePassingAttackMod * homePressureMod * homeChemistryLinkMod * (1 + ((home.linePosition || 50) - 50) / 165) + (homeMentality.attBonus || 0) + home.aggressiveness / 500) * dnaImpact(homeAttDNA.mult)
  };
  const homeDefenseSector = {
    ...defaultSector,
    averageAttribute: home.defense,
    chemistry: home.chemistry,
    chaosMax: 10 + homeCards.chaos,
    tacticalBonus: ((homeEffect.def || 1) * (homeCards.def || 1) * homeWidthDefenseMod * homeChemistryLinkMod * (1 + (50 - (home.linePosition || 50)) / 170) - (homeMentality.defPenalty || 0) + home.aggressiveness / 500) * dnaImpact(homeDefDNA.mult)
  };
  const awayAttackSector = {
    ...defaultSector,
    averageAttribute: away.attack,
    chemistry: away.chemistry,
    chaosMax: 10 + awayCards.chaos,
    tacticalBonus: ((awayEffect.att || 1) * (awayCards.att || 1) * awayWidthAttackMod * awayPassingAttackMod * awayPressureMod * awayChemistryLinkMod * (1 + ((away.linePosition || 50) - 50) / 165) + (awayMentality.attBonus || 0) + away.aggressiveness / 500) * dnaImpact(awayAttDNA.mult)
  };
  const awayDefenseSector = {
    ...defaultSector,
    averageAttribute: away.defense,
    chemistry: away.chemistry,
    chaosMax: 10 + awayCards.chaos,
    tacticalBonus: ((awayEffect.def || 1) * (awayCards.def || 1) * awayWidthDefenseMod * awayChemistryLinkMod * (1 + (50 - (away.linePosition || 50)) / 170) - (awayMentality.defPenalty || 0) + away.aggressiveness / 500) * dnaImpact(awayDefDNA.mult)
  };
  for (let i = 0; i < COMMENTARY_COUNT; i++) {
    const second = i * COMMENTARY_INTERVAL_SECONDS;
    const minute = Math.floor(second / MATCH_REAL_TIME_SECONDS * MATCH_DURATION_MINUTES);
    let tmpl;
    if (i === 0) tmpl = COMMENTARY_TEMPLATES[0];
    else tmpl = COMMENTARY_TEMPLATES[1 + Math.floor(Math.random() * (COMMENTARY_TEMPLATES.length - 2))];
    events.push({
      id: `comm_${i}_${Date.now()}`,
      minute,
      realTimeSecond: second,
      type: "COMMENTARY",
      title: tmpl.title,
      description: tmpl.desc,
      teamId: "system"
      // Neutral
    });
  }
  for (let minute = 1; minute <= MATCH_DURATION_MINUTES; minute++) {
    const homeLateBonus = minute > 75 ? homeEffect.lateBonus || 1 : 1;
    const awayLateBonus = minute > 75 ? awayEffect.lateBonus || 1 : 1;
    const homeMid = home.midfield * homeEffect.mid * homeCards.mid * homeLateBonus * homeWidthMidMod * homePassingMidMod * homePressureMod * homeChemistryLinkMod * dnaImpact(homeMidDNA.mult) * (home.chemistry / 100);
    const awayMid = away.midfield * awayEffect.mid * awayCards.mid * awayLateBonus * awayWidthMidMod * awayPassingMidMod * awayPressureMod * awayChemistryLinkMod * dnaImpact(awayMidDNA.mult) * (away.chemistry / 100);
    const totalMid = homeMid + awayMid;
    const possessionRoll = Math.random() * totalMid;
    const hasPossession = possessionRoll < homeMid ? "home" : "away";
    homePlayers.forEach((p) => {
      const effect = calculateDNAEffect(p, "midfield");
      const drain = (homeEffect.staminaDrain || 1) * homeStaminaDrainMod * (homeMentality.staminaPenalty ? 1.2 : 1) * effect.staminaBonus;
      playerStamina[p.id] = Math.max(10, (playerStamina[p.id] || 100) - drain * 0.3);
    });
    awayPlayers.forEach((p) => {
      const effect = calculateDNAEffect(p, "midfield");
      const drain = (awayEffect.staminaDrain || 1) * awayStaminaDrainMod * (awayMentality.staminaPenalty ? 1.2 : 1) * effect.staminaBonus;
      playerStamina[p.id] = Math.max(10, (playerStamina[p.id] || 100) - drain * 0.3);
    });
    if (hasPossession === "home") {
      homePossessionWon++;
      homeMomentum++;
      awayMomentum = 0;
    } else {
      awayPossessionWon++;
      awayMomentum++;
      homeMomentum = 0;
    }
    if (minute === 45 && !halfTimeEventPushed) {
      halfTimeEventPushed = true;
      const baseSecondHalf = Math.floor(45 / MATCH_DURATION_MINUTES * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `half_time_${Date.now()}`,
        minute: 45,
        realTimeSecond: baseSecondHalf,
        type: "COMMENTARY",
        title: "FIM DO 1\xBA TEMPO",
        description: `As equipes v\xE3o pro vesti\xE1rio! Placar no intervalo: ${homeScore} a ${awayScore}.`,
        teamId: "system"
      });
    }
    if (homeMomentum === 3) {
      const ms = Math.floor(minute / MATCH_DURATION_MINUTES * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `mom_h_${minute}_${Date.now()}`,
        minute,
        realTimeSecond: ms,
        type: "COMMENTARY",
        title: "DOM\xCDNIO ESTABELECIDO",
        description: `${home.name} domina o meio-campo e n\xE3o deixa o advers\xE1rio respirar!`,
        teamId: "system"
      });
    } else if (awayMomentum === 3) {
      const ms = Math.floor(minute / MATCH_DURATION_MINUTES * MATCH_REAL_TIME_SECONDS);
      events.push({
        id: `mom_a_${minute}_${Date.now()}`,
        minute,
        realTimeSecond: ms,
        type: "COMMENTARY",
        title: "PRESS\xC3O ALTA!",
        description: `Momentum total pro ${away.name}, parece que eles acamparam no campo de ataque!`,
        teamId: "system"
      });
    }
    const baseSecond = Math.floor(minute / MATCH_DURATION_MINUTES * MATCH_REAL_TIME_SECONDS);
    const currentEventSecond = Math.max(0, Math.min(MATCH_REAL_TIME_SECONDS - 1, baseSecond + Math.floor(Math.random() * 7) - 3));
    let intensity = 0.125 + minute / 500;
    intensity *= hasPossession === "home" ? 1 + (homeIntensity - 50) / 520 : 1 + (awayIntensity - 50) / 520;
    if (hasPossession === "home" && awayEffect.tickReduction) intensity *= 1 - awayEffect.tickReduction;
    if (hasPossession === "away" && homeEffect.tickReduction) intensity *= 1 - homeEffect.tickReduction;
    if (Math.random() > intensity) continue;
    if (hasPossession === "home") {
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
      if (result.outcome === "goal") {
        const varRoll = Math.random();
        if (varRoll < 0.08) {
          events.push({
            id: `var_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "VAR",
            title: "VAR EM A\xC7\xC3O",
            description: VAR_DESCRIPTIONS[Math.floor(Math.random() * VAR_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: "system"
          });
        }
        homeScore++;
        homeShots++;
        homeShotsOnTarget++;
        scorers.push({ playerId: mainAttacker.id, teamId: home.id });
        const assistant = activeHome[1];
        if (assistant) assists.push({ playerId: assistant.id, teamId: home.id });
        const descTmpl = GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)];
        const goalDesc = assistant ? `${descTmpl.replace("{player}", mainAttacker.nickname)} Com um passe magistral de ${assistant.nickname}!` : descTmpl.replace("{player}", mainAttacker.nickname);
        events.push({
          id: `event_${home.id}_${minute}_${Date.now()}_${Math.random()}`,
          minute,
          realTimeSecond: currentEventSecond + 1,
          type: "GOAL",
          title: "GOL!",
          description: goalDesc,
          playerId: mainAttacker.id,
          assistantId: assistant?.id,
          teamId: home.id
        });
      } else if (result.outcome === "defense") {
        homeShots++;
        const defenseVariant = Math.random();
        if (defenseVariant < 0.2) {
          events.push({
            id: `wood_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "WOODWORK",
            title: "NA TRAVE!",
            description: WOODWORK_DESCRIPTIONS[Math.floor(Math.random() * WOODWORK_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: home.id,
            playerId: mainAttacker.id
          });
        } else if (defenseVariant < 0.5) {
          events.push({
            id: `block_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "BLOCKED",
            title: "BLOQUEADO!",
            description: BLOCKED_DESCRIPTIONS[Math.floor(Math.random() * BLOCKED_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: home.id,
            playerId: defender.id
          });
        } else {
          if (Math.random() > 0.4) homeShotsOnTarget++;
          const descTmpl = DEFENSE_DESCRIPTIONS[Math.floor(Math.random() * DEFENSE_DESCRIPTIONS.length)];
          const defDesc = descTmpl.replace("{player}", mainAttacker.nickname);
          events.push({
            id: `event_${away.id}_${minute}_${Date.now()}_${Math.random()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "CHANCE",
            title: "DEFESA!",
            description: defDesc,
            playerId: defender.id,
            teamId: home.id
          });
        }
      } else {
        const turnoverRoll = Math.random();
        if (turnoverRoll < 0.1) {
          events.push({
            id: `off_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "OFFSIDE",
            title: "IMPEDIMENTO",
            description: OFFSIDE_DESCRIPTIONS[Math.floor(Math.random() * OFFSIDE_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: home.id,
            playerId: mainAttacker.id
          });
        } else if (turnoverRoll < 0.2) {
          events.push({
            id: `cnt_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "COUNTER",
            title: "CONTRA-ATAQUE!",
            description: COUNTER_DESCRIPTIONS[Math.floor(Math.random() * COUNTER_DESCRIPTIONS.length)].replace("{player}", defender.nickname),
            teamId: away.id,
            playerId: defender.id
          });
        } else if (turnoverRoll < 0.25) {
          events.push({
            id: `err_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "MISTAKE",
            title: "FALHA!",
            description: MISTAKE_DESCRIPTIONS[Math.floor(Math.random() * MISTAKE_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: home.id,
            playerId: mainAttacker.id
          });
        } else {
          const foulRoll = Math.random();
          const foulChance = 0.12 * (((home.aggressiveness || 50) + homeIntensity) / 100);
          if (foulRoll < foulChance) {
            const yellowRoll = Math.random();
            const isYellow = yellowRoll < 0.25;
            const isRed = !isYellow && yellowRoll < 0.3;
            if (isYellow || isRed) {
              events.push({
                id: `event_${home.id}_${minute}_card`,
                minute,
                realTimeSecond: currentEventSecond,
                type: isRed ? "CARD_RED" : "CARD_YELLOW",
                title: isRed ? "CART\xC3O VERMELHO!" : "CART\xC3O AMARELO!",
                description: `${mainAttacker.nickname} recebe o cart\xE3o ap\xF3s entrada dura em ${defender.nickname}.`,
                playerId: mainAttacker.id,
                teamId: home.id
              });
            } else {
              events.push({
                id: `event_${home.id}_${minute}_foul`,
                minute,
                realTimeSecond: currentEventSecond,
                type: "FOUL",
                title: "FALTA",
                description: FOUL_DESCRIPTIONS[Math.floor(Math.random() * FOUL_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
                playerId: mainAttacker.id,
                teamId: home.id
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
      if (result.outcome === "goal") {
        const varRoll = Math.random();
        if (varRoll < 0.08) {
          events.push({
            id: `var_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "VAR",
            title: "VAR EM A\xC7\xC3O",
            description: VAR_DESCRIPTIONS[Math.floor(Math.random() * VAR_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: "system"
          });
        }
        awayScore++;
        awayShots++;
        awayShotsOnTarget++;
        scorers.push({ playerId: mainAttacker.id, teamId: away.id });
        const assistant = activeAway[1];
        if (assistant) assists.push({ playerId: assistant.id, teamId: away.id });
        const descTmpl = GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)];
        const goalDesc = assistant ? `${descTmpl.replace("{player}", mainAttacker.nickname)} Com um passe magistral de ${assistant.nickname}!` : descTmpl.replace("{player}", mainAttacker.nickname);
        events.push({
          id: `event_${away.id}_${minute}_goal`,
          minute,
          realTimeSecond: currentEventSecond + 1,
          type: "GOAL",
          title: "GOL!",
          description: goalDesc,
          playerId: mainAttacker.id,
          assistantId: assistant?.id,
          teamId: away.id
        });
      } else if (result.outcome === "defense") {
        awayShots++;
        const defenseVariant = Math.random();
        if (defenseVariant < 0.2) {
          events.push({
            id: `wood_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "WOODWORK",
            title: "NA TRAVE!",
            description: WOODWORK_DESCRIPTIONS[Math.floor(Math.random() * WOODWORK_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: away.id,
            playerId: mainAttacker.id
          });
        } else if (defenseVariant < 0.5) {
          events.push({
            id: `block_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "BLOCKED",
            title: "BLOQUEADO!",
            description: BLOCKED_DESCRIPTIONS[Math.floor(Math.random() * BLOCKED_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: away.id,
            playerId: defender.id
          });
        } else {
          if (Math.random() > 0.4) awayShotsOnTarget++;
          const descTmpl = DEFENSE_DESCRIPTIONS[Math.floor(Math.random() * DEFENSE_DESCRIPTIONS.length)];
          const defDesc = descTmpl.replace("{player}", mainAttacker.nickname);
          events.push({
            id: `event_${home.id}_${minute}_defense`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "CHANCE",
            title: "DEFESA!",
            description: defDesc,
            playerId: defender.id,
            teamId: away.id
          });
        }
      } else {
        const turnoverRoll = Math.random();
        if (!mainAttacker || !defender) continue;
        if (turnoverRoll < 0.1) {
          events.push({
            id: `off_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "OFFSIDE",
            title: "IMPEDIMENTO",
            description: OFFSIDE_DESCRIPTIONS[Math.floor(Math.random() * OFFSIDE_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: away.id,
            playerId: mainAttacker.id
          });
        } else if (turnoverRoll < 0.2) {
          events.push({
            id: `cnt_${home.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "COUNTER",
            title: "CONTRA-ATAQUE!",
            description: COUNTER_DESCRIPTIONS[Math.floor(Math.random() * COUNTER_DESCRIPTIONS.length)].replace("{player}", defender.nickname),
            teamId: home.id,
            playerId: defender.id
          });
        } else if (turnoverRoll < 0.25) {
          events.push({
            id: `err_${away.id}_${minute}_${Date.now()}`,
            minute,
            realTimeSecond: currentEventSecond,
            type: "MISTAKE",
            title: "FALHA!",
            description: MISTAKE_DESCRIPTIONS[Math.floor(Math.random() * MISTAKE_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
            teamId: away.id,
            playerId: mainAttacker.id
          });
        } else {
          const foulRoll = Math.random();
          const foulChance = 0.12 * (((away.aggressiveness || 50) + awayIntensity) / 100);
          if (foulRoll < foulChance) {
            const yellowRoll = Math.random();
            const isYellow = yellowRoll < 0.25;
            const isRed = !isYellow && yellowRoll < 0.3;
            if (isYellow || isRed) {
              events.push({
                id: `event_${away.id}_${minute}_card`,
                minute,
                realTimeSecond: currentEventSecond,
                type: isRed ? "CARD_RED" : "CARD_YELLOW",
                title: isRed ? "CART\xC3O VERMELHO!" : "CART\xC3O AMARELO!",
                description: `${mainAttacker.nickname} foi advertido pelo \xE1rbitro.`,
                playerId: mainAttacker.id,
                teamId: away.id
              });
            } else {
              events.push({
                id: `event_${away.id}_${minute}_foul`,
                minute,
                realTimeSecond: currentEventSecond,
                type: "FOUL",
                title: "FALTA",
                description: FOUL_DESCRIPTIONS[Math.floor(Math.random() * FOUL_DESCRIPTIONS.length)].replace("{player}", mainAttacker.nickname),
                playerId: mainAttacker.id,
                teamId: away.id
              });
            }
          }
        }
      }
    }
  }
  events.push({
    id: `full_time_${Date.now()}`,
    minute: MATCH_DURATION_MINUTES,
    realTimeSecond: MATCH_REAL_TIME_SECONDS,
    type: "COMMENTARY",
    title: "FIM DE PAPO",
    description: "Apito final do arbitro cibernetico! Batalha encerrada.",
    teamId: "system"
  });
  const totalPossession = homePossessionWon + awayPossessionWon;
  const finalRatings = {};
  const clampRating = (value) => Number(Math.max(3, Math.min(10, value)).toFixed(1));
  const countGoals = (playerId, teamId) => scorers.filter((item) => item.playerId === playerId && item.teamId === teamId).length;
  const countAssists = (playerId, teamId) => assists.filter((item) => item.playerId === playerId && item.teamId === teamId).length;
  const getEventAverage = (playerId) => {
    const ratings = playerRatings[playerId];
    if (!ratings || ratings.length === 0) return null;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };
  const rateTeamPlayers = (team, players, isHome, goalsFor, goalsAgainst, shotsFor, shotsAgainst, possession, opponentPossession) => {
    const resultBonus = goalsFor > goalsAgainst ? 0.45 : goalsFor === goalsAgainst ? 0.12 : -0.35;
    const goalDiff = goalsFor - goalsAgainst;
    const shotBalance = shotsFor - shotsAgainst;
    const possessionEdge = possession - opponentPossession;
    players.forEach((player) => {
      let sectorBase = 6 + resultBonus;
      if (player.role === "GOL") {
        sectorBase += Math.max(-1.2, Math.min(1.2, 1.2 - goalsAgainst * 0.55 + (shotsAgainst > 0 ? (shotsAgainst - goalsAgainst) / 12 : 0)));
      } else if (player.role === "ZAG") {
        sectorBase += Math.max(-1.1, Math.min(1.1, goalDiff * 0.18 - goalsAgainst * 0.35 - shotsAgainst / 35));
        sectorBase += team.linePosition <= 35 && goalsAgainst === 0 ? 0.25 : 0;
      } else if (player.role === "MEI") {
        sectorBase += Math.max(-0.9, Math.min(0.9, possessionEdge / 45 + shotBalance / 28));
        sectorBase += team.passing !== void 0 && team.passing <= 35 && possession >= 52 ? 0.2 : 0;
      } else {
        sectorBase += Math.max(-1, Math.min(1.2, goalsFor * 0.25 + shotsFor / 24 + goalDiff * 0.15));
        sectorBase += team.passing !== void 0 && team.passing >= 70 && shotsFor >= shotsAgainst ? 0.18 : 0;
      }
      const directContribution = countGoals(player.id, team.id) * 0.85 + countAssists(player.id, team.id) * 0.45;
      const eventAverage = getEventAverage(player.id);
      const isStabilized = team.stabilizationPlayerId === player.id;
      const variance = (Math.random() - 0.5) * (isStabilized ? 0.45 : 0.9);
      const blended = eventAverage === null ? sectorBase : sectorBase * 0.42 + eventAverage * 0.58;
      finalRatings[player.id] = clampRating(blended + directContribution + variance);
    });
  };
  const homePossession = totalPossession > 0 ? Math.round(homePossessionWon / totalPossession * 100) : 50;
  const awayPossession = totalPossession > 0 ? 100 - homePossession : 50;
  rateTeamPlayers(home, homePlayers, true, homeScore, awayScore, homeShots, awayShots, homePossession, awayPossession);
  rateTeamPlayers(away, awayPlayers, false, awayScore, homeScore, awayShots, homeShots, awayPossession, homePossession);
  Object.entries(playerRatings).forEach(([id, ratings]) => {
    let sum = ratings.reduce((a, b) => a + b, 0);
    let avg = sum / Math.max(1, ratings.length);
    const isHomePlayer = homePlayers.some((p) => p.id === id);
    const isAwayPlayer = awayPlayers.some((p) => p.id === id);
    const isStabilized = isHomePlayer && home.stabilizationPlayerId === id || isAwayPlayer && away.stabilizationPlayerId === id;
    const varianceFactor = isStabilized ? 1 : 4;
    const randomSwing = (Math.random() - 0.5) * varianceFactor;
    let teamBonus = 0;
    if (isHomePlayer && homeScore > awayScore) teamBonus = 0.5;
    if (isHomePlayer && homeScore < awayScore) teamBonus = -0.5;
    if (isAwayPlayer && awayScore > homeScore) teamBonus = 0.5;
    if (isAwayPlayer && awayScore < homeScore) teamBonus = -0.5;
    avg += teamBonus + randomSwing;
    finalRatings[id] = finalRatings[id] !== void 0 ? clampRating(finalRatings[id] * 0.65 + avg * 0.35) : clampRating(avg);
  });
  let headline = `Equil\xEDbrio total: ${home.name} e ${away.name} dividem os pontos em cl\xE1ssico eletrizante`;
  if (homeScore > awayScore) {
    if (homeScore - awayScore >= 3) headline = `Que goleada! ${home.name} massacra ${away.name} e avisa a liga!`;
    else headline = `Dever cumprido: Vit\xF3ria suada e importante do ${home.name} em casa`;
  } else if (awayScore > homeScore) {
    if (awayScore - homeScore >= 3) headline = `Passeio no parque! Visitante indigesto, ${away.name} goleia e cala o est\xE1dio.`;
    else headline = `Guerreiros! ${away.name} arranca vit\xF3ria heroica fora de casa nos minutos finais.`;
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
    events: events.sort((a, b) => a.realTimeSecond - b.realTimeSecond || a.minute - b.minute).map(refineEventCopy),
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

// src/engine/newsService.ts
var addNews = (state, title, content, type, importance = 1, action) => {
  const news = {
    id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: state.world.currentDate,
    title,
    content,
    type,
    importance,
    action
  };
  state.world.news = [news, ...state.world.news || []].slice(0, 50);
};
var newsHeadlines = {
  transfer: (state, player, team, value) => {
    const title = `REFOR\xC7O NA \xC1REA!`;
    const content = `${team.name} assina com ${player.nickname}, o novo refor\xE7o de ${player.totalRating} pontos de rating!`;
    addNews(state, title, content, "TRANSFER", value && value >= 800 ? 3 : 2, {
      kind: "PLAYER_PROFILE",
      season: state.world.currentSeason || 2050,
      playerId: player.id,
      teamId: team.id
    });
  },
  exile: (state, player) => {
    const title = `FIM DA LINHA!`;
    const content = `${player.nickname} \xE9 exilado do cen\xE1rio profissional por baixo desempenho. Um novo desafiante surge da Shadow Pool.`;
    addNews(state, title, content, "EXILE", 3, {
      kind: "PLAYER_PROFILE",
      season: state.world.currentSeason || 2050,
      playerId: player.id
    });
  },
  champion: (state, team, district) => {
    const title = `DOMINA\xC7\xC3O EM ${district}!`;
    const content = `${team.name} conquista o Distrito ${district} e garante vaga na Copa dos Distritos!`;
    addNews(state, title, content, "CHAMPION", 3, {
      kind: "TEAM_PROFILE",
      season: state.world.currentSeason || 2050,
      teamId: team.id
    });
  },
  cupWinner: (state, team) => {
    const title = `SOBERANO DOS DISTRITOS!`;
    const content = `O time ${team.name} levanta a ta\xE7a e unifica a regi\xE3o ap\xF3s vencer a Copa dos Distritos!`;
    addNews(state, title, content, "CUP", 3, {
      kind: "TEAM_PROFILE",
      season: state.world.currentSeason || 2050,
      teamId: team.id
    });
  },
  migration: (state, team, newDist) => {
    void newDist;
    const title = "PRESSAO DE TEMPORADA";
    const content = `${team.name} segue no distrito de origem. A campanha ruim vira pressao esportiva, nao troca de identidade.`;
    addNews(state, title, content, "MIGRATION", 1, {
      kind: "TEAM_PROFILE",
      season: state.world.currentSeason || 2050,
      teamId: team.id
    });
  },
  seasonEnded: (state, report) => {
    const title = "TEMPORADA ENCERRADA";
    const content = `A temporada ${report.season} foi arquivada no The Pulse: campeoes, clubes sob pressao, destaque de rating e impacto economico estao disponiveis.`;
    addNews(state, title, content, "SYSTEM", 3, {
      kind: "SEASON_REPORT",
      season: report.season
    });
  },
  offseasonWindow: (state) => {
    const title = "JANELA DE OFFSEASON ABERTA";
    const content = "O mundo segue rodando. Ha 3 dias de offseason para ajustes finais, entradas em clubes e leitura do season report antes da nova temporada.";
    addNews(state, title, content, "SYSTEM", 2);
  },
  seasonStarted: (state, season) => {
    const title = `TEMPORADA ${season} EM CURSO`;
    const content = "A nova temporada comecou automaticamente. Clubes mantiveram sua base e quem ajustar tatica e treino agora ganha vantagem cedo.";
    addNews(state, title, content, "SYSTEM", 2);
  },
  joinWindow: (state, roundLimit) => {
    const title = "ENTRADA EM CLUBES LIBERADA";
    const content = `Managers podem assumir clubes sem resetar nada ate a rodada ${roundLimit}. Depois disso, o mundo segue apenas com takeover elegivel.`;
    addNews(state, title, content, "SYSTEM", 2);
  },
  managerQueueOpened: (state, team) => {
    addNews(
      state,
      "FILA DE TECNICOS ANDOU",
      `${team.name} voltou ao radar e abriu conversa para a proxima temporada.`,
      "SYSTEM",
      2,
      {
        kind: "TEAM_PROFILE",
        season: state.world.currentSeason || 2050,
        teamId: team.id
      }
    );
  },
  managerApplicationAccepted: (state, team) => {
    addNews(
      state,
      "CLUBE ABRIU CONVERSA",
      `${team.name} gostou do contato e deixou a assinatura pronta para o tecnico interessado.`,
      "SYSTEM",
      2,
      {
        kind: "TEAM_PROFILE",
        season: state.world.currentSeason || 2050,
        teamId: team.id
      }
    );
  },
  managerApplicationRejected: (state, teamName) => {
    addNews(
      state,
      "NEGOCIACAO ENCERRADA",
      `${teamName} recuou e optou por outro caminho no mercado de tecnicos.`,
      "SYSTEM",
      1
    );
  },
  managerInviteReceived: (state, team) => {
    addNews(
      state,
      "CLUBE PROCURA COMANDO",
      `${team.name} iniciou contatos em busca de um novo tecnico para reorganizar a campanha.`,
      "SYSTEM",
      2,
      {
        kind: "TEAM_PROFILE",
        season: state.world.currentSeason || 2050,
        teamId: team.id
      }
    );
  },
  managerClubUnavailable: (state, teamName) => {
    addNews(
      state,
      "VAGA FECHADA",
      `${teamName} saiu do mercado de tecnicos antes do acordo ser fechado.`,
      "SYSTEM",
      1
    );
  }
};
var generateSeasonReport = (state, reallocated) => {
  const leagues = state.world.leagues;
  const finalStandings = {};
  Object.keys(leagues).forEach((k) => {
    finalStandings[k] = leagues[k].standings;
  });
  let profitWinner = { teamId: "", capGain: -1 };
  Object.values(state.teams).forEach((t) => {
    const gain = (t.powerCap || 0) - 8e3;
    if (gain > profitWinner.capGain) {
      profitWinner = { teamId: t.id, capGain: gain };
    }
  });
  let mvpRating = { playerId: "", ratingGain: -1 };
  Object.values(state.players).forEach((p) => {
    const gain = p.history.seasonRatingDelta || 0;
    if (gain > mvpRating.ratingGain) {
      mvpRating = { playerId: p.id, ratingGain: gain };
    }
  });
  const getTeamSeasonScoreDelta = (team) => {
    return (team.squad || []).reduce((sum, playerId) => {
      const player = state.players[playerId];
      return sum + (player?.history?.seasonRatingDelta || 0);
    }, 0);
  };
  let bestTeam = { teamId: "", scoreDelta: -Infinity };
  let worstTeam = { teamId: "", scoreDelta: Infinity };
  Object.values(state.teams).filter((team) => team.id.startsWith("t_")).forEach((team) => {
    const scoreDelta = getTeamSeasonScoreDelta(team);
    if (scoreDelta > bestTeam.scoreDelta) bestTeam = { teamId: team.id, scoreDelta };
    if (scoreDelta < worstTeam.scoreDelta) worstTeam = { teamId: team.id, scoreDelta };
  });
  const managerHighlight = bestTeam.teamId && state.teams[bestTeam.teamId]?.managerId ? {
    managerId: state.teams[bestTeam.teamId].managerId,
    teamId: bestTeam.teamId,
    reason: "Maior alta de score da temporada"
  } : null;
  const topTransfers = Object.values(state.players).flatMap((player) => (player.history.clubEvents || []).filter((event) => event.season === (state.world.currentSeason || 2050) && !!event.value).map((event) => ({
    playerId: player.id,
    fromTeamName: event.fromTeamName,
    toTeamName: event.toTeamName,
    value: event.value || 0
  }))).sort((a, b) => b.value - a.value).slice(0, 5);
  const report = {
    season: state.world.currentSeason || 2050,
    finalStandings,
    reallocatedTeams: reallocated,
    profitWinner,
    mvpRating,
    eliteCupWinnerId: state.world.eliteCup?.winnerId || null,
    districtCupWinnerId: state.world.districtCup?.winnerId || null,
    managerHighlight,
    teamRatingMovers: {
      best: bestTeam,
      worst: worstTeam
    },
    topTransfers
  };
  state.world.history = [report, ...state.world.history || []];
  return report;
};

// src/constants/storeCatalog.ts
var APP_CIRCUIT = {
  id: "circuito-neon-01",
  name: "Circuito Neon 01",
  durationDays: 90,
  targetSeasonRuns: 3,
  finalRewardItemId: "badge_elite_original_s1",
  premiumName: "Passe do Circuito",
  passIconPath: "/assetas/avatars/pass/pass-circuit-neon-01.png",
  finalRewardImagePath: "/assetas/avatars/pass/badge-elite-original-s1.png",
  bannerImagePath: "/assetas/avatars/pass/pass-circuit-neon-banner.png"
};
var formatBootNumber = (value) => String(value).padStart(2, "0");
var buildBootImagePath = (fileNo) => `/assetas/avatars/boots/boot_${formatBootNumber(fileNo)}.png`;
var buildBootId = (fileNo) => `boot_${formatBootNumber(fileNo)}`;
var bootSeeds = [
  { fileNo: 1, name: "Velocity Cyan", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 12, description: "Base neon leve para abrir a colecao do elenco.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Sem bonus competitivo." },
  { fileNo: 2, name: "Orbit Violet", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 12, description: "Visual escuro com acento violeta para jogadores de lado.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Ideal para variar estilo." },
  { fileNo: 3, name: "Static Aqua", collectionLabel: "Linha Tecnica", rarity: "COMMON", currency: "GOLD", price: 13, description: "Modelo frio e tecnico para titulares de posse.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Mantem o jogo limpo." },
  { fileNo: 4, name: "Blade Silver", collectionLabel: "Linha Tecnica", rarity: "COMMON", currency: "GOLD", price: 13, description: "Acabamento prateado com detalhe verde de controle.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Boa para meias e armadores." },
  { fileNo: 5, name: "Sky Pulse", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 14, description: "Leve e brilhante, com leitura imediata de velocidade.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Sem impacto em score." },
  { fileNo: 6, name: "Solar Gold", collectionLabel: "Linha Tecnica", rarity: "COMMON", currency: "GOLD", price: 14, description: "Visual dourado esportivo para atletas chamativos.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Valor de estilo apenas." },
  { fileNo: 7, name: "Frost Edge", collectionLabel: "Linha Estabilidade", rarity: "COMMON", currency: "GOLD", price: 14, description: "Base branca e fria para elenco equilibrado.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Boa para colecao inicial." },
  { fileNo: 8, name: "Mint Flow", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 15, description: "Tom verde-agua com assinatura de acelera\xE7\xE3o.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Sem efeito competitivo." },
  { fileNo: 9, name: "Inferno Red", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 15, description: "Pe\xE7a vibrante para quem quer atacante aparecendo.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Ideal para vitrine." },
  { fileNo: 10, name: "Night Sprint", collectionLabel: "Linha Velocidade", rarity: "COMMON", currency: "GOLD", price: 15, description: "Preto e violeta com cara de corrida curta e agressiva.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Sem bonus escondido." },
  { fileNo: 11, name: "Copper Touch", collectionLabel: "Linha Tecnica", rarity: "COMMON", currency: "GOLD", price: 16, description: "Bronze polido para jogadores de refinamento.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Valor de estilo." },
  { fileNo: 12, name: "Graph Surge", collectionLabel: "Linha Estabilidade", rarity: "COMMON", currency: "GOLD", price: 16, description: "Visual escuro com sola \xE1cida para elenco firme.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Boa para defesa e base." },
  { fileNo: 13, name: "Cloud White", collectionLabel: "Linha Tecnica", rarity: "COMMON", currency: "GOLD", price: 16, description: "Modelo claro e limpo para equipe premium.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Sem alterar atributos." },
  { fileNo: 14, name: "Deep Current", collectionLabel: "Linha Estabilidade", rarity: "COMMON", currency: "GOLD", price: 17, description: "Aqua escuro com leitura de firmeza e presen\xE7a.", effectLabel: "Visual Base", effectDescription: "Cosmetica pura. Fecha a base comum da linha." },
  { fileNo: 21, name: "Rune Flash", collectionLabel: "Linha Velocidade", rarity: "UNCOMMON", currency: "GOLD", price: 18, description: "Primeira faixa acima da base, mais marcante e agressiva.", effectLabel: "Estilo de Colecao", effectDescription: "Ainda sem bonus. Serve para deixar o elenco mais premium." },
  { fileNo: 23, name: "Arc Sigil", collectionLabel: "Linha Tecnica", rarity: "UNCOMMON", currency: "GOLD", price: 19, description: "Modelo simbolico para jogadores de controle e leitura.", effectLabel: "Estilo de Colecao", effectDescription: "Cosmetica intermediaria. Sem impacto no balance." },
  { fileNo: 24, name: "Void Core", collectionLabel: "Linha Tecnica", rarity: "UNCOMMON", currency: "GOLD", price: 19, description: "Centro escuro com visual de energia concentrada.", effectLabel: "Estilo de Colecao", effectDescription: "Colecao visual acima das comuns." },
  { fileNo: 25, name: "Lotus Veil", collectionLabel: "Linha Estabilidade", rarity: "UNCOMMON", currency: "GOLD", price: 20, description: "Visual lilas suave para atletas de ritmo constante.", effectLabel: "Estilo de Colecao", effectDescription: "Sem bonus. Foco em identidade visual." },
  { fileNo: 26, name: "Blaze Crest", collectionLabel: "Linha Velocidade", rarity: "UNCOMMON", currency: "GOLD", price: 20, description: "Visual de chama viva para pe\xE7as explosivas do elenco.", effectLabel: "Estilo de Colecao", effectDescription: "Cosmetica intermediaria. Boa para destaque." },
  { fileNo: 27, name: "Verdant Shell", collectionLabel: "Linha Estabilidade", rarity: "UNCOMMON", currency: "GOLD", price: 21, description: "Camada verde densa com presen\xE7a de jogador confi\xE1vel.", effectLabel: "Estilo de Colecao", effectDescription: "Sem bonus. Fecha a faixa incomum." },
  { fileNo: 31, name: "Nebula Drive", collectionLabel: "Linha Velocidade", rarity: "RARE", currency: "GOLD", price: 23, description: "Faixa rara com impulso leve para dias muito bons.", effectLabel: "Assinatura Rara", effectDescription: "Leve empurrao na evolucao pos-jogo de atleta em alta.", bootBonus: { progressionGainPct: 10 } },
  { fileNo: 32, name: "Prism Cryst", collectionLabel: "Linha Tecnica", rarity: "RARE", currency: "GOLD", price: 24, description: "Pe\xE7a rara de vitrine para jogadores tecnicos.", effectLabel: "Assinatura Rara", effectDescription: "Equilibra ganho e estabilidade em dose pequena.", bootBonus: { progressionGainPct: 8, progressionLossMitigationPct: 10 } },
  { fileNo: 33, name: "Chrono Mesh", collectionLabel: "Linha Tecnica", rarity: "RARE", currency: "GOLD", price: 24, description: "Trama rara com leitura premium e refinada.", effectLabel: "Assinatura Rara", effectDescription: "Leve bonus para evolucao positiva quando o atleta entrega nota alta.", bootBonus: { progressionGainPct: 12 } },
  { fileNo: 34, name: "Crown Gleam", collectionLabel: "Linha Estabilidade", rarity: "RARE", currency: "GOLD", price: 25, description: "Visual claro com aura de seguran\xE7a e regularidade.", effectLabel: "Assinatura Rara", effectDescription: "Amortece perdas pequenas sem mexer em score bruto.", bootBonus: { progressionLossMitigationPct: 18 } },
  { fileNo: 35, name: "Tide Breaker", collectionLabel: "Linha Velocidade", rarity: "RARE", currency: "GOLD", price: 25, description: "Splash azul para atletas de rompimento e estourada.", effectLabel: "Assinatura Rara", effectDescription: "Reforca um pouco os bons dias do atleta.", bootBonus: { progressionGainPct: 15 } },
  { fileNo: 36, name: "Obsidian Reef", collectionLabel: "Linha Estabilidade", rarity: "RARE", currency: "GOLD", price: 26, description: "Faixa rara escura para titulares de sustentacao.", effectLabel: "Assinatura Rara", effectDescription: "Segura quedas ruins e deixa a temporada mais estavel.", bootBonus: { progressionLossMitigationPct: 22 } },
  { fileNo: 41, name: "Halo Dominion", collectionLabel: "Linha Tecnica", rarity: "EPIC", currency: "FRAGMENT", price: 16, description: "Faixa epica preparada para atletas realmente especiais.", effectLabel: "Assinatura Epica", effectDescription: "Aumenta levemente ganhos e reduz perdas na evolucao pos-jogo.", bootBonus: { progressionGainPct: 18, progressionLossMitigationPct: 20 } },
  { fileNo: 42, name: "Ice Seraph", collectionLabel: "Linha Velocidade", rarity: "EPIC", currency: "FRAGMENT", price: 17, description: "Epica clara e agressiva para jogador de temporada.", effectLabel: "Assinatura Epica", effectDescription: "Prioriza crescimento sem tocar em rating bruto.", bootBonus: { progressionGainPct: 22, progressionLossMitigationPct: 16 } },
  { fileNo: 43, name: "Winged Crown", collectionLabel: "Linha Estabilidade", rarity: "LEGENDARY", currency: "FRAGMENT", price: 20, description: "Faixa lendaria para simbolos de clube e elite original.", effectLabel: "Assinatura Lendaria", effectDescription: "Entrega o melhor pacote de estabilidade da colecao sem virar pay-to-win.", bootBonus: { progressionGainPct: 16, progressionLossMitigationPct: 30 } },
  { fileNo: 44, name: "Solar Relic", collectionLabel: "Linha Tecnica", rarity: "LEGENDARY", currency: "FRAGMENT", price: 22, description: "Topo absoluto da colecao atual de chuteiras.", effectLabel: "Assinatura Lendaria", effectDescription: "Pacote lendario com crescimento melhor e queda mais suave.", bootBonus: { progressionGainPct: 20, progressionLossMitigationPct: 28 } }
];
var bootItems = bootSeeds.map((seed) => ({
  id: buildBootId(seed.fileNo),
  category: "BOOT",
  name: seed.name,
  description: seed.description,
  collectionLabel: seed.collectionLabel,
  effectLabel: seed.effectLabel,
  effectDescription: seed.effectDescription,
  rarity: seed.rarity,
  currency: seed.currency,
  price: seed.price,
  imagePath: buildBootImagePath(seed.fileNo),
  bootVisualId: seed.fileNo,
  bootBonus: seed.bootBonus
}));
var cosmeticItems = [
  {
    id: "kit_circuit_chrome",
    category: "KIT",
    name: "Circuit Chrome",
    description: "Uniforme especial cromado para o clube atual.",
    rarity: "RARE",
    currency: "GOLD",
    price: 24,
    imagePath: "/assetas/avatars/uniforms/store-kit-circuit-chrome.png",
    assetPath: "/assetas/avatars/uniforms/store-kit-circuit-chrome.png"
  },
  {
    id: "kit_holo_wave",
    category: "KIT",
    name: "Holo Wave",
    description: "Skin holografica para usar fora dos kits de distrito.",
    rarity: "RARE",
    currency: "GOLD",
    price: 26,
    imagePath: "/assetas/avatars/uniforms/store-kit-holo-wave.png",
    assetPath: "/assetas/avatars/uniforms/store-kit-holo-wave.png"
  },
  {
    id: "kit_carbon_grid",
    category: "KIT",
    name: "Carbon Grid",
    description: "Visual escuro com linhas tecnicas.",
    rarity: "RARE",
    currency: "GOLD",
    price: 27,
    imagePath: "/assetas/avatars/uniforms/store-kit-carbon-grid.png",
    assetPath: "/assetas/avatars/uniforms/store-kit-carbon-grid.png"
  },
  {
    id: "kit_pulse_white",
    category: "KIT",
    name: "Pulse White",
    description: "Uniforme claro com cara de clube premium.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 18,
    imagePath: "/assetas/avatars/uniforms/store-kit-pulse-white.png",
    assetPath: "/assetas/avatars/uniforms/store-kit-pulse-white.png"
  },
  {
    id: "kit_neon_flux",
    category: "KIT",
    name: "Neon Flux",
    description: "Skin chamativa para quem quer marcar presenca.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 20,
    imagePath: "/assetas/avatars/uniforms/store-kit-neon-flux.png",
    assetPath: "/assetas/avatars/uniforms/store-kit-neon-flux.png"
  },
  {
    id: "logo_quantum_vault",
    category: "LOGO",
    name: "Quantum Vault",
    description: "Logo especial fora da pool padrao dos clubes.",
    rarity: "RARE",
    currency: "GOLD",
    price: 22,
    imagePath: "/assetas/avatars/logos/store-logo-quantum-vault.png",
    logoPreview: {
      primary: "#0f172a",
      secondary: "#22d3ee",
      accent: "#f8fafc",
      patternId: "radial",
      symbolId: "asset:/assetas/avatars/logos/store-logo-quantum-vault.png",
      assetPath: "/assetas/avatars/logos/store-logo-quantum-vault.png"
    }
  },
  {
    id: "logo_holo_tiger",
    category: "LOGO",
    name: "Holo Tiger",
    description: "Placeholder para logo premium de energia alta.",
    rarity: "RARE",
    currency: "GOLD",
    price: 23,
    imagePath: "/assetas/avatars/logos/store-logo-holo-tiger.png",
    logoPreview: {
      primary: "#1d4ed8",
      secondary: "#ec4899",
      accent: "#facc15",
      patternId: "diagonal_split",
      symbolId: "asset:/assetas/avatars/logos/store-logo-holo-tiger.png",
      assetPath: "/assetas/avatars/logos/store-logo-holo-tiger.png"
    }
  },
  {
    id: "logo_blackout_crown",
    category: "LOGO",
    name: "Blackout Crown",
    description: "Placeholder para logo de streak de vitorias.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 16,
    imagePath: "/assetas/avatars/logos/store-logo-blackout-crown.png",
    logoPreview: {
      primary: "#020617",
      secondary: "#e2e8f0",
      accent: "#38bdf8",
      patternId: "solid",
      symbolId: "asset:/assetas/avatars/logos/store-logo-blackout-crown.png",
      assetPath: "/assetas/avatars/logos/store-logo-blackout-crown.png"
    }
  },
  {
    id: "logo_pulse_hex",
    category: "LOGO",
    name: "Pulse Hex",
    description: "Placeholder para logo com cara de tec arena.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 17,
    imagePath: "/assetas/avatars/logos/store-logo-pulse-hex.png",
    logoPreview: {
      primary: "#14532d",
      secondary: "#a3e635",
      accent: "#f8fafc",
      patternId: "stripes_vertical",
      symbolId: "asset:/assetas/avatars/logos/store-logo-pulse-hex.png",
      assetPath: "/assetas/avatars/logos/store-logo-pulse-hex.png"
    }
  },
  {
    id: "logo_solar_wire",
    category: "LOGO",
    name: "Solar Wire",
    description: "Placeholder para logo raro de assinatura visual.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 18,
    imagePath: "/assetas/avatars/logos/store-logo-solar-wire.png",
    logoPreview: {
      primary: "#7c2d12",
      secondary: "#fb923c",
      accent: "#fde68a",
      patternId: "stripes_horizontal",
      symbolId: "asset:/assetas/avatars/logos/store-logo-solar-wire.png",
      assetPath: "/assetas/avatars/logos/store-logo-solar-wire.png"
    }
  }
];
var profileItems = [
  {
    id: "accessory_founder_whistle",
    category: "ACCESSORY",
    name: "Apito de Fundador",
    description: "Acessorio de perfil para manager que carrega mundos nas costas.",
    collectionLabel: "Perfil Global",
    effectLabel: "Aura de Manager",
    effectDescription: "Marca publica de prestigio. Bonus leve de reputacao visual entre mundos.",
    rarity: "RARE",
    currency: "GOLD",
    price: 32,
    imagePath: "/logo.png",
    managerBonus: { reputationAura: 1 }
  },
  {
    id: "accessory_scout_lens",
    category: "ACCESSORY",
    name: "Lente de Scout",
    description: "Acessorio transversal para deixar o perfil com cara de observador elite.",
    collectionLabel: "Perfil Global",
    effectLabel: "Clareza de Scout",
    effectDescription: "Futuro bonus leve de leitura e filtros. Nao aumenta rating nem resultado de partida.",
    rarity: "EPIC",
    currency: "FRAGMENT",
    price: 12,
    imagePath: "/logo.png",
    managerBonus: { scoutingClarityPct: 5 }
  },
  {
    id: "badge_elite_original_s1",
    category: "BADGE",
    name: "Elite Original S1",
    description: "Badge de perfil para quem fechou o primeiro circuito com honra.",
    collectionLabel: "Perfil Global",
    effectLabel: "Prova Social",
    effectDescription: "Item de perfil atravessando mundos. Valor de historia, nao de poder.",
    rarity: "LEGENDARY",
    currency: "FRAGMENT",
    price: 0,
    premiumOnly: true,
    imagePath: APP_CIRCUIT.finalRewardImagePath,
    circuitTag: APP_CIRCUIT.id
  }
];
var STORE_ITEMS = [...bootItems, ...cosmeticItems, ...profileItems];
var STORE_ITEMS_BY_ID = Object.fromEntries(STORE_ITEMS.map((item) => [item.id, item]));

// src/utils/store.ts
var LEGACY_STORE_ITEM_ALIASES = {
  boot_velocity_cyan: "boot_01",
  boot_orbit_orange: "boot_02",
  boot_metro_white: "boot_03",
  boot_streetline_red: "boot_04",
  boot_static_blue: "boot_05",
  boot_core_silver: "boot_06",
  boot_dash_mint: "boot_07",
  boot_pulse_sand: "boot_08",
  boot_alloy_ember: "boot_21",
  boot_aero_teal: "boot_23",
  boot_flux_violet: "boot_24",
  boot_sonic_graphite: "boot_25",
  boot_nova_peach: "boot_26",
  boot_comet_aqua: "boot_27",
  boot_frost_gold: "boot_21",
  boot_carbide_black: "boot_31",
  boot_halo_pink: "boot_32",
  boot_quantum_lime: "boot_33",
  boot_rift_copper: "boot_34",
  boot_neon_phantom: "boot_35",
  boot_vector_ice: "boot_36",
  boot_signal_gold: "boot_31",
  boot_prism_navy: "boot_32",
  boot_turbo_scarlet: "boot_35",
  boot_zenith_pearl: "boot_36",
  boot_mirage_chrome: "boot_41",
  boot_thunder_orchid: "boot_42",
  boot_eclipse_carbon: "boot_43",
  boot_aurora_volt: "boot_44",
  boot_apex_obsidian: "boot_43"
};
var normalizeStoreItemId = (itemId) => {
  if (!itemId) return null;
  return LEGACY_STORE_ITEM_ALIASES[itemId] || itemId;
};
var createDefaultStoreState = () => ({
  gold: 120,
  fragments: 40,
  ownedItemIds: ["boot_01"],
  equippedBootByPlayerId: {},
  equippedKitByTeamId: {},
  equippedLogoByTeamId: {},
  equippedManagerItemIds: [],
  circuit: {
    id: APP_CIRCUIT.id,
    name: APP_CIRCUIT.name,
    premiumActive: false,
    seasonRunsCompleted: 0,
    targetSeasonRuns: APP_CIRCUIT.targetSeasonRuns,
    endsAt: new Date(Date.now() + APP_CIRCUIT.durationDays * 24 * 60 * 60 * 1e3).toISOString()
  }
});
var getStoreState = (state) => ({
  ...createDefaultStoreState(),
  ...state.store || {},
  ownedItemIds: Array.from(new Set([...state.store?.ownedItemIds || createDefaultStoreState().ownedItemIds].map((itemId) => normalizeStoreItemId(itemId) || "").filter(Boolean))),
  equippedBootByPlayerId: {
    ...createDefaultStoreState().equippedBootByPlayerId,
    ...Object.fromEntries(
      Object.entries(state.store?.equippedBootByPlayerId || {}).map(([playerId, itemId]) => [playerId, normalizeStoreItemId(itemId)])
    )
  },
  equippedKitByTeamId: {
    ...createDefaultStoreState().equippedKitByTeamId,
    ...state.store?.equippedKitByTeamId || {}
  },
  equippedLogoByTeamId: {
    ...createDefaultStoreState().equippedLogoByTeamId,
    ...state.store?.equippedLogoByTeamId || {}
  },
  equippedManagerItemIds: Array.from(new Set((state.store?.equippedManagerItemIds || []).map((itemId) => normalizeStoreItemId(itemId) || "").filter(Boolean))),
  circuit: {
    ...createDefaultStoreState().circuit,
    ...state.store?.circuit || {}
  }
});
var getStoreItem = (itemId) => {
  const normalizedId = normalizeStoreItemId(itemId);
  if (!normalizedId) return null;
  return STORE_ITEMS_BY_ID[normalizedId] || null;
};
var getEquippedBootItemForPlayer = (playerId, state) => {
  const store = getStoreState(state);
  return getStoreItem(store.equippedBootByPlayerId[playerId]);
};
var applyBootProgressionBonus = (state, playerId, delta) => {
  if (!state || delta === 0) return delta;
  const bootItem = getEquippedBootItemForPlayer(playerId, state);
  const bonus = bootItem?.bootBonus;
  if (!bonus) return delta;
  if (delta > 0 && bonus.progressionGainPct) {
    return Math.max(1, Math.round(delta * (1 + bonus.progressionGainPct / 100)));
  }
  if (delta < 0 && bonus.progressionLossMitigationPct) {
    return Math.min(-1, Math.round(delta * (1 - bonus.progressionLossMitigationPct / 100)));
  }
  return delta;
};

// src/engine/economyLogic.ts
var clamp2 = (value, min, max) => Math.max(min, Math.min(max, value));
var calculatePostMatchProgression = (player, matchRating, state) => {
  let delta = 0;
  if (matchRating >= 8.8) {
    delta = Math.floor(Math.random() * 2) + 2;
  } else if (matchRating >= 7.6) {
    delta = 2;
  } else if (matchRating >= 6.6) {
    delta = 1;
  } else if (matchRating >= 5.1) {
    delta = 0;
  } else if (matchRating >= 4.4) {
    delta = -1;
  } else {
    delta = -(Math.floor(Math.random() * 2) + 1);
  }
  const phaseFactor = 0.9 + player.currentPhase / 10 * 0.2;
  delta = Math.round(delta * phaseFactor);
  const isGenius = player.badges.slot1 === "G\xEAnio" || player.badges.slot2 === "G\xEAnio" || player.badges.slot3 === "G\xEAnio" || player.badges.slot4 === "G\xEAnio";
  if (player.totalRating >= 800 && !isGenius) {
    delta *= delta > 0 ? 0.8 : 0.45;
  }
  if (player.totalRating >= 900 && matchRating >= 5 && delta < 0) {
    delta = 0;
  }
  delta = Math.round(delta);
  if (player.badges.trainingSlot4) {
    delta *= 0.8;
  }
  delta = Math.round(delta);
  delta = applyBootProgressionBonus(state, player.id, delta);
  const currentSeasonDelta = player.history.seasonRatingDelta || 0;
  if (currentSeasonDelta + delta > 55) delta = 55 - currentSeasonDelta;
  if (currentSeasonDelta + delta < -24) delta = -24 - currentSeasonDelta;
  return delta;
};
var calculateSatisfactionUpdate = (player, matchRating, teamWon, isTitular) => {
  let change = 0;
  if (matchRating !== null) {
    if (matchRating > 7) change += Math.floor(Math.random() * 5) + 3;
    else if (matchRating < 5) change -= 2;
  }
  if (teamWon) change += 3;
  if (isTitular) {
    player.history.benchGamesCount = 0;
    if (player.satisfaction < 75) change += 2;
  } else {
    player.history.benchGamesCount = (player.history.benchGamesCount || 0) + 1;
    if (player.history.benchGamesCount >= 4) {
      change -= 2;
    }
  }
  const newSatisfaction = Math.min(100, Math.max(0, player.satisfaction + change));
  return newSatisfaction;
};
var calculateAttractiveness = (player, team, teammates, teamPosition) => {
  let score = 40;
  const isHighTier = player.totalRating >= 800;
  const isEliteTeam = (team.powerCap || 0) >= 1e4;
  if (isHighTier) {
    if (isEliteTeam) score += 15;
    else score -= 30;
  }
  const sameRolePlayers = teammates.filter((p) => p.role === player.role);
  const betterPlayers = sameRolePlayers.filter((p) => p.totalRating > player.totalRating).length;
  if (betterPlayers === 0) {
    score += 35;
    if (!isEliteTeam && isHighTier) score += 5;
  } else if (betterPlayers >= 1) {
    score -= 25;
  }
  if (teamPosition <= 4) score += 20;
  else if (teamPosition >= 12) score -= 15;
  const chemistryBonus = (team.chemistry || 50) / 10;
  score += chemistryBonus;
  const chaos = Math.floor(Math.random() * 10);
  score += chaos;
  return clamp2(score, 0, 100);
};
var processNightMarket = (state, proposals, teams, players) => {
  const notifications = [];
  const remainingProposals = [...proposals];
  const proposalsByPlayer = remainingProposals.filter((prop) => prop.status === "PENDING").reduce((acc, prop) => {
    acc[prop.playerId] = acc[prop.playerId] || [];
    acc[prop.playerId].push(prop);
    return acc;
  }, {});
  const declineProposal = (prop, message) => {
    prop.status = "DECLINED";
    const player = players[prop.playerId];
    const toTeam = teams[prop.toTeamId];
    if (message && player && toTeam) {
      notifications.push({
        id: `refuse_${Date.now()}_${prop.id}`,
        title: "Proposta Recusada",
        message,
        type: "transfer"
      });
    }
  };
  Object.entries(proposalsByPlayer).forEach(([playerId, playerProposals]) => {
    const player = players[playerId];
    if (!player) {
      playerProposals.forEach((prop) => declineProposal(prop));
      return;
    }
    if (player.satisfaction >= 80) {
      playerProposals.forEach((prop) => {
        const toTeam2 = teams[prop.toTeamId];
        declineProposal(prop, toTeam2 ? `${player.nickname} est? feliz no clube e recusou a proposta do ${toTeam2.name}.` : void 0);
      });
      return;
    }
    const valid = playerProposals.map((prop) => {
      const toTeam2 = teams[prop.toTeamId];
      if (!toTeam2) return null;
      const currentPower = toTeam2.squad.reduce((sum, id) => sum + (players[id]?.totalRating || 0), 0);
      if (currentPower + player.totalRating > (toTeam2.powerCap || 9e3)) return null;
      const teammates = toTeam2.squad.map((id) => players[id]).filter((p) => !!p);
      const mockPosition = toTeam2.powerCap && toTeam2.powerCap > 1e4 ? 2 : 10;
      const attrScore = calculateAttractiveness(player, toTeam2, teammates, mockPosition);
      const tieBreaker = Math.abs(`${prop.id}:${playerId}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 17;
      const valueBonus = Math.min(12, Math.max(0, (prop.value - player.totalRating) / 20));
      const score = attrScore + valueBonus + tieBreaker / 10;
      return { prop, toTeam: toTeam2, score, attrScore };
    }).filter((item) => Boolean(item)).sort((a, b) => b.score - a.score);
    const winner = valid[0];
    if (!winner || winner.attrScore <= 65) {
      playerProposals.forEach((prop) => declineProposal(prop));
      return;
    }
    const winningProp = winner.prop;
    const toTeam = winner.toTeam;
    const fromTeam = winningProp.fromTeamId ? teams[winningProp.fromTeamId] : null;
    winningProp.status = "ACCEPTED";
    newsHeadlines.transfer(state, player, toTeam, winningProp.value || player.totalRating);
    if (fromTeam) {
      fromTeam.squad = fromTeam.squad.filter((id) => id !== player.id);
    }
    toTeam.squad.push(player.id);
    player.contract.teamId = toTeam.id;
    player.satisfaction = 100;
    player.history.clubEvents = [
      {
        season: state.world.currentSeason || 2050,
        date: state.world.currentDate,
        type: "TRANSFERRED",
        fromTeamId: fromTeam?.id || null,
        fromTeamName: fromTeam?.name,
        toTeamId: toTeam.id,
        toTeamName: toTeam.name,
        value: winningProp.value || player.totalRating,
        note: `Transferencia por ${winningProp.value || 0} gold`
      },
      ...player.history.clubEvents || []
    ].slice(0, 12);
    notifications.push({
      id: `accept_${Date.now()}_${player.id}`,
      title: "Transfer?ncia Conclu?da",
      message: `${player.nickname} assinou com o ${toTeam.name}!`,
      type: "transfer"
    });
    playerProposals.filter((prop) => prop.id !== winningProp.id).forEach((prop) => declineProposal(prop));
  });
  return { notifications, proposals: remainingProposals };
};

// src/engine/districtCupLogic.ts
var awardDistrictTeamTitle = (team, season) => {
  if (!team) return;
  const titles = team.titles || { league: 0, cup: 0, total: 0 };
  titles.cup += 1;
  titles.total += 1;
  team.titles = titles;
  const title = `Campe\xE3o da Copa de Distritos (${team.district})`;
  team.achievements = team.achievements || [];
  if (!team.achievements.some((achievement) => achievement.season === season && achievement.title === title)) {
    team.achievements.unshift({
      season,
      title,
      type: "Distrito"
    });
  }
};
var selectDistrictCupManagers = (state) => {
  const activeManagers = Object.values(state.managers || {});
  const sorted = activeManagers.filter((m) => m && typeof m.reputation === "number").sort((a, b) => {
    const score = (manager) => {
      const career = manager.career || {};
      const humanBonus = manager.isNPC === false || manager.id === state.userManagerId ? 35 : 0;
      return (manager.reputation || 0) + humanBonus + (career.titlesWon || 0) * 8 + (career.totalLeagueTitles || 0) * 6 + (career.totalCupTitles || 0) * 5 + (career.hallOfFameEntries || 0) * 10;
    };
    return score(b) - score(a);
  });
  const selected = sorted.slice(0, 4);
  const mapping = {};
  const districts = ["NORTE", "SUL", "LESTE", "OESTE"];
  districts.forEach((d, i) => {
    mapping[d] = selected[i]?.id || "ai_manager_dist";
  });
  return mapping;
};
var generateDistrictRosters = (state) => {
  const allPlayers = Object.values(state.players);
  const rosters = {
    "NORTE": [],
    "SUL": [],
    "LESTE": [],
    "OESTE": [],
    "EXILADO": []
  };
  ["NORTE", "SUL", "LESTE", "OESTE"].forEach((d) => {
    const districtPlayers = allPlayers.filter((p) => (p.originDistrict || p.district) === d).sort((a, b) => b.totalRating - a.totalRating).slice(0, 15);
    rosters[d] = districtPlayers.map((p) => p.id);
  });
  return rosters;
};
var initDistrictCup = (state) => {
  state.world.phase = "DISTRICT_CUP";
  const rosters = generateDistrictRosters(state);
  const managers = selectDistrictCupManagers(state);
  ["NORTE", "SUL", "LESTE", "OESTE"].forEach((d) => {
    const teamId = `d_${d.toLowerCase()}`;
    const existingTeam = state.teams[teamId];
    const team = existingTeam ? {
      ...existingTeam,
      managerId: managers[d],
      squad: rosters[d],
      lineup: {},
      tactics: {
        ...existingTeam.tactics,
        playStyle: existingTeam.tactics?.playStyle || "Equilibrado",
        preferredFormation: existingTeam.tactics?.preferredFormation || "4-3-3"
      }
    } : {
      id: teamId,
      name: `Sele\xE7\xE3o ${d}`,
      city: d,
      district: d,
      league: "Cyan",
      // Dummy
      colors: { primary: "#FFD700", secondary: "#000000" },
      managerId: managers[d],
      squad: rosters[d],
      lineup: {},
      // To be filled by manager
      tactics: {
        playStyle: "Equilibrado",
        preferredFormation: "4-3-3"
      }
    };
    state.teams[teamId] = team;
  });
};
var finalizeDistrictCup = (state) => {
  const winnerId = state.world.districtCup.winnerId;
  if (winnerId) {
    const winnerTeam = state.teams[winnerId];
    if (winnerTeam) {
      awardDistrictTeamTitle(winnerTeam, state.world.currentSeason || 2050);
      winnerTeam.squad.forEach((pid) => {
        const p = state.players[pid];
        if (p) {
          p.achievements.push({
            season: state.world.currentSeason || 2050,
            title: `Campe\xE3o da Copa de Distritos (${winnerTeam.district})`,
            type: "Distrito"
          });
        }
      });
      const managerId = winnerTeam.managerId;
      if (managerId && state.managers[managerId]) {
        const m = state.managers[managerId];
        m.career.titlesWon += 1;
        m.career.totalCupTitles += 1;
        m.achievements.push({
          season: state.world.currentSeason || 2050,
          title: `Campe\xE3o da Copa de Distritos (${winnerTeam.district})`,
          type: "Distrito"
        });
      }
    }
  }
  const allPlayersInWorld = Object.values(state.players);
  const mip = [...allPlayersInWorld].sort((a, b) => (b.history.seasonRatingDelta || 0) - (a.history.seasonRatingDelta || 0))[0];
  if (mip && (mip.history.seasonRatingDelta || 0) > 0) {
    mip.achievements.push({
      season: state.world.currentSeason || 2050,
      title: `Most Improved Player (+${mip.history.seasonRatingDelta} pts)`,
      type: "Individual"
    });
  }
  Object.values(state.players).forEach((player) => {
    if (player.district === "EXILADO") return;
    const isConvoked = Object.values(state.teams).some((t) => t.id.startsWith("d_") && t.squad.includes(player.id));
    if (isConvoked) {
      player.fatigue = 50;
      const originalTeamId = player.contract.teamId;
      if (originalTeamId) {
        const club = state.teams[originalTeamId];
        if (club) {
          const ratingGain = player.history.seasonRatingDelta || 0;
          if (ratingGain > 0) {
            club.powerCap += ratingGain;
          }
        }
      }
    } else {
      player.fatigue = 0;
    }
  });
  state.world.phase = "OFFSEASON";
};

// src/utils/managerStats.ts
var clamp3 = (value, min, max) => Math.max(min, Math.min(max, value));
var getManagerAttribute = (manager, key) => clamp3(Math.round(manager?.attributes?.[key] ?? 50), 0, 100);
var getManagerDraftInfluence = (manager) => {
  const negotiation = getManagerAttribute(manager, "negotiation");
  const scout = getManagerAttribute(manager, "scout");
  return Math.round((negotiation - 50) * 0.8 + (scout - 50) * 0.4);
};

// src/utils/managerTacticalMemory.ts
var TACTICAL_MEMORY_MASTERED_AT = 82;
var recordManagerTacticalMemory = (manager, style, understanding) => {
  if (!manager || !style || understanding < TACTICAL_MEMORY_MASTERED_AT) return manager;
  const currentMemory = manager.tacticalMemory?.[style] || 0;
  if (currentMemory >= understanding) return manager;
  return {
    ...manager,
    tacticalMemory: {
      ...manager.tacticalMemory || {},
      [style]: understanding
    }
  };
};

// src/engine/gameLogic.ts
var getSeasonDayNumber = (dateStr, seasonStartRealStr, worldDay) => {
  if (worldDay !== void 0) return worldDay;
  if (!seasonStartRealStr) return 0;
  const seasonStart = new Date(seasonStartRealStr);
  const current = new Date(dateStr);
  if (current < seasonStart) return 0;
  const diffDays = Math.floor((current.getTime() - seasonStart.getTime()) / (1e3 * 60 * 60 * 24));
  return diffDays % SEASON_DAYS + 1;
};
var isSeasonMatchDay = (dayNumber) => {
  if (dayNumber < 3) return false;
  const leagueLastDay = 2 + SEASON_ROUNDS * MATCH_INTERVAL_DAYS - 1;
  if (dayNumber <= leagueLastDay) return dayNumber % 2 !== 0;
  const eliteCupStartDay = leagueLastDay + 1;
  const eliteCupEndDay = eliteCupStartDay + ELITE_CUP_ROUNDS - 1;
  if (dayNumber >= eliteCupStartDay && dayNumber <= eliteCupEndDay) return true;
  return false;
};
var getRoundFromDay = (dayNumber) => {
  if (dayNumber < 3) return 0;
  const leagueLastDay = 2 + SEASON_ROUNDS * MATCH_INTERVAL_DAYS - 1;
  if (dayNumber <= leagueLastDay) {
    if (dayNumber % 2 !== 0) return Math.floor(dayNumber / 2);
    else return 0;
  }
  const eliteCupStartDay = leagueLastDay + 1;
  const eliteCupEndDay = eliteCupStartDay + ELITE_CUP_ROUNDS - 1;
  if (dayNumber >= eliteCupStartDay && dayNumber <= eliteCupEndDay) {
    return SEASON_ROUNDS + (dayNumber - eliteCupStartDay) + 1;
  }
  return 0;
};
var isJoinWindowOpen = (state) => {
  if ((state.world.currentDay || 0) < 3) return true;
  if (state.world.phase === "OFFSEASON") return true;
  if (state.world.phase === "REGULAR_SEASON" && (state.world.currentRound || 0) <= MIDSEASON_JOIN_MAX_ROUND) return true;
  return false;
};
var pushManagerMarketNotification = (state, title, message, type = "info") => {
  state.notifications.unshift({
    id: `manager_market_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: state.world.currentDate,
    title,
    message,
    type,
    read: false
  });
};
var getStandingPosition = (state, teamId) => {
  for (const league of Object.values(state.world.leagues || {})) {
    const standings = league.standings || [];
    const index = standings.findIndex((row) => row.teamId === teamId);
    if (index >= 0) return index + 1;
  }
  return 99;
};
var getTeamPowerCap = (team, players = {}) => {
  if (!team) return 0;
  if (typeof team.powerCap === "number" && team.powerCap > 0) return team.powerCap;
  const squadPower = calculateTeamPower(team, players);
  if (squadPower >= 10800) return 11600;
  if (squadPower >= 9600) return 10600;
  if (squadPower >= 8200) return 9600;
  if (squadPower > 0) return 8800;
  if (team.league === "Cyan") return MAX_TEAM_POWER_TIER_1;
  if (team.league === "Green") return MAX_TEAM_POWER_TIER_3;
  return 9600;
};
var resolveClubOfferMarket = (state) => {
  const userId = state.userId;
  if (!userId) return;
  const currentDay = state.world.currentDay || 0;
  const clubOffers = state.world.clubOffers || (state.world.clubOffers = []);
  const userManager = state.userManagerId ? state.managers[state.userManagerId] : null;
  const unemployed = !state.userTeamId && (!userManager || !userManager.career.currentTeamId);
  clubOffers.forEach((offer) => {
    if (offer.targetUserId !== userId) return;
    if (offer.status === "WAITING_NEXT_SEASON" && (state.world.phase === "OFFSEASON" || currentDay < 3)) {
      offer.status = "PENDING";
      offer.availableOnDay = currentDay + 1;
      offer.note = "A fila andou. A diretoria responde a partir do proximo dia.";
      pushManagerMarketNotification(
        state,
        "Fila liberada",
        `${state.teams[offer.teamId]?.name || "Um clube"} abriu conversa para a proxima temporada.`,
        "info"
      );
      const queuedTeam = state.teams[offer.teamId];
      if (queuedTeam) {
        newsHeadlines.managerQueueOpened(state, queuedTeam);
      }
    }
    if (offer.status === "PENDING" && offer.source === "APPLICATION" && offer.availableOnDay <= currentDay) {
      const team = state.teams[offer.teamId];
      const teamManager = team?.managerId ? state.managers[team.managerId] : null;
      const teamBlocked = !team || teamManager && teamManager.isNPC === false;
      if (teamBlocked) {
        offer.status = "REJECTED";
        offer.respondedAt = state.world.currentDate;
        offer.note = "Clube indisponivel no momento.";
        pushManagerMarketNotification(state, "Resposta de proposta", "Seu pedido nao pode avancar porque o clube ficou indisponivel.", "warning");
        newsHeadlines.managerClubUnavailable(state, team?.name || "O clube");
        return;
      }
      const position = getStandingPosition(state, offer.teamId);
      const reputation = userManager?.reputation || 50;
      const vacancyBonus = !team?.managerId ? 0.22 : 0;
      const pressureBonus = position >= 7 ? 0.16 : position >= 5 ? 0.08 : -0.04;
      const acceptanceChance = Math.max(0.22, Math.min(0.9, 0.5 + vacancyBonus + pressureBonus + (reputation - 50) / 200));
      if (Math.random() <= acceptanceChance) {
        offer.status = "ACCEPTED";
        offer.respondedAt = state.world.currentDate;
        offer.note = "Contrato liberado. Assinatura disponivel.";
        pushManagerMarketNotification(state, "Proposta aceita", `${team.name} topou conversar. A assinatura pode ser feita agora.`, "success");
        newsHeadlines.managerApplicationAccepted(state, team);
      } else {
        offer.status = "REJECTED";
        offer.respondedAt = state.world.currentDate;
        offer.note = "A diretoria optou por outro caminho.";
        pushManagerMarketNotification(state, "Proposta recusada", `${team?.name || "O clube"} recusou sua proposta desta vez.`, "warning");
        newsHeadlines.managerApplicationRejected(state, team?.name || "O clube");
      }
    }
    if (offer.status === "ACCEPTED" && currentDay > offer.availableOnDay + 2) {
      offer.status = "EXPIRED";
      offer.respondedAt = state.world.currentDate;
      offer.note = "A proposta perdeu a validade.";
    }
  });
  if (!isJoinWindowOpen(state)) {
    clubOffers.forEach((offer) => {
      if (offer.targetUserId !== userId) return;
      if (offer.status === "PENDING" || offer.status === "ACCEPTED") {
        offer.status = "EXPIRED";
        offer.respondedAt = state.world.currentDate;
        offer.note = "A janela de entrada foi encerrada.";
      }
    });
    return;
  }
  const hasActiveOffer = clubOffers.some(
    (offer) => offer.targetUserId === userId && (offer.status === "PENDING" || offer.status === "ACCEPTED" || offer.status === "WAITING_NEXT_SEASON")
  );
  if (!unemployed || hasActiveOffer) return;
  const eligibleTeams = Object.values(state.teams).filter((team) => team.id.startsWith("t_")).filter((team) => {
    const teamManager = team.managerId ? state.managers[team.managerId] : null;
    return !teamManager || teamManager.isNPC !== false;
  }).map((team) => ({
    team,
    position: getStandingPosition(state, team.id),
    managerless: !team.managerId
  })).sort((a, b) => {
    if (a.managerless !== b.managerless) return a.managerless ? -1 : 1;
    return b.position - a.position;
  });
  const inviteTarget = eligibleTeams[0]?.team;
  if (!inviteTarget) return;
  if (Math.random() > 0.65) return;
  clubOffers.unshift({
    id: `club_offer_${Date.now()}_${inviteTarget.id}`,
    teamId: inviteTarget.id,
    targetUserId: userId,
    managerId: state.userManagerId || null,
    managerName: userManager?.name || null,
    source: "INVITE",
    status: "ACCEPTED",
    createdAt: state.world.currentDate,
    availableOnDay: currentDay + 1,
    note: "A diretoria quer resposta a partir do proximo dia."
  });
  pushManagerMarketNotification(
    state,
    "Contato de clube",
    `${inviteTarget.name} iniciou conversas. A proposta fica assinavel no proximo dia.`,
    "info"
  );
  newsHeadlines.managerInviteReceived(state, inviteTarget);
};
var sortStandings = (standings) => [...standings].sort((a, b) => {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  return gdB - gdA;
});
var LEAGUE_DISTRICT_ORDER = [
  { key: "norte", district: "NORTE" },
  { key: "sul", district: "SUL" },
  { key: "leste", district: "LESTE" },
  { key: "oeste", district: "OESTE" }
];
var getNextRotationDistrict = (district) => {
  switch (district) {
    case "NORTE":
      return "SUL";
    case "SUL":
      return "LESTE";
    case "LESTE":
      return "OESTE";
    case "OESTE":
      return "NORTE";
    default:
      return "NORTE";
  }
};
var rotateLastPlacedTeams = (state) => {
  const reallocations = [];
  LEAGUE_DISTRICT_ORDER.forEach(({ key, district }) => {
    const league = state.world.leagues?.[key];
    const standings = league?.standings || [];
    if (standings.length === 0) return;
    const lastRow = sortStandings(standings).at(-1);
    const team = lastRow?.teamId ? state.teams[lastRow.teamId] : null;
    if (!team || !team.id.startsWith("t_")) return;
    const from = team.district || district;
    const to = getNextRotationDistrict(from);
    if (from === to) return;
    team.originDistrict = team.originDistrict || from;
    team.district = to;
    team.league = getLeagueColorForDistrict(to);
    reallocations.push({ teamId: team.id, from, to });
  });
  return reallocations;
};
var ensureRecoveryFreeAgentPool = (state) => {
  if (!isJoinWindowOpen(state)) return;
  const goodFreeAgents = Object.values(state.players).filter(
    (player) => !player.contract.teamId && player.district !== "EXILADO" && player.totalRating >= 620 && player.totalRating <= 860
  );
  const targetCount = 36;
  if (goodFreeAgents.length >= targetCount) return;
  const districts = ["NORTE", "SUL", "LESTE", "OESTE"];
  const roles = ["GOL", "ZAG", "MEI", "ATA"];
  const needed = targetCount - goodFreeAgents.length;
  const season = state.world.currentSeason || 2050;
  for (let i = 0; i < needed; i++) {
    const role = roles[i % roles.length];
    const district = districts[(i + season) % districts.length];
    const rating = 640 + (i * 37 + season) % 190;
    const id = `p_recovery_${season}_${state.world.currentRound || 0}_${i}_${Object.keys(state.players).length}`;
    if (state.players[id]) continue;
    const player = generatePlayer(id, district, rating, role);
    player.contract.teamId = null;
    player.satisfaction = 55;
    state.players[id] = player;
  }
};
var getLeagueColorForDistrict = (district) => {
  switch (district) {
    case "NORTE":
      return "Cyan";
    case "SUL":
      return "Orange";
    case "LESTE":
      return "Green";
    case "OESTE":
      return "Purple";
    default:
      return "Cyan";
  }
};
var getSeasonStandingPosition = (state, team) => {
  const league = state.world.leagues?.[team.district.toLowerCase()];
  if (!league?.standings?.length) return null;
  const index = sortStandings(league.standings).findIndex((row) => row.teamId === team.id);
  return index >= 0 ? index + 1 : null;
};
var applyActiveSeasonDividend = (state, team, position) => {
  if (state.userTeamId !== team.id || !canTeamGainMatchProgression(state, team.id)) return;
  if (!position || position > 6) return;
  const capGain = position === 1 ? 28 : position <= 3 ? 18 : position <= 4 ? 12 : 6;
  const playerGain = position === 1 ? 6 : position <= 3 ? 4 : position <= 4 ? 2 : 1;
  team.powerCap = (team.powerCap || MAX_TEAM_POWER_TIER_3) + capGain;
  const focusIds = [
    state.training?.individualFocus?.evolutionSlot,
    state.training?.individualFocus?.stabilizationSlot
  ].filter((id) => Boolean(id && team.squad.includes(id)));
  [...new Set(focusIds)].forEach((playerId) => {
    const player = state.players[playerId];
    if (!player) return;
    player.totalRating += playerGain;
    player.history.seasonRatingDelta = (player.history.seasonRatingDelta || 0) + playerGain;
  });
};
var addCappedSeasonRating = (player, gain) => {
  const seasonDelta = player.history.seasonRatingDelta || 0;
  const allowedGain = Math.max(0, Math.min(gain, 55 - seasonDelta));
  if (allowedGain <= 0) return 0;
  player.totalRating += allowedGain;
  player.history.seasonRatingDelta = seasonDelta + allowedGain;
  return allowedGain;
};
var applySeasonMeritScoreBonus = (state, team, position) => {
  if (!position || position > 4) return;
  const squadPlayers = team.squad.map((playerId) => state.players[playerId]).filter(Boolean).sort((a, b) => {
    const gamesDiff = (b.history.gamesPlayed || 0) - (a.history.gamesPlayed || 0);
    if (gamesDiff !== 0) return gamesDiff;
    return b.totalRating - a.totalRating;
  }).slice(0, 11);
  if (squadPlayers.length === 0) return;
  const baseGain = position === 1 ? 2 : 1;
  let scoreGain = 0;
  squadPlayers.forEach((player) => {
    scoreGain += addCappedSeasonRating(player, baseGain);
  });
  if (scoreGain > 0) {
    const capGain = position === 1 ? 36 : position <= 3 ? 18 : 10;
    team.powerCap = (team.powerCap || MAX_TEAM_POWER_TIER_3) + capGain;
  }
};
var applySeasonSatisfactionReview = (state, team, position) => {
  const squadPlayers = team.squad.map((playerId) => state.players[playerId]).filter(Boolean);
  if (squadPlayers.length === 0) return;
  const teamAverageRating = squadPlayers.reduce((sum, player) => sum + player.totalRating, 0) / squadPlayers.length;
  const teamMood = position === 1 ? 6 : position && position <= 4 ? 3 : position && position >= 7 ? -8 : position && position >= 5 ? -3 : 0;
  squadPlayers.forEach((player) => {
    const gamesPlayed = player.history.gamesPlayed || 0;
    let change = teamMood;
    if (gamesPlayed <= 2) change -= player.totalRating >= teamAverageRating ? 12 : 8;
    else if (gamesPlayed <= 4) change -= player.totalRating >= teamAverageRating ? 7 : 4;
    if ((player.history.averageRating || 6) < 5.2) change -= 3;
    if ((player.history.averageRating || 6) >= 7.2) change += 3;
    player.satisfaction = Math.max(0, Math.min(100, player.satisfaction + change));
  });
};
var awardTeamTitle = (team, season, title, kind) => {
  if (!team) return;
  const titles = team.titles || { league: 0, cup: 0, total: 0 };
  titles[kind] += 1;
  titles.total += 1;
  team.titles = titles;
  team.achievements = team.achievements || [];
  if (!team.achievements.some((achievement) => achievement.season === season && achievement.title === title)) {
    team.achievements.unshift({
      season,
      title,
      type: kind === "league" ? "Clube" : "Distrito"
    });
  }
};
var awardLeagueTopScorer = (state, leagueName, standings) => {
  const scorers = standings.flatMap((row) => {
    const team = state.teams[row.teamId];
    return (team?.squad || []).map((playerId) => {
      const player = state.players[playerId];
      return player ? { player, team } : null;
    });
  }).filter(Boolean).map((item) => item).sort((a, b) => (b.player.history?.goals || 0) - (a.player.history?.goals || 0));
  const winner = scorers[0];
  const goals = winner?.player.history?.goals || 0;
  if (!winner || goals <= 0) return;
  const title = `Artilheiro da ${leagueName} (${goals} gols)`;
  if (!winner.player.achievements.some((achievement) => achievement.season === (state.world.currentSeason || 2050) && achievement.title === title)) {
    winner.player.achievements.unshift({
      season: state.world.currentSeason || 2050,
      title,
      type: "Individual"
    });
  }
};
var shuffle = (items) => {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
var calculateTeamPower = (team, players) => {
  if (!team.squad || team.squad.length === 0) return 0;
  return team.squad.reduce((sum, playerId) => {
    const player = players[playerId];
    return sum + (player ? player.totalRating : 0);
  }, 0);
};
var getSignatureStyle = (mastery, fallback) => {
  return Object.entries(mastery).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0]?.[0] || fallback;
};
var ensureTeamLegacy = (team, players) => {
  const currentScore = calculateTeamPower(team, players);
  team.legacy = team.legacy || {
    seasonsPlayed: 0,
    peakScore: currentScore,
    scoreDeltaAllTime: 0,
    tacticalMastery: {},
    signatureStyle: team.tactics.playStyle
  };
  team.legacy.peakScore = Math.max(team.legacy.peakScore || currentScore, currentScore);
  team.legacy.tacticalMastery = team.legacy.tacticalMastery || {};
  team.legacy.signatureStyle = team.legacy.signatureStyle || team.tactics.playStyle;
  return team.legacy;
};
var recordPlayerClubEvent = (state, player, type, fromTeamId, toTeamId, note) => {
  const fromTeam = fromTeamId ? state.teams[fromTeamId] : null;
  const toTeam = toTeamId ? state.teams[toTeamId] : null;
  player.history.clubEvents = [
    {
      season: state.world.currentSeason || 2050,
      date: state.world.currentDate,
      type,
      fromTeamId: fromTeamId || null,
      fromTeamName: fromTeam?.name,
      toTeamId: toTeamId || null,
      toTeamName: toTeam?.name,
      note
    },
    ...player.history.clubEvents || []
  ].slice(0, 12);
};
var checkPowerCap = (team, players) => {
  const total = calculateTeamPower(team, players);
  return total <= getTeamPowerCap(team, players);
};
var applySafetyNet = (state, teamId) => {
  const team = state.teams[teamId];
  if (!team) return;
  const totalBefore = calculateTeamPower(team, state.players);
  const missingPlayers = Math.max(0, SAFETY_NET_MIN_PLAYERS - team.squad.length);
  let addedPlayers = 0;
  if (missingPlayers > 0) {
    const freeAgents = Object.values(state.players).filter((p) => !p.contract.teamId);
    for (const agent of freeAgents) {
      if (addedPlayers >= missingPlayers) break;
      team.squad.push(agent.id);
      state.players[agent.id].contract.teamId = team.id;
      state.players[agent.id].totalRating = Math.max(state.players[agent.id].totalRating, SAFETY_NET_FREE_AGENT_RATING);
      if (state.players[agent.id].potential < state.players[agent.id].totalRating) {
        state.players[agent.id].potential = state.players[agent.id].totalRating;
      }
      addedPlayers++;
    }
  }
  if (addedPlayers > 0) {
    const message = `Piso de seguran\xE7a ativado. ${addedPlayers} jogadores recrutados para o elenco.`;
    const notification = {
      id: `n_${Date.now()}_safetynet_${team.id}`,
      date: state.world.currentDate,
      title: "Liga dos Renegados",
      message,
      type: "info",
      read: false
    };
    state.notifications = [notification, ...state.notifications];
  }
};
var updateStandings = (standings, homeId, awayId, homeScore, awayScore) => {
  const homeStats = standings.find((s) => s.teamId === homeId);
  const awayStats = standings.find((s) => s.teamId === awayId);
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
var updatePlayerSatisfaction = (state, teamId, result) => {
  const team = state.teams[teamId];
  if (!team || !team.squad) return;
  const lineupIds = Object.values(team.lineup).filter(Boolean);
  const isHome = result?.homeTeamId === teamId;
  const teamWon = result ? isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore : false;
  team.squad.forEach((playerId) => {
    const player = state.players[playerId];
    if (!player) return;
    const isStarter = lineupIds.includes(playerId);
    const matchRating = result?.ratings?.[playerId] || null;
    player.satisfaction = calculateSatisfactionUpdate(player, matchRating, teamWon, isStarter);
  });
};
var DAY_MS = 24 * 60 * 60 * 1e3;
var canTeamGainMatchProgression = (state, teamId) => {
  if (!state.participants?.length) return true;
  const team = state.teams[teamId];
  if (!team?.managerId) return true;
  const manager = state.managers[team.managerId];
  if (manager?.isNPC !== false) return true;
  const participant = state.participants.find(
    (entry) => entry.teamId === teamId || entry.managerId === team.managerId
  );
  if (!participant?.updatedAt) {
    return state.userTeamId === teamId || state.userManagerId === team.managerId;
  }
  const lastSeen = new Date(participant.updatedAt).getTime();
  if (!Number.isFinite(lastSeen)) return false;
  const idleMs = Date.now() - lastSeen;
  return idleMs <= HUMAN_MANAGER_ACTIVE_GRACE_DAYS * DAY_MS;
};
var canTeamUseActiveManagement = canTeamGainMatchProgression;
var updatePlayerEvolutions = (state, result, homePlayers, awayPlayers, homePower, awayPower, homeCanGainProgression = true, awayCanGainProgression = true) => {
  const homeDifficulty = awayPower / Math.max(1, homePower);
  const awayDifficulty = homePower / Math.max(1, awayPower);
  homePlayers.forEach((player) => {
    updateSinglePlayerEvolution(state, player, result, homeDifficulty, homeCanGainProgression);
  });
  awayPlayers.forEach((player) => {
    updateSinglePlayerEvolution(state, player, result, awayDifficulty, awayCanGainProgression);
  });
};
var updateSinglePlayerEvolution = (state, player, result, difficulty, canGainProgression = true) => {
  const previousCareerGames = player.history.careerGamesPlayed || 0;
  const previousCareerAverage = player.history.careerAverageRating || player.history.averageRating || 0;
  player.history.gamesPlayed++;
  player.history.careerGamesPlayed = previousCareerGames + 1;
  const goals = result.scorers.filter((s) => s.playerId === player.id).length;
  const assists = result.assists.filter((a) => a.playerId === player.id).length;
  player.history.goals += goals;
  player.history.assists += assists;
  player.history.careerGoals = (player.history.careerGoals || 0) + goals;
  player.history.careerAssists = (player.history.careerAssists || 0) + assists;
  let matchRating = result.ratings?.[player.id];
  if (matchRating === void 0) {
    matchRating = 6 + (Math.random() - 0.5);
    const teamId = player.contract.teamId;
    if (teamId) {
      const isHome = result.homeTeamId === teamId;
      const teamWon = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
      const teamDraw = result.homeScore === result.awayScore;
      if (teamWon) matchRating += 0.45;
      else if (teamDraw) matchRating += 0.15;
      else matchRating -= 0.3;
    }
  }
  matchRating = Math.max(3, Math.min(10, matchRating));
  player.history.careerAverageRating = Number(((previousCareerAverage * previousCareerGames + matchRating) / player.history.careerGamesPlayed).toFixed(2));
  const rawDelta = calculatePostMatchProgression(player, matchRating, state);
  let performanceDelta = rawDelta;
  if (rawDelta > 0) {
    const uphillMultiplier = Math.max(0.9, Math.min(1.24, 0.86 + difficulty * 0.24));
    performanceDelta = Math.round(rawDelta * uphillMultiplier);
  } else if (rawDelta < 0) {
    const protectionMultiplier = Math.max(0.68, Math.min(1.05, 1.08 - difficulty * 0.16));
    performanceDelta = Math.round(rawDelta * protectionMultiplier);
  } else if (matchRating >= 6.4 && difficulty >= 1.12) {
    performanceDelta = 1;
  }
  const delta = canGainProgression ? performanceDelta : 0;
  const newRating = player.totalRating + delta;
  if (player.contract.teamId) {
    const team = state.teams[player.contract.teamId];
    if (team) {
      if (team.powerCap === void 0) {
        team.powerCap = getTeamPowerCap(team, state.players);
      }
      if (delta > 0) {
        team.powerCap += delta;
      }
    }
  }
  if (canGainProgression && newRating >= 900 && !player.achievements.some((a) => a.title === "Membro do Hall da Fama")) {
    player.achievements.push({
      season: state.world.currentSeason || 2050,
      title: "Membro do Hall da Fama",
      type: "Clube"
    });
    if (player.contract.teamId) {
      const team = state.teams[player.contract.teamId];
      if (team && team.managerId && state.managers[team.managerId]) {
        state.managers[team.managerId].career.hallOfFameEntries += 1;
      }
    }
  }
  player.totalRating = newRating;
  player.history.peakRating = Math.max(player.history.peakRating || newRating, newRating);
  if (newRating < 400) {
    const exiled = Object.values(state.players).find((p) => p.district === "EXILADO" && p.totalRating === 400);
    if (exiled) {
      const oldTeamId = player.contract.teamId;
      if (oldTeamId) {
        state.teams[oldTeamId].squad = state.teams[oldTeamId].squad.filter((id) => id !== player.id);
      }
      player.contract.teamId = "";
      player.district = "EXILADO";
      player.totalRating = 400;
      newsHeadlines.exile(state, player);
      exiled.district = "NORTE";
      exiled.contract.teamId = "";
    }
    player.totalRating = 400;
  } else {
    player.totalRating = Math.min(1e3, newRating);
  }
  player.history.seasonRatingDelta = (player.history.seasonRatingDelta || 0) + delta;
  player.history.lastMatchRatings = [matchRating, ...player.history.lastMatchRatings || []].slice(0, 5);
  const oldGames = player.history.gamesPlayed - 1;
  player.history.averageRating = Number(((player.history.averageRating * oldGames + matchRating) / player.history.gamesPlayed).toFixed(2));
};
var fusionAverage = (player, keys) => {
  const values = keys.map((key) => player.fusion[key]).filter((value) => typeof value === "number" && value > 0);
  if (values.length === 0) return player.totalRating / 10;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
var sectorRating = (player, attr) => {
  if (attr === "goalkeeper") {
    return fusionAverage(player, ["REF"]) * 0.5 + fusionAverage(player, ["DEF"]) * 0.3 + fusionAverage(player, ["POS"]) * 0.2;
  }
  if (attr === "attack") {
    return fusionAverage(player, ["FIN"]) * 0.45 + fusionAverage(player, ["DRI"]) * 0.2 + fusionAverage(player, ["PAS"]) * 0.2 + fusionAverage(player, ["DET"]) * 0.15;
  }
  if (attr === "midfield") {
    return fusionAverage(player, ["PAS"]) * 0.4 + fusionAverage(player, ["MOV"]) * 0.25 + fusionAverage(player, ["DRI"]) * 0.15 + fusionAverage(player, ["DET"]) * 0.2;
  }
  return fusionAverage(player, ["DET"]) * 0.35 + fusionAverage(player, ["MOV"]) * 0.25 + fusionAverage(player, ["PAS"]) * 0.15 + fusionAverage(player, ["DRI"]) * 0.15 + fusionAverage(player, ["FIN"]) * 0.1;
};
var calculateAttr = (sel, attr, hypePlayerId) => {
  if (attr === "goalkeeper") {
    const hypeBonus = sel.gk.id === hypePlayerId ? 1.03 : 1;
    const rolePenalty = sel.gk.role === "GOL" ? 1 : 0.5;
    return Math.round(sectorRating(sel.gk, attr) / 2 * hypeBonus * rolePenalty);
  }
  let players = [];
  let targetRole = "ZAG";
  if (attr === "defense") {
    players = sel.def;
    targetRole = "ZAG";
  }
  if (attr === "midfield") {
    players = sel.mid;
    targetRole = "MEI";
  }
  if (attr === "attack") {
    players = sel.att;
    targetRole = "ATA";
  }
  if (players.length === 0) return 0;
  const sum = players.reduce((acc, p) => {
    const isTarget = p.role === targetRole;
    const penalty = isTarget ? 1 : 0.6;
    const hypeBonus = p.id === hypePlayerId ? 1.03 : 1;
    return acc + sectorRating(p, attr) * penalty * hypeBonus;
  }, 0);
  return Math.round(sum / (players.length || 1) / 2);
};
var getMatchSquad = (team, players) => {
  const lineup = team.lineup || {};
  const lineupIds = Object.values(lineup).filter(Boolean);
  if (lineupIds.length >= 11) {
    const starters = lineupIds.map((id) => players[id]).filter((p) => !!p);
    let gk2 = null;
    const def2 = [];
    const mid2 = [];
    const att2 = [];
    Object.entries(lineup).forEach(([slotId, playerId]) => {
      const p = players[playerId];
      if (!p) return;
      if (slotId.startsWith("GOL")) gk2 = p;
      else if (slotId.startsWith("ZAG")) def2.push(p);
      else if (slotId.startsWith("MEI")) mid2.push(p);
      else if (slotId.startsWith("ATA")) att2.push(p);
    });
    if (!gk2) gk2 = starters.find((p) => p.role === "GOL") || starters[0];
    const all = [gk2, ...def2, ...mid2, ...att2];
    return { gk: gk2, def: def2, mid: mid2, att: att2, all };
  }
  const squad = team.squad.map((id) => players[id]).filter((p) => !!p);
  if (squad.length === 0) {
    const dummyObj = { id: "dummy", role: "ATA", totalRating: 10, contract: { teamId: team.id } };
    return { gk: dummyObj, def: [dummyObj], mid: [dummyObj], att: [dummyObj], all: [dummyObj] };
  }
  let gk = squad.find((p) => p.role === "GOL");
  if (!gk) {
    const sorted = [...squad].sort((a, b) => b.totalRating - a.totalRating);
    gk = sorted[0];
  }
  if (!gk) {
    const dummyObj = { id: "dummy", role: "ATA", totalRating: 10, contract: { teamId: team.id } };
    return { gk: dummyObj, def: [dummyObj], mid: [dummyObj], att: [dummyObj], all: [dummyObj] };
  }
  let pool = squad.filter((p) => p.id !== gk.id);
  pool.sort((a, b) => b.totalRating - a.totalRating);
  const def = [];
  const mid = [];
  const att = [];
  const fill = (target, roles, count) => {
    for (let i = 0; i < count; i++) {
      if (target.length >= count) break;
      const idx = pool.findIndex((p) => roles.includes(p.role));
      if (idx !== -1) {
        target.push(pool[idx]);
        pool.splice(idx, 1);
      }
    }
  };
  fill(def, ["ZAG"], 4);
  fill(mid, ["MEI"], 3);
  fill(att, ["ATA"], 3);
  while (def.length < 4 && pool.length > 0) def.push(pool.shift());
  while (mid.length < 3 && pool.length > 0) mid.push(pool.shift());
  while (att.length < 3 && pool.length > 0) att.push(pool.shift());
  return { gk, def, mid, att, all: [gk, ...def, ...mid, ...att] };
};
var simulateAndRecordMatch = (state, match, standings) => {
  const homeTeam = state.teams[match.homeTeamId];
  const awayTeam = state.teams[match.awayTeamId];
  if (!homeTeam || !awayTeam) {
    console.error(`Teams not found: ${match.homeTeamId} vs ${match.awayTeamId}`);
    return { homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, homeScore: 0, awayScore: 0, scorers: [], assists: [], ratings: {}, events: [], stats: { possession: { home: 50, away: 50 }, shots: { home: 0, away: 0 }, shotsOnTarget: { home: 0, away: 0 } } };
  }
  const homeSelection = getMatchSquad(homeTeam, state.players);
  const awaySelection = getMatchSquad(awayTeam, state.players);
  const homeCanUseActiveManagement = canTeamUseActiveManagement(state, homeTeam.id);
  const awayCanUseActiveManagement = canTeamUseActiveManagement(state, awayTeam.id);
  const homeUnderstanding = homeCanUseActiveManagement && state.userTeamId === homeTeam.id ? state.training?.playstyleTraining?.understanding[homeTeam.tactics.playStyle] || 0 : homeCanUseActiveManagement ? 70 : 50;
  const awayUnderstanding = awayCanUseActiveManagement && state.userTeamId === awayTeam.id ? state.training?.playstyleTraining?.understanding[awayTeam.tactics.playStyle] || 0 : awayCanUseActiveManagement ? 70 : 50;
  const styleReadinessMultiplier = (understanding) => Math.max(0.82, Math.min(0.98, 0.82 + understanding / 520));
  const homeHypePlayerId = homeCanUseActiveManagement && state.userTeamId === homeTeam.id ? state.training?.individualFocus?.evolutionSlot : null;
  const awayHypePlayerId = awayCanUseActiveManagement && state.userTeamId === awayTeam.id ? state.training?.individualFocus?.evolutionSlot : null;
  const homeStabilizationPlayerId = homeCanUseActiveManagement && state.userTeamId === homeTeam.id ? state.training?.individualFocus?.stabilizationSlot : null;
  const awayStabilizationPlayerId = awayCanUseActiveManagement && state.userTeamId === awayTeam.id ? state.training?.individualFocus?.stabilizationSlot : null;
  const homeStats = {
    id: homeTeam.id,
    name: homeTeam.name,
    attack: calculateAttr(homeSelection, "attack", homeHypePlayerId),
    midfield: calculateAttr(homeSelection, "midfield", homeHypePlayerId),
    defense: calculateAttr(homeSelection, "defense", homeHypePlayerId),
    goalkeeper: calculateAttr(homeSelection, "goalkeeper", homeHypePlayerId),
    playStyle: homeTeam.tactics.playStyle,
    mentality: homeTeam.tactics.mentality || "Calculista",
    linePosition: homeTeam.tactics.linePosition ?? 50,
    aggressiveness: homeTeam.tactics.aggressiveness ?? homeTeam.tactics.intensity ?? 50,
    intensity: homeTeam.tactics.intensity ?? homeTeam.tactics.aggressiveness ?? 50,
    width: homeTeam.tactics.width ?? 50,
    passing: homeTeam.tactics.passing ?? 50,
    slots: homeCanUseActiveManagement ? homeTeam.tactics.slots || [null, null, null] : [null, null, null],
    chemistry: Math.round((homeTeam.chemistry || 50) * styleReadinessMultiplier(homeUnderstanding)),
    hypePlayerId: homeHypePlayerId,
    stabilizationPlayerId: homeStabilizationPlayerId
  };
  homeStats.attack = Math.round(homeStats.attack * 1.05);
  homeStats.midfield = Math.round(homeStats.midfield * 1.05);
  homeStats.defense = Math.round(homeStats.defense * 1.05);
  homeStats.goalkeeper = Math.round(homeStats.goalkeeper * 1.05);
  const awayStats = {
    id: awayTeam.id,
    name: awayTeam.name,
    attack: calculateAttr(awaySelection, "attack", awayHypePlayerId),
    midfield: calculateAttr(awaySelection, "midfield", awayHypePlayerId),
    defense: calculateAttr(awaySelection, "defense", awayHypePlayerId),
    goalkeeper: calculateAttr(awaySelection, "goalkeeper", awayHypePlayerId),
    playStyle: awayTeam.tactics.playStyle,
    mentality: awayTeam.tactics.mentality || "Calculista",
    linePosition: awayTeam.tactics.linePosition ?? 50,
    aggressiveness: awayTeam.tactics.aggressiveness ?? awayTeam.tactics.intensity ?? 50,
    intensity: awayTeam.tactics.intensity ?? awayTeam.tactics.aggressiveness ?? 50,
    width: awayTeam.tactics.width ?? 50,
    passing: awayTeam.tactics.passing ?? 50,
    slots: awayCanUseActiveManagement ? awayTeam.tactics.slots || [null, null, null] : [null, null, null],
    chemistry: Math.round((awayTeam.chemistry || 50) * styleReadinessMultiplier(awayUnderstanding)),
    hypePlayerId: awayHypePlayerId,
    stabilizationPlayerId: awayStabilizationPlayerId
  };
  const result = simulateMatch(homeStats, awayStats, homeSelection.all, awaySelection.all);
  match.result = result;
  match.homeScore = result.homeScore;
  match.awayScore = result.awayScore;
  const homePower = calculateTeamPower(homeTeam, state.players);
  const awayPower = calculateTeamPower(awayTeam, state.players);
  const homeCanGainProgression = canTeamGainMatchProgression(state, homeTeam.id);
  const awayCanGainProgression = canTeamGainMatchProgression(state, awayTeam.id);
  updatePlayerEvolutions(
    state,
    result,
    homeSelection.all,
    awaySelection.all,
    homePower,
    awayPower,
    homeCanGainProgression,
    awayCanGainProgression
  );
  updatePlayerSatisfaction(state, match.homeTeamId, result);
  updatePlayerSatisfaction(state, match.awayTeamId, result);
  if (standings) {
    updateStandings(standings, match.homeTeamId, match.awayTeamId, result.homeScore, result.awayScore);
  }
  return result;
};
var getEliteCupTeams = (state) => {
  const leagues = ["norte", "sul", "leste", "oeste"];
  const teams = [];
  leagues.forEach((key) => {
    const standings = sortStandings(state.world.leagues[key].standings);
    standings.slice(0, 4).forEach((row) => teams.push(row.teamId));
  });
  return teams;
};
var getDistrictCupTeams = (state) => {
  const districts = ["NORTE", "SUL", "LESTE", "OESTE"];
  const districtTeamIds = [];
  districts.forEach((district) => {
    const districtTeamId = `d_${district.toLowerCase()}`;
    const districtTeam = state.teams[districtTeamId];
    if (districtTeam) {
      districtTeam.squad = [];
      const allPlayers = Object.values(state.players);
      const districtPlayers = allPlayers.filter((p) => p.district === district);
      const topPlayers = districtPlayers.sort((a, b) => b.totalRating - a.totalRating).slice(0, 18);
      districtTeam.squad = topPlayers.map((p) => p.id);
      districtTeamIds.push(districtTeamId);
    }
  });
  return districtTeamIds;
};
var simulateAITeamDay = (state, teamId) => {
  const team = state.teams[teamId];
  if (!team) return;
  if (!state.world.transferWindowOpen) return;
  const squadPlayers = team.squad.map((id) => state.players[id]).filter((p) => !!p);
  squadPlayers.forEach((player) => {
    if (team.squad.length > SAFETY_NET_MIN_PLAYERS && player.satisfaction < 40) {
      if (Math.random() < 0.05) {
        const previousTeamId = player.contract.teamId;
        player.contract.teamId = "";
        team.squad = team.squad.filter((id) => id !== player.id);
        recordPlayerClubEvent(state, player, "RELEASED", previousTeamId, null, "Dispensado por baixa satisfacao");
        Object.keys(team.lineup).forEach((pos) => {
          if (team.lineup[pos] === player.id) {
            delete team.lineup[pos];
          }
        });
        state.notifications.unshift({
          id: `ai_release_${Date.now()}_${player.id}`,
          date: state.world.currentDate,
          title: "Jogador Dispensado pela IA",
          message: `O ${team.name} dispensou ${player.nickname} devido a baixa satisfa\xE7\xE3o.`,
          type: "transfer",
          read: false
        });
      }
    }
  });
  if (team.squad.length < SQUAD_SIZE_MAX) {
    const freeAgents = Object.values(state.players).filter((p) => !p.contract.teamId).sort((a, b) => b.totalRating - a.totalRating);
    if (freeAgents.length > 0) {
      const bestAvailable = freeAgents[0];
      const newTotalPower = calculateTeamPower(team, state.players) + bestAvailable.totalRating;
      if (newTotalPower <= getTeamPowerCap(team, state.players)) {
        bestAvailable.contract.teamId = team.id;
        team.squad.push(bestAvailable.id);
        recordPlayerClubEvent(state, bestAvailable, "SIGNED", null, team.id, "Contratado como agente livre");
        state.notifications.unshift({
          id: `ai_sign_${Date.now()}_${bestAvailable.id}`,
          date: state.world.currentDate,
          title: "Mercado Agitado",
          message: `Sem muito alarde, o ${team.name} contratou o agente livre ${bestAvailable.nickname}.`,
          type: "transfer",
          read: false
        });
      }
    }
  }
  if (team.squad.length >= SQUAD_SIZE_MAX && Math.random() < 0.012) {
    const currentPower = calculateTeamPower(team, state.players);
    const outgoing = [...squadPlayers].filter((player) => player.satisfaction < 70 || player.totalRating < 520).sort((a, b) => {
      if (a.satisfaction !== b.satisfaction) return a.satisfaction - b.satisfaction;
      return a.totalRating - b.totalRating;
    })[0];
    if (outgoing) {
      const freeAgent = Object.values(state.players).filter((player) => !player.contract.teamId).filter((player) => player.totalRating >= outgoing.totalRating + 35).filter((player) => currentPower - outgoing.totalRating + player.totalRating <= getTeamPowerCap(team, state.players)).sort((a, b) => b.totalRating - a.totalRating)[0];
      if (freeAgent) {
        const previousTeamId = outgoing.contract.teamId;
        outgoing.contract.teamId = "";
        team.squad = team.squad.filter((id) => id !== outgoing.id);
        Object.keys(team.lineup).forEach((pos) => {
          if (team.lineup[pos] === outgoing.id) {
            delete team.lineup[pos];
          }
        });
        recordPlayerClubEvent(state, outgoing, "RELEASED", previousTeamId, null, "Saiu para abrir espaco no mercado");
        freeAgent.contract.teamId = team.id;
        freeAgent.satisfaction = 92;
        team.squad.push(freeAgent.id);
        const value = freeAgent.totalRating;
        recordPlayerClubEvent(state, freeAgent, "SIGNED", null, team.id, "Contratado em janela de mercado");
        freeAgent.history.clubEvents[0].value = value;
        newsHeadlines.transfer(state, freeAgent, team, value);
        state.notifications.unshift({
          id: `ai_market_${Date.now()}_${freeAgent.id}`,
          date: state.world.currentDate,
          title: "Mercado de Impacto",
          message: `${team.name} trocou ${outgoing.nickname} por ${freeAgent.nickname}.`,
          type: "transfer",
          read: false
        });
      }
    }
  }
  const leagueId = team.district.toLowerCase();
  const league = state.world.leagues[leagueId];
  if (league && league.matches) {
    const myMatches = league.matches.filter((m) => m.played && (m.homeTeamId === team.id || m.awayTeamId === team.id));
    myMatches.sort((a, b) => b.round - a.round);
    if (myMatches.length >= 3) {
      const last3 = myMatches.slice(0, 3);
      const isLoss = (m) => {
        const scoreA = m.homeTeamId === team.id ? m.homeScore : m.awayScore;
        const scoreB = m.homeTeamId === team.id ? m.awayScore : m.homeScore;
        return scoreA < scoreB;
      };
      if (last3.every(isLoss)) {
        const current = team.tactics.playStyle;
        const alternatives = ["Retranca Armada", "Equilibrado", "Vertical"];
        team.tactics.playStyle = alternatives.find((s) => s !== current) || "Retranca Armada";
      }
    }
  }
};
var processTrainingDay = (state) => {
  if (state.training?.cardLaboratory?.slots) {
    state.training.cardLaboratory.slots.forEach((slot) => {
      if (slot.cardId && slot.finishTime) {
        const finish = new Date(slot.finishTime);
        const now = new Date(state.world.currentDate);
        if (now >= finish) {
          const userTeam = state.teams[state.userTeamId];
          if (userTeam) {
            const cardTemplates = {
              "ataque": {
                name: "Ataque Total",
                description: "Aumenta o b\xF4nus ofensivo da equipe em 10%.",
                effect: "Ataque +10%"
              },
              "defesa": {
                name: "Muralha",
                description: "Aumenta o b\xF4nus defensivo da equipe em 15%.",
                effect: "Defesa +15%"
              },
              "meio": {
                name: "Meio Criativo",
                description: "Aumenta o controle de jogo no meio-campo em 10%.",
                effect: "Meio-Campo +10%"
              }
            };
            const template = cardTemplates[slot.cardId] || {
              name: "Carta Desconhecida",
              description: "Efeito misterioso.",
              effect: "???"
            };
            const newCard = {
              id: `card_${Date.now()}_${slot.cardId}`,
              name: template.name,
              description: template.description,
              effect: template.effect
            };
            userTeam.inventory = userTeam.inventory || [];
            userTeam.inventory.push(newCard);
            state.notifications.unshift({
              id: `n_${Date.now()}_card_lab`,
              date: state.world.currentDate,
              title: "Laborat\xF3rio de Cartas",
              message: `A pesquisa da carta "${newCard.name}" foi conclu\xEDda e adicionada ao seu invent\xE1rio!`,
              type: "success",
              read: false
            });
          }
          slot.cardId = null;
          slot.finishTime = null;
        }
      }
    });
  }
  if (state.training?.playstyleTraining?.currentStyle) {
    const currentStyle = state.training.playstyleTraining.currentStyle;
    const currentUnderstanding = state.training.playstyleTraining.understanding[currentStyle] || 0;
    const increment = Math.floor(Math.random() * 3) + 1;
    const newUnderstanding = Math.min(100, currentUnderstanding + increment);
    state.training.playstyleTraining.understanding[currentStyle] = newUnderstanding;
    const managerId = state.userManagerId;
    const manager = managerId ? state.managers[managerId] : null;
    const nextManager = recordManagerTacticalMemory(manager, currentStyle, newUnderstanding);
    if (managerId && nextManager && nextManager !== manager) {
      state.managers[managerId] = nextManager;
    }
    const trainedTeam = state.userTeamId ? state.teams[state.userTeamId] : null;
    if (trainedTeam) {
      const legacy = ensureTeamLegacy(trainedTeam, state.players);
      legacy.tacticalMastery[currentStyle] = Math.max(legacy.tacticalMastery[currentStyle] || 0, newUnderstanding);
      legacy.signatureStyle = getSignatureStyle(legacy.tacticalMastery, trainedTeam.tactics.playStyle);
    }
  }
};
var maybeGenerateDailyWorldEvent = (state) => {
  if (Math.random() > 0.18) return;
  const teams = Object.values(state.teams).filter((team) => team.id.startsWith("t_"));
  const players = Object.values(state.players).filter((player) => player.contract.teamId);
  if (teams.length === 0 || players.length === 0) return;
  const roll = Math.random();
  const date = state.world.currentDate;
  if (roll < 0.45) {
    const featured = [...players].sort((a, b) => {
      const aScore = (a.history.goals || 0) * 3 + (a.history.assists || 0) * 2 + a.totalRating / 100;
      const bScore = (b.history.goals || 0) * 3 + (b.history.assists || 0) * 2 + b.totalRating / 100;
      return bScore - aScore;
    })[0];
    const team = featured.contract.teamId ? state.teams[featured.contract.teamId] : null;
    state.notifications.unshift({
      id: `event_star_${Date.now()}_${featured.id}`,
      date,
      title: "Destaque da Rodada",
      message: `${featured.nickname} virou assunto na liga${team ? ` defendendo o ${team.name}` : ""}.`,
      type: "success",
      read: false
    });
    return;
  }
  if (roll < 0.75) {
    const pressureTeam = teams.map((team) => {
      const league = state.world.leagues[team.district.toLowerCase()];
      const row = league?.standings?.find((s) => s.teamId === team.id);
      return { team, row };
    }).filter((item) => item.row && item.row.played >= 4).sort((a, b) => a.row.points / Math.max(1, a.row.played) - b.row.points / Math.max(1, b.row.played))[0]?.team;
    if (pressureTeam) {
      state.notifications.unshift({
        id: `event_manager_${Date.now()}_${pressureTeam.id}`,
        date,
        title: "Tecnico Pressionado",
        message: `A diretoria do ${pressureTeam.name} cobra reacao imediata apos sequencia ruim.`,
        type: "crisis",
        read: false
      });
    }
    return;
  }
  const boostedTeam = teams[Math.floor(Math.random() * teams.length)];
  const oldCap = getTeamPowerCap(boostedTeam, state.players);
  const gain = 100;
  boostedTeam.powerCap = oldCap + gain;
  state.notifications.unshift({
    id: `event_value_${Date.now()}_${boostedTeam.id}`,
    date,
    title: "Valor de Clube Atualizado",
    message: `${boostedTeam.name} ganhou tracao comercial. Teto de score +${gain}.`,
    type: "info",
    read: false
  });
};
var processTransferDay = (state) => {
  Object.keys(state.teams).forEach((teamId) => {
    if (teamId !== state.userTeamId) {
      simulateAITeamDay(state, teamId);
    }
  });
  if (state.transferProposals && state.transferProposals.length > 0) {
    const { notifications, proposals } = processNightMarket(state, state.transferProposals, state.teams, state.players);
    state.transferProposals = proposals;
    state.notifications = [...notifications, ...state.notifications];
  }
};
var processMatchDay = (state, round) => {
  const world = state.world;
  if (round <= SEASON_ROUNDS) {
    state.notifications.unshift({
      id: `n_${Date.now()}_round_${round}`,
      date: world.currentDate,
      title: `Rodada ${round} Finalizada`,
      message: "Os jogos da liga foram realizados.",
      type: "match",
      read: false
    });
    const leagues = ["norte", "sul", "leste", "oeste"];
    leagues.forEach((leagueKey) => {
      const league = world.leagues[leagueKey];
      if (league && league.matches) {
        const roundMatches = league.matches.filter((m) => m.round === round);
        roundMatches.forEach((match) => {
          if (!match.played) {
            const result = simulateAndRecordMatch(state, match, league.standings);
            match.played = true;
            match.status = "FINISHED";
            if (state.userTeamId && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
              match.revealed = false;
              const isHome = match.homeTeamId === state.userTeamId;
              const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
              const opponent = state.teams[opponentId];
              state.lastHeadline = {
                title: result.headline || "Fim de Jogo",
                message: `O ${state.teams[state.userTeamId]?.name} ${result.homeScore > result.awayScore ? isHome ? "venceu" : "perdeu para" : result.homeScore < result.awayScore ? isHome ? "perdeu para" : "venceu" : "empatou com"} o ${opponent?.name} por ${result.homeScore}-${result.awayScore}.`
              };
              state.notifications.unshift({
                id: `n_${Date.now()}_match_${match.id}`,
                date: state.world.currentDate,
                title: result.headline || "Resultado da Partida",
                message: `Sua equipe jogou contra ${opponent?.name}. Placar: ${match.homeScore}-${match.awayScore}.`,
                type: "match",
                read: false
              });
            }
          }
        });
        if (round === SEASON_ROUNDS) {
          const sorted = sortStandings(league.standings);
          const champion = state.teams[sorted[0].teamId];
          if (champion) {
            newsHeadlines.champion(state, champion, leagueKey.toUpperCase());
            awardTeamTitle(champion, world.currentSeason || 2050, `Campe\xE3o da Liga ${league.name}`, "league");
            champion.squad.forEach((pid) => {
              const p = state.players[pid];
              if (p) {
                p.achievements.push({
                  season: world.currentSeason || 2050,
                  title: `Campe\xE3o da Liga ${league.name}`,
                  type: "Clube"
                });
              }
            });
            const managerId = champion.managerId;
            if (managerId && state.managers[managerId]) {
              const m = state.managers[managerId];
              m.career.titlesWon += 1;
              m.career.totalLeagueTitles += 1;
              m.achievements.push({
                season: world.currentSeason || 2050,
                title: `Campe\xE3o da Liga ${league.name}`,
                type: "Clube"
              });
              if (managerId === state.userManagerId) {
                m.career.consecutiveTitles += 1;
                if (m.career.consecutiveTitles >= 3) {
                  world.news.unshift({
                    id: `n_${Date.now()}_era_zee`,
                    title: `A ERA ${m.name.toUpperCase()}!`,
                    content: `O manager alcan\xE7a o status de Lenda ap\xF3s o tricampeonato consecutivo.`,
                    type: "CHAMPION",
                    date: world.currentDate,
                    importance: 3
                  });
                }
              }
            }
          }
          awardLeagueTopScorer(state, league.name, league.standings);
        }
      }
    });
  } else if (round <= SEASON_ROUNDS + ELITE_CUP_ROUNDS) {
    const eliteRound = round - SEASON_ROUNDS;
    if (eliteRound === 1 && world.eliteCup.teams.length === 0) {
      world.eliteCup.teams = getEliteCupTeams(state);
    }
    const stageName = eliteRound === 1 ? "Oitavas de Final" : eliteRound === 2 ? "Quartas de Final" : eliteRound === 3 ? "Semifinal" : "Final";
    state.notifications.unshift({
      id: `n_${Date.now()}_elite_${eliteRound}`,
      date: world.currentDate,
      title: `Copa Elite - ${stageName}`,
      message: `Jogos da fase ${stageName} realizados.`,
      type: "match",
      read: false
    });
    let matchesToPlay = [];
    if (eliteRound === 1) {
      if (world.eliteCup.bracket.round1.length === 0) {
        const shuffled = shuffle(world.eliteCup.teams);
        for (let i = 0; i < shuffled.length; i += 2) {
          world.eliteCup.bracket.round1.push({
            id: `ec_r1_${i}`,
            round: eliteRound,
            homeTeamId: shuffled[i],
            awayTeamId: shuffled[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.round1;
    } else if (eliteRound === 2) {
      if (world.eliteCup.bracket.quarters.length === 0) {
        const prev = world.eliteCup.bracket.round1;
        const winners = prev.map((m) => m.homeScore >= m.awayScore ? m.homeTeamId : m.awayTeamId);
        for (let i = 0; i < winners.length; i += 2) {
          world.eliteCup.bracket.quarters.push({
            id: `ec_qf_${i}`,
            round: eliteRound,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.quarters;
    } else if (eliteRound === 3) {
      if (world.eliteCup.bracket.semis.length === 0) {
        const prev = world.eliteCup.bracket.quarters;
        const winners = prev.map((m) => m.homeScore >= m.awayScore ? m.homeTeamId : m.awayTeamId);
        for (let i = 0; i < winners.length; i += 2) {
          world.eliteCup.bracket.semis.push({
            id: `ec_sf_${i}`,
            round: eliteRound,
            homeTeamId: winners[i],
            awayTeamId: winners[i + 1],
            homeScore: 0,
            awayScore: 0,
            played: false,
            date: world.currentDate
          });
        }
      }
      matchesToPlay = world.eliteCup.bracket.semis;
    } else if (eliteRound === 4) {
      if (!world.eliteCup.bracket.final) {
        const prev = world.eliteCup.bracket.semis;
        const winners = prev.map((m) => m.homeScore >= m.awayScore ? m.homeTeamId : m.awayTeamId);
        world.eliteCup.bracket.final = {
          id: `ec_final`,
          round: eliteRound,
          homeTeamId: winners[0],
          awayTeamId: winners[1],
          homeScore: 0,
          awayScore: 0,
          played: false,
          date: world.currentDate
        };
      }
      matchesToPlay = [world.eliteCup.bracket.final];
    }
    if (matchesToPlay && matchesToPlay.length > 0) {
      matchesToPlay.forEach((match) => {
        if (!match.played) {
          const result = simulateAndRecordMatch(state, match, null);
          match.played = true;
          match.status = "FINISHED";
          if (state.userTeamId && (match.homeTeamId === state.userTeamId || match.awayTeamId === state.userTeamId)) {
            match.revealed = false;
            const isHome = match.homeTeamId === state.userTeamId;
            const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
            const opponent = state.teams[opponentId];
            state.lastHeadline = {
              title: result.headline || "Copa Elite",
              message: `O ${state.teams[state.userTeamId]?.name} ${result.homeScore > result.awayScore ? isHome ? "venceu" : "perdeu para" : result.homeScore < result.awayScore ? isHome ? "perdeu para" : "venceu" : "empatou com"} o ${opponent?.name} por ${result.homeScore}-${result.awayScore}.`
            };
            state.notifications.unshift({
              id: `n_${Date.now()}_match_${match.id}`,
              date: state.world.currentDate,
              title: result.headline || "Resultado Copa Elite",
              message: `Sua equipe jogou contra ${opponent?.name}. Placar: ${match.homeScore}-${match.awayScore}.`,
              type: "match",
              read: false
            });
          }
        }
      });
    }
    world.eliteCup.round = eliteRound;
    if (eliteRound === 4 && world.eliteCup.bracket.final) {
      const final = world.eliteCup.bracket.final;
      if (final.homeScore === final.awayScore) {
        const penaltyWinner = Math.random() > 0.5 ? "home" : "away";
        if (penaltyWinner === "home") final.homeScore += 1;
        else final.awayScore += 1;
      }
      const winnerId = final.homeScore > final.awayScore ? final.homeTeamId : final.awayTeamId;
      world.eliteCup.winnerId = winnerId;
      const winnerTeam = state.teams[winnerId];
      awardTeamTitle(winnerTeam, world.currentSeason || 2050, "Campe\xE3o da Copa Elite", "cup");
      winnerTeam.squad.forEach((pid) => {
        const p = state.players[pid];
        if (p) {
          p.achievements.push({
            season: world.currentSeason || 2050,
            title: "Campe\xE3o da Copa Elite",
            type: "Clube"
          });
        }
      });
      const managerId = winnerTeam.managerId;
      if (managerId && state.managers[managerId]) {
        const m = state.managers[managerId];
        m.career.titlesWon += 1;
        m.career.totalCupTitles += 1;
        m.achievements.push({
          season: world.currentSeason || 2050,
          title: "Campe\xE3o da Copa Elite",
          type: "Clube"
        });
      }
      state.notifications.unshift({
        id: `n_${Date.now()}_elite_winner`,
        date: world.currentDate,
        title: "Campe\xE3o da Copa Elite!",
        message: `${winnerTeam.name} conquistou a Copa Elite em uma final emocionante!`,
        type: "success",
        read: false
      });
    }
  } else if (round <= TOTAL_ROUNDS) {
    const districtRound = round - (SEASON_ROUNDS + ELITE_CUP_ROUNDS);
    if (districtRound === 1 && world.districtCup.teams.length === 0) {
      const teamIds = getDistrictCupTeams(state);
      world.districtCup.teams = teamIds;
      world.districtCup.standings = teamIds.map((id) => ({
        teamId: id,
        team: state.teams[id]?.name || id,
        played: 0,
        points: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0
      }));
    }
    state.notifications.unshift({
      id: `n_${Date.now()}_district_${districtRound}`,
      date: world.currentDate,
      title: `Copa dos Distritos - Rodada ${districtRound}`,
      message: districtRound === 4 ? "Grande Final dos Distritos" : `Fase de Grupos - Rodada ${districtRound}`,
      type: "match",
      read: false
    });
    if (districtRound === 1 && world.districtCup.teams.length === 0) {
      world.districtCup.teams = ["d_norte", "d_sul", "d_leste", "d_oeste"];
    }
    if (districtRound <= 3) {
      const pairings = [
        [[0, 1], [2, 3]],
        [[0, 2], [1, 3]],
        [[0, 3], [1, 2]]
      ];
      const todaysPairings = pairings[districtRound - 1];
      todaysPairings.forEach(([idx1, idx2], i) => {
        const home = world.districtCup.teams[idx1];
        const away = world.districtCup.teams[idx2];
        const match = {
          id: `dc_r${districtRound}_${i}`,
          round: districtRound,
          homeTeamId: home,
          awayTeamId: away,
          homeScore: 0,
          awayScore: 0,
          played: false,
          date: world.currentDate,
          status: "FINISHED"
        };
        world.districtCup.matches.push(match);
        simulateAndRecordMatch(state, match, world.districtCup.standings);
        match.played = true;
      });
      world.districtCup.round = districtRound;
    } else {
      const sorted = sortStandings(world.districtCup.standings);
      const finalists = sorted.slice(0, 2).map((s) => s.teamId);
      const match = {
        id: `dc_final`,
        round: districtRound,
        homeTeamId: finalists[0],
        awayTeamId: finalists[1],
        homeScore: 0,
        awayScore: 0,
        played: false,
        date: world.currentDate,
        status: "FINISHED"
      };
      world.districtCup.final = match;
      simulateAndRecordMatch(state, match, null);
      match.played = true;
      if (match.homeScore === match.awayScore) {
        const penaltyWinner = Math.random() > 0.5 ? "home" : "away";
        if (penaltyWinner === "home") match.homeScore += 1;
        else match.awayScore += 1;
      }
      const winnerId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId;
      world.districtCup.winnerId = winnerId;
      world.districtCup.round = districtRound;
      const winnerTeam = state.teams[winnerId];
      newsHeadlines.cupWinner(state, winnerTeam);
      state.notifications.unshift({
        id: `n_${Date.now()}_district_winner`,
        date: world.currentDate,
        title: "Campe\xE3o dos Distritos!",
        message: `${winnerTeam.name} venceu a Copa dos Distritos e unificou a regi\xE3o!`,
        type: "success",
        read: false
      });
    }
  }
};
var runDistrictCupShowcase = (state) => {
  initDistrictCup(state);
  state.world.districtCup.teams = ["d_norte", "d_sul", "d_leste", "d_oeste"];
  state.world.districtCup.matches = [];
  state.world.districtCup.standings = state.world.districtCup.teams.map((id) => ({
    teamId: id,
    team: state.teams[id]?.name || id,
    played: 0,
    points: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0
  }));
  const pairings = [
    [[0, 1], [2, 3]],
    [[0, 2], [1, 3]],
    [[0, 3], [1, 2]]
  ];
  pairings.forEach((roundPairings, roundIndex) => {
    roundPairings.forEach(([homeIndex, awayIndex], matchIndex) => {
      const match = {
        id: `dc_r${roundIndex + 1}_${matchIndex}`,
        round: roundIndex + 1,
        homeTeamId: state.world.districtCup.teams[homeIndex],
        awayTeamId: state.world.districtCup.teams[awayIndex],
        homeScore: 0,
        awayScore: 0,
        played: false,
        date: state.world.currentDate,
        status: "FINISHED"
      };
      simulateAndRecordMatch(state, match, state.world.districtCup.standings);
      match.played = true;
      state.world.districtCup.matches.push(match);
    });
  });
  const finalists = sortStandings(state.world.districtCup.standings).slice(0, 2).map((team) => team.teamId);
  const finalMatch = {
    id: "dc_final",
    round: 4,
    homeTeamId: finalists[0],
    awayTeamId: finalists[1],
    homeScore: 0,
    awayScore: 0,
    played: false,
    date: state.world.currentDate,
    status: "FINISHED"
  };
  simulateAndRecordMatch(state, finalMatch, null);
  finalMatch.played = true;
  if (finalMatch.homeScore === finalMatch.awayScore) {
    if (Math.random() > 0.5) finalMatch.homeScore += 1;
    else finalMatch.awayScore += 1;
  }
  state.world.districtCup.final = finalMatch;
  state.world.districtCup.round = 4;
  state.world.districtCup.winnerId = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeamId : finalMatch.awayTeamId;
  const winnerTeam = state.teams[state.world.districtCup.winnerId];
  if (winnerTeam) {
    newsHeadlines.cupWinner(state, winnerTeam);
  }
  finalizeDistrictCup(state);
  newsHeadlines.offseasonWindow(state);
  newsHeadlines.joinWindow(state, MIDSEASON_JOIN_MAX_ROUND);
};
var processEndOfDayChecks = (state, dayNumber) => {
  Object.values(state.players).forEach((player) => {
    if (player.badges.trainingSlot4) {
      player.badges.trainingSlot4.daysLeft -= 1;
      console.log(`Dia ${state.world.currentDay}: ${player.nickname} progrediu no treino (${player.badges.trainingSlot4.daysLeft} dias restantes)`);
      if (player.badges.trainingSlot4.daysLeft <= 0) {
        const { trait, type } = player.badges.trainingSlot4;
        if (type === "CURE") {
          player.badges.slot4 = null;
          state.notifications.unshift({
            id: `n_${Date.now()}_cure_${player.id}`,
            date: state.world.currentDate,
            title: "Cura Conclu\xEDda",
            message: `${player.nickname} superou seu fardo e agora tem o DNA limpo!`,
            type: "success",
            read: false
          });
        } else {
          player.badges.slot4 = trait;
          state.notifications.unshift({
            id: `n_${Date.now()}_learn_${player.id}`,
            date: state.world.currentDate,
            title: "DNA Evolu\xEDdo",
            message: `${player.nickname} aprendeu o trait [${trait}] em seu slot de legado!`,
            type: "success",
            read: false
          });
        }
        delete player.badges.trainingSlot4;
      }
    }
  });
  if (dayNumber % 7 === 0) {
    Object.keys(state.teams).forEach((teamId) => {
      const team = state.teams[teamId];
      if (!checkPowerCap(team, state.players)) {
      }
      if (calculateTeamPower(team, state.players) < SAFETY_NET_TOTAL) {
        applySafetyNet(state, teamId);
      }
    });
  }
};
var submitProposals = (state, managerId, playerIds) => {
  const manager = state.managers[managerId];
  if (!manager || !manager.career.currentTeamId) return state;
  const newState = JSON.parse(JSON.stringify(state));
  if (!newState.world.draftProposals) {
    newState.world.draftProposals = [];
  }
  const currentProposals = newState.world.draftProposals;
  playerIds.forEach((playerId) => {
    const alreadyExists = currentProposals.some((p) => p.playerId === playerId && p.managerId === managerId);
    if (!alreadyExists) {
      currentProposals.push({
        playerId,
        managerId,
        teamId: manager.career.currentTeamId,
        priority: currentProposals.filter((p) => p.managerId === managerId).length + 1
      });
    }
  });
  return newState;
};
var cancelDraftProposal = (state, managerId, playerId) => {
  const newState = JSON.parse(JSON.stringify(state));
  if (!newState.world.draftProposals) return state;
  newState.world.draftProposals = newState.world.draftProposals.filter(
    (p) => !(p.playerId === playerId && p.managerId === managerId)
  );
  return newState;
};
var draftTieBreaker = (proposal) => {
  const seed = `${proposal.managerId}:${proposal.teamId}:${proposal.playerId}`;
  return seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 17;
};
var canDraftPlayer = (state, proposal) => {
  const player = state.players[proposal.playerId];
  const team = state.teams[proposal.teamId];
  if (!player || !team) return false;
  if ((team.squad || []).includes(player.id)) return false;
  if ((team.squad || []).length >= SQUAD_SIZE_MAX) return false;
  const currentPower = calculateTeamPower(team, state.players);
  const cap = getTeamPowerCap(team, state.players);
  if (currentPower + player.totalRating > cap) return false;
  const currentTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;
  const currentManager = currentTeam?.managerId ? state.managers[currentTeam.managerId] : null;
  return !currentManager || currentManager.isNPC !== false;
};
var assignDraftPlayer = (state, proposal) => {
  const player = state.players[proposal.playerId];
  const team = state.teams[proposal.teamId];
  if (!player || !team) return;
  const previousTeamId = player.contract.teamId;
  if (previousTeamId && state.teams[previousTeamId]) {
    state.teams[previousTeamId].squad = (state.teams[previousTeamId].squad || []).filter((id) => id !== player.id);
    Object.entries(state.teams[previousTeamId].lineup || {}).forEach(([slotId, playerId]) => {
      if (playerId === player.id) delete state.teams[previousTeamId].lineup[slotId];
    });
  }
  player.contract.teamId = team.id;
  team.squad = [.../* @__PURE__ */ new Set([...team.squad || [], player.id])];
  recordPlayerClubEvent(state, player, "DRAFTED", previousTeamId, team.id, "Escolhido no Draft Genesis");
};
var chooseDraftWinner = (state, proposals) => {
  const valid = proposals.filter((proposal) => canDraftPlayer(state, proposal));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => {
    const managerA = state.managers[a.managerId];
    const managerB = state.managers[b.managerId];
    const teamA = state.teams[a.teamId];
    const teamB = state.teams[b.teamId];
    const powerA = teamA ? calculateTeamPower(teamA, state.players) : 0;
    const powerB = teamB ? calculateTeamPower(teamB, state.players) : 0;
    const humanA = managerA?.isNPC === false ? 1 : 0;
    const humanB = managerB?.isNPC === false ? 1 : 0;
    const needA = SQUAD_SIZE_MAX - (teamA?.squad?.length || 0);
    const needB = SQUAD_SIZE_MAX - (teamB?.squad?.length || 0);
    const scoreA = humanA * 1e4 + needA * 100 - Math.round(powerA / 25) + getManagerDraftInfluence(managerA) + draftTieBreaker(a);
    const scoreB = humanB * 1e4 + needB * 100 - Math.round(powerB / 25) + getManagerDraftInfluence(managerB) + draftTieBreaker(b);
    return scoreB - scoreA;
  })[0];
};
var resolveDraftConflict = (state) => {
  try {
    if (!state?.world?.draftProposals || state.world.draftProposals.length === 0) return;
    const world = state.world;
    const proposals = [...world.draftProposals].filter((proposal) => proposal?.playerId && proposal?.managerId && proposal?.teamId).sort((a, b) => a.priority - b.priority);
    const maxRound = proposals.reduce((max, proposal) => Math.max(max, proposal.priority || 1), 1);
    const draftedPlayerIds = /* @__PURE__ */ new Set();
    for (let round = 1; round <= maxRound; round += 1) {
      const roundProposals = proposals.filter((proposal) => proposal.priority === round && !draftedPlayerIds.has(proposal.playerId));
      const proposalsByPlayer = roundProposals.reduce((acc, proposal) => {
        acc[proposal.playerId] = acc[proposal.playerId] || [];
        acc[proposal.playerId].push(proposal);
        return acc;
      }, {});
      for (const playerId of Object.keys(proposalsByPlayer)) {
        const winner = chooseDraftWinner(state, proposalsByPlayer[playerId]);
        if (!winner) continue;
        assignDraftPlayer(state, winner);
        draftedPlayerIds.add(playerId);
      }
    }
    world.draftProposals = [];
  } catch (e) {
  }
};
var autoCompleteDraft = (state) => {
  const teams = Object.values(state.teams).filter((t) => t.id.startsWith("t_"));
  const allFreeAgents = Object.values(state.players).filter((p) => !p.contract.teamId && p.district !== "EXILADO").sort((a, b) => b.totalRating - a.totalRating);
  if (allFreeAgents.length === 0) return;
  const legendaries = allFreeAgents.filter((p) => p.totalRating >= 850);
  legendaries.forEach((p) => {
    const targetTeam = teams.filter((t) => t.squad.length < SQUAD_SIZE_MAX).sort((a, b) => (a.powerCap || 0) - (b.powerCap || 0))[0];
    if (targetTeam) {
      p.contract.teamId = targetTeam.id;
      targetTeam.squad.push(p.id);
    }
  });
  const remainingFreeAgents = Object.values(state.players).filter((p) => !p.contract.teamId && p.district !== "EXILADO").sort((a, b) => b.totalRating - a.totalRating);
  teams.forEach((team) => {
    while (team.squad.length < SQUAD_SIZE_MAX && remainingFreeAgents.length > 0) {
      const p = remainingFreeAgents.shift();
      p.contract.teamId = team.id;
      team.squad.push(p.id);
    }
  });
  if (state.lastHeadline) {
    state.lastHeadline = {
      title: "ELENCOS FECHADOS",
      message: "A Liga realizou o preenchimento autom\xE1tico. Todos os times possuem elencos equilibrados para a estreia!"
    };
  }
};
var advanceGameDay = (prevState, skipDateIncrement = false) => {
  if (prevState.world.currentDay === -1) {
    return prevState;
  }
  const state = JSON.parse(JSON.stringify(prevState));
  const { world } = state;
  if (!skipDateIncrement) {
    const date = new Date(world.currentDate);
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
    world.currentDate = date.toISOString();
    world.currentDay = (world.currentDay || 0) + 1;
    console.log(`>>> M\xC1QUINA DO TEMPO: Avan\xE7ando para o Dia ${world.currentDay} <<<`);
    if (!world.seasonStartReal || new Date(world.currentDate) < new Date(world.seasonStartReal)) {
      const nextDay = new Date(world.currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      world.seasonStartReal = nextDay.toISOString();
    }
  } else {
    world.currentDay = (world.currentDay || 0) + 1;
    console.log(`>>> REL\xD3GIO REAL: avan\xE7ando para o Dia ${world.currentDay} <<<`);
  }
  const isGenesisSeason = (world.currentSeason || 2050) === 2050 && (state.world.history?.length || 0) === 0;
  if (isGenesisSeason && world.currentDay === 1) {
    resolveDraftConflict(state);
  } else if (isGenesisSeason && world.currentDay === GENESIS_DRAFT_AUTOFILL_DAY) {
    resolveDraftConflict(state);
    autoCompleteDraft(state);
    world.status = "ACTIVE";
  } else if (world.currentDay >= GENESIS_DRAFT_AUTOFILL_DAY && world.status === "LOBBY") {
    world.status = "ACTIVE";
  }
  const dayNumber = getSeasonDayNumber(world.currentDate, world.seasonStartReal, world.currentDay);
  const isMatchDay = isSeasonMatchDay(dayNumber);
  const round = getRoundFromDay(dayNumber);
  if (round >= 1 && round <= SEASON_ROUNDS) world.phase = "REGULAR_SEASON";
  else if (round > SEASON_ROUNDS && round <= TOTAL_ROUNDS) world.phase = "ELITE_CUP";
  else world.phase = "OFFSEASON";
  processTrainingDay(state);
  processEndOfDayChecks(state, dayNumber);
  world.transferWindowOpen = true;
  ensureRecoveryFreeAgentPool(state);
  resolveClubOfferMarket(state);
  processTransferDay(state);
  if (isMatchDay) {
    const round2 = getRoundFromDay(dayNumber);
    world.currentRound = round2;
    processMatchDay(state, round2);
    if (round2 === TOTAL_ROUNDS) {
      runDistrictCupShowcase(state);
      world.phase = "OFFSEASON";
    }
  }
  maybeGenerateDailyWorldEvent(state);
  if (state.world.isInitialSeed) {
    state.world.isInitialSeed = false;
  }
  return state;
};
var startNewSeason = (state) => {
  const currentSeason = state.world.currentSeason || 2050;
  const nextSeason = currentSeason + 1;
  const teamsAfterRotation = { ...state.teams };
  const rotationState = {
    ...state,
    teams: teamsAfterRotation
  };
  const reallocations = rotateLastPlacedTeams(rotationState);
  const seasonReport = generateSeasonReport(rotationState, reallocations);
  newsHeadlines.seasonEnded(rotationState, seasonReport);
  Object.values(rotationState.teams).filter((team) => team.id.startsWith("t_")).forEach((team) => {
    const legacy = ensureTeamLegacy(team, rotationState.players);
    const currentScore = calculateTeamPower(team, rotationState.players);
    const teamPosition = getSeasonStandingPosition(rotationState, team);
    const seasonDelta = team.squad.reduce((sum, playerId) => {
      return sum + (rotationState.players[playerId]?.history?.seasonRatingDelta || 0);
    }, 0);
    legacy.seasonsPlayed += 1;
    legacy.peakScore = Math.max(legacy.peakScore || currentScore, currentScore);
    legacy.scoreDeltaAllTime = (legacy.scoreDeltaAllTime || 0) + seasonDelta;
    if (rotationState.userTeamId === team.id && rotationState.training?.playstyleTraining?.understanding) {
      Object.entries(rotationState.training.playstyleTraining.understanding).forEach(([style, value]) => {
        if (value === void 0) return;
        const playStyle = style;
        legacy.tacticalMastery[playStyle] = Math.max(legacy.tacticalMastery[playStyle] || 0, value);
      });
    }
    legacy.signatureStyle = getSignatureStyle(legacy.tacticalMastery, team.tactics.playStyle);
    applySeasonSatisfactionReview(rotationState, team, teamPosition);
    applySeasonMeritScoreBonus(rotationState, team, teamPosition);
    applyActiveSeasonDividend(rotationState, team, teamPosition);
  });
  const leagues = { ...rotationState.world.leagues };
  const currentWorldDate = new Date(rotationState.world.currentDate);
  const newSeasonStartDate = new Date(currentWorldDate);
  newSeasonStartDate.setHours(8, 0, 0, 0);
  const leagueDistricts = Object.fromEntries(LEAGUE_DISTRICT_ORDER.map((item) => [item.key, item.district]));
  Object.keys(leagues).forEach((key) => {
    const league = { ...leagues[key] };
    const district = leagueDistricts[key] || league.district;
    const leagueTeamIds = Object.values(rotationState.teams).filter((team) => team.id.startsWith("t_") && (!district || team.district === district)).map((team) => team.id);
    league.standings = leagueTeamIds.map((teamId, index) => ({
      teamId,
      team: rotationState.teams[teamId]?.name,
      position: index + 1,
      logo: rotationState.teams[teamId]?.logo,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      gd: 0
    }));
    const teamObjs = leagueTeamIds.map((id) => rotationState.teams[id]);
    league.matches = generateCalendar(teamObjs, league.id, newSeasonStartDate.toISOString());
    league.teams = leagueTeamIds;
    leagues[key] = league;
  });
  const players = { ...rotationState.players };
  Object.keys(players).forEach((id) => {
    const player = { ...players[id] };
    const currentTeamId = player.contract?.teamId || null;
    const currentTeam = currentTeamId ? rotationState.teams[currentTeamId] : null;
    const ratingStart = player.history.ratingSeasonStart ?? Math.max(0, player.totalRating - (player.history.seasonRatingDelta || 0));
    const seasonSnapshot = {
      season: currentSeason,
      teamId: currentTeam?.id || null,
      teamName: currentTeam?.name || "Livre",
      ratingStart,
      ratingEnd: player.totalRating,
      ratingDelta: player.totalRating - ratingStart,
      gamesPlayed: player.history.gamesPlayed || 0,
      goals: player.history.goals || 0,
      assists: player.history.assists || 0,
      averageRating: player.history.averageRating || 0,
      satisfaction: player.satisfaction || 0
    };
    player.badges = generateBadges(player.totalRating);
    player.history = {
      ...player.history,
      goals: 0,
      assists: 0,
      gamesPlayed: 0,
      averageRating: 0,
      seasonRatingDelta: 0,
      ratingSeasonStart: player.totalRating,
      seasonSnapshots: [seasonSnapshot, ...player.history.seasonSnapshots || []].slice(0, 3),
      // lastMatchRatings should probably stay for form? 
      // Let's clear it for a "clean" season start
      lastMatchRatings: []
    };
    players[id] = player;
  });
  const finalState = {
    ...rotationState,
    teams: rotationState.teams,
    players,
    world: {
      ...state.world,
      currentSeason: nextSeason,
      currentDay: 0,
      currentRound: 0,
      currentDate: newSeasonStartDate.toISOString(),
      seasonStartReal: newSeasonStartDate.toISOString(),
      status: "ACTIVE",
      phase: "REGULAR_SEASON",
      transferWindowOpen: true,
      offseasonDecision: void 0,
      clubOffers: [],
      leagues,
      eliteCup: { ...state.world.eliteCup, round: 0, teams: [], winnerId: null, bracket: { round1: [], quarters: [], semis: [], final: null } },
      districtCup: { ...state.world.districtCup, round: 0, teams: [], matches: [], standings: [], winnerId: null, final: null }
    },
    lastHeadline: {
      title: `Temporada ${nextSeason} Iniciada`,
      message: `Bem-vindos ao ano de ${nextSeason}. As lendas do passado agora enfrentam novos desafios. Tra\xE7os t\xE9cnicos foram recalibrados.`
    }
  };
  newsHeadlines.seasonStarted(finalState, nextSeason);
  const seasonReportNewsIndex = finalState.world.news.findIndex(
    (news) => news.action?.kind === "SEASON_REPORT" && news.action.season === seasonReport.season
  );
  if (seasonReportNewsIndex > 0) {
    const [seasonReportNews] = finalState.world.news.splice(seasonReportNewsIndex, 1);
    finalState.world.news.unshift(seasonReportNews);
  }
  return finalState;
};
export {
  advanceGameDay,
  applySafetyNet,
  autoCompleteDraft,
  calculateAttr,
  calculateTeamPower,
  canTeamGainMatchProgression,
  cancelDraftProposal,
  checkPowerCap,
  getMatchSquad,
  getSeasonDayNumber,
  getTeamPowerCap,
  isJoinWindowOpen,
  resolveDraftConflict,
  simulateAndRecordMatch,
  startNewSeason,
  submitProposals,
  updatePlayerSatisfaction,
  updateStandings
};
