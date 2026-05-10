import { GameState } from '../types';
import { getManagerSeasonGoldBonusPct } from './managerStats';

export interface SeasonRewardResult {
  season: number;
  gold: number;
  fragments: number;
  reasons: string[];
  payload: Record<string, unknown>;
}

export const calculateSeasonRewardsForUser = (state: GameState): SeasonRewardResult | null => {
  const manager = state.userManagerId ? state.managers[state.userManagerId] : null;
  const teamId = state.userTeamId || manager?.career.currentTeamId;
  const team = teamId ? state.teams[teamId] : null;
  const latestReport = state.world.history?.[0];

  if (!manager || !team || !latestReport) return null;

  const season = latestReport.season;
  const reasons: string[] = ['Temporada completada'];
  let gold = 40;
  let fragments = 2;

  gold += 10;
  reasons.push('Season report gerado');

  if (manager.career.currentTeamId === team.id) {
    gold += 10;
    reasons.push('Clube mantido ate o fechamento');
  }

  const teamStanding = Object.entries(latestReport.finalStandings || {})
    .flatMap(([leagueId, standings]) => standings.map((standing, index) => ({
      leagueId,
      position: index + 1,
      teamId: standing.teamId,
    })))
    .find(row => row.teamId === team.id);

  if (teamStanding?.position === 1) {
    gold += 35;
    fragments += 3;
    reasons.push('Campeao da liga');
  } else if (teamStanding?.position === 2) {
    gold += 25;
    reasons.push('Vice da liga');
  } else if (teamStanding && teamStanding.position <= 4) {
    gold += 15;
    reasons.push('Top 4 da liga');
  }

  if (latestReport.eliteCupWinnerId === team.id) {
    gold += 25;
    fragments += 2;
    reasons.push('Campeao da Copa Elite');
  }

  if (latestReport.managerHighlight?.teamId === team.id) {
    gold += 10;
    reasons.push('Tecnico destaque da temporada');
  }

  const hasHighlightedPlayer =
    latestReport.mvpRating?.playerId &&
    team.squad.includes(latestReport.mvpRating.playerId);

  if (hasHighlightedPlayer) {
    gold += 10;
    reasons.push('Jogador destaque no elenco');
  }

  const hasElite50Player = team.squad.some(playerId => (state.players[playerId]?.totalRating || 0) >= 850);
  if (hasElite50Player) {
    gold += 5;
    reasons.push('Elenco com atleta de elite');
  }

  const managerGoldBonusPct = getManagerSeasonGoldBonusPct(manager);
  const managerGoldBonus = managerGoldBonusPct > 0 ? Math.floor(gold * managerGoldBonusPct / 100) : 0;
  if (managerGoldBonus > 0) {
    gold += managerGoldBonus;
    reasons.push(`Evolucao do manager +${managerGoldBonusPct}%`);
  }

  return {
    season,
    gold,
    fragments,
    reasons,
    payload: {
      teamId: team.id,
      teamName: team.name,
      leaguePosition: teamStanding?.position || null,
      eliteCupWinner: latestReport.eliteCupWinnerId === team.id,
      managerHighlight: latestReport.managerHighlight?.teamId === team.id,
      highlightedPlayer: hasHighlightedPlayer || false,
      managerGoldBonusPct,
      managerGoldBonus,
      reasons,
    },
  };
};
