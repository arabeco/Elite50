import { generateInitialState } from './src/engine/generator';
import * as fs from 'fs';

console.log("--- ELITE 2050 DETERMINISM VERIFICATION ---");

function runCheck() {
    console.log("Generating Run 1...");
    const state1 = generateInitialState();
    const players1 = Object.values(state1.players);
    const traitCount1 = players1.reduce((sum, p) => sum + (p.badges.slot1 ? 1 : 0) + (p.badges.slot2 ? 1 : 0) + (p.badges.slot3 ? 1 : 0), 0);

    console.log("Generating Run 2...");
    const state2 = generateInitialState();
    const players2 = Object.values(state2.players);
    const traitCount2 = players2.reduce((sum, p) => sum + (p.badges.slot1 ? 1 : 0) + (p.badges.slot2 ? 1 : 0) + (p.badges.slot3 ? 1 : 0), 0);

    console.log(`\nRun 1: ${players1.length} players, ${traitCount1} traits.`);
    console.log(`Run 2: ${players2.length} players, ${traitCount2} traits.`);

    // Check Determinism
    const str1 = JSON.stringify(state1.players);
    const str2 = JSON.stringify(state2.players);

    if (str1 === str2) {
        console.log("✅ DETERMINISM CHECK PASSED: Both runs produced identical player pools.");
    } else {
        console.log("❌ DETERMINISM CHECK FAILED: Runs produced different player pools.");
    }

    // Check Traits
    if (traitCount1 > 2000) { // Approx 2-3 traits per player (1000 players)
        console.log(`✅ TRAIT DISTRIBUTION PASSED: Found ${traitCount1} traits in the pool.`);
    } else {
        console.log(`⚠️ TRAIT DISTRIBUTION WARNING: Low trait count detected (${traitCount1}).`);
    }

    // Sample player
    const sample = players1[0];
    console.log(`\nSample Player [${sample.nickname}]: Rating ${sample.totalRating}, Tier ${sample.district}, Badges:`, sample.badges);
}

runCheck();
