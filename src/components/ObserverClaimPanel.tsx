import React, { useMemo, useState } from 'react';
import { Eye, Shield, Users, Trophy, Zap, Mail, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import { useGameDispatch, useGameState } from '../store/GameContext';
import { isJoinWindowOpen } from '../engine/gameLogic';
import { ClubOffer, LeagueState, Team } from '../types';
import { TeamLogo } from './TeamLogo';

const isHumanManager = (managerId: string | null | undefined, stateManagers: any) => {
  if (!managerId) return false;
  const manager = stateManagers[managerId];
  if (!manager) return false;
  return manager.isNPC === false || !manager.id.startsWith('m_');
};

export const ObserverClaimPanel: React.FC = () => {
  const { state, isSyncing } = useGameState();
  const { submitClubApplication, respondToClubOffer } = useGameDispatch();
  const [managerName, setManagerName] = useState('');
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);
  const [actingTeamId, setActingTeamId] = useState<string | null>(null);
  const joinWindowOpen = isJoinWindowOpen(state);
  const allowNegotiation = state.world.access?.allowTakeover !== false;

  const userOffers = useMemo(
    () => ((state.world.clubOffers || []).filter(offer => offer.targetUserId === state.userId) as ClubOffer[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.userId, state.world.clubOffers]
  );
  const offerByTeamId = useMemo(
    () => userOffers.reduce<Record<string, ClubOffer>>((acc, offer) => {
      if (!acc[offer.teamId] || ['ACCEPTED', 'PENDING', 'WAITING_NEXT_SEASON'].includes(offer.status)) {
        acc[offer.teamId] = offer;
      }
      return acc;
    }, {}),
    [userOffers]
  );

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

  const handleTeamAction = async (teamId: string, offer?: ClubOffer) => {
    setActingTeamId(teamId);
    try {
      if (offer?.status === 'ACCEPTED' && joinWindowOpen && (state.world.currentDay || 0) >= offer.availableOnDay) {
        await respondToClubOffer(offer.id, true, managerName);
        return;
      }
      await submitClubApplication(teamId, managerName);
    } finally {
      setActingTeamId(null);
    }
  };

  const handleOfferDecision = async (offerId: string, accept: boolean) => {
    setActingOfferId(offerId);
    try {
      await respondToClubOffer(offerId, accept, managerName);
    } finally {
      setActingOfferId(null);
    }
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
              Mercado de tecnicos
            </h2>
            <p className="mt-2 max-w-2xl text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Voce esta dentro do mundo, vendo a liga em tempo real. Nada de takeover seco: envie proposta, espere a resposta e assine no timing certo.
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

        <div className="relative z-10 mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-200">Janela atual</p>
            <p className="mt-2 text-lg font-black italic text-white">{joinWindowOpen ? 'Aberta' : 'Fechada'}</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
              {joinWindowOpen ? 'Da para assinar ou mandar proposta agora.' : 'Pedidos novos entram na fila da proxima temporada.'}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-200">Inbox de contratos</p>
            <p className="mt-2 text-lg font-black italic text-white">
              {userOffers.filter(offer => ['PENDING', 'ACCEPTED', 'WAITING_NEXT_SEASON'].includes(offer.status)).length}
            </p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
              propostas vivas no seu radar
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/45">Regra</p>
            <p className="mt-2 text-lg font-black italic text-white">Sem entrada instantanea</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
              no minimo a resposta chega no dia seguinte
            </p>
          </div>
        </div>
      </section>

      {userOffers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Mail size={14} className="text-cyan-300" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">Inbox do tecnico</h3>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {userOffers.slice(0, 4).map((offer) => {
              const team = state.teams[offer.teamId];
              if (!team) return null;
              const actionableNow = offer.status === 'ACCEPTED' && joinWindowOpen && (state.world.currentDay || 0) >= offer.availableOnDay;
              const waitsNext = offer.status === 'WAITING_NEXT_SEASON';
              const pendingAnswer = offer.status === 'PENDING';
              return (
                <div key={offer.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-200">{team.district}</p>
                      <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight text-white">{team.name}</h3>
                      <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-white/35">
                        {offer.note || 'Sem detalhe adicional.'}
                      </p>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] ${
                      actionableNow
                        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
                        : offer.status === 'ACCEPTED'
                          ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
                          : waitsNext
                            ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100'
                            : pendingAnswer
                              ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                              : 'border-white/10 bg-white/[0.04] text-white/45'
                    }`}>
                      {actionableNow
                        ? 'Assinar agora'
                        : offer.status === 'ACCEPTED'
                          ? 'Pronta para assinatura'
                          : waitsNext
                            ? 'Fila da prox temporada'
                            : pendingAnswer
                              ? 'Aguardando resposta'
                              : offer.status}
                    </div>
                  </div>

                  {(offer.status === 'ACCEPTED' || offer.status === 'PENDING' || offer.status === 'WAITING_NEXT_SEASON') && (
                    <div className="mt-4 flex gap-2">
                      {offer.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() => handleOfferDecision(offer.id, true)}
                          disabled={isSyncing || actingOfferId === offer.id || !actionableNow}
                          className={`flex-1 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.25em] transition ${
                            actionableNow
                              ? 'border border-emerald-400/35 bg-emerald-400 text-black hover:bg-emerald-300'
                              : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/30'
                          }`}
                        >
                          <CheckCircle2 size={13} className="mx-auto mb-1" />
                          {actionableNow ? 'Assinar contrato' : 'Assinavel no timing certo'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOfferDecision(offer.id, false)}
                        disabled={isSyncing || actingOfferId === offer.id}
                        className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[8px] font-black uppercase tracking-[0.25em] text-white/60 transition hover:bg-white/[0.08]"
                      >
                        <XCircle size={13} className="mx-auto mb-1" />
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
            {(() => {
              const teamOffer = offerByTeamId[team.id];
              return teamOffer ? (
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/60">
                  {teamOffer.status === 'ACCEPTED' ? <CheckCircle2 size={12} className="text-emerald-300" /> : <Clock3 size={12} className="text-cyan-300" />}
                  {teamOffer.status === 'ACCEPTED'
                    ? (joinWindowOpen && (state.world.currentDay || 0) >= teamOffer.availableOnDay ? 'Contrato liberado' : 'Resposta positiva')
                    : teamOffer.status === 'WAITING_NEXT_SEASON'
                      ? 'Fila proxima temporada'
                      : teamOffer.status === 'PENDING'
                        ? 'Aguardando resposta'
                        : teamOffer.status === 'REJECTED'
                          ? 'Recusado'
                          : 'Historico'}
                </div>
              ) : null;
            })()}

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
              disabled={isHuman || isSyncing || actingTeamId === team.id || !allowNegotiation}
              onClick={() => handleTeamAction(team.id, offerByTeamId[team.id])}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] transition ${
                isHuman || !allowNegotiation
                  ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/25'
                  : 'border border-cyan-400/40 bg-cyan-400 text-black hover:bg-cyan-300'
              }`}
            >
              <Shield size={13} />
              {(() => {
                const offer = offerByTeamId[team.id];
                if (isHuman) return 'Clube humano';
                if (!allowNegotiation) return 'Mercado fechado';
                if (actingTeamId === team.id) return 'Enviando...';
                if (offer?.status === 'ACCEPTED') {
                  return joinWindowOpen && (state.world.currentDay || 0) >= offer.availableOnDay
                    ? 'Assinar contrato'
                    : 'Resposta positiva';
                }
                if (offer?.status === 'PENDING') return 'Resposta amanha';
                if (offer?.status === 'WAITING_NEXT_SEASON') return 'Fila prox temporada';
                return joinWindowOpen ? 'Pedir contrato' : 'Entrar na fila';
              })()}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};
