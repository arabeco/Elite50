import React from 'react';
import { X, Trophy, TrendingDown, TrendingUp, Shuffle, Star, Shield } from 'lucide-react';
import { LeagueTeamStats, Manager, Player, SeasonReport, Team } from '../types';

interface SeasonReportModalProps {
  report: SeasonReport;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  managers: Record<string, Manager>;
  userTeamId?: string | null;
  onClose: () => void;
  onTeamClick?: (teamId: string) => void;
  onPlayerClick?: (player: Player) => void;
}

export const SeasonReportModal: React.FC<SeasonReportModalProps> = ({
  report,
  teams,
  players,
  managers,
  userTeamId,
  onClose,
  onTeamClick,
  onPlayerClick
}) => {
  const championRows = (Object.entries(report.finalStandings || {}) as Array<[string, LeagueTeamStats[]]>)
    .map(([leagueKey, rows]) => {
      const sorted = [...(rows || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      });
      return { leagueKey, row: sorted[0], team: sorted[0] ? teams[sorted[0].teamId] : null };
    })
    .filter(item => item.team);

  const profitTeam = report.profitWinner?.teamId ? teams[report.profitWinner.teamId] : null;
  const mvpPlayer = report.mvpRating?.playerId ? players[report.mvpRating.playerId] : null;
  const bestTeamMover = report.teamRatingMovers?.best?.teamId ? teams[report.teamRatingMovers.best.teamId] : null;
  const worstTeamMover = report.teamRatingMovers?.worst?.teamId ? teams[report.teamRatingMovers.worst.teamId] : null;
  const eliteCupWinner = report.eliteCupWinnerId ? teams[report.eliteCupWinnerId] : null;
  const districtCupWinner = report.districtCupWinnerId ? teams[report.districtCupWinnerId] : null;
  const managerHighlight = report.managerHighlight?.managerId ? managers[report.managerHighlight.managerId] : null;
  const userTeam = userTeamId ? teams[userTeamId] : null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-500/40 bg-slate-950/95 shadow-[0_0_70px_rgba(6,182,212,0.22)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="border-b border-white/10 bg-gradient-to-br from-cyan-950/50 via-slate-950 to-fuchsia-950/40 p-6 sm:p-8">
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.35em] text-cyan-300">
            The Pulse Arquivo
          </p>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white sm:text-5xl">
            Temporada {report.season}
          </h2>
          <p className="mt-3 max-w-2xl text-xs font-bold uppercase tracking-widest text-slate-400">
            Recap oficial com campeoes, migracoes e destaques da season.
          </p>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-5 slim-scrollbar sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                <Shield size={15} /> Seu clube
              </div>
              <button
                type="button"
                disabled={!userTeam}
                onClick={() => userTeam && onTeamClick?.(userTeam.id)}
                className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Resumo final</p>
                <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                  {userTeam?.name || 'Sem clube'}
                </p>
              </button>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                <Trophy size={15} /> Campeoes de liga
              </div>
              <div className="space-y-2">
                {championRows.map(({ leagueKey, team }) => (
                  <button
                    type="button"
                    key={leagueKey}
                    onClick={() => team && onTeamClick?.(team.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2 text-left transition hover:bg-white/10"
                  >
                    <span className="truncate text-[10px] font-black uppercase tracking-wider text-white">
                      {team?.name || '---'}
                    </span>
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-slate-500">
                      {leagueKey}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                <Star size={15} /> Destaques
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={!mvpPlayer}
                  onClick={() => mvpPlayer && onPlayerClick?.(mvpPlayer)}
                  className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">MVP de rating</p>
                  <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                    {mvpPlayer?.nickname || 'sem destaque'} {report.mvpRating?.ratingGain > 0 ? `+${report.mvpRating.ratingGain}` : ''}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!profitTeam}
                  onClick={() => profitTeam && onTeamClick?.(profitTeam.id)}
                  className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Score Maximo</p>
                  <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                    {profitTeam?.name || 'sem clube'} {report.profitWinner?.capGain > 0 ? `+${report.profitWinner.capGain}` : ''}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!bestTeamMover}
                  onClick={() => bestTeamMover && onTeamClick?.(bestTeamMover.id)}
                  className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
                >
                  <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-300">
                    <TrendingUp size={12} /> Maior alta de score
                  </p>
                  <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                    {bestTeamMover?.name || 'sem clube'} {report.teamRatingMovers?.best?.scoreDelta !== undefined ? `${report.teamRatingMovers.best.scoreDelta >= 0 ? '+' : ''}${report.teamRatingMovers.best.scoreDelta}` : ''}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!managerHighlight}
                  className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
                >
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Tecnico destaque</p>
                  <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                    {managerHighlight?.name || 'sem tecnico'} {report.managerHighlight?.reason ? `- ${report.managerHighlight.reason}` : ''}
                  </p>
                </button>

                <button
                  type="button"
                  disabled={!worstTeamMover}
                  onClick={() => worstTeamMover && onTeamClick?.(worstTeamMover.id)}
                  className="w-full rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
                >
                  <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-rose-300">
                    <TrendingDown size={12} /> Maior queda de score
                  </p>
                  <p className="mt-1 truncate text-sm font-black uppercase italic text-white">
                    {worstTeamMover?.name || 'sem clube'} {report.teamRatingMovers?.worst?.scoreDelta !== undefined ? `${report.teamRatingMovers.worst.scoreDelta >= 0 ? '+' : ''}${report.teamRatingMovers.worst.scoreDelta}` : ''}
                  </p>
                </button>
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Trophy size={15} /> Campeoes das copas
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!eliteCupWinner}
                onClick={() => eliteCupWinner && onTeamClick?.(eliteCupWinner.id)}
                className="rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Copa Elite</p>
                <p className="mt-1 truncate text-sm font-black uppercase italic text-white">{eliteCupWinner?.name || 'A definir'}</p>
              </button>
              <button
                type="button"
                disabled={!districtCupWinner}
                onClick={() => districtCupWinner && onTeamClick?.(districtCupWinner.id)}
                className="rounded-xl bg-black/35 px-3 py-3 text-left transition hover:bg-white/10 disabled:cursor-default"
              >
                <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Copa dos Distritos</p>
                <p className="mt-1 truncate text-sm font-black uppercase italic text-white">{districtCupWinner?.name || 'A definir'}</p>
              </button>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
              <Shuffle size={15} /> Realocacoes
            </div>
            {report.reallocatedTeams.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {report.reallocatedTeams.map(item => {
                  const team = teams[item.teamId];
                  return (
                    <button
                      type="button"
                      key={`${item.teamId}-${item.from}-${item.to}`}
                      onClick={() => team && onTeamClick?.(team.id)}
                      className="rounded-xl bg-black/35 px-3 py-2 text-left transition hover:bg-white/10"
                    >
                      <p className="truncate text-[10px] font-black uppercase tracking-wider text-white">
                        {team?.name || item.teamId}
                      </p>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
                        {`${item.from} -> ${item.to}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-black/35 px-3 py-3 text-[9px] font-bold uppercase tracking-widest text-white/35">
                Nenhum clube foi realocado nessa season.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
