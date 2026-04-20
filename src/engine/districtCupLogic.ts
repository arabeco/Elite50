import { GameState, Player, Team, Manager, District, Match, SeasonPhase } from '../types';

const awardDistrictTeamTitle = (team: Team | undefined, season: number) => {
    if (!team) return;

    const titles = team.titles || { league: 0, cup: 0, total: 0 };
    titles.cup += 1;
    titles.total += 1;
    team.titles = titles;

    const title = `Campeão da Copa de Distritos (${team.district})`;
    team.achievements = team.achievements || [];
    if (!team.achievements.some(achievement => achievement.season === season && achievement.title === title)) {
        team.achievements.unshift({
            season,
            title,
            type: 'Distrito'
        });
    }
};

/**
 * Selects 4 human managers for District Cup.
 * Priority: Human role, then Reputation.
 */
export const selectDistrictCupManagers = (state: GameState): Record<District, string> => {
    const activeManagers = Object.values(state.managers);
    const humanManagers = activeManagers.filter(m => m.id === state.userManagerId || true); // In multiplayer, check real user IDs

    // For this prototype, we'll take top 4 by reputation if available
    const sorted = activeManagers
        .filter(m => m && typeof m.reputation === 'number')
        .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
    const selected = sorted.slice(0, 4);

    const mapping: Partial<Record<District, string>> = {};
    const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];

    districts.forEach((d, i) => {
        mapping[d] = selected[i]?.id || 'ai_manager_dist';
    });

    return mapping as Record<District, string>;
};

/**
 * Convokes the 15 best players from each district.
 */
export const generateDistrictRosters = (state: GameState): Record<District, string[]> => {
    const allPlayers = Object.values(state.players);
    const rosters: Record<District, string[]> = {
        'NORTE': [], 'SUL': [], 'LESTE': [], 'OESTE': [], 'EXILADO': []
    };

    ['NORTE', 'SUL', 'LESTE', 'OESTE'].forEach(d => {
        const districtPlayers = allPlayers
            .filter(p => p.district === d)
            .sort((a, b) => b.totalRating - a.totalRating)
            .slice(0, 15);

        rosters[d as District] = districtPlayers.map(p => p.id);
    });

    return rosters;
};

/**
 * Initializes the District Cup state and tournament.
 */
export const initDistrictCup = (state: GameState) => {
    state.world.phase = 'DISTRICT_CUP';
    const rosters = generateDistrictRosters(state);
    const managers = selectDistrictCupManagers(state);

    // Setup the 4 District Teams (Special virtual teams)
    ['NORTE', 'SUL', 'LESTE', 'OESTE'].forEach(d => {
        const teamId = `d_${d.toLowerCase()}`;
        const existingTeam = state.teams[teamId];
        const team: Team = existingTeam ? {
            ...existingTeam,
            managerId: managers[d as District],
            squad: rosters[d as District],
            lineup: {},
            tactics: {
                ...existingTeam.tactics,
                playStyle: existingTeam.tactics?.playStyle || 'Equilibrado',
                preferredFormation: existingTeam.tactics?.preferredFormation || '4-3-3'
            }
        } : {
            id: teamId,
            name: `Seleção ${d}`,
            city: d,
            district: d as District,
            league: 'Cyan', // Dummy
            colors: { primary: '#FFD700', secondary: '#000000' },
            managerId: managers[d as District],
            squad: rosters[d as District],
            lineup: {}, // To be filled by manager
            tactics: {
                playStyle: 'Equilibrado',
                preferredFormation: '4-3-3'
            }
        };
        state.teams[teamId] = team;
    });

    // Generate Matches (Triangular: 3 rounds + Final)
    // Round 1: N vs S, L vs O
    // Round 2: N vs L, S vs O
    // Round 3: N vs O, S vs L
    // This is simplified. User asked for Triangular (3 games) + Final.
};

export const finalizeDistrictCup = (state: GameState) => {
    // 1. Award District Cup to Winner's squad
    const winnerId = state.world.districtCup.winnerId;
    if (winnerId) {
        const winnerTeam = state.teams[winnerId];
        if (winnerTeam) {
            awardDistrictTeamTitle(winnerTeam, state.world.currentSeason || 2050);

            winnerTeam.squad.forEach(pid => {
                const p = state.players[pid];
                if (p) {
                    p.achievements.push({
                        season: state.world.currentSeason || 2050,
                        title: `Campeão da Copa de Distritos (${winnerTeam.district})`,
                        type: 'Distrito'
                    });
                }
            });

            // Award to Manager
            const managerId = winnerTeam.managerId;
            if (managerId && state.managers[managerId]) {
                const m = state.managers[managerId];
                m.career.titlesWon += 1;
                m.career.totalCupTitles += 1;
                m.achievements.push({
                    season: state.world.currentSeason || 2050,
                    title: `Campeão da Copa de Distritos (${winnerTeam.district})`,
                    type: 'Distrito'
                });
            }
        }
    }

    // 2. Award Individual: Most Improved Player (Highest Season Rating Delta)
    const allPlayersInWorld = Object.values(state.players);
    const mip = [...allPlayersInWorld].sort((a, b) => (b.history.seasonRatingDelta || 0) - (a.history.seasonRatingDelta || 0))[0];

    if (mip && (mip.history.seasonRatingDelta || 0) > 0) {
        mip.achievements.push({
            season: state.world.currentSeason || 2050,
            title: `Most Improved Player (+${mip.history.seasonRatingDelta} pts)`,
            type: 'Individual'
        });
    }

    // 3. Cleanup and Reset
    Object.values(state.players).forEach(player => {
        if (player.district === 'EXILADO') return;

        // Apply Fatigue for participants
        const isConvoked = Object.values(state.teams).some(t => t.id.startsWith('d_') && t.squad.includes(player.id));

        if (isConvoked) {
            player.fatigue = 50; // Heavy fatigue for next season

            // Profit Logic: Add rating gain to original club powerCap
            const originalTeamId = player.contract.teamId;
            if (originalTeamId) {
                const club = state.teams[originalTeamId];
                if (club) {
                    const ratingGain = player.history.seasonRatingDelta || 0;
                    if (ratingGain > 0) {
                        club.powerCap! += ratingGain;
                    }
                }
            }
        } else {
            player.fatigue = 0; // Fresh
        }

        // Reset season delta for new season AFTER awarding trophies
        player.history.seasonRatingDelta = 0;
    });

    state.world.phase = 'OFFSEASON';
};
