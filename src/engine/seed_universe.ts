import { FusionSkills, Pentagon, Player, Team, District, PlayerRole, PositionType } from '../types';
import { regenerateDNA } from './generator';
import { HAIR_COUNT_BY_GENDER } from '../constants/avatarAssets';

// --- Seeded Random Engine (Internal for Seeding) ---
let _seed = 1234567;
export const resetSeed = () => {
    _seed = 1234567;
};
const mulberry32 = (a: number) => {
    return () => {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
};
let rand = mulberry32(_seed);

const randomInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const randomFloat = () => rand();

const TIERS = {
    S: { min: 900, max: 1000, count: 8 },
    A: { min: 800, max: 899, count: 42 },
    B: { min: 700, max: 799, count: 140 },
    C: { min: 520, max: 699, count: 330 },
    D: { min: 400, max: 519, count: 220 }
};

const SHADOW_POOL_COUNT = 260;
const CURRENT_SEASON = 2050;
const GIVEN_NAMES_2050 = [
    'Kael', 'Ivo', 'Noa', 'Niko', 'Lio', 'Teo', 'Rian', 'Milo', 'Soren', 'Kian', 'Ari', 'Eron',
    'Vico', 'Ryo', 'Ilan', 'Rin', 'Tavi', 'Ezra', 'Nilo', 'Koa', 'Levi', 'Oren', 'Zev', 'Ciro',
    'Zara', 'Mira', 'Ayla', 'Nia', 'Luma', 'Kira', 'Suri', 'Iris', 'Mina', 'Vela', 'Juno', 'Rina',
    'Yara', 'Nyra', 'Lia', 'Anya', 'Sora', 'Maia', 'Veda', 'Elin', 'Nara', 'Liora', 'Tala', 'Uma'
];

const DISTRICT_SURNAMES_2050: Record<District, string[]> = {
    NORTE: ['Voss', 'Kade', 'Soren', 'Vale', 'Ivar', 'Nyra', 'Fenn', 'Calder', 'Skarn', 'Vail', 'Holt', 'Neris'],
    SUL: ['Vega', 'Ravel', 'Drax', 'Varga', 'Nero', 'Mako', 'Sol', 'Kross', 'Ruan', 'Daren', 'Malik', 'Torr'],
    LESTE: ['Sato', 'Haru', 'Ren', 'Akari', 'Zhen', 'Onari', 'Sen', 'Kaizen', 'Mori', 'Aoki', 'Lien', 'Tao'],
    OESTE: ['Arken', 'Nox', 'Corvin', 'Vey', 'Orion', 'Lior', 'Rial', 'Senda', 'Varyn', 'Oryn', 'Aster', 'Quill'],
    EXILADO: ['Null', 'Vanta', 'Rook', 'Ash', 'Drift', 'Cairn', 'Hex', 'Morrow', 'Rift', 'Vale', 'Kade', 'Nox'],
};

const ELITE_ALIASES_2050 = ['Zero', 'Flux', 'Corte', 'Nexus', 'Vanta', 'Pulse', 'Apex', 'Ghost', 'Nova', 'Rift', 'Halo', 'Prime'];

const getRoleProduction = (role: PlayerRole, rating: number, games: number) => {
    const ratingFactor = Math.max(0.45, rating / 720);
    const goalsRate = role === 'ATA' ? 0.34 : role === 'MEI' ? 0.18 : role === 'ZAG' ? 0.05 : 0.01;
    const assistsRate = role === 'MEI' ? 0.28 : role === 'ATA' ? 0.16 : role === 'ZAG' ? 0.08 : 0.02;

    return {
        goals: Math.max(0, Math.round(games * goalsRate * ratingFactor + randomInt(-2, 4))),
        assists: Math.max(0, Math.round(games * assistsRate * ratingFactor + randomInt(-2, 4))),
    };
};

const buildCareerHistory = (role: PlayerRole, rating: number, isExiled: boolean): Player['history'] => {
    const careerGamesPlayed = randomInt(isExiled ? 18 : 28, isExiled ? 110 : 180);
    const production = getRoleProduction(role, rating, careerGamesPlayed);
    const careerAverageRating = Number((5.75 + Math.min(2.35, Math.max(0, (rating - 430) / 270)) + (randomFloat() - 0.5) * 0.28).toFixed(2));
    const legacyTags = isExiled
        ? ['Renascido do circuito', 'Nome de rua', 'Aposta de mercado', 'Exilado valioso']
        : ['Joia lapidada', 'Veterano de arena', 'Especialista tatico', 'Criado em base forte', 'Nome de vestiario', 'Titular confiavel'];
    const snapshotCount = randomInt(2, 4);
    const firstRating = Math.max(260, rating - randomInt(35, 140));
    const seasonSnapshots = Array.from({ length: snapshotCount }, (_, index) => {
        const season = CURRENT_SEASON - snapshotCount + index;
        const start = Math.round(firstRating + ((rating - firstRating) * index) / snapshotCount);
        const end = index === snapshotCount - 1
            ? Math.max(start, rating - randomInt(0, 28))
            : Math.round(firstRating + ((rating - firstRating) * (index + 1)) / snapshotCount);
        const games = Math.max(5, Math.round(careerGamesPlayed / snapshotCount) + randomInt(-5, 6));
        const seasonProduction = getRoleProduction(role, Math.round((start + end) / 2), games);

        return {
            season,
            teamId: null,
            teamName: index === 0 ? 'Circuito Base' : (isExiled ? 'Rota Exilada' : 'Clube anterior'),
            ratingStart: start,
            ratingEnd: end,
            ratingDelta: end - start,
            gamesPlayed: games,
            goals: seasonProduction.goals,
            assists: seasonProduction.assists,
            averageRating: Number((careerAverageRating + (randomFloat() - 0.5) * 0.38).toFixed(2)),
            satisfaction: randomInt(isExiled ? 42 : 52, 94),
        };
    });

    return {
        goals: 0,
        assists: 0,
        averageRating: 0,
        gamesPlayed: 0,
        lastMatchRatings: Array.from({ length: randomInt(3, 5) }, () => Number((4.4 + randomFloat() * 4.8).toFixed(1))),
        benchGamesCount: 0,
        seasonRatingDelta: 0,
        careerGoals: production.goals,
        careerAssists: production.assists,
        careerGamesPlayed,
        careerAverageRating,
        peakRating: Math.min(1000, rating + randomInt(0, isExiled ? 22 : 45)),
        legacyTag: legacyTags[randomInt(0, legacyTags.length - 1)],
        formerClubCount: randomInt(isExiled ? 1 : 0, isExiled ? 5 : 4),
        ratingSeasonStart: rating,
        seasonSnapshots,
        clubEvents: []
    };
};

const buildPentagonFromRating = (rating: number, role: PlayerRole): Pentagon => {
    const base = Math.max(38, Math.min(96, Math.round(rating / 10)));
    const roleBias: Record<PlayerRole, Partial<Record<keyof Pentagon, number>>> = {
        GOL: { AGI: 8, INT: 5, FOR: 2, TAT: 1, TEC: -3 },
        ZAG: { FOR: 8, TAT: 5, INT: 2, AGI: -2, TEC: -1 },
        MEI: { TEC: 7, TAT: 6, INT: 4, AGI: 1, FOR: -3 },
        ATA: { TEC: 7, AGI: 5, FOR: 3, INT: 1, TAT: -2 },
    };

    const buildValue = (key: keyof Pentagon) => Math.max(18, Math.min(100, base + (roleBias[role][key] || 0) + randomInt(-12, 12)));

    return {
        FOR: buildValue('FOR'),
        AGI: buildValue('AGI'),
        INT: buildValue('INT'),
        TAT: buildValue('TAT'),
        TEC: buildValue('TEC'),
    };
};

const normalizePentagonToRating = (pentagon: Pentagon, rating: number): Pentagon => {
    const keys: (keyof Pentagon)[] = ['FOR', 'AGI', 'INT', 'TAT', 'TEC'];
    const targetSum = Math.max(90, Math.min(500, Math.round(rating / 2)));
    const currentSum = keys.reduce((sum, key) => sum + pentagon[key], 0);
    const scale = targetSum / Math.max(1, currentSum);
    const normalized = keys.reduce((acc, key) => {
        acc[key] = Math.max(18, Math.min(100, Math.round(pentagon[key] * scale)));
        return acc;
    }, {} as Pentagon);

    let diff = targetSum - keys.reduce((sum, key) => sum + normalized[key], 0);
    let guard = 0;
    while (diff !== 0 && guard < 80) {
        for (const key of keys) {
            if (diff === 0) break;
            if (diff > 0 && normalized[key] < 100) {
                normalized[key] += 1;
                diff -= 1;
            } else if (diff < 0 && normalized[key] > 18) {
                normalized[key] -= 1;
                diff += 1;
            }
        }
        guard += 1;
    }

    return normalized;
};

const calculateFusions = (p: Pentagon, position: PositionType): FusionSkills => ({
    DET: p.FOR + p.INT,
    PAS: p.TAT + p.TEC,
    DRI: position === 'Linha' ? p.AGI + p.INT : undefined,
    FIN: position === 'Linha' ? p.FOR + p.TEC : undefined,
    MOV: position === 'Linha' ? p.AGI + p.TAT : undefined,
    REF: position === 'Goleiro' ? p.AGI + p.INT : undefined,
    DEF: position === 'Goleiro' ? p.FOR + p.TEC : undefined,
    POS: position === 'Goleiro' ? p.AGI + p.TAT : undefined,
});

const pickRole = (): PlayerRole => {
    const roll = rand();
    if (roll < 0.11) return 'GOL';
    if (roll < 0.45) return 'ZAG';
    if (roll < 0.76) return 'MEI';
    return 'ATA';
};

const buildPlayerName = (district: District, totalRating: number) => {
    const first = GIVEN_NAMES_2050[randomInt(0, GIVEN_NAMES_2050.length - 1)];
    const surnames = DISTRICT_SURNAMES_2050[district] || DISTRICT_SURNAMES_2050.EXILADO;
    const last = surnames[randomInt(0, surnames.length - 1)];
    const eliteAliasChance = totalRating >= 900 ? 0.68 : totalRating >= 820 ? 0.22 : 0.04;
    const useAlias = rand() < eliteAliasChance;
    const alias = ELITE_ALIASES_2050[randomInt(0, ELITE_ALIASES_2050.length - 1)];

    return {
        name: `${first} ${last}`,
        nickname: useAlias ? `${first} ${alias}` : first,
    };
};

const generatePlayer = (tier: keyof typeof TIERS | 'EXILED', id?: string): Player => {
    const isExiled = tier === 'EXILED';
    const range = isExiled ? { min: 520, max: 780 } : TIERS[tier];
    const rating = randomInt(range.min, range.max);

    const role = pickRole();
    const position: PositionType = role === 'GOL' ? 'Goleiro' : 'Linha';
    const gender = rand() < 0.5 ? 'M' : 'F';
    const pentagon = normalizePentagonToRating(buildPentagonFromRating(rating, role), rating);
    const fusion = calculateFusions(pentagon, position);
    const totalRating = Math.min(1000, Object.values(fusion).reduce((sum, value) => sum + (value || 0), 0));
    const district = isExiled ? 'EXILADO' : (['NORTE', 'SUL', 'LESTE', 'OESTE'][Math.floor(rand() * 4)] as District);
    const { name, nickname } = buildPlayerName(district, totalRating);

    const player: Player = {
        id: id || Math.random().toString(36).substring(2, 11),
        name,
        nickname,
        originDistrict: district,
        district,
        appearance: {
            gender,
            bodyId: randomInt(1, 3),
            hairId: randomInt(1, HAIR_COUNT_BY_GENDER[gender]),
            bootId: randomInt(1, 2)
        },
        position,
        role,
        pentagon,
        fusion,
        totalRating,
        potential: Math.min(1000, totalRating + Math.floor(rand() * 100)),
        currentPhase: 6.0,
        phaseHistory: [],
        badges: { slot1: null, slot2: null, slot3: null, slot4: null, slot3Hidden: true },
        contract: { teamId: null },
        history: buildCareerHistory(role, totalRating, isExiled),
        satisfaction: 70,
        trainingProgress: 0,
        fatigue: 0,
        achievements: []
    };

    // LOCK DNA
    player.badges = regenerateDNA(player);
    return player;
};

export const seedUniverse = (teams: Team[], seed: number = 1234567): { players: Record<string, Player>, teams: Record<string, Team> } => {
    _seed = seed;
    rand = mulberry32(_seed);

    const playerPool: Player[] = [];

    // 1. Generate active players based on Tiers
    Object.keys(TIERS).forEach(tierKey => {
        const tier = tierKey as keyof typeof TIERS;
        for (let i = 0; i < TIERS[tier].count; i++) {
            playerPool.push(generatePlayer(tier, `p_${tier}_${i}`));
        }
    });

    // 2. Generate exiled/shadow players
    for (let i = 0; i < SHADOW_POOL_COUNT; i++) {
        playerPool.push(generatePlayer('EXILED', `p_exiled_${i}`));
    }

    // 3. Prepare Teams
    const sortedTeams = [...teams];
    type ClubProfile = 'POWERHOUSE' | 'CONTENDER' | 'STABLE' | 'REBUILD';
    const getProfile = (index: number): ClubProfile => {
        if (index < 6) return 'POWERHOUSE';
        if (index < 16) return 'CONTENDER';
        if (index < 26) return 'STABLE';
        return 'REBUILD';
    };
    const profileConfig: Record<ClubProfile, { cap: number; target: number; minPower: number; starSlots: number; preferredMin: number; preferredMax: number }> = {
        POWERHOUSE: { cap: 11600, target: 11100, minPower: 10800, starSlots: 3, preferredMin: 620, preferredMax: 1000 },
        CONTENDER: { cap: 10600, target: 10100, minPower: 9600, starSlots: 2, preferredMin: 590, preferredMax: 880 },
        STABLE: { cap: 9600, target: 8900, minPower: 8200, starSlots: 0, preferredMin: 520, preferredMax: 780 },
        REBUILD: { cap: 8800, target: 7800, minPower: 7200, starSlots: 0, preferredMin: 500, preferredMax: 700 },
    };

    const teamStates: Record<string, Team> = {};
    const playerStates: Record<string, Player> = {};

    // 4. Draft Logic
    const activePlayers = playerPool.filter(p => p.district !== 'EXILADO').sort((a, b) => b.totalRating - a.totalRating);
    const marketReserve: Player[] = [];
    const reserveRange = (min: number, max: number, count: number) => {
        for (let i = 0; i < count; i++) {
            const index = activePlayers.findIndex(p => p.totalRating >= min && p.totalRating <= max);
            if (index === -1) return;
            marketReserve.push(activePlayers.splice(index, 1)[0]);
        }
    };

    reserveRange(800, 849, 6);
    reserveRange(700, 799, 30);
    reserveRange(620, 699, 42);
    reserveRange(520, 619, 30);

    const faPlayers = activePlayers;

    const takeBestFit = (maxRating: number, minRating = 0) => {
        const index = faPlayers.findIndex(p => p.totalRating <= maxRating && p.totalRating >= minRating);
        if (index !== -1) return faPlayers.splice(index, 1)[0];
        const fallbackIndex = faPlayers.findIndex(p => p.totalRating <= maxRating);
        if (fallbackIndex !== -1) return faPlayers.splice(fallbackIndex, 1)[0];
        return faPlayers.pop();
    };

    const allocatePlayers = (team: Team, profile: ClubProfile) => {
        const squad: string[] = [];
        const config = profileConfig[profile];
        let cap = config.cap;
        team.powerCap = cap;

        for (let i = 0; i < config.starSlots; i++) {
            const p = faPlayers.shift();
            if (p) {
                p.contract.teamId = team.id;
                squad.push(p.id);
                playerStates[p.id] = p;
            }
        };

        if (profile === 'STABLE' || profile === 'REBUILD') {
            const symbol = profile === 'STABLE' ? takeBestFit(820, 700) : takeBestFit(760, 660);
            if (symbol) {
                symbol.contract.teamId = team.id;
                squad.push(symbol.id);
                playerStates[symbol.id] = symbol;
            }
        }

        while (squad.length < 15 && faPlayers.length > 0) {
            const currentTotal = squad.reduce((sum, id) => sum + (playerStates[id]?.totalRating || 0), 0);
            const remaining = 15 - squad.length;
            const targetAverage = Math.round((config.target - currentTotal) / remaining);
            const maxAllowedPerPlayer = Math.min(config.preferredMax, Math.max(config.preferredMin, targetAverage + 70));
            const minAllowedPerPlayer = Math.max(config.preferredMin, targetAverage - 95);
            const p = takeBestFit(maxAllowedPerPlayer, minAllowedPerPlayer);
            if (!p) break;

            p.contract.teamId = team.id;
            squad.push(p.id);
            playerStates[p.id] = p;
        }

        let finalPower = squad.reduce((sum, id) => sum + (playerStates[id]?.totalRating || 0), 0);
        if (finalPower < config.minPower && squad.length > 0) {
            let missing = config.minPower - finalPower;
            const sortedForLift = [...squad]
                .map(id => playerStates[id])
                .filter(Boolean)
                .sort((a, b) => a.totalRating - b.totalRating);

            for (const player of sortedForLift) {
                if (missing <= 0) break;
                const gain = Math.min(45, missing, 1000 - player.totalRating);
                player.totalRating += gain;
                player.potential = Math.max(player.potential, Math.min(1000, player.totalRating + randomInt(20, 90)));
                player.history.ratingSeasonStart = player.totalRating;
                player.history.peakRating = Math.max(player.history.peakRating || player.totalRating, player.totalRating);
                missing -= gain;
            }

            finalPower = squad.reduce((sum, id) => sum + (playerStates[id]?.totalRating || 0), 0);
        }

        team.legacy = {
            seasonsPlayed: randomInt(4, 15),
            peakScore: Math.max(finalPower, config.target + randomInt(profile === 'REBUILD' ? 600 : 100, profile === 'POWERHOUSE' ? 1500 : 900)),
            scoreDeltaAllTime: finalPower - config.target + randomInt(-180, 260),
            tacticalMastery: {
                [team.tactics.playStyle]: randomInt(profile === 'POWERHOUSE' ? 58 : 34, profile === 'REBUILD' ? 68 : 82),
            },
            signatureStyle: team.tactics.playStyle,
        };

        team.squad = squad;
        const sortedSquad = [...squad].map(id => playerStates[id]).sort((a, b) => b.totalRating - a.totalRating);
        team.lineup = {
            'GOL': sortedSquad.find(p => p.role === 'GOL')?.id || sortedSquad[0].id,
            'ZAG1': sortedSquad.filter(p => p.role === 'ZAG')[0]?.id || sortedSquad[1].id,
            'ZAG2': sortedSquad.filter(p => p.role === 'ZAG')[1]?.id || sortedSquad[2].id,
            'MEI1': sortedSquad.filter(p => p.role === 'MEI')[0]?.id || sortedSquad[3].id,
            'MEI2': sortedSquad.filter(p => p.role === 'MEI')[1]?.id || sortedSquad[4].id,
            'ATA1': sortedSquad.filter(p => p.role === 'ATA')[0]?.id || sortedSquad[5].id
        };

        teamStates[team.id] = team;
    };

    sortedTeams.filter(t => t.id.startsWith('t_')).forEach((team, index) => allocatePlayers(team, getProfile(index)));

    faPlayers.forEach(p => { playerStates[p.id] = p; });
    marketReserve.forEach(p => { playerStates[p.id] = p; });
    playerPool.filter(p => p.district === 'EXILADO').forEach(p => { playerStates[p.id] = p; });

    return { players: playerStates, teams: teamStates };
};

