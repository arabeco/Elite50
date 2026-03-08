import { useGame, useGameDispatch } from '../store/GameContext';
import { Player, GameNotification } from '../types';
import { supabase } from '../lib/supabase';
import { advanceGameDay, submitProposals, cancelDraftProposal } from '../engine/gameLogic';
import { SQUAD_SIZE_MAX } from '../constants/gameConstants';

export const useTransfers = (userTeamId: string | null, totalPoints: number, powerCap: number) => {
    const { state, setState, isOnline } = useGame();
    const { addToast } = useGameDispatch();

    const handleMakeProposal = async (player: Player) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;
        const isLobby = state.world.status === 'LOBBY';
        const isDraftDay = isLobby && (state.world.currentDay === 0 || state.world.currentDay === 1 || state.world.currentDay === 2);

        if (!userTeam) {
            addToast('Você precisa estar em um time para fazer uma proposta!', 'error');
            return;
        }

        // Check if already proposed to prevent double clicks/duplicates
        const isAlreadyProposed = state.world.draftProposals?.some(p => p.playerId === player.id && p.managerId === state.userManagerId);
        if (isDraftDay && isAlreadyProposed) {
            return; // Already in wishlist
        }

        if (userTeam.squad.length >= SQUAD_SIZE_MAX) {
            addToast(`Seu elenco já está cheio (máximo ${SQUAD_SIZE_MAX} jogadores)!`, 'error');
            return;
        }

        if (!isDraftDay && (player.satisfaction || 70) >= 80) {
            addToast(`${player.nickname} está muito feliz no clube atual e não tem interesse em sair agora. (Satisfação: ${player.satisfaction}%)`, 'warning');
            return;
        }

        const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
        // Also account for pending proposals in the power cap check
        const pendingPower = (state.world.draftProposals || [])
            .filter(p => p.managerId === state.userManagerId)
            .reduce((sum, p) => sum + (state.players[p.playerId]?.totalRating || 0), 0);

        const nextTotalPoints = currentPower + pendingPower + player.totalRating;

        if (nextTotalPoints > powerCap) {
            addToast(`A vinda de ${player.nickname} excederia o limite de ${powerCap} pts de Score!`, 'error');
            return;
        }

        if (isDraftDay) {
            if (!state.userManagerId) {
                addToast('User Manager ID não encontrado!', 'error');
                return;
            }
            // Genesis Draft Day 0, 1 or 2 wishlisting - No confirmation for draft to make it feel like "shopping"
            setState(prev => submitProposals(prev, state.userManagerId!, [player.id]));
            addToast(`${player.nickname} adicionado à Wishlist de Contratação!`, 'success');
        } else {
            const confirmMsg = `Deseja enviar uma proposta de roubo para ${player.nickname} por ${player.totalRating} pts? A IA responderá no próximo dia.`;
            if (window.confirm(confirmMsg)) {
                try {
                    const newProposal: any = {
                        id: `prop_${Date.now()}`,
                        playerId: player.id,
                        fromTeamId: userTeam.id,
                        toTeamId: player.contract.teamId || null,
                        value: player.totalRating,
                        status: 'PENDING',
                        date: state.world.currentDate
                    };

                    setState(prev => ({
                        ...prev,
                        transferProposals: [newProposal, ...(prev.transferProposals || [])]
                    }));

                    addToast(`Proposta de roubo enviada para ${player.nickname}! Aguarde a resposta da IA.`, 'success');
                } catch (error) {
                    console.error('Erro na transferência:', error);
                    addToast('Erro ao processar transferência.', 'error');
                }
            }
        }
    };

    const handleCancelDraftProposal = (playerId: string) => {
        if (!state.userManagerId) return;
        setState(prev => cancelDraftProposal(prev, state.userManagerId!, playerId));
        const player = state.players[playerId];
        if (player) {
            addToast(`${player.nickname} removido da sua Wishlist.`, 'info');
        }
    };

    const handleSellPlayer = async (playerId: string) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;

        if (!userTeam) {
            addToast('Você precisa estar em um time para vender um jogador!', 'error');
            return;
        }

        const player = state.players[playerId];
        if (!player) return;

        if (window.confirm(`Deseja dispensar ${player.nickname}? O teto de ${powerCap} pts será mantido.`)) {
            try {
                // If the player is contracted to another team, we must do a TRADE OFFER instead of selling directly
                // Actually handleSellPlayer is for RELEASING a player from your OWN team.
                const newNotification: GameNotification = {
                    id: `sell_${Date.now()}`,
                    date: new Date().toISOString(),
                    title: 'Atleta Dispensado',
                    message: `${player.nickname} deixou o ${userTeam.name}.`,
                    type: 'transfer',
                    read: false
                };

                setState(prev => {
                    const newState = { ...prev };

                    // Update player: set teamId to null (exiled)
                    newState.players[playerId] = {
                        ...player,
                        contract: {
                            ...player.contract,
                            teamId: '' // Clear team reference
                        }
                    };

                    // Update team: remove from squad and lineup, and PERSIST powerCap
                    const updatedSquad = newState.teams[userTeam.id].squad.filter(id => id !== playerId);
                    const updatedLineup = { ...newState.teams[userTeam.id].lineup };
                    Object.keys(updatedLineup).forEach(pos => {
                        if (updatedLineup[pos] === playerId) {
                            delete updatedLineup[pos];
                        }
                    });

                    newState.teams[userTeam.id] = {
                        ...newState.teams[userTeam.id],
                        squad: updatedSquad,
                        lineup: updatedLineup,
                        powerCap: powerCap // Ensure current cap is saved in team state
                    };

                    newState.notifications = [newNotification, ...(newState.notifications || [])];
                    return newState;
                });

                if (isOnline) {
                    const { data } = await supabase.auth.getUser();
                    // Optional: update transfer history or player status in DB
                    await supabase.from('notifications').insert({
                        user_id: data.user?.id,
                        title: newNotification.title,
                        message: newNotification.message,
                        type: newNotification.type
                    });
                }

                addToast(`${player.nickname} foi dispensado do elenco.`, 'success');
            } catch (error) {
                console.error('Erro ao dispensar jogador:', error);
                addToast('Erro ao dispensar jogador. Tente novamente.', 'error');
            }
        }
    };

    const handleSendTradeOffer = async (requestedPlayerId: string, offeredPlayerId: string) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;
        const isDraft = (state.world as any).status === 'DRAFT';

        if (!isDraft && !state.world.transferWindowOpen) {
            addToast('A janela de transferências está fechada em dias de jogo!', 'error');
            return;
        }

        if (!userTeam) {
            addToast('Você precisa estar em um time para propor trocas!', 'error');
            return;
        }

        const requestedPlayer = state.players[requestedPlayerId];
        const offeredPlayer = state.players[offeredPlayerId];
        const targetTeamId = requestedPlayer?.contract?.teamId;

        if (!targetTeamId) {
            addToast('O jogador solicitado não pertence a nenhum time!', 'error');
            return;
        }

        const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
        const nextPowerAfterSwap = currentPower - offeredPlayer.totalRating + requestedPlayer.totalRating;

        if (nextPowerAfterSwap > powerCap) {
            addToast(`Essa troca faria seu time exceder o limite de ${powerCap} pts! (Balanço: ${requestedPlayer.totalRating - offeredPlayer.totalRating} pts)`, 'error');
            return;
        }

        if (!isDraft && (requestedPlayer.satisfaction || 70) >= 85) {
            addToast(`${requestedPlayer.nickname} está muito satisfeito no clube atual e não aceitaria ser trocado agora.`, 'warning');
            return;
        }

        const confirmMsg = isDraft
            ? `Trocar ${offeredPlayer.nickname} (${offeredPlayer.totalRating} pts) por ${requestedPlayer.nickname} (${requestedPlayer.totalRating} pts)?`
            : `Propor troca de ${offeredPlayer.nickname} por ${requestedPlayer.nickname}?`;

        if (window.confirm(confirmMsg)) {
            if (isDraft) {
                // Instant trade during draft
                setState(prev => {
                    const newState = { ...prev };
                    const myTeam = newState.teams[userTeam.id];
                    const aiTeam = newState.teams[targetTeamId];

                    myTeam.squad = myTeam.squad.filter(id => id !== offeredPlayerId);
                    myTeam.squad.push(requestedPlayerId);
                    aiTeam.squad = aiTeam.squad.filter(id => id !== requestedPlayerId);
                    aiTeam.squad.push(offeredPlayerId);

                    newState.players[requestedPlayerId].contract.teamId = userTeam.id;
                    newState.players[offeredPlayerId].contract.teamId = targetTeamId;

                    return newState;
                });
                addToast('Troca efetuada com sucesso!', 'success');
            } else {
                const newOffer: any = {
                    id: `trade_${Date.now()}`,
                    fromTeamId: userTeam.id,
                    toTeamId: targetTeamId,
                    offeredPlayerId,
                    requestedPlayerId,
                    status: 'PENDING',
                    date: state.world.currentDate
                };

                setState(prev => ({
                    ...prev,
                    tradeOffers: [newOffer, ...(prev.tradeOffers || [])]
                }));

                // Simple AI logic for trade response
                const diff = offeredPlayer.totalRating - requestedPlayer.totalRating;
                const acceptanceChance = diff >= 0 ? 0.9 : 0.3 + (diff / 200);

                if (Math.random() < acceptanceChance) {
                    addToast(`O ${state.teams[targetTeamId].name} aceitou a proposta! A troca foi efetuada.`, 'success');
                    setState(prev => {
                        const newState = { ...prev };
                        const myTeam = newState.teams[userTeam.id];
                        const aiTeam = newState.teams[targetTeamId];

                        myTeam.squad = myTeam.squad.filter(id => id !== offeredPlayerId);
                        myTeam.squad.push(requestedPlayerId);
                        aiTeam.squad = aiTeam.squad.filter(id => id !== requestedPlayerId);
                        aiTeam.squad.push(offeredPlayerId);

                        newState.players[requestedPlayerId].contract.teamId = userTeam.id;
                        newState.players[offeredPlayerId].contract.teamId = targetTeamId;

                        if (newState.tradeOffers && newState.tradeOffers.length > 0) {
                            newState.tradeOffers[0].status = 'ACCEPTED';
                        }

                        return newState;
                    });
                } else {
                    addToast(`O ${state.teams[targetTeamId].name} recusou a troca.`, 'error');
                    setState(prev => {
                        const newState = { ...prev };
                        if (newState.tradeOffers && newState.tradeOffers.length > 0) {
                            newState.tradeOffers[0].status = 'DECLINED';
                        }
                        return newState;
                    });
                }
            }
        }
    };

    return { handleMakeProposal, handleSellPlayer, handleSendTradeOffer, handleCancelDraftProposal };
};
