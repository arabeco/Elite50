import * as fs from 'fs';
import { regenerateDNA } from './src/engine/generator.js';

const migrate = () => {
    const filePath = './universe_state.json';
    if (!fs.existsSync(filePath)) {
        console.log('Universe state not found. Skipping migration.');
        return;
    }

    const state = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const players = state.players;

    let count = 0;
    Object.keys(players).forEach(id => {
        const player = players[id];
        // Ensure player has the correct type-safe structure for regenerateDNA
        player.badges = regenerateDNA(player);
        count++;
    });

    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    console.log(`Successfully migrated DNA for ${count} players.`);
};

migrate();
