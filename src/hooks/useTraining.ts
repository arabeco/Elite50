import { useGame } from '../store/GameContext';
import { PlayStyle } from '../types';
import { applyManagerTacticalMemoryFloor } from '../utils/managerTacticalMemory';

export const useTraining = (userTeamId: string | null) => {
    const { state, setState, addToast } = useGame();

    const handleSetFocus = (type: 'evolution' | 'stabilization', playerId: string | null) => {
        setState(prev => ({
            ...prev,
            training: {
                ...prev.training,
                individualFocus: {
                    ...prev.training.individualFocus,
                    [type === 'evolution' ? 'evolutionSlot' : 'stabilizationSlot']: playerId
                }
            }
        }));
    };

    const handleStartCardLab = (cardType: string, selectedLabSlot: number | null) => {
        if (selectedLabSlot === null) return;

        const finishDate = new Date(state.world.currentDate);
        finishDate.setDate(finishDate.getDate() + 3);

        setState(prev => {
            const newSlots = [...prev.training.cardLaboratory.slots];
            newSlots[selectedLabSlot] = {
                cardId: cardType,
                finishTime: finishDate.toISOString()
            };
            return {
                ...prev,
                training: {
                    ...prev.training,
                    cardLaboratory: {
                        ...prev.training.cardLaboratory,
                        slots: newSlots
                    }
                }
            };
        });
        addToast(`${cardType} iniciado no laboratorio. Conclui em 3 dias.`, 'success');
    };

    const handleChemistryBoost = () => {
        // ... (removed or kept for compatibility, but user wants to replace it)
        // I will keep the function signature but maybe the UI won't use it anymore
    };

    const handleSetPlaystyleTraining = (style: string | null) => {
        setState(prev => {
            const manager = prev.userManagerId ? prev.managers[prev.userManagerId] : null;
            const nextTraining = applyManagerTacticalMemoryFloor(prev.training, manager, style as PlayStyle | null);
            const nextUnderstanding = style ? (nextTraining.playstyleTraining.understanding[style] || 0) : 0;

            if (style && nextUnderstanding > (prev.training.playstyleTraining.understanding[style] || 0)) {
                addToast(`${style} recuperado do curriculo do manager: ${nextUnderstanding}% de base.`, 'success');
            }

            return {
                ...prev,
                training: nextTraining
            };
        });
    };

    const handleStartLegacyTraining = (playerId: string, type: 'CURE' | 'LEARN', trait?: string) => {
        const player = state.players[playerId];
        if (!player) return;

        const targetTrait = type === 'CURE'
            ? (player.badges.slot4 || 'Fardo')
            : (trait || 'Clutch');

        setState(prev => ({
            ...prev,
            players: {
                ...prev.players,
                [playerId]: {
                    ...prev.players[playerId],
                    badges: {
                        ...prev.players[playerId].badges,
                        trainingSlot4: {
                            trait: targetTrait,
                            daysLeft: type === 'CURE' ? 5 : 7,
                            type,
                            targetRarity: type === 'CURE' ? 'Bronze' : 'Ouro'
                        }
                    }
                }
            }
        }));

        addToast(
            type === 'CURE'
                ? `${player.nickname} iniciou cura do legado.`
                : `${player.nickname} iniciou treino de trait: ${targetTrait}.`,
            'success'
        );
    };

    return { handleSetFocus, handleStartCardLab, handleChemistryBoost, handleSetPlaystyleTraining, handleStartLegacyTraining };
};
