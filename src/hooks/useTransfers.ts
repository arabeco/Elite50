import { useGame, useGameDispatch } from '../store/GameContext';
import { Player, GameNotification } from '../types';
import { supabase } from '../lib/supabase';
import { advanceGameDay, submitProposals, cancelDraftProposal } from '../engine/gameLogic';
import { SQUAD_SIZE_MAX } from '../constants/gameConstants';
import { calculateTradeAcceptanceChance } from '../engine/economyLogic';
import { addNews } from '../engine/newsService';
import { releasePlayerBootToInventory } from '../utils/store';

export const useTransfers = (userTeamId: string | null, totalPoints: number, powerCap: number) => {
    const { state, setState, isOnline } = useGame();
    const { addToast, requestConfirm } = useGameDispatch();

    const handleMakeProposal = async (player: Player) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;
        const isDraftDay = state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay < 2;

        if (!userTeam) {
            addToast('VocÃª precisa estar em um time para fazer uma proposta!', 'error');
            return;
        }

        // Check if already proposed to prevent double clicks/duplicates
        const isAlreadyProposed = state.world.draftProposals?.some(p => p.playerId === player.id && p.managerId === state.userManagerId);
        if (isDraftDay && isAlreadyProposed) {
            addToast(`${player.nickname} ja esta reservado na sua lista. O score dele continua ocupado ate o Draft resolver.`, 'warning');
            return;
        }

        const hasPendingMarketProposal = !isDraftDay && (state.transferProposals || []).some(proposal =>
            proposal.playerId === player.id &&
            proposal.toTeamId === userTeam.id &&
            proposal.status === 'PENDING'
        );
        if (hasPendingMarketProposal) {
            addToast(`${player.nickname} ja esta na sua fila de propostas para a proxima virada.`, 'warning');
            return;
        }

        if (userTeam.squad.length >= SQUAD_SIZE_MAX) {
            addToast(`Seu elenco jÃ¡ estÃ¡ cheio (mÃ¡ximo ${SQUAD_SIZE_MAX} jogadores)!`, 'error');
            return;
        }

        if (!isDraftDay && (player.satisfaction || 70) >= 80) {
            addToast(`${player.nickname} estÃ¡ muito feliz no clube atual e nÃ£o tem interesse em sair agora. (SatisfaÃ§Ã£o: ${player.satisfaction}%)`, 'warning');
            return;
        }

        if (isDraftDay) {
            const currentTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;
            const currentManager = currentTeam?.managerId ? state.managers[currentTeam.managerId] : null;
            if (currentManager?.isNPC === false) {
                addToast(`${player.nickname} pertence a um clube humano e nao entra no Draft Genesis.`, 'warning');
                return;
            }
        }

        const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
        // Also account for pending proposals in the power cap check
        const pendingDraftPower = (state.world.draftProposals || [])
            .filter(p => p.managerId === state.userManagerId)
            .reduce((sum, p) => sum + (state.players[p.playerId]?.totalRating || 0), 0);
        const pendingMarketPower = (state.transferProposals || [])
            .filter(p => p.toTeamId === userTeam.id && p.status === 'PENDING')
            .reduce((sum, p) => sum + (state.players[p.playerId]?.totalRating || 0), 0);
        const pendingPower = pendingDraftPower + pendingMarketPower;

        const nextTotalPoints = currentPower + pendingPower + player.totalRating;
        const exceedsPowerCap = nextTotalPoints > powerCap;

        if (exceedsPowerCap) {
            addToast(`A vinda de ${player.nickname} excederia o Score Maximo de ${powerCap} pts. Pendentes ja ocupam ${pendingPower} pts.`, 'error');
            return;
        }

        if (nextTotalPoints > powerCap) {
            addToast(`A vinda de ${player.nickname} excederia o Score MÃ¡ximo de ${powerCap} pts!`, 'error');
            return;
        }

        if (isDraftDay) {
            if (!state.userManagerId) {
                addToast('User Manager ID nÃ£o encontrado!', 'error');
                return;
            }
            // Draft proposals reserve score until the daily resolution accepts or rejects them.
            const remainingAfterReserve = powerCap - nextTotalPoints;
            const confirmed = await requestConfirm({
                title: 'Reservar no Draft',
                message: `${player.nickname} ocupa ${player.totalRating} de score ate a resolucao. Score restante apos reserva: ${remainingAfterReserve}.`,
                confirmLabel: 'Reservar',
            });
            if (!confirmed) return;

            setState(prev => submitProposals(prev, state.userManagerId!, [player.id]));
            addToast(`Proposta enviada para ${player.nickname}. ${player.totalRating} de score reservado e removido da pool ate o Draft resolver.`, 'success');
            return;
        } else {
            const confirmed = await requestConfirm({
                title: 'Propor contratação',
                message: `${player.nickname} entra na fila da virada por ${player.totalRating} de score. Se outro clube tambem chamar, ele escolhe a melhor proposta.`,
                confirmLabel: 'Propor',
            });
            if (confirmed) {
                try {
                    const newProposal: any = {
                        id: `prop_${Date.now()}`,
                        playerId: player.id,
                        fromTeamId: player.contract.teamId || null,
                        toTeamId: userTeam.id,
                        value: player.totalRating,
                        status: 'PENDING',
                        date: state.world.currentDate
                    };

                    setState(prev => ({
                        ...prev,
                        transferProposals: [newProposal, ...(prev.transferProposals || [])]
                    }));

                    addToast(`${player.nickname} entrou na sua fila. A resposta vem na proxima virada.`, 'success');
                } catch (error) {
                    console.error('Erro na transferÃªncia:', error);
                    addToast('Erro ao processar transferÃªncia.', 'error');
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
            addToast('VocÃª precisa estar em um time para vender um jogador!', 'error');
            return;
        }

        const player = state.players[playerId];
        if (!player) return;

        const confirmed = await requestConfirm({
            title: 'Dispensar atleta',
            message: `Dispensar ${player.nickname}? O Score Maximo de ${powerCap} pts sera mantido.`,
            confirmLabel: 'Dispensar',
            tone: 'danger',
        });
        if (confirmed) {
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
                    const newState = releasePlayerBootToInventory({ ...prev }, playerId);

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
                    addNews(
                        newState,
                        'ATLETA DISPENSADO',
                        `${player.nickname} deixou o ${userTeam.name} e ficou disponivel no mercado.`,
                        'TRANSFER',
                        1,
                        {
                            kind: 'PLAYER_PROFILE',
                            season: newState.world.currentSeason || 2050,
                            playerId: player.id,
                            teamId: userTeam.id
                        }
                    );
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


        if (!userTeam) {
            addToast('VocÃª precisa estar em um time para propor trocas!', 'error');
            return;
        }

        const requestedPlayer = state.players[requestedPlayerId];
        const offeredPlayer = state.players[offeredPlayerId];
        const targetTeamId = requestedPlayer?.contract?.teamId;

        if (!targetTeamId) {
            addToast('O jogador solicitado nÃ£o pertence a nenhum time!', 'error');
            return;
        }

        const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
        const nextPowerAfterSwap = currentPower - offeredPlayer.totalRating + requestedPlayer.totalRating;

        if (nextPowerAfterSwap > powerCap) {
            addToast(`Essa troca faria seu time exceder o Score MÃ¡ximo de ${powerCap} pts! (BalanÃ§o: ${requestedPlayer.totalRating - offeredPlayer.totalRating} pts)`, 'error');
            return;
        }

        if (!isDraft && (requestedPlayer.satisfaction || 70) >= 85) {
            addToast(`${requestedPlayer.nickname} estÃ¡ muito satisfeito no clube atual e nÃ£o aceitaria ser trocado agora.`, 'warning');
            return;
        }

        const confirmMsg = isDraft
            ? `Trocar ${offeredPlayer.nickname} (${offeredPlayer.totalRating} pts) por ${requestedPlayer.nickname} (${requestedPlayer.totalRating} pts)?`
            : `Propor troca de ${offeredPlayer.nickname} por ${requestedPlayer.nickname}?`;

        const confirmed = await requestConfirm({
            title: isDraft ? 'Confirmar troca' : 'Propor troca',
            message: confirmMsg,
            confirmLabel: isDraft ? 'Trocar' : 'Propor',
        });
        if (confirmed) {
            if (isDraft) {
                // Instant trade during draft
                setState(prev => {
                    const newState = releasePlayerBootToInventory({ ...prev }, offeredPlayerId);
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
                const acceptanceChance = calculateTradeAcceptanceChance(offeredPlayer, requestedPlayer);

                if (Math.random() < acceptanceChance) {
                    addToast(`O ${state.teams[targetTeamId].name} aceitou a proposta! A troca foi efetuada.`, 'success');
                    setState(prev => {
                        const newState = releasePlayerBootToInventory({ ...prev }, offeredPlayerId);
                        const myTeam = newState.teams[userTeam.id];
                        const aiTeam = newState.teams[targetTeamId];

                        myTeam.squad = myTeam.squad.filter(id => id !== offeredPlayerId);
                        myTeam.squad.push(requestedPlayerId);
                        aiTeam.squad = aiTeam.squad.filter(id => id !== requestedPlayerId);
                        aiTeam.squad.push(offeredPlayerId);

                        newState.players[requestedPlayerId].contract.teamId = userTeam.id;
                        newState.players[offeredPlayerId].contract.teamId = targetTeamId;
                        addNews(
                            newState,
                            'TROCA CONFIRMADA',
                            `${userTeam.name} recebeu ${requestedPlayer.nickname}; ${state.teams[targetTeamId].name} ficou com ${offeredPlayer.nickname}.`,
                            'TRANSFER',
                            2,
                            {
                                kind: 'PLAYER_PROFILE',
                                season: newState.world.currentSeason || 2050,
                                playerId: requestedPlayer.id,
                                teamId: userTeam.id
                            }
                        );

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
