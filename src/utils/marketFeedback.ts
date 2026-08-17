import { GameState } from '../types';

export type MarketFeedback = {
  message: string;
  type: 'success' | 'warning';
};

export const getMarketFeedback = (previous: GameState, current: GameState): MarketFeedback[] => {
  const teamId = current.userTeamId;
  if (!teamId || previous.worldId !== current.worldId) return [];

  const feedback: MarketFeedback[] = [];
  const currentTransfers = new Map((current.transferProposals || []).map(proposal => [proposal.id, proposal]));
  const currentTrades = new Map((current.tradeOffers || []).map(offer => [offer.id, offer]));

  (previous.transferProposals || [])
    .filter(proposal => proposal.toTeamId === teamId && proposal.status === 'PENDING')
    .forEach(previousProposal => {
      const proposal = currentTransfers.get(previousProposal.id);
      if (!proposal || proposal.status === 'PENDING' || proposal.status === 'WAITING_WINDOW') return;
      const player = current.players[proposal.playerId];
      feedback.push({
        message: proposal.status === 'ACCEPTED'
          ? `Contratacao concluida: ${player?.nickname || 'o atleta'} chegou ao clube.`
          : `Proposta recusada: ${player?.nickname || 'o atleta'} nao vem para o clube.`,
        type: proposal.status === 'ACCEPTED' ? 'success' : 'warning',
      });
    });

  (previous.tradeOffers || [])
    .filter(offer => offer.fromTeamId === teamId && offer.status === 'PENDING')
    .forEach(previousOffer => {
      const offer = currentTrades.get(previousOffer.id);
      if (!offer || offer.status === 'PENDING') return;
      const player = current.players[offer.requestedPlayerId];
      feedback.push({
        message: offer.status === 'ACCEPTED'
          ? `Troca aceita: ${player?.nickname || 'o atleta'} chegou ao clube.`
          : `Troca recusada por ${player?.nickname || 'o atleta'}.`,
        type: offer.status === 'ACCEPTED' ? 'success' : 'warning',
      });
    });

  return feedback;
};
