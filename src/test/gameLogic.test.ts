import { describe, it, expect } from 'vitest';
import { calculateTeamPower, advanceGameDay, startNewSeason } from '../engine/gameLogic';
import { Team, Player } from '../types';

describe('gameLogic', () => {
    it('calculateTeamPower should return correct sum of player ratings', () => {
        const mockTeam = {
            id: 'team_1',
            name: 'Test Team',
            squad: ['p_1', 'p_2']
        } as Team;

        const mockPlayers: Record<string, Player> = {
            'p_1': { id: 'p_1', totalRating: 85 } as Player,
            'p_2': { id: 'p_2', totalRating: 75 } as Player,
            'p_3': { id: 'p_3', totalRating: 90 } as Player,
        };

        const power = calculateTeamPower(mockTeam, mockPlayers);
        expect(power).toBe(160); // 85 + 75
    });

    it('calculateTeamPower should handle missing players safely', () => {
        const mockTeam = {
            id: 'team_1',
            squad: ['p_1', 'p_invalid']
        } as Team;

        const mockPlayers: Record<string, Player> = {
            'p_1': { id: 'p_1', totalRating: 85 } as Player,
        };

        const power = calculateTeamPower(mockTeam, mockPlayers);
        expect(power).toBe(85);
    });

    it('advanceGameDay should not modify the original state (immutability)', () => {
        const initialState = {
            world: { status: 'ACTIVE', currentDate: new Date().toISOString() },
            leagues: {},
            teams: {},
            players: {}
        } as any;

        const newState = advanceGameDay(initialState);

        // newState should be a new object
        expect(newState).not.toBe(initialState);
    });

    it('advanceGameDay should do nothing if status is LOBBY', () => {
        const initialState = {
            world: { status: 'LOBBY', currentDate: new Date().toISOString() },
            leagues: {},
            teams: {},
            players: {}
        } as any;

        const newState = advanceGameDay(initialState);
        expect(newState).toBe(initialState); // Short circuit returns exactly the same reference
    });

    it('startNewSeason should increment season and reset status to LOBBY', () => {
        const initialState = {
            world: {
                status: 'FINISHED',
                currentSeason: 2050,
                currentDate: new Date().toISOString(),
                leagues: {},
                eliteCup: {},
                districtCup: {}
            },
            teams: {},
            players: {
                'p_1': {
                    id: 'p_1',
                    totalRating: 80,
                    history: { goals: 10, gamesPlayed: 30 }
                }
            }
        } as any;

        const newState = startNewSeason(initialState);

        expect(newState.world.currentSeason).toBe(2051);
        expect(newState.world.status).toBe('LOBBY');
        expect(newState.world.currentRound).toBe(1);

        // Verify player history resets
        expect(newState.players['p_1'].history.goals).toBe(0);
        expect(newState.players['p_1'].history.gamesPlayed).toBe(0);
    });
});
