import { useGame, useGameDispatch } from '../store/GameContext';
import { advanceGameDay, startNewSeason } from '../engine/gameLogic';
import { useRef } from 'react';

export const useGameDay = () => {
    const { state, setState, saveGame } = useGame();
    const { addToast } = useGameDispatch();

    const isAdvancingRef = useRef(false);

    const handleAdvanceDay = async () => {
        if (isAdvancingRef.current) return;

        if (!state.isCreator) {
            alert('Apenas o Criador do Mundo pode avançar a data da temporada.');
            return;
        }

        if (state.world.status === 'LOBBY') {
            alert('A temporada ainda não começou! Inicie a temporada na aba Home primeiro.');
            return;
        }

        if (!window.confirm('Deseja avançar para o próximo dia? Todos os jogos da rodada serão simulados.')) return;

        isAdvancingRef.current = true;
        try {
            console.log('GM: Avançando dia do jogo...');
            // We apply the change and immediately get the new state
            const newState = advanceGameDay(state);
            setState(newState);
            // Save state immediately to ensure the new state is distributed
            await saveGame(newState);
            addToast('Dia avançado com sucesso', 'success');
        } finally {
            isAdvancingRef.current = false;
        }
    };

    const handleStartNewSeason = () => {
        if (!state.isCreator) {
            alert('Apenas o Criador do Mundo pode iniciar a nova temporada.');
            return;
        }

        if (!window.confirm('A Temporada atual chegou ao fim! Deseja calcular a evolução dos jogadores e iniciar o próximo ano?')) return;

        console.log('GM: Iniciando nova temporada...');
        setState(prev => startNewSeason(prev));
        addToast('Nova temporada iniciada com sucesso! Elencos, calendários e traços atualizados.', 'success');
    };

    return { handleAdvanceDay, handleStartNewSeason };
};
