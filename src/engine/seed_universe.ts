import { Player, Team, District, PlayerRole, PositionType } from '../types';
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

const TIERS = {
    S: { min: 900, max: 1000, count: 10 },
    A: { min: 800, max: 899, count: 40 },
    B: { min: 700, max: 799, count: 150 },
    C: { min: 500, max: 699, count: 300 },
    D: { min: 400, max: 499, count: 200 }
};

const SHADOW_POOL_COUNT = 300;
const NICKNAMES = [
    'Zeca', 'Manto', 'Faisca', 'Sombra', 'Relâmpago', 'Titã', 'Muralha', 'Falcão', 'Serpente', 'Lobo',
    'Pantera', 'Dragão', 'Fênix', 'Trovão', 'Furacão', 'Vortex', 'Kaiser', 'Czar', 'Duque', 'Barão',
    'Samurai', 'Ninja', 'Ronin', 'Shogun', 'Sensei', 'Mestre', 'Aprendiz', 'Guerreiro', 'Bárbaro', 'Paladino'
];

const LAST_NAMES = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
    'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa'
];

const generatePlayer = (tier: keyof typeof TIERS | 'EXILED', id?: string): Player => {
    const isExiled = tier === 'EXILED';
    const range = isExiled ? { min: 400, max: 400 } : TIERS[tier];
    const rating = randomInt(range.min, range.max);

    const roles: PlayerRole[] = ['GOL', 'ZAG', 'MEI', 'ATA'];
    const role = roles[Math.floor(rand() * roles.length)];
    const position: PositionType = role === 'GOL' ? 'Goleiro' : 'Linha';

    const nickname = NICKNAMES[Math.floor(rand() * NICKNAMES.length)] + ' ' + (Math.floor(rand() * 99));
    const name = nickname + ' ' + LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const gender = rand() < 0.5 ? 'M' : 'F';

    const player: Player = {
        id: id || Math.random().toString(36).substring(2, 11),
        name,
        nickname,
        district: isExiled ? 'EXILADO' : (['NORTE', 'SUL', 'LESTE', 'OESTE'][Math.floor(rand() * 4)] as District),
        appearance: {
            gender,
            bodyId: randomInt(1, 3),
            hairId: randomInt(1, HAIR_COUNT_BY_GENDER[gender]),
            bootId: randomInt(1, 2)
        },
        position,
        role,
        pentagon: {
            FOR: Math.floor(rating / 10),
            AGI: Math.floor(rating / 10),
            INT: Math.floor(rating / 10),
            TAT: Math.floor(rating / 10),
            TEC: Math.floor(rating / 10)
        },
        fusion: {
            DET: Math.floor(rating / 10 * 2),
            PAS: Math.floor(rating / 10 * 2),
            // Note: In generator.ts, fusions are sums of pentagon stats (2 stats each)
            // For simplicity in seeding, we multiply by 2 to match the scale
            DRI: position === 'Linha' ? Math.floor(rating / 10 * 2) : undefined,
            FIN: position === 'Linha' ? Math.floor(rating / 10 * 2) : undefined,
            MOV: position === 'Linha' ? Math.floor(rating / 10 * 2) : undefined,
            REF: position === 'Goleiro' ? Math.floor(rating / 10 * 2) : undefined,
            DEF: position === 'Goleiro' ? Math.floor(rating / 10 * 2) : undefined,
            POS: position === 'Goleiro' ? Math.floor(rating / 10 * 2) : undefined,
        } as any,
        totalRating: rating,
        potential: Math.min(1000, rating + Math.floor(rand() * 100)),
        currentPhase: 6.0,
        phaseHistory: [],
        badges: { slot1: null, slot2: null, slot3: null, slot4: null, slot3Hidden: true },
        contract: { teamId: null },
        history: {
            goals: 0,
            assists: 0,
            averageRating: 0,
            gamesPlayed: 0,
            lastMatchRatings: [],
            benchGamesCount: 0,
            seasonRatingDelta: 0
        },
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

    // 1. Generate 700 active players based on Tiers
    Object.keys(TIERS).forEach(tierKey => {
        const tier = tierKey as keyof typeof TIERS;
        for (let i = 0; i < TIERS[tier].count; i++) {
            playerPool.push(generatePlayer(tier));
        }
    });

    // 2. Generate 300 Exiled players
    for (let i = 0; i < SHADOW_POOL_COUNT; i++) {
        playerPool.push(generatePlayer('EXILED'));
    }

    // 3. Prepare Teams
    const sortedTeams = [...teams];
    const teamRoles = {
        ELITE: sortedTeams.slice(0, 8),
        AVERAGE: sortedTeams.slice(8, 24),
        REBUILD: sortedTeams.slice(24, 32)
    };

    const teamStates: Record<string, Team> = {};
    const playerStates: Record<string, Player> = {};

    // 4. Draft Logic
    const activePlayers = playerPool.filter(p => p.district !== 'EXILADO').sort((a, b) => b.totalRating - a.totalRating);
    const faPlayers = activePlayers;

    const allocatePlayers = (team: Team, type: 'ELITE' | 'AVERAGE' | 'REBUILD') => {
        const squad: string[] = [];
        let cap = type === 'ELITE' ? 10700 : type === 'AVERAGE' ? 9500 : 9000;
        team.powerCap = cap;

        if (type === 'ELITE') {
            const starCount = 3;
            for (let i = 0; i < starCount; i++) {
                const p = faPlayers.shift();
                if (p) {
                    p.contract.teamId = team.id;
                    squad.push(p.id);
                    playerStates[p.id] = p;
                }
            }
        } else if (type === 'AVERAGE') {
            const startIdx = faPlayers.findIndex(p => p.totalRating < 800);
            const pIdx = startIdx !== -1 ? startIdx : 0;
            const p = faPlayers.splice(pIdx, 1)[0];
            if (p) {
                p.contract.teamId = team.id;
                squad.push(p.id);
                playerStates[p.id] = p;
            }
        }

        while (squad.length < 15 && faPlayers.length > 0) {
            const currentTotal = squad.reduce((sum, id) => sum + (playerStates[id]?.totalRating || 0), 0);
            const remaining = 15 - squad.length;
            const maxAllowedPerPlayer = type === 'REBUILD' ? 440 : (cap - currentTotal) / remaining;

            const pIdx = faPlayers.findIndex(p => {
                const fitsCap = p.totalRating <= maxAllowedPerPlayer;
                const isTooGoodForRebuild = type === 'REBUILD' && p.totalRating >= 600;
                return fitsCap && !isTooGoodForRebuild;
            });

            const finalIdx = pIdx !== -1 ? pIdx : faPlayers.length - 1;
            const p = faPlayers.splice(finalIdx, 1)[0];

            p.contract.teamId = team.id;
            squad.push(p.id);
            playerStates[p.id] = p;
        }

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

    teamRoles.ELITE.forEach(t => allocatePlayers(t, 'ELITE'));
    teamRoles.AVERAGE.forEach(t => allocatePlayers(t, 'AVERAGE'));
    teamRoles.REBUILD.forEach(t => allocatePlayers(t, 'REBUILD'));

    faPlayers.forEach(p => { playerStates[p.id] = p; });
    playerPool.filter(p => p.district === 'EXILADO').forEach(p => { playerStates[p.id] = p; });

    return { players: playerStates, teams: teamStates };
};

