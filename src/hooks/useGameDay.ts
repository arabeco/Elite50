import { useRef } from 'react';
import { advanceGameDay, startNewSeason } from '../engine/gameLogic';
import { useGame, useGameDispatch } from '../store/GameContext';
import { grantSeasonCompletionRewards } from '../lib/metaStore';
import { claimWorldDayTick, claimWorldTick, completeWorldDayTick } from '../lib/worldTick';
import { calculateSeasonRewardsForUser } from '../utils/seasonRewards';

export const useGameDay = () => {
  const { state, setState, saveGame, isAuthenticated, worldId } = useGame();
  const { addToast, requestConfirm } = useGameDispatch();
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
      addToast('Apenas o Criador do Mundo pode avancar a data da temporada.', 'warning');
      return;
    }

    if (state.world.status === 'LOBBY') {
      addToast('A temporada ainda nao comecou. Inicie pela Home primeiro.', 'warning');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Avancar dia',
      message: 'Todos os jogos da rodada serao simulados.',
      confirmLabel: 'Avancar',
    });
    if (!confirmed) return;

    isAdvancingRef.current = true;
    let tickKey: string | null = null;
    try {
      const tickClaim = await claimWorldDayTick(worldId, state);
      tickKey = tickClaim.tickKey;

      if (!tickClaim.ok) {
        addToast('Esse dia ja esta sendo processado ou ja foi avancado.', 'warning');
        return;
      }

      const previousSeason = state.world.currentSeason || 2050;
      const newState = advanceGameDay(state);
      setState(newState);
      await saveGame(newState);
      await maybeGrantSeasonRewards(previousSeason, newState);
      await completeWorldDayTick(worldId, tickKey, true);
      addToast('Dia avancado com sucesso', 'success');
    } catch (error: any) {
      await completeWorldDayTick(worldId, tickKey, false, error?.message || String(error));
      console.error('Erro ao avancar dia:', error);
      addToast('Erro ao avancar dia', 'error');
    } finally {
      isAdvancingRef.current = false;
    }
  };

  const handleStartNewSeason = async () => {
    if (!state.isCreator) {
      addToast('Apenas o Criador do Mundo pode acelerar a offseason.', 'warning');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Encerrar offseason',
      message: 'A proxima temporada sera aberta agora.',
      confirmLabel: 'Abrir season',
    });
    if (!confirmed) return;

    let tickKey: string | null = null;
    try {
      const previousSeason = state.world.currentSeason || 2050;
      const tickClaim = await claimWorldTick(
        worldId,
        `season-${previousSeason}:start-next-season`,
        state.world.currentDate
      );
      tickKey = tickClaim.tickKey;

      if (!tickClaim.ok) {
        addToast('A nova temporada ja esta sendo preparada.', 'warning');
        return;
      }

      const newState = startNewSeason(state);
      setState(newState);
      await saveGame(newState);
      await maybeGrantSeasonRewards(previousSeason, newState);
      await completeWorldDayTick(worldId, tickKey, true);
      addToast('Offseason encerrada. A nova temporada ja comecou.', 'success');
    } catch (error: any) {
      await completeWorldDayTick(worldId, tickKey, false, error?.message || String(error));
      console.error('Erro ao abrir nova temporada:', error);
      addToast('Erro ao abrir nova temporada', 'error');
    }
  };

  return { handleAdvanceDay, handleStartNewSeason };
};
