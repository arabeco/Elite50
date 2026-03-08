import { describe, it, expect } from 'vitest';
import { simulateMatch } from '../engine/MatchEngine';
import { Team, Player, Match } from '../types';

describe('MatchEngine', () => {
    it('simulateMatch should generate valid scores', () => {
        const mockHome = {
            id: 'h1',
            name: 'Home Team',
            district: 'NORTE',
            logo: { type: 'shield', primaryColor: '#f00', secondaryColor: '#fff', pattern: 'solid' },
            color: '#f00',
            manager: '',
            stadium: '',
            squad: [],
            tactics: { playStyle: 'Equilibrado', formation: '4-3-3', mentality: 'Ofensivo' },
            lineup: {
                startingXI: ['p0_home', 'p1_home', 'p2_home', 'p3_home', 'p4_home', 'p5_home', 'p6_home', 'p7_home', 'p8_home', 'p9_home', 'p10_home'],
                bench: []
            },
            attack: 80,
            midfield: 80,
            defense: 80,
            goalkeeper: 80
        } as any;

        const mockAway = {
            id: 'a1',
            name: 'Away Team',
            district: 'SUL',
            logo: { type: 'shield', primaryColor: '#00f', secondaryColor: '#fff', pattern: 'solid' },
            color: '#00f',
            manager: '',
            stadium: '',
            squad: [],
            tactics: { playStyle: 'Equilibrado', formation: '4-4-2', mentality: 'Defensivo' },
            lineup: {
                startingXI: ['p0_away', 'p1_away', 'p2_away', 'p3_away', 'p4_away', 'p5_away', 'p6_away', 'p7_away', 'p8_away', 'p9_away', 'p10_away'],
                bench: []
            },
            attack: 70,
            midfield: 70,
            defense: 70,
            goalkeeper: 70
        } as any;

        const homeSquad = Array.from({ length: 11 }, (_, i) => `p${i}_home`);
        mockHome.squad = homeSquad;

        const awaySquad = Array.from({ length: 11 }, (_, i) => `p${i}_away`);
        mockAway.squad = awaySquad;

        const mockPlayers: Record<string, Player> = {};
        homeSquad.forEach((id, i) => {
            mockPlayers[id] = { id, teamId: 'h1', isHidden: false, nickname: `Player ${i} H`, pentagon: { shooting: 80, passing: 80, defending: 80, dribbling: 80, physical: 80 }, totalRating: 80 } as any;
        });
        awaySquad.forEach((id, i) => {
            mockPlayers[id] = { id, teamId: 'a1', isHidden: false, nickname: `Player ${i} A`, pentagon: { shooting: 70, passing: 70, defending: 70, dribbling: 70, physical: 70 }, totalRating: 70 } as any;
        });

        const match: Match = {
            id: 'm1',
            round: 1,
            homeTeamId: 'h1',
            awayTeamId: 'a1',
            played: false,
            date: new Date().toISOString()
        };

        const result = simulateMatch(mockHome, mockAway, Object.values(mockPlayers));

        expect(result.homeScore).toBeGreaterThanOrEqual(0);
        expect(result.awayScore).toBeGreaterThanOrEqual(0);

        // Check if the number of GOAL events matches the actual score
        const homeGoals = result.events.filter(e => e.type === 'GOAL' && e.teamId === 'h1').length;
        const awayGoals = result.events.filter(e => e.type === 'GOAL' && e.teamId === 'a1').length;

        expect(homeGoals).toBe(result.homeScore);
        expect(awayGoals).toBe(result.awayScore);

        // Should have some commentary
        expect(result.events.length).toBeGreaterThan(0);
    });
});
