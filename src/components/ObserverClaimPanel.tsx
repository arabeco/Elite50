import React, { useMemo, useState } from 'react';
import { Eye, Shield, Users, Trophy, Zap } from 'lucide-react';
import { useGameDispatch, useGameState } from '../store/GameContext';
import { LeagueState, Team } from '../types';
import { TeamLogo } from './TeamLogo';

const isHumanManager = (managerId: string | null | undefined, stateManagers: any) => {
  if (!managerId) return false;
  const manager = stateManagers[managerId];
  if (!manager) return false;
  return manager.isNPC === false || !manager.id.startsWith('m_');
};

export const ObserverClaimPanel: React.FC = () => {
  const { state, isSyncing } = useGameState();
  const { claimTeam } = useGameDispatch();
  const [managerName, setManagerName] = useState('');
  const [claimingTeamId, setClaimingTeamId] = useState<string | null>(null);
  const allowTakeover = state.world.currentDay < 3 || state.world.access?.allowTakeover !== false;

  const teams = useMemo(() => {
    const leagues = Object.values(state.world.leagues || {}) as LeagueState[];
    const leagueByTeam = new Map<string, { name: string; position: number }>();

    leagues.forEach(league => {
      const sorted = [...(league.standings || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      });
      sorted.forEach((row, index) => leagueByTeam.set(row.teamId, { name: league.name, position: index + 1 }));
    });

    return (Object.values(state.teams) as Team[])
      .filter(team => team.id.startsWith('t_'))
      .map(team => {
        const squad = (team.squad || []).map(id => state.players[id]).filter(Boolean);
        const totalRating = squad.reduce((sum, player) => sum + player.totalRating, 0);
        const averageRating = squad.length > 0 ? Math.round(totalRating / squad.length) : 0;
        return {
          team,
          squadCount: squad.length,
          totalRating,
          averageRating,
          league: leagueByTeam.get(team.id),
          isHuman: isHumanManager(team.managerId, state.managers)
        };
      })
      .sort((a, b) => {
        if (a.isHuman !== b.isHuman) return a.isHuman ? 1 : -1;
        return b.totalRating - a.totalRating;
      });
  }, [state.teams, state.players, state.managers, state.world.leagues]);

  const handleClaim = async (teamId: string) => {
    setClaimingTeamId(teamId);
    await claimTeam(teamId, managerName);
    setClaimingTeamId(null);
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-black/45 p-5 shadow-[0_0_40px_rgba(6,182,212,0.12)] sm:p-7">
        <div className="absolute right-0 top-0 h-44 w-44 translate-x-12 -translate-y-12 rounded-full bg-cyan-500/10 blur-[70px]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-200">
              <Eye size={13} /> Modo observador
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white sm:text-4xl">
              Escolha um clube para entrar
            </h2>
            <p className="mt-2 max-w-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Voce esta dentro do mundo, vendo a liga em tempo real. Para jogar, assuma um clube de IA.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <label className="mb-2 block text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
              Nome do manager
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(event) => setManagerName(event.target.value)}
              placeholder="SEU NOME NO MUNDO"
              className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-xs font-black uppercase tracking-widest text-white outline-none transition focus:border-cyan-400/60"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {teams.map(({ team, squadCount, totalRating, averageRating, league, isHuman }) => (
          <div
            key={team.id}
            className={`relative overflow-hidden rounded-2xl border p-4 transition ${
              isHuman
                ? 'border-white/10 bg-white/[0.025] opacity-55'
                : 'border-white/10 bg-black/40 hover:border-cyan-500/40 hover:bg-cyan-500/[0.04]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                <TeamLogo
                  primaryColor={team.logo?.primary || team.colors.primary || '#fff'}
                  secondaryColor={team.logo?.secondary || team.colors.secondary || '#111'}
                  accentColor={team.logo?.accent}
                  shapeId={team.logo?.shapeId}
                  patternId={(team.logo?.patternId || 'none') as any}
                  symbolId={team.logo?.symbolId || 'Shield'}
                  size={46}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[8px] font-black uppercase tracking-[0.25em] text-cyan-300">
                  {team.district} {league ? `- ${league.position}o ${league.name}` : ''}
                </p>
                <h3 className="truncate text-lg font-black uppercase italic tracking-tight text-white">
                  {team.name}
                </h3>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                    <Users size={12} className="mb-1 text-slate-400" />
                    <p className="text-sm font-black text-white">{squadCount}</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/30">atletas</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                    <Zap size={12} className="mb-1 text-cyan-300" />
                    <p className="text-sm font-black text-white">{averageRating}</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/30">media</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] px-2 py-2">
                    <Trophy size={12} className="mb-1 text-amber-300" />
                    <p className="text-sm font-black text-white">{team.titles?.total || 0}</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-white/30">titulos</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isHuman || isSyncing || claimingTeamId === team.id || !allowTakeover}
              onClick={() => handleClaim(team.id)}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] transition ${
                isHuman || !allowTakeover
                  ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/25'
                  : 'border border-cyan-400/40 bg-cyan-400 text-black hover:bg-cyan-300'
              }`}
            >
              <Shield size={13} />
              {isHuman ? 'Clube humano' : !allowTakeover ? 'Takeover fechado' : claimingTeamId === team.id ? 'Assumindo...' : 'Assumir clube'}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};
