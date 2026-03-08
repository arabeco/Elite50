import { generateInitialState } from './src/engine/generator';
import { advanceGameDay, submitProposals } from './src/engine/gameLogic';
import { GameState, Team, Player, District } from './src/types';

console.log("=== PROTOCOLO DE SIMULAÇÃO DE ESTRESSE: ELITE 2050 (8 SEEDS) ===");

let state = generateInitialState();

// 1. IDENTIFY THE 8 SEEDS (2 per district)
const clubTeams = Object.values(state.teams).filter(t => t.id.startsWith('t_'));
const selectedTeamIds: string[] = [];
const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];

districts.forEach(d => {
    const districtTeams = clubTeams.filter(t => t.district === d);
    selectedTeamIds.push(districtTeams[0].id);
    selectedTeamIds.push(districtTeams[1].id);
});

// Map strategies to selected teams
const strategies: Record<string, string> = {
    [selectedTeamIds[0]]: "Elite: Superstars/Lendários",
    [selectedTeamIds[1]]: "Elite: Posse/Passe Ouro",
    [selectedTeamIds[2]]: "Industrial: Físico/Pressão Alta",
    [selectedTeamIds[3]]: "Industrial: Retranca/Vidro Curado",
    [selectedTeamIds[4]]: "Shadow: Chaos/Displicentes",
    [selectedTeamIds[5]]: "Shadow: Contra-ataque/Clutch",
    [selectedTeamIds[6]]: "Emergente: Slot 4/Gênios",
    [selectedTeamIds[7]]: "Emergente: Equilibrado/Bagres",
};

console.log("\nConfiguração das 8 Seeds:");
selectedTeamIds.forEach(id => console.log(`- ${state.teams[id].name} (${state.teams[id].district}): ${strategies[id]}`));

function logMilestone(day: number) {
    console.log(`\n--- MARCO: DIA ${day} ---`);
    selectedTeamIds.forEach(id => {
        const team = state.teams[id];
        const squad = team.squad.map(pid => state.players[pid]);
        const avgRating = squad.reduce((sum, p) => sum + p.totalRating, 0) / Math.max(1, squad.length);
        const avgSatisfaction = squad.reduce((sum, p) => sum + p.satisfaction, 0) / Math.max(1, squad.length);

        // Find league standing
        const leagueId = team.district.toLowerCase() as keyof typeof state.world.leagues;
        const standing = state.world.leagues[leagueId]?.standings.find(s => s.teamId === id);

        console.log(`${team.name.padEnd(15)} | Rating: ${avgRating.toFixed(1)} | Sat: ${avgSatisfaction.toFixed(1)}% | Vit: ${standing?.won || 0} | Cap: ${team.powerCap}`);
    });
}

// 2. RUN SIMULATION (45 DAYS)
state.world.currentDay = 0; // Ensure we start at 0

for (let day = 0; day <= 45; day++) {
    // Strategy-specific actions
    selectedTeamIds.forEach(id => {
        const team = state.teams[id];

        // Draft Actions (Days 0-2)
        if (day <= 2) {
            // Find top players suitable for strategy
            const freeAgents = Object.values(state.players).filter(p => !p.contract.teamId);
            if (id === selectedTeamIds[0]) { // Elite: Superstars
                const topP = freeAgents.sort((a, b) => b.totalRating - a.totalRating).slice(0, 3).map(p => p.id);
                state = submitProposals(state, team.managerId || `m_${id}`, topP);
            }
            if (id === selectedTeamIds[6]) { // Emergente: Slot 4
                // Look for players with Slot 4 'Fardo' or 'Gênio'
                const targets = freeAgents.filter(p => p.badges.slot4 !== null || p.badges.slot1 === 'Gênio').slice(0, 3).map(p => p.id);
                state = submitProposals(state, team.managerId || `m_${id}`, targets);
            }
        }

        // Tactic changes (Day 10 and 20)
        if (day === 10) {
            team.tactics.playStyle = (id.includes('1') || id.includes('3')) ? 'Blitzkrieg' : 'Catenaccio';
        }
        if (day === 20) {
            team.tactics.playStyle = (id.includes('2') || id.includes('4')) ? 'Tiki-Taka' : 'Gegenpressing';
        }

        // Training Slot 4 Focus
        if (day >= 3) {
            const squad = team.squad.map(pid => state.players[pid]);
            squad.forEach(p => {
                if (p.badges.slot4 && !p.badges.trainingSlot4) {
                    // Start healing fardo
                    p.badges.trainingSlot4 = { trait: 'Soberano', daysLeft: 10, type: 'CURE' };
                }
            });
        }
    });

    // Resolve Draft and auto-fill logic inside advanceGameDay (already implemented in gameLogic)
    state = advanceGameDay(state, false);

    // Milestones
    if ([2, 10, 20, 30, 40].includes(day)) {
        logMilestone(day);
    }
}

logMilestone(45);

// 3. ANALYSIS OF LENDÁRIOS
const lendarios = Object.values(state.players).filter(p => p.badges.slot3 === 'Finaliz Lendária' || p.badges.slot3 === 'Passe Lendária' || p.badges.slot3 === 'Defesa Lendária');
console.log("\n--- LOCALIZAÇÃO DOS 10 LENDÁRIOS DA POOL ---");
lendarios.forEach(p => {
    const team = p.contract.teamId ? state.teams[p.contract.teamId].name : "FREE AGENT";
    console.log(`${p.nickname.padEnd(15)} | Rating: ${p.totalRating} | Time: ${team} | Trait: ${p.badges.slot3}`);
});

console.log("\nSIMULAÇÃO FINALIZADA.");
