import React, { useMemo, useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useTransfers } from '../../hooks/useTransfers';
import { Player, PlayerRole } from '../../types';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { LayoutGrid, Rows3, Rocket, Search, Shield, Users, X, UserMinus } from 'lucide-react';
import { advanceGameDay, getDraftInterestReport, getTeamPowerCap } from '../../engine/gameLogic';
import { claimWorldTick, completeWorldDayTick } from '../../lib/worldTick';
import { GENESIS_DRAFT_AUTOFILL_DAY, GENESIS_DRAFT_LAST_DAY } from '../../constants/gameConstants';

const ROLE_ORDER: PlayerRole[] = ['GOL', 'ZAG', 'MEI', 'ATA'];

const ROLE_LABELS: Record<PlayerRole, string> = {
  GOL: 'Goleiros',
  ZAG: 'Zagueiros',
  MEI: 'Meio-Campistas',
  ATA: 'Atacantes',
};

const groupPlayersByRole = (players: Player[]) =>
  ROLE_ORDER.reduce<Record<PlayerRole, Player[]>>((acc, role) => {
    acc[role] = players
      .filter(player => player.role === role)
      .sort((a, b) => b.totalRating - a.totalRating);
    return acc;
  }, { GOL: [], ZAG: [], MEI: [], ATA: [] });

export const DraftPanel: React.FC = () => {
  const { state, setState, saveGame, addToast, requestConfirm, worldId } = useGame();
  const [activeTab, setActiveTab] = useState<'market' | 'squad'>('squad');
  const [marketViewMode, setMarketViewMode] = useState<'cards' | 'list'>('list');
  const [squadViewMode, setSquadViewMode] = useState<'cards' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 'NORTE' | 'SUL' | 'LESTE' | 'OESTE'>('ALL');
  const [marketSort, setMarketSort] = useState<'interest' | 'power'>('interest');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const userTeam = state.userTeamId ? state.teams[state.userTeamId] : null;
  const proposals = state.world.draftProposals || [];
  const myProposals = proposals.filter(proposal => proposal.managerId === state.userManagerId);
  const myProposalPlayerIds = myProposals.map(proposal => proposal.playerId);

  const { handleMakeProposal, handleCancelDraftProposal, handleSellPlayer } = useTransfers(
    userTeam?.id || null,
    0,
    getTeamPowerCap(userTeam, state.players)
  );

  const proposalCounts = useMemo(() => {
    return proposals.reduce<Record<string, number>>((acc, proposal) => {
      acc[proposal.playerId] = (acc[proposal.playerId] || 0) + 1;
      return acc;
    }, {});
  }, [proposals]);

  const currentSquadPlayers = useMemo(() => {
    if (!userTeam) return [];
    return userTeam.squad.map(playerId => state.players[playerId]).filter(Boolean);
  }, [state.players, userTeam]);

  const pendingPlayers = useMemo(() => {
    return myProposalPlayerIds.map(playerId => state.players[playerId]).filter(Boolean);
  }, [myProposalPlayerIds, state.players]);

  const combinedSquad = useMemo(() => {
    const seen = new Set<string>();
    return [...currentSquadPlayers, ...pendingPlayers].filter(player => {
      if (seen.has(player.id)) return false;
      seen.add(player.id);
      return true;
    });
  }, [currentSquadPlayers, pendingPlayers]);

  const filteredMarketPlayers = useMemo(() => {
    if (!userTeam) return [];

    return Object.values(state.players)
      .filter(player => {
        const playerTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;
        const playerManager = playerTeam?.managerId ? state.managers[playerTeam.managerId] : null;
        const isDraftEligible = !playerTeam || playerManager?.isNPC !== false;
        const notAlreadyMine = !userTeam.squad.includes(player.id) && !myProposalPlayerIds.includes(player.id);
        const matchesSearch =
          player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.nickname.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || player.role === roleFilter;
        const matchesDistrict = districtFilter === 'ALL' || player.district === districtFilter;

        return isDraftEligible && notAlreadyMine && matchesSearch && matchesRole && matchesDistrict;
      })
      .sort((a, b) => {
        if (marketSort === 'interest') {
          const chanceA = getDraftInterestReport(state, userTeam.id, a.id).chance;
          const chanceB = getDraftInterestReport(state, userTeam.id, b.id).chance;
          if (chanceA !== chanceB) return chanceB - chanceA;
        }
        return b.totalRating - a.totalRating;
      })
      .slice(0, 60);
  }, [districtFilter, marketSort, myProposalPlayerIds, roleFilter, searchTerm, state, userTeam]);

  const currentPower = useMemo(() => {
    return combinedSquad.reduce((sum, player) => sum + player.totalRating, 0);
  }, [combinedSquad]);

  const draftBudget = getTeamPowerCap(userTeam, state.players);
  const remaining = draftBudget - currentPower;
  const progress = Math.min(100, (currentPower / draftBudget) * 100);

  const groupedMarketPlayers = useMemo(() => groupPlayersByRole(filteredMarketPlayers), [filteredMarketPlayers]);
  const groupedSquadPlayers = useMemo(() => groupPlayersByRole(combinedSquad), [combinedSquad]);
  const roleSummary = useMemo(() => {
    return ROLE_ORDER.map(role => {
      const players = groupedSquadPlayers[role] || [];
      const power = players.reduce((sum, player) => sum + player.totalRating, 0);
      return { role, players, power };
    });
  }, [groupedSquadPlayers]);

  if (!userTeam) return null;

  const totalSelected = combinedSquad.length;
  const confirmedSelected = currentSquadPlayers.length;
  const pendingSelected = pendingPlayers.length;
  const draftPhaseLabel = `Dia ${Math.max(0, state.world.currentDay || 0)} de ${GENESIS_DRAFT_LAST_DAY}`;
  const draftPhaseDetail = state.world.currentDay <= 0
    ? 'Monte sua lista. As reservas ocupam score e entram na primeira virada.'
    : state.world.currentDay < GENESIS_DRAFT_LAST_DAY
      ? 'Continue ajustando sua lista. O Dia 2 ainda fica aberto para propostas.'
      : 'Ultima janela de ajuste. Na proxima virada, o Dia 3 computa disputas e completa elencos.';

  const openMarketForRole = (role: PlayerRole | 'ALL' = 'ALL') => {
    setActiveTab('market');
    setMarketViewMode('list');
    setRoleFilter(role);
    setMarketSort('interest');
  };

  const getInterestClass = (tone: ReturnType<typeof getDraftInterestReport>['tone']) => {
    if (tone === 'safe') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
    if (tone === 'warn') return 'border-amber-400/25 bg-amber-400/10 text-amber-200';
    if (tone === 'risk') return 'border-orange-400/25 bg-orange-400/10 text-orange-200';
    if (tone === 'danger') return 'border-rose-400/25 bg-rose-400/10 text-rose-200';
    return 'border-white/10 bg-white/[0.04] text-white/35';
  };

  const handleFinalizeDraft = async () => {
    if (totalSelected < 11) {
      addToast('Voce precisa selecionar pelo menos 11 jogadores.', 'warning');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Confirmar Draft Genesis',
      message: 'As propostas serao processadas na virada do dia.',
      confirmLabel: 'Confirmar',
    });
    if (!confirmed) {
      return;
    }

    const newState = { ...state };
    if (newState.world.currentDay === -1) {
      newState.world.currentDay = 0;
    }
    setState(newState);
    await saveGame(newState);
    addToast('Draft confirmado. Propostas entram na virada do dia.', 'success');
  };

  const handleResolveDraftNow = async () => {
    if (!state.isCreator) {
      addToast('Apenas o criador do mundo pode resolver o Draft agora.', 'warning');
      return;
    }

    if (totalSelected < 11) {
      addToast('Escolha pelo menos 11 jogadores antes de resolver o Draft.', 'warning');
      return;
    }

    if (remaining < 0) {
      addToast('O elenco estourou o Score Maximo. Remova alguem antes de resolver.', 'warning');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Resolver Draft agora',
      message: 'As disputas serao processadas, a liga completara elencos vazios e a temporada sera aberta para testes.',
      confirmLabel: 'Resolver',
    });
    if (!confirmed) return;

    const tickKey = `season-${state.world.currentSeason || 2050}:resolve-draft`;
    const tickClaim = await claimWorldTick(worldId, tickKey, state.world.currentDate);
    if (!tickClaim.ok) {
      addToast('O Draft ja esta sendo resolvido ou foi processado.', 'warning');
      return;
    }

    try {
      let newState = JSON.parse(JSON.stringify(state)) as typeof state;
      if (newState.world.currentDay === -1) {
        newState.world.currentDay = 0;
      }

      while (newState.world.status === 'LOBBY' && newState.world.currentDay < GENESIS_DRAFT_AUTOFILL_DAY) {
        newState = advanceGameDay(newState);
      }

      newState.world.status = 'ACTIVE';
      newState.world.startScheduledAt = null;
      setState(newState);
      await saveGame(newState);
      await completeWorldDayTick(worldId, tickClaim.tickKey, true);
      addToast('Draft resolvido. Temporada aberta.', 'success');
    } catch (error: any) {
      await completeWorldDayTick(worldId, tickClaim.tickKey, false, error?.message || String(error));
      console.error('Erro ao resolver Draft:', error);
      addToast('Erro ao resolver Draft', 'error');
    }
  };

  const renderGroupedList = (
    groups: Record<PlayerRole, Player[]>,
    options: {
      emptyMessage: string;
      actionForPlayer?: (player: Player) => React.ReactNode;
      onRowClick?: (player: Player) => void;
      showDemand?: boolean;
      showStatus?: boolean;
    }
  ) => {
    const total = Object.values(groups).reduce((sum, group) => sum + group.length, 0);
    if (total === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
          {options.emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {ROLE_ORDER.map(role => {
          const players = groups[role];
          if (players.length === 0) return null;

          return (
            <div key={role} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
              <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                  {ROLE_LABELS[role]}
                </h3>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {players.map(player => {
                  const isPending = myProposalPlayerIds.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => options.onRowClick?.(player)}
                      className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{player.nickname}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">
                          {player.district} {options.showStatus ? `• ${isPending ? 'Aguardando' : 'No elenco'}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black italic text-cyan-300">{player.totalRating}</p>
                        {options.showDemand && (
                          <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">
                            {proposalCounts[player.id] || 0} propostas
                          </p>
                        )}
                      </div>
                      <div onClick={event => event.stopPropagation()}>
                        {options.actionForPlayer?.(player)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGroupedCards = (
    groups: Record<PlayerRole, Player[]>,
    options: {
      emptyMessage: string;
      actionForPlayer?: (player: Player) => React.ReactNode;
    }
  ) => {
    const total = Object.values(groups).reduce((sum, group) => sum + group.length, 0);
    if (total === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
          {options.emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {ROLE_ORDER.map(role => {
          const players = groups[role];
          if (players.length === 0) return null;

          return (
            <section key={role} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-5 w-1 rounded-full bg-cyan-400" />
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">{ROLE_LABELS[role]}</h3>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">{players.length} atletas</p>
                </div>
              </div>
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
                {players.map(player => (
                  <div key={player.id} className="w-[142px] shrink-0 snap-start space-y-2">
                    <PlayerCard
                      player={player}
                      onClick={setSelectedPlayer}
                      variant="full"
                      teamLogo={userTeam.logo}
                    />
                    {options.actionForPlayer?.(player)}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-500/20 bg-black/40 p-4 sm:p-6">
        <div className="absolute right-0 top-0 p-6 opacity-10 pointer-events-none">
          <Rocket size={96} className="text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">Genesis</p>
              <h1 className="text-2xl font-black uppercase italic tracking-tight text-white">Draft Genesis</h1>
            </div>
            <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
              <span className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-amber-100">{draftPhaseLabel}</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white/75">{currentPower.toLocaleString()} / {draftBudget.toLocaleString()} score</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white/75">{totalSelected} / 15 atletas</span>
              <span className={`rounded-xl border px-3 py-2 ${remaining >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                saldo {remaining >= 0 ? '+' : ''}{remaining}
              </span>
            </div>
            <p className="max-w-2xl text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
              {draftPhaseDetail}
            </p>
          </div>

          <div className="w-full max-w-md space-y-3">
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
              <div
                className={`h-full rounded-full transition-all ${remaining >= 0 ? 'bg-cyan-400' : 'bg-rose-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={handleFinalizeDraft}
              disabled={remaining < 0 || totalSelected < 11}
              className={`w-full rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                remaining < 0 || totalSelected < 11
                  ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/25'
                  : 'bg-cyan-400 text-black hover:bg-cyan-300'
              }`}
            >
              Confirmar Draft
            </button>
            {state.isCreator && (
              <button
                type="button"
                onClick={handleResolveDraftNow}
                disabled={remaining < 0 || totalSelected < 11}
                className={`w-full rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                  remaining < 0 || totalSelected < 11
                    ? 'cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/25'
                    : 'border border-amber-300/35 bg-amber-300/15 text-amber-100 hover:bg-amber-300/20'
                }`}
              >
                Resolver e comecar agora
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-200">1. Escolha atletas</p>
          <p className="mt-2 text-xl font-black italic text-white">{totalSelected}/15</p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
            minimo de 11 para liberar a confirmacao
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-amber-200">2. Respeite o teto</p>
          <p className={`mt-2 text-xl font-black italic ${remaining >= 0 ? 'text-white' : 'text-rose-200'}`}>
            {remaining >= 0 ? '+' : ''}{remaining.toLocaleString()}
          </p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
            saldo de score antes da temporada
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/45">3. Confirme</p>
          <p className="mt-2 text-xl font-black italic text-white">{myProposals.length}</p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
            propostas entram na fila da virada do dia
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.28em] text-cyan-300">Meu elenco agora</p>
              <h2 className="mt-1 truncate text-xl font-black uppercase italic text-white">{userTeam.name}</h2>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
                {userTeam.league} / {userTeam.district}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openMarketForRole('ALL')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/20"
            >
              <Search size={13} />
              Buscar atletas
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/35">Confirmados</p>
              <p className="mt-1 text-2xl font-black italic text-white">{confirmedSelected}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/35">Wishlist</p>
              <p className="mt-1 text-2xl font-black italic text-amber-200">{pendingSelected}</p>
            </div>
            <div className={`rounded-xl border p-3 ${remaining >= 0 ? 'border-emerald-400/20 bg-emerald-400/10' : 'border-rose-400/20 bg-rose-400/10'}`}>
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/35">Saldo cap</p>
              <p className={`mt-1 text-2xl font-black italic ${remaining >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                {remaining >= 0 ? '+' : ''}{remaining.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.2em] text-white/35">
              <span>Score usado</span>
              <span>{currentPower.toLocaleString()} / {draftBudget.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-white/10 bg-black/50">
              <div
                className={`h-full rounded-full transition-all ${remaining >= 0 ? 'bg-cyan-400' : 'bg-rose-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.28em] text-white/35">Por posicao</p>
              <h2 className="mt-1 text-sm font-black uppercase italic text-white">Mapa do elenco</h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('squad')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              <Shield size={12} />
              Ver elenco
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {roleSummary.map(({ role, players, power }) => (
              <div key={role} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white">{ROLE_LABELS[role]}</p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/30">
                      {players.length} atletas / {power.toLocaleString()} score
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openMarketForRole(role)}
                    className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
          {[
            { id: 'squad', label: `Meu Elenco (${totalSelected})`, icon: Shield },
            { id: 'market', label: `Mercado de Draft (${filteredMarketPlayers.length})`, icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as 'market' | 'squad')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab.id ? 'bg-cyan-500 text-black' : 'text-white/45 hover:text-white'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
          {[
            { id: 'cards', label: 'Cards', icon: LayoutGrid },
            { id: 'list', label: 'Lista', icon: Rows3 },
          ].map(mode => (
            <button
              key={mode.id}
              type="button"
              onClick={() => activeTab === 'market' ? setMarketViewMode(mode.id as 'cards' | 'list') : setSquadViewMode(mode.id as 'cards' | 'list')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                (activeTab === 'market' ? marketViewMode : squadViewMode) === mode.id
                  ? 'bg-cyan-500 text-black'
                  : 'text-white/45 hover:text-white'
              }`}
            >
              <mode.icon size={12} />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'market' ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-[1.2fr_repeat(3,minmax(0,0.55fr))]">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                type="text"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Buscar atleta..."
                className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none placeholder:text-white/15"
              />
            </div>
            <select
              value={roleFilter}
              onChange={event => setRoleFilter(event.target.value as PlayerRole | 'ALL')}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none"
            >
              <option value="ALL">Todas posicoes</option>
              <option value="GOL">Goleiros</option>
              <option value="ZAG">Zagueiros</option>
              <option value="MEI">Meias</option>
              <option value="ATA">Atacantes</option>
            </select>
            <select
              value={districtFilter}
              onChange={event => setDistrictFilter(event.target.value as 'ALL' | 'NORTE' | 'SUL' | 'LESTE' | 'OESTE')}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none"
            >
              <option value="ALL">Todos setores</option>
              <option value="NORTE">Norte</option>
              <option value="SUL">Sul</option>
              <option value="LESTE">Leste</option>
              <option value="OESTE">Oeste</option>
            </select>
            <select
              value={marketSort}
              onChange={event => setMarketSort(event.target.value as 'interest' | 'power')}
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none"
            >
              <option value="interest">Maior interesse</option>
              <option value="power">Maior poder</option>
            </select>
          </div>

          {marketViewMode === 'cards'
            ? renderGroupedCards(groupedMarketPlayers, {
              emptyMessage: 'Nenhum atleta disponivel nesses filtros.',
              actionForPlayer: (player) => {
                const interest = getDraftInterestReport(state, userTeam.id, player.id);
                return (
                  <div className="space-y-2">
                    <div className={`rounded-xl border px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.16em] ${getInterestClass(interest.tone)}`}>
                      {interest.label} / {interest.chance}%
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMakeProposal(player)}
                      disabled={interest.chance <= 0}
                      className={`w-full rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition ${
                        interest.chance <= 0
                          ? 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/25'
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                      }`}
                    >
                      Recrutar
                    </button>
                  </div>
                );
              },
            })
            : renderGroupedList(groupedMarketPlayers, {
              emptyMessage: 'Nenhum atleta disponivel nesses filtros.',
              showDemand: true,
              onRowClick: setSelectedPlayer,
              actionForPlayer: (player) => {
                const interest = getDraftInterestReport(state, userTeam.id, player.id);
                return (
                  <div className="flex items-center gap-2">
                    <div className={`min-w-[92px] rounded-xl border px-2 py-2 text-center text-[8px] font-black uppercase tracking-[0.16em] ${getInterestClass(interest.tone)}`}>
                      {interest.chance}%
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMakeProposal(player)}
                      disabled={interest.chance <= 0}
                      className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] transition ${
                        interest.chance <= 0
                          ? 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/25'
                          : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                      }`}
                    >
                      Recrutar
                    </button>
                  </div>
                );
              },
            })}
        </div>
      ) : (
        <div className="space-y-4">
          {squadViewMode === 'cards'
            ? renderGroupedCards(groupedSquadPlayers, {
              emptyMessage: 'Seu elenco do draft esta vazio.',
              actionForPlayer: (player) => {
                const isPending = myProposalPlayerIds.includes(player.id);
                return (
                  <button
                    type="button"
                    onClick={() => isPending ? handleCancelDraftProposal(player.id) : handleSellPlayer(player.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition ${
                      isPending
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                    }`}
                  >
                    {isPending ? <X size={12} /> : <UserMinus size={12} />}
                    {isPending ? 'Remover wishlist' : 'Dispensar'}
                  </button>
                );
              },
            })
            : renderGroupedList(groupedSquadPlayers, {
              emptyMessage: 'Seu elenco do draft esta vazio.',
              showStatus: true,
              onRowClick: setSelectedPlayer,
              actionForPlayer: (player) => {
                const isPending = myProposalPlayerIds.includes(player.id);
                return (
                  <button
                    type="button"
                    onClick={() => isPending ? handleCancelDraftProposal(player.id) : handleSellPlayer(player.id)}
                    className={`rounded-xl border px-4 py-3 text-[8px] font-black uppercase tracking-[0.2em] transition ${
                      isPending
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                    }`}
                  >
                    {isPending ? 'Tirar wishlist' : 'Mandar embora'}
                  </button>
                );
              },
            })}
        </div>
      )}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
};
