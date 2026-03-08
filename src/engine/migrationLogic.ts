import { GameState, Team, District, Player } from '../types';
import { newsHeadlines } from './newsService';

/**
 * Migration Logic: Identifies the bottom 2 teams of each district (Z2)
 * and swaps them to a different district for the next season.
 */
export const shuffleBottomTeams = (state: GameState): { teamId: string; from: District; to: District }[] => {
    const districts: District[] = ['NORTE', 'SUL', 'LESTE', 'OESTE'];
    const leagueKeys = ['norte', 'sul', 'leste', 'oeste'] as const;

    interface MigratingTeam {
        teamId: string;
        oldDistrict: District;
    }

    const migratingTeams: MigratingTeam[] = [];

    // 1. Identify Z2 (7th and 8th) from each league
    leagueKeys.forEach((key, index) => {
        const league = state.world.leagues[key];
        const sorted = [...league.standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const gdA = a.goalsFor - a.goalsAgainst;
            const gdB = b.goalsFor - b.goalsAgainst;
            return gdB - gdA;
        });

        const bottom2 = sorted.slice(6, 8); // 7th and 8th
        bottom2.forEach(stat => {
            migratingTeams.push({
                teamId: stat.teamId,
                oldDistrict: districts[index]
            });
        });
    });

    // 2. Redistribute randomly to a DIFFERENT district
    // We have 8 teams. We need to put 2 in each of the 4 districts, 
    // ensuring no one stays in their oldDistrict.

    const availableSlots: Record<District, number> = {
        'NORTE': 2, 'SUL': 2, 'LESTE': 2, 'OESTE': 2, 'EXILADO': 0
    };

    const shuffleArray = <T>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5);

    const reallocated: Record<string, District> = {};
    const teamsToAssign = shuffleArray([...migratingTeams]);

    teamsToAssign.forEach(mt => {
        const otherDistricts = districts.filter(d => d !== mt.oldDistrict && availableSlots[d] > 0);

        // If we get stuck (very rare with 8 teams and 4 districts), 
        // we might need a more robust backtracking, but for a game engine, 
        // a simple retry or prioritized shuffle usually works.
        const targetDist = otherDistricts[Math.floor(Math.random() * otherDistricts.length)];

        if (targetDist) {
            reallocated[mt.teamId] = targetDist;
            availableSlots[targetDist]--;
        } else {
            // Fallback: take any available even if it's the same (should not happen if shuffled well)
            const fallback = districts.find(d => availableSlots[d] > 0);
            if (fallback) {
                reallocated[mt.teamId] = fallback;
                availableSlots[fallback]--;
            }
        }
    });

    // 3. Apply Changes and Satisfaction Penalty
    Object.entries(reallocated).forEach(([teamId, newDist]) => {
        const team = state.teams[teamId];
        if (team) {
            team.district = newDist;

            // Penalty for Tier S/A players
            team.squad.forEach(pid => {
                const player = state.players[pid];
                if (player && player.totalRating >= 800) {
                    player.satisfaction = Math.max(0, player.satisfaction - 10);
                }
            });

            newsHeadlines.migration(state, team, newDist);

            state.notifications.unshift({
                id: `migration_${Date.now()}_${team.id}`,
                date: state.world.currentDate,
                title: 'Migração Inter-Distrital',
                message: `O ${team.name} foi realocado para o distrito ${newDist} devido ao mau desempenho.`,
                type: 'warning',
                read: false
            });
        }
    });

    return Object.entries(reallocated).map(([teamId, newDist]) => ({
        teamId,
        from: migratingTeams.find(mt => mt.teamId === teamId)!.oldDistrict,
        to: newDist
    }));
};
