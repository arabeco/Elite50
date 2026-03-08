import { generateInitialState } from './src/engine/generator';
import { advanceGameDay, startNewSeason } from './src/engine/gameLogic';
import { GameState, Team, Player, Match } from './src/types';
import { deleteSavedState } from './src/engine/persistence';

// Protocolo de Auditoria ELITE 2050
console.log('=== PROTOCOLO DE AUDITORIA E SIMULAÇÃO REAL: ELITE 2050 ===\n');

// --- PERSISTENCE HANDLING ---
const forceReset = process.argv.includes('--force-reset');
if (forceReset) {
    deleteSavedState();
}

let state: GameState = generateInitialState();

// Only set to ACTIVE if it's the initial seed (new game)
if (state.world.isInitialSeed) {
    state.world.status = 'ACTIVE';
}

const teamIds = Object.keys(state.teams);
// Select 1 Elite, 1 Average, 1 Rebuild based on initial powerCap (or close to it if resuming)
const eliteTeamId = teamIds.find(id => state.teams[id].powerCap >= 10600 && id.startsWith('t_'))!;
const avgTeamId = teamIds.find(id => state.teams[id].powerCap >= 9400 && state.teams[id].powerCap <= 9600 && id.startsWith('t_'))!;
const rebuildTeamId = teamIds.find(id => state.teams[id].powerCap <= 9100 && id.startsWith('t_'))!;

if (!eliteTeamId || !avgTeamId || !rebuildTeamId) {
    console.error(`[AUDIT] Falha ao selecionar times para rastreio: Elite=${eliteTeamId}, Avg=${avgTeamId}, Rebuild=${rebuildTeamId}`);
    process.exit(1);
}

const trackedTeams = [eliteTeamId, avgTeamId, rebuildTeamId];
const teamInitialCaps: Record<string, number> = {};
const teamMatchHistory: Record<string, any[]> = {};
const teamTransfers: Record<string, string[]> = {};

// Select 2 players per team
const trackedPlayers: string[] = [];
const playerHistory: Record<string, { initialRating: number, matches: any[] }> = {};

trackedTeams.forEach(tid => {
    const team = state.teams[tid];
    teamInitialCaps[tid] = team.powerCap || 0;
    teamMatchHistory[tid] = [];
    teamTransfers[tid] = [];

    const pIds = team.squad.slice(0, 2);
    pIds.forEach(pid => {
        trackedPlayers.push(pid);
        playerHistory[pid] = {
            initialRating: state.players[pid].totalRating,
            matches: []
        };
    });
});

console.log(`[AUDIT] Times Selecionados:`);
trackedTeams.forEach(tid => console.log(` - ${state.teams[tid].name} (${tid.includes('elite') ? 'ELITE' : tid.includes('rebuild') ? 'REBUILD' : 'AVERAGE'}) | Cap Inicial: ${teamInitialCaps[tid]}`));
console.log('');

// --- Simulation Loop (45 Days) ---
for (let day = 1; day <= 45; day++) {
    const prevStateStr = JSON.stringify(state);
    state = advanceGameDay(state, false);
    const prevState = JSON.parse(prevStateStr) as GameState;

    const phase = state.world.phase;
    const date = state.world.currentDate;
    const dateYMD = date.split('T')[0];

    // Record Matches for tracked teams
    const allMatches: Match[] = [];
    Object.values(state.world.leagues).forEach(l => allMatches.push(...l.matches));
    if (state.world.eliteCup.bracket) {
        allMatches.push(...state.world.eliteCup.bracket.round1);
        allMatches.push(...state.world.eliteCup.bracket.quarters);
        allMatches.push(...state.world.eliteCup.bracket.semis);
        if (state.world.eliteCup.bracket.final) allMatches.push(state.world.eliteCup.bracket.final);
    }
    allMatches.push(...state.world.districtCup.matches || []);
    if (state.world.districtCup.final) allMatches.push(state.world.districtCup.final);

    allMatches.forEach(m => {
        if (m.date === dateYMD && m.played) {
            trackedTeams.forEach(tid => {
                if (m.homeTeamId === tid || m.awayTeamId === tid) {
                    const isHome = m.homeTeamId === tid;
                    const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                    const opponent = state.teams[opponentId]?.name || 'Unknown';
                    teamMatchHistory[tid].push({
                        round: m.round,
                        opponent,
                        score: `${m.homeScore}-${m.awayScore}`,
                        result: isHome ? (m.homeScore! > m.awayScore! ? 'V' : m.homeScore! < m.awayScore! ? 'D' : 'E') : (m.awayScore! > m.homeScore! ? 'V' : m.awayScore! < m.homeScore! ? 'D' : 'E')
                    });
                }
            });

            // Record player ratings for these matches
            trackedPlayers.forEach(pid => {
                if (m.homeTeamId === state.players[pid].contract.teamId || m.awayTeamId === state.players[pid].contract.teamId) {
                    // Check if player played (simple check: if they are in the lineup)
                    const team = state.teams[state.players[pid].contract.teamId!];
                    if (Object.values(team.lineup).includes(pid)) {
                        const matchRating = m.result?.ratings?.[pid] || 0;
                        const oldRating = prevState.players[pid].totalRating;
                        const newRating = state.players[pid].totalRating;
                        if (matchRating > 0) {
                            playerHistory[pid].matches.push({
                                day,
                                rating: matchRating,
                                delta: newRating - oldRating
                            });
                        }
                    }
                }
            });
        }
    });

    // Record Transfers
    state.world.news.forEach(news => {
        if (news.date === date && news.type === 'TRANSFER') {
            trackedTeams.forEach(tid => {
                if (news.content.includes(state.teams[tid].name)) {
                    teamTransfers[tid].push(news.content);
                }
            });
        }
    });
}

// --- Audit Report Generation ---
let totalRatingDelta = 0;
let playerCount = 0;
Object.values(state.players).forEach(p => {
    if (p.district !== 'EXILADO') {
        totalRatingDelta += (p.history.seasonRatingDelta || 0);
        playerCount++;
    }
});

let acceptedTransfers = 0;
let blockedByCap = 0;
state.world.news.forEach(news => {
    if (news.type === 'TRANSFER' && news.title.includes('REFORÇO')) acceptedTransfers++;
});
// Since we don't have a direct log of blocked-by-cap in news, we'll infer or just check the notifications if possible
// For this audit, let's just count notifications of "Proposta Recusada" that mention Cap
state.notifications.forEach(n => {
    if (n.title === 'Proposta Recusada') blockedByCap++;
});

let dcGoals = 0;
let dcMatches = 0;
state.world.districtCup.matches?.forEach(m => {
    dcGoals += (m.homeScore || 0) + (m.awayScore || 0);
    dcMatches++;
});
if (state.world.districtCup.final) {
    dcGoals += (state.world.districtCup.final.homeScore || 0) + (state.world.districtCup.final.awayScore || 0);
    dcMatches++;
}

console.log('\n=== RELATÓRIO DE SUSTENTABILIDADE ===');
console.log(`Delta de Rating Médio da Liga: ${(totalRatingDelta / playerCount).toFixed(2)}`);
console.log(`Status do Mercado: ${acceptedTransfers} Aceitas | ${blockedByCap} Bloqueadas/Recusadas`);
console.log(`Média de Gols (Copa de Distritos): ${(dcGoals / (dcMatches || 1)).toFixed(2)}`);

console.log('\nA) TRACKING DE TIMES:');
trackedTeams.forEach(tid => {
    const team = state.teams[tid];
    const initialCap = teamInitialCaps[tid];
    const finalCap = team.powerCap || 0;
    const currentPower = team.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
    const freeSpace = finalCap - currentPower;

    console.log(`\nTime: ${team.name} | Cap Inicial: ${initialCap} | Cap Final: ${finalCap}`);
    console.log(`LIGA - Jogos:`);
    teamMatchHistory[tid].filter(m => m.round <= 14).forEach(m => {
        console.log(`  Round ${m.round}: vs ${m.opponent} | Placar: ${m.score} (${m.result})`);
    });
    console.log(`Transferências e Mercado:`);
    teamTransfers[tid].forEach(t => console.log(`  - ${t}`));
    console.log(`Saldo Final: Free Space: ${freeSpace}`);
});

console.log('\nB) TRACKING DE JOGADORES:');
trackedPlayers.forEach(pid => {
    const player = state.players[pid];
    const history = playerHistory[pid];
    const finalRating = player.totalRating;
    const delta = finalRating - history.initialRating;

    console.log(`\nJogador: ${player.nickname} | Rating Inicial: ${history.initialRating} | Final: ${finalRating} | Delta: ${delta > 0 ? '+' : ''}${delta}`);
    console.log(`Log de Partidas (Amostra):`);
    history.matches.slice(0, 5).forEach(m => {
        console.log(`  Dia ${m.day}: Nota: ${m.rating.toFixed(1)} | Variação: ${m.delta > 0 ? '+' : ''}${m.delta}`);
    });
});

console.log('\nC) RELATÓRIO DA COPA DE DISTRITOS:');
const dc = state.world.districtCup;
console.log(`Fase de Grupos:`);
dc.matches.forEach(m => {
    console.log(`  ${state.teams[m.homeTeamId].name} ${m.homeScore}-${m.awayScore} ${state.teams[m.awayTeamId].name}`);
});
if (dc.final) {
    console.log(`GRANDE FINAL:`);
    console.log(`  ${state.teams[dc.final.homeTeamId].name} ${dc.final.homeScore}-${dc.final.awayScore} ${state.teams[dc.final.awayTeamId].name}`);
    console.log(`CAMPEÃO: ${state.teams[dc.winnerId!].name}`);
}

console.log('\nRatings dos Finalistas (Destaques):');
if (dc.final) {
    [dc.final.homeTeamId, dc.final.awayTeamId].forEach(tid => {
        const team = state.teams[tid];
        console.log(`- ${team.name}:`);
        team.squad.slice(0, 3).forEach(pid => {
            const p = state.players[pid];
            console.log(`  ${p.nickname}: Rating ${p.totalRating} | Satisfação: ${p.satisfaction}%`);
        });
    });
}

console.log('\nD) VALIDAÇÃO DE CALENDÁRIO E MIGRAÇÃO:');
const report = state.world.history[0];
if (report && report.reallocatedTeams) {
    console.log(`Times Realocados:`);
    report.reallocatedTeams.forEach(r => {
        console.log(`  - ${state.teams[r.teamId].name}: ${r.from} -> ${r.to}`);
    });
}
const nextSeasonMatches = state.world.leagues.norte.matches.filter(m => m.round === 1);
if (nextSeasonMatches.length > 0) {
    console.log(`Status Season 2: Calendário gerado com ${state.world.leagues.norte.matches.length} jogos na Liga Norte.`);
} else {
    console.log(`Status Season 2: Erro na geração do calendário.`);
}

console.log('\nAudit Concluído.');
