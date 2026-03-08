import { generateInitialState } from './src/engine/generator';

console.log("--- ELITE 2050 TEAM COMPOSITION REPORT ---");

const state = generateInitialState();
const teams = Object.values(state.teams).filter(t => t.id.startsWith('t_'));
const players = state.players;

const report = teams.map(t => {
    const squad = t.squad.map(id => players[id]);
    const ratings = squad.map(p => p.totalRating).sort((a, b) => b - a);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const district = t.district;

    // Categorize based on seed_universe.ts logic
    // ELITE: first 8 (IDs t_1 to t_8)
    // AVERAGE: 8 to 24 (IDs t_9 to t_24)
    // REBUILD: 24 to 32 (IDs t_25 to t_32)
    const idNum = parseInt(t.id.split('_')[1]);
    let type = 'AVERAGE';
    if (idNum <= 8) type = 'ELITE';
    if (idNum > 24) type = 'REBUILD';

    return {
        name: t.name,
        type,
        district,
        count: squad.length,
        avg: avg.toFixed(1),
        max: ratings[0],
        min: ratings[ratings.length - 1],
        top3: ratings.slice(0, 3).join(', '),
        powerCap: t.powerCap
    };
});

// Group by type
const elite = report.filter(r => r.type === 'ELITE');
const average = report.filter(r => r.type === 'AVERAGE');
const rebuild = report.filter(r => r.type === 'REBUILD');

console.log("\n--- ELITE TEAMS (8) ---");
elite.forEach(t => console.log(`${t.name.padEnd(15)} | Avg: ${t.avg} | Max: ${t.max} | Top 3: [${t.top3}] | Cap: ${t.powerCap}`));

console.log("\n--- AVERAGE TEAMS (16) --- (Sample 4)");
average.slice(0, 4).forEach(t => console.log(`${t.name.padEnd(15)} | Avg: ${t.avg} | Max: ${t.max} | Top 3: [${t.top3}] | Cap: ${t.powerCap}`));

console.log("\n--- REBUILD TEAMS (8) ---");
rebuild.forEach(t => console.log(`${t.name.padEnd(15)} | Avg: ${t.avg} | Max: ${t.max} | Top 3: [${t.top3}] | Cap: ${t.powerCap}`));

const totalActivePlayers = report.reduce((sum, t) => sum + t.count, 0);
console.log(`\nTotal Active Players in Teams: ${totalActivePlayers}`);
console.log(`FA / Exiled Players: ${1000 - totalActivePlayers}`);
