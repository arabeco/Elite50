import { GameState, District } from '../types';

/**
 * Club districts are fixed identity.
 * Kept as a compatibility hook for older season-report shape, but new seasons do not move clubs.
 */
export const shuffleBottomTeams = (state: GameState): { teamId: string; from: District; to: District }[] => {
    void state;
    return [];
};
