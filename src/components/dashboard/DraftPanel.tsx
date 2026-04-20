import React, { useMemo, useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useTransfers } from '../../hooks/useTransfers';
import { Player, PlayerRole } from '../../types';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { LayoutGrid, Rows3, Rocket, Search, Shield, Users, X, UserMinus } from 'lucide-react';

const ROLE_ORDER: PlayerRole[] = ['GOL', 'ZAG', 'MEI', 'ATA'];

const ROLE_LABELS: Record<PlayerRole, string> = {
  GOL: 'Goleiros',
  ZAG: 'Zagueiros',
  MEI: 'Meio-Campistas',
  ATA: 'Atacantes',
};

const groupPlayersByRole = (players: Player[]) =>
  ROLE_ORDER.reduce<Record<PlayerRole, Player[]>>((acc, role) => {
    acc[role] = players.filter(player => player.role === role);
    return acc;
  }, { GOL: [], ZAG: [], MEI: [], ATA: [] });

export const DraftPanel: React.FC = () => {
  const { state, setState, saveGame } = useGame();
  const [activeTab, setActiveTab] = useState<'market' | 'squad'>('market');
  const [marketViewMode, setMarketViewMode] = useState<'cards' | 'list'>('list');
  const [squadViewMode, setSquadViewMode] = useState<'cards' | 'list'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 'NORTE' | 'SUL' | 'LESTE' | 'OESTE'>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const userTeam = state.userTeamId ? state.teams[state.userTeamId] : null;
  const proposals = state.world.draftProposals || [];
  const myProposals = proposals.filter(proposal => proposal.managerId === state.userManagerId);
  const myProposalPlayerIds = myProposals.map(proposal => proposal.playerId);

  const { handleMakeProposal, handleCancelDraftProposal, handleSellPlayer } = useTransfers(
    userTeam?.id || null,
    0,
    userTeam?.powerCap || 0
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
      .sort((a, b) => b.totalRating - a.totalRating)
      .slice(0, 60);
  }, [districtFilter, myProposalPlayerIds, roleFilter, searchTerm, state.managers, state.players, state.teams, userTeam]);

  const currentPower = useMemo(() => {
    return combinedSquad.reduce((sum, player) => sum + player.totalRating, 0);
  }, [combinedSquad]);

  const draftBudget = userTeam?.powerCap || 15000;
  const remaining = draftBudget - currentPower;
  const progress = Math.min(100, (currentPower / draftBudget) * 100);

  const groupedMarketPlayers = useMemo(() => groupPlayersByRole(filteredMarketPlayers), [filteredMarketPlayers]);
  const groupedSquadPlayers = useMemo(() => groupPlayersByRole(combinedSquad), [combinedSquad]);

  if (!userTeam) return null;

  const totalSelected = combinedSquad.length;

  const handleFinalizeDraft = async () => {
    if (totalSelected < 11) {
      window.alert('Voce precisa selecionar pelo menos 11 jogadores.');
      return;
    }

    if (!window.confirm('Confirmar o Draft Genesis agora? As propostas serao processadas na virada do dia.')) {
      return;
    }

    const newState = { ...state };
    if (newState.world.currentDay === -1) {
      newState.world.currentDay = 0;
    }
    setState(newState);
    await saveGame(newState);
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
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white/75">{currentPower.toLocaleString()} / {draftBudget.toLocaleString()} score</span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white/75">{totalSelected} / 15 atletas</span>
              <span className={`rounded-xl border px-3 py-2 ${remaining >= 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-200'}`}>
                saldo {remaining >= 0 ? '+' : ''}{remaining}
              </span>
            </div>
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
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
          {[
            { id: 'market', label: `Mercado de Draft (${filteredMarketPlayers.length})`, icon: Users },
            { id: 'squad', label: `Meu Elenco (${totalSelected})`, icon: Shield },
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
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-[1.2fr_repeat(2,minmax(0,0.55fr))]">
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
          </div>

          {marketViewMode === 'cards'
            ? renderGroupedCards(groupedMarketPlayers, {
              emptyMessage: 'Nenhum atleta disponivel nesses filtros.',
              actionForPlayer: (player) => (
                <button
                  type="button"
                  onClick={() => handleMakeProposal(player)}
                  className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  Recrutar
                </button>
              ),
            })
            : renderGroupedList(groupedMarketPlayers, {
              emptyMessage: 'Nenhum atleta disponivel nesses filtros.',
              showDemand: true,
              onRowClick: setSelectedPlayer,
              actionForPlayer: (player) => (
                <button
                  type="button"
                  onClick={() => handleMakeProposal(player)}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  Recrutar
                </button>
              ),
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
                    className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] transition ${
                      isPending
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                    }`}
                  >
                    {isPending ? 'Remover' : 'Dispensar'}
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
