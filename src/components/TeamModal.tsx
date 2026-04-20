import React from 'react';
import { X, Users, Zap, Trophy, BarChart3, Shield, Star, CalendarDays, LayoutGrid, Rows3 } from 'lucide-react';
import { LeagueState, Match, Team, Player } from '../types';
import { TeamLogo } from './TeamLogo';
import { PlayerCard } from './PlayerCard';
import { useGameDispatch, useGameState } from '../store/GameContext';

interface TeamModalProps {
  team: Team;
  players: Record<string, Player>;
  onClose: () => void;
  onPlayerClick: (player: Player) => void;
  onTeamClick?: (teamId: string) => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ team, players, onClose, onPlayerClick, onTeamClick }) => {
  const { state, isSyncing } = useGameState();
  const { claimTeam } = useGameDispatch();
  const [rosterViewMode, setRosterViewMode] = React.useState<'cards' | 'list'>('cards');
  const squadPlayers = (team.squad || []).map(id => players[id]).filter(Boolean);
  const squadPlayersByRole = {
    GOL: squadPlayers.filter(player => player.role === 'GOL'),
    ZAG: squadPlayers.filter(player => player.role === 'ZAG'),
    MEI: squadPlayers.filter(player => player.role === 'MEI'),
    ATA: squadPlayers.filter(player => player.role === 'ATA'),
  };
  const totalRating = squadPlayers.reduce((sum, player) => sum + player.totalRating, 0);
  const averageRating = squadPlayers.length > 0 ? Math.round(totalRating / squadPlayers.length) : 0;
  const seasonScoreDelta = squadPlayers.reduce((sum, player) => sum + (player.history?.seasonRatingDelta || 0), 0);
  const averageMatchRating = squadPlayers.length > 0
    ? Number((squadPlayers.reduce((sum, player) => sum + (player.history?.averageRating || 0), 0) / squadPlayers.length).toFixed(2))
    : 0;
  const league = (Object.values(state.world.leagues || {}) as LeagueState[]).find(l => l.standings.some(row => row.teamId === team.id));
  const sortedStandings = league
    ? [...league.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    })
    : [];
  const leaguePosition = sortedStandings.findIndex(row => row.teamId === team.id) + 1;
  const titles = team.titles || { league: 0, cup: 0, total: 0 };
  const achievements = team.achievements || [];
  const manager = team.managerId ? state.managers[team.managerId] : null;
  const isHumanClub = !!manager && (manager.isNPC === false || !manager.id.startsWith('m_'));
  const isObserver = !state.userTeamId && (!!state.userManagerId || !state.isCreator);
  const starPlayer = [...squadPlayers].sort((a, b) => b.totalRating - a.totalRating)[0] || null;
  const allMatches: Match[] = [
    ...(Object.values(state.world.leagues || {}) as LeagueState[]).flatMap(leagueState => leagueState.matches || []),
    ...(state.world.eliteCup?.bracket?.round1 || []),
    ...(state.world.eliteCup?.bracket?.quarters || []),
    ...(state.world.eliteCup?.bracket?.semis || []),
    ...(state.world.eliteCup?.bracket?.final ? [state.world.eliteCup.bracket.final] : []),
    ...(state.world.districtCup?.matches || []),
    ...(state.world.districtCup?.final ? [state.world.districtCup.final] : []),
  ];
  const recentMatches = allMatches
    .filter(match => match.played && (match.homeTeamId === team.id || match.awayTeamId === team.id))
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateDiff || (b.round || 0) - (a.round || 0);
    })
    .slice(0, 5);

  const getMatchSummary = (match: Match) => {
    const isHome = match.homeTeamId === team.id;
    const opponent = state.teams[isHome ? match.awayTeamId : match.homeTeamId];
    const teamScore = isHome ? match.homeScore ?? 0 : match.awayScore ?? 0;
    const opponentScore = isHome ? match.awayScore ?? 0 : match.homeScore ?? 0;
    const result = teamScore > opponentScore ? 'V' : teamScore < opponentScore ? 'D' : 'E';
    return {
      opponent,
      score: `${teamScore}-${opponentScore}`,
      result,
      venue: isHome ? 'Casa' : 'Fora',
    };
  };

  const handleClaimTeam = async () => {
    const name = window.prompt('Nome do manager neste mundo:') || undefined;
    await claimTeam(team.id, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-[2rem] border border-cyan-500/40 bg-slate-950/90 shadow-[0_0_60px_rgba(6,182,212,0.18)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-black/60 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-cyan-950/40 via-slate-950 to-fuchsia-950/30 p-4 sm:p-6">
          <div className="absolute right-0 top-0 h-48 w-48 translate-x-16 -translate-y-16 rounded-full bg-cyan-500/10 blur-[70px]" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-6 pr-10">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl sm:h-24 sm:w-24">
              <TeamLogo
                primaryColor={team.logo?.primary || team.colors.primary || '#fff'}
                secondaryColor={team.logo?.secondary || team.colors.secondary || '#111'}
                accentColor={team.logo?.accent}
                shapeId={team.logo?.shapeId}
                patternId={(team.logo?.patternId || 'none') as any}
                symbolId={team.logo?.symbolId || 'Shield'}
                size={window.innerWidth < 640 ? 54 : 70}
              />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">
                {team.district} - {team.league}
              </p>
              <h2 className="truncate text-2xl font-black uppercase italic tracking-tighter text-white sm:text-4xl">
                {team.name}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                  <Users size={12} /> {squadPlayers.length} atletas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                  <Zap size={12} /> {totalRating} score
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                  <BarChart3 size={12} /> {averageRating} media
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                  seasonScoreDelta >= 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                }`}>
                  <Zap size={12} /> Season {seasonScoreDelta >= 0 ? '+' : ''}{seasonScoreDelta}
                </span>
                {leaguePosition > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                    <Trophy size={12} /> {leaguePosition}o na liga
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-amber-200">
                  <Trophy size={12} /> {titles.total} titulos
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                  isHumanClub
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                    : 'border-white/10 bg-white/[0.04] text-slate-300'
                }`}>
                  <Shield size={12} /> {isHumanClub ? 'Humano' : 'IA'}
                </span>
              </div>
            </div>
            {isObserver && !isHumanClub && team.id.startsWith('t_') && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleClaimTeam}
                className="ml-auto hidden shrink-0 rounded-xl border border-cyan-400/40 bg-cyan-400 px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-cyan-300 disabled:opacity-50 sm:block"
              >
                Assumir clube
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-4 sm:p-6 slim-scrollbar">
          {isObserver && !isHumanClub && team.id.startsWith('t_') && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleClaimTeam}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400 px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-cyan-300 disabled:opacity-50 sm:hidden"
            >
              <Shield size={13} /> Assumir clube
            </button>
          )}

          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Total</p>
              <p className="mt-1 text-2xl font-black italic text-white">{titles.total}</p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-cyan-200">Ligas</p>
              <p className="mt-1 text-2xl font-black italic text-white">{titles.league}</p>
            </div>
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-fuchsia-200">Copas</p>
              <p className="mt-1 text-2xl font-black italic text-white">{titles.cup}</p>
            </div>
            <div className={`rounded-xl border p-3 ${
              seasonScoreDelta >= 0
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : 'border-rose-500/20 bg-rose-500/10'
            }`}>
              <p className="text-[7px] font-black uppercase tracking-widest text-white/45">Score Season</p>
              <p className={`mt-1 text-2xl font-black italic ${seasonScoreDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {seasonScoreDelta >= 0 ? '+' : ''}{seasonScoreDelta}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-cyan-200">Nota Media</p>
              <p className="mt-1 text-2xl font-black italic text-white">{averageMatchRating || '--'}</p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
            <button
              type="button"
              disabled={!starPlayer}
              onClick={() => starPlayer && onPlayerClick(starPlayer)}
              className="group rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-black/20 p-3 text-left transition hover:border-amber-300/50 hover:bg-amber-500/15 disabled:cursor-default"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-amber-300">
                  <Star size={13} /> Craque do clube
                </div>
                <span className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white/35">
                  abrir perfil
                </span>
              </div>
              {starPlayer ? (
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-black uppercase italic tracking-tight text-white">{starPlayer.nickname}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/35">
                      {starPlayer.role} - {starPlayer.history.goals || 0} gols - nota {starPlayer.history.averageRating?.toFixed?.(1) || '--'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/30">Rating</p>
                    <p className="text-3xl font-black italic text-amber-300">{starPlayer.totalRating}</p>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-white/25">Sem elenco registrado.</p>
              )}
            </button>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-cyan-300">
                  <CalendarDays size={13} /> Ultimos resultados
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-white/25">{recentMatches.length}/5</span>
              </div>
              {recentMatches.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {recentMatches.map(match => {
                    const summary = getMatchSummary(match);
                    return (
                      <div key={match.id} className="rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                            summary.result === 'V'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : summary.result === 'D'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {summary.result}
                          </span>
                          <span className="text-sm font-black italic text-white">{summary.score}</span>
                        </div>
                        <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wider text-white/70">
                          {summary.opponent?.name || 'Adversario'}
                        </p>
                        <p className="text-[7px] font-bold uppercase tracking-widest text-white/25">{summary.venue} - Rodada {match.round}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-white/25">Nenhum jogo disputado ainda.</p>
              )}
            </div>
          </div>

          {achievements.length > 0 && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="mb-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-amber-300">
                <Trophy size={12} /> Sala de trofeus
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {achievements.slice(0, 6).map((achievement, index) => (
                  <div key={`${achievement.season}-${achievement.title}-${index}`} className="rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                    <p className="truncate text-[9px] font-black uppercase tracking-wider text-white">{achievement.title}</p>
                    <p className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-white/30">S{achievement.season} - {achievement.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/30">Elenco</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">Cards ou lista</p>
            </div>
            <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
              {[
                { id: 'cards', label: 'Cards', icon: LayoutGrid },
                { id: 'list', label: 'Lista', icon: Rows3 },
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setRosterViewMode(mode.id as 'cards' | 'list')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                    rosterViewMode === mode.id ? 'bg-cyan-500 text-black' : 'text-white/45 hover:text-white'
                  }`}
                >
                  <mode.icon size={12} />
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {rosterViewMode === 'cards' ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {squadPlayers.map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={onPlayerClick}
                  variant="compact"
                  teamLogo={team.logo}
                  onTeamClick={onTeamClick}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(['GOL', 'ZAG', 'MEI', 'ATA'] as const).map(role => {
                const rolePlayers = squadPlayersByRole[role];
                if (rolePlayers.length === 0) return null;

                return (
                  <div key={role} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                    <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                        {role === 'GOL' ? 'Goleiros' : role === 'ZAG' ? 'Zagueiros' : role === 'MEI' ? 'Meio-Campistas' : 'Atacantes'}
                      </h3>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {rolePlayers.map(player => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => onPlayerClick(player)}
                          className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{player.nickname}</p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">{player.name}</p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">{player.role}</span>
                          <span className="text-lg font-black italic text-white">{player.totalRating}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {squadPlayers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-10 text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
                  Sem atletas registrados.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
