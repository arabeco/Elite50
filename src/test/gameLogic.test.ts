import { describe, it, expect } from 'vitest';
import { calculateTeamPower, advanceGameDay, startNewSeason, resolveDraftConflict } from '../engine/gameLogic';
import { generateInitialState } from '../engine/generator';
import { Team, Player, GameState } from '../types';

const attachHumanDraftManager = (state: GameState, managerId: string, teamId: string) => {
    state.teams[teamId].managerId = managerId;
    state.teams[teamId].squad = [];
    state.teams[teamId].lineup = {};
    state.teams[teamId].powerCap = 12000;
    state.managers[managerId] = {
        id: managerId,
        name: managerId,
        district: state.teams[teamId].district,
        reputation: 50,
        isNPC: false,
        attributes: { evolution: 50, negotiation: 50, scout: 50 },
        career: {
            titlesWon: 0,
            totalLeagueTitles: 0,
            totalCupTitles: 0,
            hallOfFameEntries: 0,
            consecutiveTitles: 0,
            currentTeamId: teamId,
            historyTeamIds: []
        },
        achievements: []
    };
};

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

    it('advanceGameDay should do nothing on the pre-season lobby day', () => {
        const initialState = {
            world: { status: 'LOBBY', currentDay: -1, currentDate: new Date().toISOString() },
            leagues: {},
            teams: {},
            players: {}
        } as any;

        const newState = advanceGameDay(initialState);
        expect(newState).toBe(initialState); // Pre-season lock returns exactly the same reference
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

    it('resolves Genesis Draft in priority rounds between human managers', () => {
        const state = generateInitialState();
        attachHumanDraftManager(state, 'h_1', 't_31');
        attachHumanDraftManager(state, 'h_2', 't_32');

        const targetPlayerId = state.teams.t_1.squad[0];
        state.world.draftProposals = [
            { managerId: 'h_1', teamId: 't_31', playerId: targetPlayerId, priority: 1 },
            { managerId: 'h_2', teamId: 't_32', playerId: targetPlayerId, priority: 2 }
        ];

        resolveDraftConflict(state);

        expect(state.players[targetPlayerId].contract.teamId).toBe('t_31');
        expect(state.teams.t_31.squad).toContain(targetPlayerId);
        expect(state.teams.t_32.squad).not.toContain(targetPlayerId);
        expect(state.teams.t_1.squad).not.toContain(targetPlayerId);
        expect(state.world.draftProposals).toEqual([]);
    });

    it('lets a human draft from an NPC team but never from another human team', () => {
        const state = generateInitialState();
        attachHumanDraftManager(state, 'h_1', 't_31');
        attachHumanDraftManager(state, 'h_owner', 't_32');

        const npcPlayerId = state.teams.t_1.squad[0];
        const humanOwnedPlayerId = state.teams.t_2.squad[0];
        state.players[humanOwnedPlayerId].contract.teamId = 't_32';
        state.teams.t_32.squad = [humanOwnedPlayerId];

        state.world.draftProposals = [
            { managerId: 'h_1', teamId: 't_31', playerId: npcPlayerId, priority: 1 },
            { managerId: 'h_1', teamId: 't_31', playerId: humanOwnedPlayerId, priority: 2 }
        ];

        resolveDraftConflict(state);

        expect(state.players[npcPlayerId].contract.teamId).toBe('t_31');
        expect(state.teams.t_31.squad).toContain(npcPlayerId);
        expect(state.players[humanOwnedPlayerId].contract.teamId).toBe('t_32');
        expect(state.teams.t_31.squad).not.toContain(humanOwnedPlayerId);
        expect(state.teams.t_32.squad).toContain(humanOwnedPlayerId);
    });
});
