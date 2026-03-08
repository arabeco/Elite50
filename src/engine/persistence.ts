import { GameState } from '../types';

export const saveGameState = (state: GameState): void => {
    // console.log('[PERSISTENCE] Desativado no navegador. Use Supabase.');
};

export const loadGameState = (): GameState | null => {
    return null;
};

export const deleteSavedState = (): void => {
    // console.log('[PERSISTENCE] Desativado no navegador. Use Supabase.');
};
