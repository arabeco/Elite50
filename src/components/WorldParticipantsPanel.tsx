import React from 'react';
import { Crown, Eye, Shield, Users } from 'lucide-react';
import { useGameState } from '../store/GameContext';

export const WorldParticipantsPanel: React.FC = () => {
  const { state } = useGameState();
  const participants = state.participants || [];
  const leagueByTeam = new Map<string, string>();

  Object.values(state.world.leagues || {}).forEach((league: any) => {
    (league.standings || []).forEach((row: any) => {
      leagueByTeam.set(row.teamId, league.name);
    });
  });

  if (participants.length === 0) return null;

  const humans = participants.filter(participant => participant.teamId);
  const observers = participants.filter(participant => !participant.teamId);

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4 shadow-[0_0_28px_rgba(34,211,238,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-cyan-300" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/75">
            Humanos no mundo
          </h3>
        </div>
        <div className="flex gap-2 text-[8px] font-black uppercase tracking-widest text-white/35">
          <span>{humans.length} clubes</span>
          <span>{observers.length} observadores</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map(participant => {
          const team = participant.teamId ? state.teams[participant.teamId] : null;
          const manager = participant.managerId ? state.managers[participant.managerId] : null;
          const label = participant.isCreator ? 'Dono' : participant.isObserver ? 'Observador' : 'Humano';

          return (
            <div
              key={participant.userId}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                participant.isCreator
                  ? 'border-amber-400/35 bg-amber-400/10 text-amber-200'
                  : participant.isObserver
                    ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                    : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
              }`}>
                {participant.isCreator ? <Crown size={15} /> : participant.isObserver ? <Eye size={15} /> : <Shield size={15} />}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-wider text-white">
                  {manager?.name || `${label} ${participant.userId.slice(0, 6)}`}
                </p>
                <p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-widest text-white/35">
                  {team?.name || label}
                </p>
                <p className="truncate text-[8px] font-bold uppercase tracking-widest text-cyan-300/80">
                  {team ? (leagueByTeam.get(team.id) || team.league) : 'sem clube'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
