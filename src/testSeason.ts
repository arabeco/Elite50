import { generateInitialState } from './engine/generator';
import { advanceGameDay } from './engine/gameLogic';
import { GameState, Match } from './types';
import * as fs from 'fs';

async function runSeasonSimulation() {
    const logLines: string[] = [];
    const _log = (msg: string) => {
        console.log(msg);
        logLines.push(msg);
    };

    _log("===============================================");
    _log("🚀 INICIANDO SIMULAÇÃO DE TEMPORADA REAL 🚀");
    _log("===============================================");

    // 1. Generate Initial State (Seeded)
    _log("⏳ Gerando Fase Lobby e Draft...");
    let state: GameState = generateInitialState();

    // Create 4 Dummy Managers
    const managers = [
        { id: 'm1', name: 'Afonso', teamId: 't_norte_1' }, // Admin Elite
        { id: 'm2', name: 'Yudi', teamId: 't_sul_2' },     // Tokyo Neon
        { id: 'm3', name: 'Gabi', teamId: 't_leste_3' },   // Cyber Pulse
        { id: 'm4', name: 'Beto', teamId: 't_oeste_4' }    // Rio Districts
    ];

    managers.forEach(m => {
        state.managers[m.id] = {
            id: m.id,
            name: m.name,
            reputation: 2.5,
            district: 'NORTE',
            attributes: {
                evolution: 50,
                negotiation: 50,
                scout: 50
            },
            career: {
                currentTeamId: m.teamId,
                historyTeamIds: [],
                titlesWon: 0,
                totalLeagueTitles: 0,
                totalCupTitles: 0,
                hallOfFameEntries: 0,
                consecutiveTitles: 0
            },
            achievements: []
        };
    });

    _log("✅ Lobby Gerado. Total de Jogadores: " + Object.keys(state.players).length);
    _log("▶️ Mudando Status do Mundo para ACTIVE...");
    state.world.status = 'ACTIVE';

    // Advance 45 Days
    _log("\n⏳ Simulando 45 Dias da Temporada...\n");

    let totalGoals = 0;
    let totalMatches = 0;

    // Track match results and powers
    for (let day = 1; day <= 45; day++) {
        try {
            state = advanceGameDay(state);
        } catch (e: any) {
            console.log("\n\n==== FATAL ERROR ON DAY " + day + " ====");
            console.log(e.stack);
            process.exit(1);
        }

        // Log matches that finished today
        const matchesToday = (Object.values((state as any).matches || {}) as Match[])
            .filter(m => m.date === state.world.currentDate && m.status === ('COMPLETED' as any));

        matchesToday.forEach(m => {
            totalMatches++;
            totalGoals += (m.homeScore + m.awayScore);
        });

        if (day === 1 || day % 10 === 0 || day === 45) {
            const team1 = state.teams['t_norte_1'];
            if (team1) {
                const p1 = Object.values(state.players).filter(p => team1.squad.includes(p.id)).reduce((acc, p) => acc + p.totalRating, 0) / 11;
                _log(`[Dia ${day}] -> Rod. ${state.world.currentRound} | Power Admin Elite (t_norte_1): ${Math.round(p1)}`);
            } else {
                _log(`[Dia ${day}] -> Rod. ${state.world.currentRound}`);
            }

            // Print up to 4 matches of the day to show more results
            matchesToday.slice(0, 4).forEach(m => {
                _log(`   ⚽ ${state.teams[m.homeTeamId].name} ${m.homeScore} x ${m.awayScore} ${state.teams[m.awayTeamId].name}`);
            });
        }
    }

    _log("\n===============================================");
    _log("🏁 FIM DA TEMPORADA 2050 🏁");
    _log("===============================================\n");

    _log(`Gols na Temporada: ${totalGoals} gols em ${totalMatches} jogos (Média: ${(totalGoals / totalMatches || 0).toFixed(2)} por jogo)`);
    _log("📊 RESULTADOS DAS LIGAS:");
    Object.keys(state.world.leagues).forEach(key => {
        const l = state.world.leagues[key as any];
        const top = l.standings[0];
        if (top) {
            const team = state.teams[top.teamId];
            _log(`🏆 Campeão ${l.name}: ${team.name} com ${top.points} Pontos e ${top.goalsFor} Gols!`);
        }
    });

    _log("\n📊 RESULTADO COPA ELITE (MUNDIAL):");
    if (state.world.eliteCup.bracket.final) {
        const m = state.world.eliteCup.bracket.final;
        _log(`Final: ${state.teams[m.homeTeamId].name} ${m.homeScore} x ${m.awayScore} ${state.teams[m.awayTeamId].name}`);
    }

    _log("\n📊 TRANSFERÊNCIAS REALIZADAS PELA IA:");
    const transfers = state.notifications.filter(n => n.type === 'transfer');
    _log(`Total de Transferências: ${transfers.length}`);
    transfers.slice(0, 10).forEach(t => _log(`- ${t.message}`));

    fs.writeFileSync('season_report.txt', logLines.join('\n'));
}

runSeasonSimulation();
