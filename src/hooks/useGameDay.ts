import { useRef } from 'react';
import { advanceGameDay, startNewSeason } from '../engine/gameLogic';
import { useGame, useGameDispatch } from '../store/GameContext';
import { grantSeasonCompletionRewards } from '../lib/metaStore';
import { calculateSeasonRewardsForUser } from '../utils/seasonRewards';

export const useGameDay = () => {
  const { state, setState, saveGame, isAuthenticated } = useGame();
  const { addToast } = useGameDispatch();
  const isAdvancingRef = useRef(false);

  const maybeGrantSeasonRewards = async (previousSeason: number | undefined, nextState: typeof state) => {
    const nextSeason = nextState.world.currentSeason || 2050;
    if (!previousSeason || nextSeason <= previousSeason) return;
    if (!isAuthenticated) return;

    const rewards = calculateSeasonRewardsForUser(nextState);
    if (!rewards) return;

    try {
      const result = await grantSeasonCompletionRewards(
        rewards.season,
        rewards.gold,
        rewards.fragments,
        rewards.payload
      );

      if (result.ok) {
        addToast(`Temporada encerrada: +${result.gold} ouro, +${result.fragments} fragmentos`, 'success');
      }
    } catch (error) {
      console.error('Erro ao conceder recompensas de temporada:', error);
      addToast('Temporada virou, mas a recompensa online nao foi sincronizada.', 'warning');
    }
  };

  const handleAdvanceDay = async () => {
    if (isAdvancingRef.current) return;

    if (!state.isCreator) {
      alert('Apenas o Criador do Mundo pode avancar a data da temporada.');
      return;
    }

    if (state.world.status === 'LOBBY') {
      alert('A temporada ainda nao comecou! Inicie a temporada na aba Home primeiro.');
      return;
    }

    if (!window.confirm('Deseja avancar para o proximo dia? Todos os jogos da rodada serao simulados.')) return;

    isAdvancingRef.current = true;
    try {
      const previousSeason = state.world.currentSeason || 2050;
      const newState = advanceGameDay(state);
      setState(newState);
      await saveGame(newState);
      await maybeGrantSeasonRewards(previousSeason, newState);
      addToast('Dia avancado com sucesso', 'success');
    } finally {
      isAdvancingRef.current = false;
    }
  };

  const handleStartNewSeason = async () => {
    if (!state.isCreator) {
      alert('Apenas o Criador do Mundo pode acelerar a offseason.');
      return;
    }

    if (!window.confirm('Deseja encurtar a offseason e abrir a proxima temporada agora?')) return;

    const previousSeason = state.world.currentSeason || 2050;
    const newState = startNewSeason(state);
    setState(newState);
    await saveGame(newState);
    await maybeGrantSeasonRewards(previousSeason, newState);
    addToast('Offseason encerrada. A nova temporada ja comecou.', 'success');
  };

  return { handleAdvanceDay, handleStartNewSeason };
};
