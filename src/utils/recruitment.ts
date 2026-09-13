import { GameState, Player } from '../types';
import { getTeamPowerCap } from '../engine/gameLogic';
import { SQUAD_SIZE_MAX } from '../constants/gameConstants';

export const isHumanClub = (state: GameState, teamId?: string | null) => {
  const team = teamId ? state.teams[teamId] : null;
  return !!team && (state.managers[team.managerId || '']?.isNPC === false
    || (state.participants || []).some(participant => participant.teamId === team.id));
};

export function getRecruitmentBudget(state: GameState, teamId: string) {
  const team = state.teams[teamId];
  const owned = new Set(team?.squad || []);
  const reserved = new Set([
    ...(state.world.draftProposals || []).filter(p => p.teamId === teamId).map(p => p.playerId),
    ...(state.transferProposals || []).filter(p => p.toTeamId === teamId && ['PENDING', 'WAITING_WINDOW'].includes(p.status)).map(p => p.playerId),
  ].filter(id => !owned.has(id)));
  const used = [...owned].reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
  const pending = [...reserved].reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
  const cap = getTeamPowerCap(team, state.players);
  return { cap, used, pending, remaining: cap - used - pending, slots: Math.max(0, SQUAD_SIZE_MAX - owned.size - reserved.size), reserved };
}

export function getRecruitmentBlock(state: GameState, teamId: string, player: Player, draft: boolean): string | null {
  const budget = getRecruitmentBudget(state, teamId);
  if (player.contract.teamId === teamId) return 'Já está no elenco';
  if (budget.reserved.has(player.id)) return 'Proposta enviada';
  if (isHumanClub(state, player.contract.teamId)) return 'Disponível apenas por troca';
  if (budget.slots === 0) return 'Elenco e reservas completos';
  if (player.totalRating > budget.remaining) return `Faltam ${player.totalRating - budget.remaining} pontos de espaço`;
  if (!draft && (player.satisfaction ?? 70) >= 80) return 'Não quer sair do clube';
  return null;
}
