import { simulateMatch } from './MatchEngine';
import { Player, TeamStats } from '../types';
import { generatePlayer } from './generator';

// Helper to create a standardized team for testing
function createStandardTeamStats(name: string, rating: number, playStyle: any = 'Equilibrado'): TeamStats {
    return {
        id: name,
        name: name,
        attack: rating,
        midfield: rating,
        defense: rating,
        goalkeeper: rating,
        playStyle: playStyle,
        mentality: 'Calculista',
        linePosition: 50,
        aggressiveness: 50,
        slots: [null, null, null],
        chemistry: 100
    };
}

function createStandardSquad(teamId: string, rating: number, traits: string[] = []): Player[] {
    const squad: Player[] = [];
    const roles: any[] = ['GOL', 'ZAG', 'ZAG', 'MEI', 'MEI', 'ATA'];
    roles.forEach((role, i) => {
        const p = generatePlayer(`p_${teamId}_${i}`, 'NORTE', rating, role);
        if (traits.length > 0) {
            p.badges.slot1 = traits[0] || p.badges.slot1;
            p.badges.slot2 = traits[1] || p.badges.slot2;
            p.badges.slot3 = traits[2] || p.badges.slot3;
        }
        squad.push(p);
    });
    return squad;
}

async function runGripTest(iterations: number) {
    console.log(`=== INICIANDO ANÁLISE DE GRIP (${iterations} ITERAÇÕES) ===\n`);

    const results = {
        baseline: { win: 0, draw: 0, loss: 0 },
        tactical: { win: 0, draw: 0, loss: 0 },
        traits: { win: 0, draw: 0, loss: 0 },
        scoreGap: { win: 0, draw: 0, loss: 0 },
        training: { win: 0, draw: 0, loss: 0 }
    };

    const rating = 600;

    // 1. BASELINE: Luck/Chaos factor (Team A vs Team A)
    for (let i = 0; i < iterations; i++) {
        const teamA = createStandardTeamStats('Base_A', rating);
        const teamB = createStandardTeamStats('Base_B', rating);
        const res = simulateMatch(teamA, teamB, createStandardSquad('A', rating), createStandardSquad('B', rating));
        if (res.homeScore > res.awayScore) results.baseline.win++;
        else if (res.homeScore < res.awayScore) results.baseline.loss++;
        else results.baseline.draw++;
    }

    // 2. TACTICAL GRIP: Tiki-Taka vs Balanced
    for (let i = 0; i < iterations; i++) {
        const teamA = createStandardTeamStats('Tactic_A', rating, 'Tiki-Taka');
        teamA.midfield += 50; // Manual tactical advantage simulation
        const teamB = createStandardTeamStats('Base_B', rating);
        const res = simulateMatch(teamA, teamB, createStandardSquad('A', rating), createStandardSquad('B', rating));
        if (res.homeScore > res.awayScore) results.tactical.win++;
        else if (res.homeScore < res.awayScore) results.tactical.loss++;
        else results.tactical.draw++;
    }

    // 3. TRAIT GRIP: Legendary Traits vs Standard
    for (let i = 0; i < iterations; i++) {
        const teamA = createStandardTeamStats('Trait_A', rating);
        const squadA = createStandardSquad('A', rating, ['Finaliz Lendária', 'Passe Ouro', 'Gênio']);
        const teamB = createStandardTeamStats('Base_B', rating);
        const res = simulateMatch(teamA, teamB, squadA, createStandardSquad('B', rating));
        if (res.homeScore > res.awayScore) results.traits.win++;
        else if (res.homeScore < res.awayScore) results.traits.loss++;
        else results.traits.draw++;
    }

    // 4. SCORE GAP: 700 vs 600
    for (let i = 0; i < iterations; i++) {
        const teamA = createStandardTeamStats('High_A', 700);
        const teamB = createStandardTeamStats('Base_B', 600);
        const res = simulateMatch(teamA, teamB, createStandardSquad('A', 700), createStandardSquad('B', 600));
        if (res.homeScore > res.awayScore) results.scoreGap.win++;
        else if (res.homeScore < res.awayScore) results.scoreGap.loss++;
        else results.scoreGap.draw++;
    }

    // CALCULATE GRIP PERCENTAGES
    const calcGrip = (r: any) => (((r.win / iterations) - 0.5) * 100).toFixed(2);
    const chaosGrip = (Math.abs((results.baseline.win / iterations) - 0.5) * 100).toFixed(2);

    console.log("--- RESULTADOS ---");
    console.log(`[CASUALIDADE/CAOS]: ${chaosGrip}% de variação natural (Base: 5.00%)`);
    console.log(`[GRIP TÁTICA]: ${calcGrip(results.tactical)}% de impacto no resultado`);
    console.log(`[GRIP TRAITS]: ${calcGrip(results.traits)}% de impacto no resultado`);
    console.log(`[GRIP SCORE (+100)]: ${calcGrip(results.scoreGap)}% de impacto no resultado`);

    console.log("\n=== FIM DA ANÁLISE ===");
}

runGripTest(2000).catch(console.error);
