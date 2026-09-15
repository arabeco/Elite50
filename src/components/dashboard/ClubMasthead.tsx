import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Player, Team } from '../../types';
import { PlayerAvatar } from '../PlayerAvatar';
import { TeamLogo } from '../TeamLogo';
import { getDistrictTheme } from '../../utils/districtTheme';

export function ClubMasthead({ team, players, season, onOpenTeam, phaseAction }: {
  team?: Team | null; players: Record<string, Player>; season: number; onOpenTeam?: () => void;
  phaseAction?: { label: string; action: string; onClick?: () => void; highlight?: boolean };
}) {
  const theme = getDistrictTheme(team?.district);
  const featured = team ? Object.values(players)
    .filter(player => player.contract.teamId === team.id)
    .sort((a, b) => b.totalRating - a.totalRating || a.id.localeCompare(b.id))[0] : null;
  return (
    <section className="club-masthead" aria-label="Identidade do clube">
      <div className="club-masthead__pitch" aria-hidden="true" />
      <div className="club-masthead__copy">
        <div className="sport-wordmark">ELITE <b>2050</b></div>
        <p className="club-masthead__edition">TEMPORADA {season} / {team ? 'LIGA ' + theme.label : 'QUATRO LIGAS. UM MUNDO.'}</p>
        <h2>{team?.name || 'O jogo é seu.'}</h2>
        {phaseAction ? <button type="button" className="sport-phase-action" data-highlight={phaseAction.highlight || undefined} onClick={phaseAction.onClick} disabled={!phaseAction.onClick}>
          <span>{phaseAction.label}</span><strong>{phaseAction.action} <ArrowUpRight size={16} aria-hidden="true" /></strong>
        </button> : <button type="button" onClick={onOpenTeam} disabled={!onOpenTeam} className="sport-team-link">{team ? 'Conhecer meu elenco' : 'Escolher meu clube'} <ArrowUpRight size={16} aria-hidden="true" /></button>}
      </div>
      {featured ? <div className="club-masthead__athlete">
        <PlayerAvatar player={featured} size="xl" mode="no-boots" cropBottomPercent={0} className="club-masthead__avatar" />
        <span className="club-masthead__rating">{featured.totalRating}<small>{featured.nickname}</small></span>
      </div> : team?.logo ? <div className="club-masthead__crest"><TeamLogo primaryColor={team.logo.primary} secondaryColor={team.logo.secondary} accentColor={team.logo.accent} shapeId={team.logo.shapeId} patternId={team.logo.patternId as any} symbolId={team.logo.symbolId} size={130} /></div> : null}
    </section>
  );
}
