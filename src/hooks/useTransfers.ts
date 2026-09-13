import { useGame, useGameDispatch } from '../store/GameContext';
import { getRecruitmentBlock, getRecruitmentBudget } from '../utils/recruitment';
import { Player, GameNotification } from '../types';
import { cancelDraftProposalInWorld, submitDraftProposalInWorld, supabase } from '../lib/supabase';
import { submitProposals, cancelDraftProposal, getDraftInterestReport } from '../engine/gameLogic';
import { GENESIS_DRAFT_LAST_DAY, SQUAD_SIZE_MAX } from '../constants/gameConstants';
import { addNews } from '../engine/newsService';
import { releasePlayerBootToInventory } from '../utils/store';

export const useTransfers = (userTeamId: string | null, totalPoints: number, powerCap: number) => {
    const { state, setState, saveGame, isOnline, worldId } = useGame();
    const { addToast, requestConfirm } = useGameDispatch();

    const handleMakeProposal = async (player: Player, options?: { quickDraft?: boolean }) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;
        const isDraftDay = state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY;

        if (!userTeam) {
            addToast('Assuma um clube antes de enviar propostas.', 'error');
            return;
        }

        const blocked = getRecruitmentBlock(state, userTeam.id, player, isDraftDay);
        if (blocked) { addToast(blocked, 'warning'); return; }

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
            addToast(`Elenco cheio: limite de ${SQUAD_SIZE_MAX} atletas.`, 'error');
            return;
        }

        if (!isDraftDay && (player.satisfaction || 70) >= 80) {
            addToast(`${player.nickname}: sem interesse em sair (${player.satisfaction}% satisfação).`, 'warning');
            return;
        }

        if (!isDraftDay && player.contract.teamId) {
            const currentTeam = state.teams[player.contract.teamId];
            const currentManager = currentTeam?.managerId ? state.managers[currentTeam.managerId] : null;
            const belongsToHuman = currentManager?.isNPC === false
                || (state.participants || []).some(participant => participant.teamId === currentTeam?.id);
            if (belongsToHuman) {
                addToast(`${player.nickname} pertence a um clube humano. Use uma proposta de troca.`, 'warning');
                return;
            }
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

        if (isDraftDay) {
            if (!state.userManagerId) {
                addToast('Manager do usuário não encontrado.', 'error');
                return;
            }
            const interest = getDraftInterestReport(state, userTeam.id, player.id);
            if (interest.chance <= 0) {
                addToast(`${player.nickname}: ${interest.label}. ${interest.reasons[0]}`, 'warning');
                return;
            }
            // Draft proposals reserve score until the daily resolution accepts or rejects them.
            const remainingAfterReserve = powerCap - nextTotalPoints;
            const confirmed = await requestConfirm({
                title: 'Reservar no Draft',
                message: `${player.nickname} ocupa ${player.totalRating} de score ate a resolucao. Chance estimada: ${interest.chance}% (${interest.label}). ${interest.reasons[0]} Score restante apos reserva: ${remainingAfterReserve}.`,
                confirmLabel: 'Reservar',
            });
            if (!confirmed) return;

            try {
                if (isOnline && worldId) {
                    await submitDraftProposalInWorld(worldId, player.id);
                }
                if (isOnline && worldId) {
                    setState(prev => submitProposals(prev, state.userManagerId!, [player.id]));
                } else {
                    const nextState = submitProposals(state, state.userManagerId!, [player.id]);
                    setState(nextState);
                    await saveGame(nextState);
                }
                addToast(`${player.nickname} adicionado. ${player.totalRating} de score reservado.`, 'success');
            } catch (error) {
                console.error('Erro ao enviar escolha do Draft:', error);
                addToast('Nao foi possivel adicionar esse atleta.', 'error');
            }
            return;
        } else {
            const confirmed = await requestConfirm({
                title: `Contratar ${player.nickname}?`,
                message: `Ele ocupa ${player.totalRating} pontos do limite do elenco. Sobram ${getRecruitmentBudget(state, userTeam.id).remaining - player.totalRating} pontos após a proposta. ${state.world.transferWindowOpen ? "A resposta chega na próxima virada do dia; a contratação não é garantida." : "A janela está fechada: a proposta aguarda a reabertura."}`,
                confirmLabel: 'Enviar proposta',
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

                    const nextState = {
                        ...state,
                        transferProposals: [newProposal, ...(state.transferProposals || [])]
                    };

                    setState(nextState);
                    await saveGame(nextState);
                    addToast(`Proposta enviada para ${player.nickname}. Resposta na proxima virada.`, 'success');
                } catch (error) {
                    console.error('Erro na transferência:', error);
                    addToast('Erro ao processar transferência.', 'error');
                }
            }
        }
    };

    const handleCancelDraftProposal = async (playerId: string) => {
        if (!state.userManagerId) return;
        try {
            if (isOnline && worldId) {
                await cancelDraftProposalInWorld(worldId, playerId);
            }
            if (isOnline && worldId) {
                setState(prev => cancelDraftProposal(prev, state.userManagerId!, playerId));
            } else {
                const nextState = cancelDraftProposal(state, state.userManagerId!, playerId);
                setState(nextState);
                await saveGame(nextState);
            }
            const player = state.players[playerId];
            if (player) addToast(`${player.nickname} removido.`, 'info');
        } catch (error) {
            console.error('Erro ao remover escolha do Draft:', error);
            addToast('Nao foi possivel remover esse atleta.', 'error');
        }
    };

    const handleSellPlayer = async (playerId: string) => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;

        if (!userTeam) {
            addToast('Assuma um clube antes de dispensar atletas.', 'error');
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
                        satisfaction: Math.min(player.satisfaction || 70, 55),
                        contract: {
                            ...player.contract,
                            teamId: null
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

                // Aqui existia um insert em `public.notifications`, tabela que nao existe
                // em nenhuma migration. O retorno nunca era verificado, entao toda dispensa
                // disparava um POST que falhava em silencio. As notificacoes do jogador ja
                // sao persistidas na coluna `notifications` de `public.games`, via saveGame.

                addToast(`${player.nickname} foi dispensado do elenco.`, 'success');
            } catch (error) {
                console.error('Erro ao dispensar jogador:', error);
                addToast('Erro ao dispensar jogador. Tente novamente.', 'error');
            }
        }
    };

    const handleSendTradeOffer = async (requestedPlayerId: string, offeredPlayerId: string): Promise<boolean> => {
        const userTeam = userTeamId ? state.teams[userTeamId] : null;
        const isDraft = (state.world as any).status === 'DRAFT';


        if (!userTeam) {
            addToast('Você precisa estar em um time para propor trocas!', 'error');
            return false;
        }

        const requestedPlayer = state.players[requestedPlayerId];
        const offeredPlayer = state.players[offeredPlayerId];
        const targetTeamId = requestedPlayer?.contract?.teamId;

        if (!offeredPlayer || offeredPlayer.contract.teamId !== userTeam.id || !userTeam.squad.includes(offeredPlayerId) || targetTeamId === userTeam.id) {
            addToast('Escolha um atleta do seu elenco para oferecer.', 'warning');
            return false;
        }
        if (!targetTeamId) {
            addToast('O jogador solicitado não pertence a nenhum time!', 'error');
            return false;
        }

        const alreadyPending = (state.tradeOffers || []).some(offer =>
            offer.status === 'PENDING' &&
            offer.fromTeamId === userTeam.id &&
            offer.toTeamId === targetTeamId &&
            offer.requestedPlayerId === requestedPlayerId
        );
        if (alreadyPending) {
            addToast(`${requestedPlayer.nickname} ja tem uma troca pendente. A resposta vem na proxima virada.`, 'warning');
            return false;
        }

        const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
        const nextPowerAfterSwap = currentPower - offeredPlayer.totalRating + requestedPlayer.totalRating;

        if (nextPowerAfterSwap > powerCap) {
            addToast(`Essa troca faria seu time exceder o Score Máximo de ${powerCap} pts! (Balanço: ${requestedPlayer.totalRating - offeredPlayer.totalRating} pts)`, 'error');
            return false;
        }

        if (!isDraft && (requestedPlayer.satisfaction || 70) >= 85) {
            addToast(`${requestedPlayer.nickname} está muito satisfeito no clube atual e não aceitaria ser trocado agora.`, 'warning');
            return false;
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

                const nextState = {
                    ...state,
                    tradeOffers: [newOffer, ...(state.tradeOffers || [])]
                };

                setState(nextState);
                await saveGame(nextState);
                addToast(`Troca enviada ao ${state.teams[targetTeamId].name}. A resposta vem na proxima virada.`, 'success');
            }
            return true;
        }

        // O usuario cancelou no dialogo de confirmacao.
        return false;
    };

    return { handleMakeProposal, handleSellPlayer, handleSendTradeOffer, handleCancelDraftProposal };
};
