import {
  Player,
  PositionType,
  PlayerRole,
  Pentagon,
  FusionSkills,
  Badges,
  Contract,
  PlayerHistory,
  Team,
  Manager,
  GameState,
  LeagueColor,
  LeagueTeamStats,
  District,
  TeamLogoMetadata,
  LogoPattern,
} from '../types';
import { generateCalendar } from './CalendarGenerator';
import { seedUniverse } from './seed_universe';

// --- Seeded Random Engine (Fixed Base) ---
let _seed = 1234567; // Fixed seed for "Base Fixa"
const mulberry32 = (a: number) => {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
};
let rand = mulberry32(_seed);

export const resetGeneratorSeed = (newSeed: number = 1234567) => {
  _seed = newSeed;
  rand = mulberry32(_seed);
};

const randomInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randomFloat = () => rand();

/**
 * Maps the current real date to the game world year (2050).
 * e.g. Feb 27, 2026 → Feb 27, 2050
 */
export const getGameDate2050 = (realDate?: Date): Date => {
  const now = realDate || new Date();
  return new Date(2050, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
};

const generateRatingPool = () => {
  const ratings: number[] = [];

  // Professional Distribution for 1000 players:
  // Gods (900-1000): 15 players
  for (let i = 0; i < 15; i++) ratings.push(randomInt(900, 1000));

  // Elites (800-899): 80 players
  for (let i = 0; i < 80; i++) ratings.push(randomInt(800, 899));

  // Pros (700-799): 200 players
  for (let i = 0; i < 200; i++) ratings.push(randomInt(700, 799));

  // Average (550-699): 450 players
  for (let i = 0; i < 450; i++) ratings.push(randomInt(550, 699));

  // Rookies/Below (200-549): 255 players
  for (let i = 0; i < 255; i++) ratings.push(randomInt(200, 549));

  // Deterministic shuffle
  return ratings.sort(() => rand() - 0.5);
};

const firstNamesMale = [
  'Bex', 'Crux', 'Dorn', 'Eld', 'Fitz', 'Gunn', 'Holt', 'Ives', 'Jude', 'Kade', 'Lux', 'Moss', 'Nash', 'Oakes', 'Piers', 'Quest', 'Rex', 'Slade', 'Tate', 'Upton', 'Vale', 'Wells', 'Xand', 'York', 'Zale', 'Asa', 'Bram', 'Cruz', 'Dane', 'Egan', 'Fox', 'Gage', 'Hart', 'Ivo', 'Joss', 'Kane', 'Lyle', 'Mercer', 'Nye', 'Oren', 'Pierce', 'Quade', 'Reeve', 'Saul', 'Tycho', 'Urie', 'Vaughn', 'Wynn', 'Xylon', 'Yates', 'Zayn', 'Aldric', 'Blaise', 'Corin', 'Drift', 'Eldon', 'Flint', 'Goram', 'Harden', 'Isham', 'Jarvis', 'Kellan', 'Landon', 'Maddox', 'Niven', 'Oberon', 'Phelan', 'Quill', 'Rogan', 'Stellan', 'Tristan', 'Ulysses', 'Viggo', 'Warrick', 'Xerxes', 'Yardley', 'Zephyr', 'Axl', 'Brod', 'Corbin', 'Drax', 'Elio', 'Fender', 'Grayson', 'Huxley', 'Icarus', 'Jagger', 'Knox', 'Lior', 'Murphy', 'Nero', 'Ozzy', 'Paxton', 'Rook', 'Sterling', 'Thorne', 'Vaughn', 'Wilder', 'Xander', 'Yuri',
  'Kael', 'Jax', 'Rune', 'Zen', 'Cade', 'Finn', 'Kai', 'Axel', 'Blaze', 'Cole', 'Dax', 'Jett', 'Kian', 'Lars', 'Mace', 'Nox', 'Orin', 'Pryce', 'Quinn', 'Rix', 'Seth', 'Trey', 'Vance', 'Wren', 'Zane', 'Arlo', 'Bryn', 'Cian', 'Darr', 'Eron', 'Fael', 'Gale', 'Hale', 'Ivar', 'Jory', 'Kaelen', 'Lian', 'Milo', 'Niall', 'Odin', 'Perrin', 'Rian', 'Soren', 'Torin', 'Ulric', 'Vance', 'Wulf', 'Xylos', 'Yuri', 'Zion', 'Ash', 'Brock', 'Croy', 'Drew', 'Elias', 'Fynn', 'Garth', 'Haze', 'Ilan', 'Jace', 'Kodi', 'Loki', 'Mael', 'Nico', 'Orion', 'Pike', 'Rhys', 'Silas', 'Talon', 'Vero', 'Wade', 'Xavi', 'Yael', 'Zeke', 'Aric', 'Bane', 'Cael', 'Dagon', 'Einar', 'Falk', 'Garen', 'Hakon', 'Iago', 'Jarl', 'Kaelan', 'Levin', 'Marek', 'Nolan', 'Oren', 'Pax', 'Roric', 'Sven', 'Tibor', 'Ulf', 'Vidor', 'Wulfric', 'Xenon', 'Ymir', 'Zoran', 'Alden'
];
const firstNamesFemale = [
  'Bree', 'Cira', 'Daya', 'Enya', 'Fia', 'Gia', 'Harlow', 'Ione', 'Jora', 'Kaia', 'Lia', 'Mira', 'Nyx', 'Ona', 'Pandora', 'Quinn', 'Rae', 'Saga', 'Thora', 'Ula', 'Vida', 'Wren', 'Xana', 'Yvaine', 'Ziva', 'Astra', 'Bianca', 'Celeste', 'Dione', 'Elara', 'Flora', 'Gaia', 'Helia', 'Iliana', 'Jiana', 'Kiana', 'Lara', 'Maia', 'Nadia', 'Odessa', 'Priya', 'Raya', 'Selia', 'Talia', 'Una', 'Vania', 'Waverly', 'Xenia', 'Yana', 'Zara', 'Anais', 'Briseis', 'Calista', 'Dagny', 'Elara', 'Ffion', 'Ginevra', 'Hestia', 'Illyria', 'Jasmine', 'Kallisto', 'Luciana', 'Maeve', 'Nerissa', 'Oriana', 'Persephone', 'Raven', 'Saoirse', 'Thalia', 'Valkyrie', 'Wisteria', 'Xanthe', 'Yelena', 'Zephyra', 'Alva', 'Beryl', 'Cyra', 'Dove', 'Esme', 'Fern', 'Greer', 'Hollis', 'Indra', 'Jules', 'Kiva', 'Lark', 'Maren', 'Nix', 'Olive', 'Paz', 'Quill', 'Rue', 'Sage', 'Tess', 'Vale', 'Willow', 'Xyla', 'Yarrow', 'Zinnia',
  'Lyra', 'Kira', 'Zoe', 'Anya', 'Nova', 'Skye', 'Jade', 'Ria', 'Zara', 'Cleo', 'Dara', 'Elara', 'Faye', 'Gwen', 'Iris', 'Juno', 'Kaelin', 'Lena', 'Mina', 'Nia', 'Orla', 'Pia', 'Rhea', 'Sora', 'Tia', 'Veda', 'Willow', 'Xena', 'Yara', 'Zia', 'Ayla', 'Bria', 'Cora', 'Dina', 'Eira', 'Freya', 'Gala', 'Hana', 'Ida', 'Jessa', 'Kaelie', 'Lila', 'Mara', 'Nola', 'Oona', 'Petra', 'Rina', 'Sasha', 'Tessa', 'Vesper', 'Willa', 'Xyla', 'Yumi', 'Zola', 'Aria', 'Blair', 'Cerys', 'Dael', 'Eris', 'Faelan', 'Gara', 'Hera', 'Iona', 'Jael', 'Kaelen', 'Liora', 'Maelie', 'Nyssa', 'Oria', 'Phaedra', 'Riona', 'Sydra', 'Tamsin', 'Una', 'Vala', 'Wynn', 'Xanthe', 'Yara', 'Zella', 'Aella'
];
const lastNames = [
  'Aegis', 'Bios', 'Cipher', 'Dynamo', 'Energetic', 'Fusion', 'Genetix', 'Helix', 'Ionic', 'Jupiter', 'Kinetic', 'Lumina', 'Momentum', 'Neural', 'Orbital', 'Photon', 'Quantum', 'Radian', 'Synthetic', 'Tachyon', 'Unison', 'Vector', 'Wavelength', 'Xenon', 'Yield', 'Zenith', 'Accel', 'Byte', 'Cyber', 'Digital', 'Electron', 'Fiber', 'Graphite', 'Hydro', 'Infinite', 'Junction', 'Kernel', 'Logic', 'Mega', 'Nucleus', 'Omega', 'Pulse', 'Resonance', 'Silicon', 'Techno', 'Ultron', 'Vertex', 'Wire', 'Xylo', 'Yottabyte', 'Zer0', 'Aerospace', 'Biosys', 'Coreware', 'Datagen', 'Ecotech', 'Futura', 'Genome', 'Hardline', 'Infinium', 'Jarvis', 'Kryotech', 'Luminar', 'Mechadyne', 'Nanite', 'Omnitech', 'Procyon', 'Quantex', 'Robotics', 'Syntex', 'Teradyne', 'Unigen', 'Videre', 'Webcore', 'Xanadu', 'Yantra', 'Zetacorp', 'Apex', 'Blade', 'Chrome', 'Dagger', 'Edge', 'Frost', 'Glitch', 'Havoc', 'Icicle', 'Jinx', 'Karma', 'Laser', 'Matrix', 'Neon', 'Onyx', 'Phantom', 'Razor', 'Shadow', 'Toxin', 'Umbra', 'Viper', 'Wraith', 'XRay', 'Yellowjacket', 'Zen', 'Archer', 'Bishop', 'Cruz', 'Drake', 'Eagle', 'Falcon', 'Griffin', 'Hawk', 'Ingram', 'Jester', 'Knight', 'Lionel', 'Maverick', 'Noble', 'Orion', 'Phoenix', 'Ranger', 'Sparrow', 'Tiger', 'Ulysses', 'Valor', 'Wolf', 'Xavier', 'York', 'Zodiac', 'Abbott', 'Bentley', 'Chandler', 'Daley', 'Ellington', 'Fairchild', 'Gallagher', 'Harrington', 'Ingalls', 'Jefferson', 'Kensington', 'Livingston', 'Monroe', 'Nelson', 'Oakley', 'Prescott', 'Quincy', 'Rutherford', 'Sheridan', 'Thornton', 'Upton', 'Vanderbilt', 'Wellington', 'Xerxes', 'Yale', 'Zimmerman', 'Ashford', 'Bradley', 'Clayton', 'Donovan', 'Ellis', 'Fletcher', 'Graham', 'Hamilton', 'Irving', 'Jackson', 'Keller', 'Langston', 'Milton', 'Newton', 'Owens', 'Porter', 'Quinn', 'Ramsey', 'Shelby', 'Trenton', 'Underwood', 'Valentine', 'Winston', 'Young', 'Zane', 'Axton', 'Bowie', 'Corbin', 'Dorian', 'Easton', 'Fulton', 'Gatlin', 'Hutton', 'Idris', 'Jagger', 'Killian', 'Landon', 'Maddox', 'Nixon', 'Orlando', 'Paxton', 'Quillon', 'Rocco', 'Stanton', 'Tristan', 'Urien', 'Vaughn', 'Weston', 'Xavian', 'Yates', 'Zayn',
  'Sterling', 'Vanguard', 'Bio', 'Wave', 'Core', 'Nexus', 'Aether', 'Synth', 'Optic', 'Apex', 'Matrix', 'Quantum', 'Echo', 'Flux', 'Giga', 'Hyper', 'Infra', 'Kinet', 'Lumen', 'Meta', 'Nano', 'Omni', 'Penta', 'Quadra', 'Rift', 'Spectra', 'Terra', 'Ultra', 'Velo', 'Xenon', 'Yotta', 'Zetta', 'Blaze', 'Chrome', 'Cypher', 'Daemon', 'Digit', 'Enigma', 'Fusion', 'Grid', 'Helix', 'Ion', 'Joule', 'Kilo', 'Logic', 'Macro', 'Micro', 'Neo', 'Octa', 'Pixel', 'Rune', 'Saga', 'Tech', 'Vector', 'Volt', 'Watt', 'Xerox', 'Yocto', 'Zero', 'Axiom', 'Bionic', 'Cortex', 'Data', 'Eon', 'Fiber', 'Gamma', 'Halo', 'Inertia', 'Jettison', 'Krypton', 'Laser', 'Magnet', 'Neural', 'Orbit', 'Plasma', 'Quasar', 'Radiant', 'Sensor', 'Titan', 'Unity', 'Vortex', 'Warp', 'Xylo', 'Yield', 'Zenith', 'Alba', 'Brooks', 'Cain', 'Dixon', 'Ellis', 'Flynn', 'Grant', 'Hayes', 'Irwin', 'Jones', 'King', 'Lane', 'Marsh', 'Nash', 'Owen', 'Page', 'Reed', 'Shaw', 'Todd', 'Vance', 'Ward', 'Young', 'Zeller', 'Adams', 'Baker', 'Clark', 'Davis', 'Evans', 'Fisher', 'Green', 'Hall', 'Hill', 'Jackson', 'Kelly', 'Lewis', 'Miller', 'Moore', 'Nelson', 'Parker', 'Roberts', 'Scott', 'Smith', 'Taylor', 'White', 'Wright', 'Allen', 'Bell', 'Carter', 'Cook', 'Cooper', 'Edwards', 'Foster', 'Gray', 'Harris', 'James', 'Johnson', 'Lee', 'Martin', 'Mitchell', 'Morris', 'Murphy', 'Myers', 'Perez', 'Phillips', 'Ramirez', 'Ross', 'Sanchez', 'Sanders', 'Stewart', 'Stone', 'Thomas', 'Thompson', 'Turner', 'Walker', 'Watson', 'Webb', 'Williams', 'Wilson', 'Wood', 'Young', 'Anderson', 'Bailey', 'Bennett', 'Brown', 'Campbell', 'Coleman', 'Collins', 'Diaz', 'Edwards', 'Flores', 'Garcia', 'Gomez', 'Gonzalez', 'Hernandez', 'Hughes', 'Jenkins', 'Kim', 'Long', 'Martinez', 'Morgan', 'Ortiz', 'Patel', 'Peterson', 'Price', 'Rivera', 'Rogers', 'Russell', 'Schmidt', 'Simmons', 'Stevens', 'Sullivan', 'Torres', 'Washington', 'Barnes', 'Bryant', 'Burke', 'Chapman', 'Cruz', 'Dean', 'Elliott', 'Ford', 'Gibson', 'Graham', 'Griffin', 'Hamilton', 'Henderson', 'Howard', 'Hudson', 'Hunt', 'Jensen', 'Jordan', 'Kennedy', 'Knight', 'Larson', 'Little', 'Marshall', 'Mason', 'Matthews', 'McDonald', 'Medina', 'Mendoza', 'Meyer', 'Mills', 'Montgomery', 'Morales', 'Murray', 'Neal', 'Olson', 'Palmer', 'Pearson', 'Perry', 'Powell', 'Ray', 'Reynolds', 'Richards', 'Robinson', 'Ruiz', 'Ryan', 'Saunders', 'Sharp', 'Singleton', 'Spencer', 'Stephens', 'Stevenson', 'Stone'
];
const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];

// --- DNA ELITE 2050 TRAITS ---
const TRAITS_BRONZE = ['Ofensivo', 'Folego', 'Passe Bronze', 'Finaliz Bronze', 'Def Bronze'];
const TRAITS_PRATA = ['Consistência', 'Versatilidade', 'Defesa Prata', 'Finaliz Prata', 'Passe Prata'];
const TRAITS_OURO = ['Finaliz Ouro', 'Passe Ouro', 'Defesa Ouro', 'Liderança', 'Folego Ouro'];
const TRAITS_LENDARIO_S3 = ['Finaliz Lendária', 'Passe Lendária', 'Defesa Lendária', 'Gênio', 'Clutch', 'Protagonista'];
const TRAITS_EPICO_S3 = ['Máquina', 'Catalisador'];
const TRAITS_FARDOS = ['Displicente', 'Pavio Curto', 'Preguiçoso', 'Vidro', 'Inconstante', 'Estático', 'Individualista', 'Boêmio'];

export const regenerateDNA = (player: Player): Badges => {
  const pRand = mulberry32(Array.from(player.id).reduce((a, b) => a + b.charCodeAt(0), 0));

  const getRand = (pool: string[]) => pool[Math.floor(pRand() * pool.length)];

  // SLOT 1 (BASE): 70% Bronze, 30% Prata
  const s1 = pRand() < 0.7 ? getRand(TRAITS_BRONZE) : getRand(TRAITS_PRATA);

  // SLOT 2 (ELITE): 60% Prata, 40% Ouro
  const s2 = pRand() < 0.6 ? getRand(TRAITS_PRATA) : getRand(TRAITS_OURO);

  // SLOT 3 (POTENCIAL): 70% Ouro (Raro), 25% Épico, 5% Lendário
  const s3Roll = pRand();
  let s3 = '';
  if (s3Roll < 0.7) s3 = getRand(TRAITS_OURO);
  else if (s3Roll < 0.95) s3 = getRand(TRAITS_EPICO_S3);
  else s3 = getRand(TRAITS_LENDARIO_S3);

  // SLOT 4 (LEGADO): 25% chance of Fardo
  const s4 = pRand() < 0.25 ? getRand(TRAITS_FARDOS) : null;

  return {
    slot1: s1,
    slot2: s2,
    slot3: s3,
    slot4: s4,
    slot3Hidden: player.totalRating < 800
  };
};

const generateName = () => {
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const firstList = gender === 'M' ? firstNamesMale : firstNamesFemale;
  const first = firstList[randomInt(0, firstList.length - 1)];
  const last = lastNames[randomInt(0, lastNames.length - 1)];

  // Deterministic appearance based on name hash (so it stays the same)
  const seedStr = `${first}${last}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  return {
    name: `${first} ${last}`,
    nickname: `${first[0]}. ${last}`,
    appearance: {
      gender: gender as 'M' | 'F',
      bodyId: (absHash % 3) + 1, // 1, 2, 3
      hairId: (absHash % 6) + 1, // 1..6
      bootId: (absHash % 15) + 1 // 1..15
    }
  };
};

export const refillTeamRoster = (
  team: Team,
  targetPower: number,
  allPlayers: Record<string, Player>,
  district: District
): Player[] => {
  const currentSquad = team.squad.map(id => allPlayers[id]).filter(Boolean);
  const currentPower = currentSquad.reduce((sum, p) => sum + p.totalRating, 0);
  const neededPower = targetPower - currentPower;
  const neededPlayersCount = Math.max(0, 18 - currentSquad.length);

  if (neededPlayersCount <= 0) return [];

  const newPlayers: Player[] = [];
  // Distribute power among new players, ensuring a minimum rating of 250
  const powerPerPlayer = Math.max(250, Math.min(1000, Math.round(neededPower / neededPlayersCount)));

  for (let i = 0; i < neededPlayersCount; i++) {
    const id = `p_refill_${team.id}_${Date.now()}_${i}`;

    // Check if team already has a goalkeeper
    const hasGk = currentSquad.some(p => p.role === 'GOL') || newPlayers.some(p => p.role === 'GOL');
    let role: PlayerRole;

    if (!hasGk) {
      role = 'GOL';
    } else {
      const r = Math.random();
      if (r < 0.35) role = 'ZAG';
      else if (r < 0.7) role = 'MEI';
      else role = 'ATA';
    }

    const player = generatePlayer(id, district, powerPerPlayer, role);
    player.contract.teamId = team.id;
    newPlayers.push(player);
  }

  return newPlayers;
};

const generatePentagon = (): Pentagon => {
  // Base stats are now random/potential based since age is removed
  const base = randomInt(40, 65);
  return {
    FOR: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    AGI: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    INT: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    TAT: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
    TEC: Math.min(100, Math.max(0, base + randomInt(-20, 30))),
  };
};

const calculateFusions = (p: Pentagon, pos: PositionType): { fusions: FusionSkills, total: number } => {
  const fusions: any = {
    DET: p.FOR + p.INT,
    PAS: p.TAT + p.TEC,
  };

  let total = fusions.DET + fusions.PAS;

  if (pos === 'Linha') {
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

export const generateBadges = (totalRating: number): Badges => {
  // We use a dummy player object or just rating to trigger the new DNA logic
  // But actually, regenerateDNA needs a player ID for deterministic seeding.
  // Let's refactor generatePlayer to call regenerateDNA directly.
  return {
    slot1: null,
    slot2: null,
    slot3: null,
    slot4: null,
    slot3Hidden: true
  };
};

export const generatePlayer = (id: string, district: District, ratingOverride?: number, forcedRole?: PlayerRole): Player => {
  const { name, nickname, appearance } = generateName();

  let role: PlayerRole;
  if (forcedRole) {
    role = forcedRole;
  } else {
    // 10% chance for Goleiro if random
    if (Math.random() < 0.1) role = 'GOL';
    else {
      const r = Math.random();
      if (r < 0.35) role = 'ZAG';
      else if (r < 0.7) role = 'MEI';
      else role = 'ATA';
    }
  }

  const position: PositionType = role === 'GOL' ? 'Goleiro' : 'Linha';
  const pentagon = generatePentagon();
  const { fusions, total } = calculateFusions(pentagon, position);
  const baseRating = Math.max(200, Math.min(1000, ratingOverride ?? total));
  const badges = generateBadges(baseRating);
  const potential = Math.min(1000, baseRating + randomInt(40, 250));

  // Generate initial form history (3-5 games)
  const historyCount = randomInt(3, 5);
  const lastMatchRatings: number[] = [];
  for (let i = 0; i < historyCount; i++) {
    // Random rating between 4.0 and 9.5
    lastMatchRatings.push(Number((Math.random() * 5.5 + 4.0).toFixed(1)));
  }

  const player: Player = {
    id,
    name,
    nickname,
    appearance,
    district,
    position,
    role,
    pentagon,
    fusion: fusions,
    totalRating: baseRating,
    potential,
    currentPhase: 6.0,
    phaseHistory: lastMatchRatings.slice(0, 3),
    badges: { slot1: null, slot2: null, slot3: null, slot4: null, slot3Hidden: true }, // Placeholder
    contract: {
      teamId: null,
    },
    history: {
      goals: 0,
      assists: 0,
      averageRating: 0,
      gamesPlayed: 0,
      lastMatchRatings,
      benchGamesCount: 0,
      seasonRatingDelta: 0
    },
    satisfaction: randomInt(50, 100),
    trainingProgress: 0,
    fatigue: 0,
    achievements: []
  };

  player.badges = regenerateDNA(player);
  return player;
};

const teamNames = [
  'Neon NFC', 'Cyber NFC', 'Aero NFC', 'Pulse NFC', 'Zenith NFC', 'Glacier NFC', 'Astro NFC', 'Nova NFC',
  'Solar SFC', 'Forge SFC', 'Magma SFC', 'Iron SFC', 'Rust SFC', 'Apex SFC', 'Vulcan SFC', 'Ignite SFC',
  'Quantum EFC', 'Void EFC', 'Synapse EFC', 'Astral EFC', 'Cipher EFC', 'Nebula EFC', 'Vertex EFC', 'Core EFC',
  'Bio WFC', 'Terra WFC', 'Viper WFC', 'Eco WFC', 'Venom WFC', 'Nexus WFC', 'Toxic WFC', 'Grove WFC'
];

const teamTargets: Record<string, number> = {
  'Neon NFC': 13000,
  'Cyber NFC': 12200,
  'Aero NFC': 11000,
  'Pulse NFC': 10100,
  'Zenith NFC': 9500,
  'Glacier NFC': 8900,
  'Astro NFC': 8400,
  'Nova NFC': 8000,
  'Solar SFC': 13000,
  'Forge SFC': 12100,
  'Magma SFC': 11200,
  'Iron SFC': 10300,
  'Rust SFC': 9400,
  'Apex SFC': 8800,
  'Vulcan SFC': 8500,
  'Ignite SFC': 8000,
  'Bio WFC': 12800,
  'Terra WFC': 12000,
  'Viper WFC': 11500,
  'Eco WFC': 10200,
  'Venom WFC': 9600,
  'Nexus WFC': 8700,
  'Toxic WFC': 8300,
  'Grove WFC': 8100,
  'Quantum EFC': 12900,
  'Void EFC': 11900,
  'Synapse EFC': 10800,
  'Astral EFC': 10000,
  'Cipher EFC': 9300,
  'Nebula EFC': 8600,
  'Vertex EFC': 8200,
  'Core EFC': 8000,
};

const cities = ['Neo-Tokyo', 'Cyber-SP', 'New London', 'Mega-York', 'Neo-Paris', 'Tech-Berlin', 'Aero-Madrid', 'Synth-Rome', 'Nova-Rio', 'Apex-City'];

const getColorsForDistrict = (district: District) => {
  switch (district) {
    case 'NORTE': return { primary: '#00f2ff', secondary: '#7000ff' }; // Cyber Cyan / Electric Purple
    case 'SUL': return { primary: '#ff4d00', secondary: '#2e2e2e' }; // Neon Orange / Carbon Gray
    case 'LESTE': return { primary: '#00ff6a', secondary: '#5c3a21' }; // Matrix Green / Dark Wood
    case 'OESTE': return { primary: '#bf00ff', secondary: '#e2e2e2' }; // Deep Violet / Silver Chrome
    default: return { primary: '#ffffff', secondary: '#000000' };
  }
};

const logoPatterns: LogoPattern[] = [
  'none', 'stripes-v', 'stripes-h', 'diagonal', 'half-v', 'half-h', 'cross', 'circle',
  'checkered', 'waves', 'diamond', 'sunburst'
];
const logoSymbols = [
  'Shield', 'Star', 'Sword', 'Zap', 'Flame', 'Crown', 'Target', 'Anchor', 'Award',
  'Compass', 'Crosshair', 'Feather', 'Flag', 'Heart', 'Key', 'Leaf', 'Lightning',
  'Moon', 'Mountain', 'Rocket', 'Sun', 'Trophy', 'Wind', 'Gem', 'Skull', 'Ghost',
  'Fingerprint', 'Cpu', 'Activity', 'ShieldAlert', 'ShieldCheck', 'Radio', 'Telescope'
];

const generateLogo = (primary: string, secondary: string): TeamLogoMetadata => {
  const patternId = logoPatterns[randomInt(0, logoPatterns.length - 1)];
  const symbolId = logoSymbols[randomInt(0, logoSymbols.length - 1)];

  // 30% chance of having a secondary symbol
  const hasSecondary = Math.random() < 0.3;
  const secondarySymbolId = hasSecondary ? logoSymbols[randomInt(0, logoSymbols.length - 1)] : undefined;

  return {
    primary,
    secondary,
    patternId,
    symbolId,
    secondarySymbolId,
  };
};

const getLeagueForDistrict = (district: District): LeagueColor => {
  switch (district) {
    case 'NORTE': return 'Cyan';
    case 'SUL': return 'Orange';
    case 'LESTE': return 'Green';
    case 'OESTE': return 'Purple';
    default: return 'Cyan';
  }
};

export const generateTeam = (id: string, index: number, district: District): Team => {
  const colors = getColorsForDistrict(district);
  return {
    id,
    name: teamNames[index] || `Team ${index}`,
    city: cities[randomInt(0, cities.length - 1)],
    district,
    league: getLeagueForDistrict(district),
    colors,
    logo: generateLogo(colors.primary, colors.secondary),
    tactics: {
      playStyle: 'Equilibrado',
      mentality: 'Calculista',
      linePosition: 50,
      aggressiveness: 50,
      slots: [null, null, null],
      preferredFormation: ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'][randomInt(0, 3)],
    },
    managerId: null,
    squad: [],
    lineup: {},
    chemistry: 50,
    inventory: [
      { id: 'card_1', name: 'Ataque Total', type: 'BUFF', rarity: 'COMMON', effect: 'Aumenta o ataque em 10%' },
      { id: 'card_2', name: 'Muralha', type: 'BUFF', rarity: 'RARE', effect: 'Aumenta a defesa em 15%' },
      { id: 'card_3', name: 'Meio-Campo Criativo', type: 'BUFF', rarity: 'COMMON', effect: 'Aumenta o meio-campo em 10%' }
    ],
    powerCap: getLeagueForDistrict(district) === 'Cyan' ? 12000 : (getLeagueForDistrict(district) === 'Orange' || getLeagueForDistrict(district) === 'Purple') ? 10000 : 8000,
  };
};

const normalizeTeamSquadRating = (team: Team, players: Record<string, Player>, targetTotal: number) => {
  const currentTotal = team.squad.reduce((sum, playerId) => {
    const player = players[playerId];
    return sum + (player ? player.totalRating : 0);
  }, 0);

  if (currentTotal <= 0) return;
  const ratio = targetTotal / currentTotal;

  team.squad.forEach(playerId => {
    const player = players[playerId];
    if (!player) return;
    const newRating = Math.max(200, Math.min(1000, Math.round(player.totalRating * ratio)));
    player.totalRating = newRating;
    if (player.potential < newRating) {
      player.potential = Math.min(1000, newRating + randomInt(40, 250));
    }
  });
};

export const generateManager = (id: string, district: District): Manager => {
  const { name } = generateName();
  return {
    id,
    name,
    district,
    reputation: randomInt(10, 90),
    attributes: {
      evolution: randomInt(10, 100),
      negotiation: randomInt(10, 100),
      scout: randomInt(10, 100),
    },
    career: {
      titlesWon: randomInt(0, 5),
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: null,
      historyTeamIds: [],
    },
    achievements: []
  };
};

export const generateInitialState = (): GameState => {

  resetGeneratorSeed(); // FIXED BASE: Ensure every new game starts the same way
  const players: Record<string, Player> = {};
  const teams: Record<string, Team> = {};
  const managers: Record<string, Manager> = {};

  // Generate 32 teams (8 per district/league)
  let teamIndex = 1;
  let globalTeamNameIndex = 0;

  districts.forEach((district) => {
    for (let i = 0; i < 8; i++) {
      const id = `t_${teamIndex}`;
      teams[id] = generateTeam(id, globalTeamNameIndex, district);
      teamIndex++;
      globalTeamNameIndex++;
    }
  });

  // Generate District Selection Teams (Seleções)
  const districtTeams: Record<District, string> = {
    'NORTE': 'Seleção do Norte',
    'SUL': 'Seleção do Sul',
    'LESTE': 'Seleção do Leste',
    'OESTE': 'Seleção do Oeste',
    'EXILADO': 'Seleção dos Exilados' // Should not happen but for safety
  };

  districts.forEach(district => {
    const id = `d_${district.toLowerCase()}`;
    const colors = getColorsForDistrict(district);
    teams[id] = {
      id,
      name: districtTeams[district],
      city: `${district} Capital`,
      district,
      league: getLeagueForDistrict(district),
      colors,
      logo: generateLogo(colors.primary, colors.secondary),
      tactics: { playStyle: 'Vertical', preferredFormation: '4-3-3' },
      managerId: null,
      squad: [],
      lineup: {},
      powerCap: 13000 // Selection teams have max cap
    };
  });

  // Generate 40 managers
  let managerIndex = 1;
  districts.forEach((district) => {
    for (let i = 0; i < 10; i++) {
      const id = `m_${managerIndex}`;
      managers[id] = generateManager(id, district);
      managerIndex++;
    }
  });

  // Assign managers to club teams only, leave district selections and 4 specific clubs vacant
  const clubs = Object.keys(teams).filter(id => id.startsWith('t_'));
  const vacantClubIds = clubs.slice(-4); // Last 4 clubs will be vacant for Heir path

  clubs.forEach((teamId, index) => {
    if (vacantClubIds.includes(teamId)) return;

    const managerId = `m_${index + 1}`;
    teams[teamId].managerId = managerId;
    managers[managerId].career.currentTeamId = teamId;
  });

  // Use the new seedUniverse script to handle 1000 players and Cap-based distribution
  const { players: seededPlayers, teams: seededTeams } = seedUniverse(Object.values(teams), _seed);

  // Merge seeded data back into the state structures
  Object.keys(seededPlayers).forEach(id => { players[id] = seededPlayers[id]; });
  Object.keys(seededTeams).forEach(id => { teams[id] = seededTeams[id]; });

  // Setup Leagues
  const teamList = Object.values(teams);
  // Filter only club teams (starting with t_) for leagues to ensure 8 teams (even number)
  const allClubs = teamList.filter(t => t.id.startsWith('t_'));

  const norteTeamObjs = allClubs.filter(t => t.district === 'NORTE');
  const sulTeamObjs = allClubs.filter(t => t.district === 'SUL');
  const lesteTeamObjs = allClubs.filter(t => t.district === 'LESTE');
  const oesteTeamObjs = allClubs.filter(t => t.district === 'OESTE');

  const norteTeams = norteTeamObjs.map(t => t.id);
  const sulTeams = sulTeamObjs.map(t => t.id);
  const lesteTeams = lesteTeamObjs.map(t => t.id);
  const oesteTeams = oesteTeamObjs.map(t => t.id);

  const createStandings = (tIds: string[]): LeagueTeamStats[] => {
    return tIds.map(id => ({
      teamId: id,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    }));
  };

  // Season starts tomorrow in the 2050 game world
  const gameNow = getGameDate2050();
  const nextDay = new Date(gameNow);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(0, 0, 0, 0);
  const seasonStartReal = nextDay.toISOString();

  return {
    players,
    teams,
    managers,
    world: {
      status: 'LOBBY',
      leagues: {
        norte: {
          id: 'l_cyan',
          name: 'Liga Norte (NFC)',
          standings: createStandings(norteTeams),
          matches: generateCalendar(norteTeamObjs, 'l_cyan', seasonStartReal),
          difficulty: 'Normal',
        },
        sul: {
          id: 'l_orange',
          name: 'Liga Sul (SFC)',
          standings: createStandings(sulTeams),
          matches: generateCalendar(sulTeamObjs, 'l_orange', seasonStartReal),
          difficulty: 'Normal',
        },
        leste: {
          id: 'l_green',
          name: 'Liga Leste (EFC)',
          standings: createStandings(lesteTeams),
          matches: generateCalendar(lesteTeamObjs, 'l_green', seasonStartReal),
          difficulty: 'Normal',
        },
        oeste: {
          id: 'l_purple',
          name: 'Liga Oeste (WFC)',
          standings: createStandings(oesteTeams),
          matches: generateCalendar(oesteTeamObjs, 'l_purple', seasonStartReal),
          difficulty: 'Normal',
        },
      },
      eliteCup: {
        round: 0,
        teams: [],
        bracket: {
          round1: [],
          quarters: [],
          semis: [],
          final: null
        },
        winnerId: null
      },
      districtCup: {
        round: 0,
        teams: [],
        standings: [],
        matches: [],
        final: null,
        winnerId: null
      },
      phase: 'REGULAR_SEASON',
      news: [],
      history: [],
      transferWindowOpen: true,
      rank1000PlayerId: null,
      currentSeason: 2050,
      currentDay: -1,
      currentRound: 1,
      currentDate: gameNow.toISOString(),
      seasonStartReal: seasonStartReal,
      isInitialSeed: true, // Marker for first run
    },
    worldId: 'default',
    userTeamId: null,
    userManagerId: null,
    lastHeadline: {
      title: "Pré-Temporada",
      message: "Tudo preparado para a formação de elencos e treinamentos. O campeonato aguarda a largada oficial."
    },
    notifications: [],
    training: {
      chemistryBoostLastUsed: undefined,
      playstyleTraining: {
        currentStyle: null,
        understanding: {
          'Blitzkrieg': 0,
          'Tiki-Taka': 0,
          'Retranca Armada': 0,
          'Motor Lento': 0,
          'Equilibrado': 20,
          'Gegenpressing': 0,
          'Catenaccio': 0,
          'Vertical': 0
        }
      },
      cardLaboratory: {
        slots: [
          { cardId: null, finishTime: null },
          { cardId: null, finishTime: null }
        ]
      },
      individualFocus: {
        evolutionSlot: null,
        stabilizationSlot: null
      }
    }
  };
};
