import React, { useState, useMemo } from 'react';
import { useGame } from '../../store/GameContext';
import { useTransfers } from '../../hooks/useTransfers';
import { Rocket, Shield, Zap, TrendingUp, CheckCircle2, Info, Search, Filter, Users, Trophy, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, PlayerRole, District } from '../../types';

export const DraftPanel: React.FC = () => {
    const { state, setState, saveGame } = useGame();
    const [activeTab, setActiveTab] = useState<'squad' | 'market'>('market');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
    const [districtFilter, setDistrictFilter] = useState<District | 'ALL'>('ALL');

    const userTeam = state.userTeamId ? state.teams[state.userTeamId] : null;

    if (!userTeam) return null;

    // Proposals logic
    const proposals = state.world.draftProposals || [];
    const myProposals = proposals.filter(p => p.managerId === state.userManagerId) || [];
    const myProposalPlayerIds = myProposals.map(p => p.playerId);

    const currentPower = userTeam.squad.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0) +
        myProposalPlayerIds.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);

    const DRAFT_BUDGET = userTeam.powerCap || 15000; // Standard draft budget
    const remaining = DRAFT_BUDGET - currentPower;
    const progress = Math.min(100, (currentPower / DRAFT_BUDGET) * 100);

    // Market Filtering
    const marketPlayers = useMemo(() => {
        return Object.values(state.players).filter(p => {
            // Only players without a manager or in NPC teams
            const pTeam = p.contract.teamId ? state.teams[p.contract.teamId] : null;
            const isNpcOwned = !pTeam || !pTeam.managerId;
            if (!isNpcOwned) return false;

            const matchesSearch = p.nickname.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
            const matchesDistrict = districtFilter === 'ALL' || p.district === districtFilter;
            const notInMySquad = !userTeam.squad.includes(p.id) && !myProposalPlayerIds.includes(p.id);

            return matchesSearch && matchesRole && matchesDistrict && notInMySquad;
        }).sort((a, b) => b.totalRating - a.totalRating);
    }, [state.players, state.teams, searchTerm, roleFilter, districtFilter, userTeam.squad, myProposalPlayerIds]);

    // Proposal Counts for everyone
    const proposalCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        proposals.forEach(p => {
            counts[p.playerId] = (counts[p.playerId] || 0) + 1;
        });
        return counts;
    }, [proposals]);

    const { handleMakeProposal, handleCancelDraftProposal } = useTransfers(userTeam.id, 0, userTeam.powerCap);

    const handleToggleDraft = (player: Player) => {
        const isRecruited = myProposalPlayerIds.includes(player.id);
        if (isRecruited) {
            handleCancelDraftProposal(player.id);
        } else {
            handleMakeProposal(player);
        }
    };

    const handleFinalizeDraft = async () => {
        const totalSquad = userTeam.squad.length + myProposalPlayerIds.length;
        if (totalSquad < 11) {
            alert('Você precisa selecionar pelo menos 11 jogadores!');
            return;
        }

        if (window.confirm('Deseja confirmar suas propostas de Draft? Elas serão processadas na primeira madrugada.')) {
            const newState = { ...state };
            // Advance from Day -1 to Day 0 if not already
            if (newState.world.currentDay === -1) {
                newState.world.currentDay = 0;
            }
            setState(newState);
            await saveGame(newState);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 max-w-[1600px] mx-auto">
            {/* Main Stats Header */}
            <div className="glass-card-neon p-4 sm:p-6 rounded-[2rem] border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                    <Rocket size={120} className="text-cyan-400 rotate-12" />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative z-10 w-full md:w-auto">
                    <div className="space-y-1">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            <h1 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter">
                                DRAFT <span className="text-cyan-400">GENESIS</span>
                            </h1>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">FASE DE MONTAGEM DE ELENCO • DIA {state.world.currentDay === -1 ? 'GENESE' : state.world.currentDay}</p>
                    </div>

                    <div className="h-10 w-[1px] bg-white/10 hidden sm:block" />

                    <div className="flex gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">SCORE UTILIZADO</p>
                            <p className={`text-lg font-black leading-none ${remaining < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                                {currentPower.toLocaleString()} <span className="text-[10px] text-slate-600">/ {DRAFT_BUDGET.toLocaleString()}</span>
                            </p>
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">VAGAS OCUPADAS</p>
                            <p className="text-lg font-black text-white leading-none">
                                {userTeam.squad.length + myProposalPlayerIds.length} <span className="text-[10px] text-slate-600">/ 15</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                    <div className="flex-1 md:w-48 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={`h-full ${remaining < 0 ? 'bg-red-500' : 'bg-cyan-500'}`}
                        />
                    </div>
                    <button
                        onClick={handleFinalizeDraft}
                        disabled={remaining < 0 || (userTeam.squad.length + myProposalPlayerIds.length) < 11}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${remaining < 0 || (userTeam.squad.length + myProposalPlayerIds.length) < 11
                            ? 'bg-white/5 text-slate-700 cursor-not-allowed'
                            : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95'
                            }`}
                    >
                        Confirmar Draft
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab('market')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'market' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                    <Users size={14} /> MERCADO DE DRAFT
                </button>
                <button
                    onClick={() => setActiveTab('squad')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'squad' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                >
                    <Shield size={14} /> MEU ELENCO ({userTeam.squad.length + myProposalPlayerIds.length})
                </button>
            </div>

            {/* Market View */}
            <AnimatePresence mode="wait">
                {activeTab === 'market' ? (
                    <motion.div
                        key="market"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                    >
                        {/* Filters Bar */}
                        <div className="glass-card-neon p-4 rounded-2xl border-white/5 flex flex-wrap items-center gap-4">
                            <div className="relative group flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="BUSCAR ATLETA..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-bold text-white uppercase outline-none focus:border-cyan-500/50 transition-all"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={roleFilter}
                                    onChange={e => setRoleFilter(e.target.value as any)}
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-white uppercase outline-none focus:border-cyan-500/50"
                                >
                                    <option value="ALL">TODAS AS POSIÇÕES</option>
                                    <option value="GOL">GOLEIROS</option>
                                    <option value="ZAG">ZAGUEIROS</option>
                                    <option value="MEI">MEIAS</option>
                                    <option value="ATA">ATACANTES</option>
                                </select>
                                <select
                                    value={districtFilter}
                                    onChange={e => setDistrictFilter(e.target.value as any)}
                                    className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-white uppercase outline-none focus:border-cyan-500/50"
                                >
                                    <option value="ALL">TODOS OS DISTRITOS</option>
                                    <option value="NORTE">NORTE</option>
                                    <option value="SUL">SUL</option>
                                    <option value="LESTE">LESTE</option>
                                    <option value="OESTE">OESTE</option>
                                </select>
                            </div>
                        </div>

                        {/* HIGH DENSITY PLAYER LIST */}
                        <div className="glass-card-neon rounded-2xl border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/5">
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Atleta</th>
                                            <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Pos</th>
                                            <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Rating</th>
                                            <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Distrito</th>
                                            <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Demanda</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        {marketPlayers.slice(0, 50).map(player => (
                                            <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-white">
                                                            {player.nickname[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-black text-white uppercase">{player.nickname}</p>
                                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{player.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${player.role === 'GOL' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                                                        player.role === 'ZAG' ? 'bg-blue-500/10 border-blue-500/30 text-blue-500' :
                                                            player.role === 'MEI' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' :
                                                                'bg-red-500/10 border-red-500/30 text-red-500'
                                                        }`}>
                                                        {player.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-mono font-black text-white text-[11px]">
                                                    {player.totalRating}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-[9px] font-bold text-slate-400 opacity-60 uppercase">{player.district}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <TrendingUp size={10} className={proposalCounts[player.id] > 0 ? 'text-cyan-400' : 'text-slate-700'} />
                                                        <span className={`text-[10px] font-black ${proposalCounts[player.id] > 0 ? 'text-white' : 'text-slate-700'}`}>
                                                            {proposalCounts[player.id] || 0}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => handleToggleDraft(player)}
                                                        disabled={state.world.currentDay === 2 && !myProposalPlayerIds.includes(player.id)}
                                                        className={`px-4 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 justify-end ml-auto ${myProposalPlayerIds.includes(player.id)
                                                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-red-500 hover:text-white hover:border-red-500/50'
                                                            : state.world.currentDay === 2
                                                                ? 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                                                                : 'bg-white/5 text-white border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                                                            }`}
                                                    >
                                                        {myProposalPlayerIds.includes(player.id) ? (
                                                            <>
                                                                <Clock size={10} className="animate-pulse" /> Aguardando
                                                            </>
                                                        ) : state.world.currentDay === 2 ? (
                                                            'Encerrado'
                                                        ) : (
                                                            'Recrutar'
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {marketPlayers.length === 0 && (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-600 gap-3">
                                    <Search size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum atleta encontrado nos filtros</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="squad"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {Array.from(new Set([...userTeam.squad, ...myProposalPlayerIds])).map(playerId => {
                            const p = state.players[playerId];
                            const isPending = myProposalPlayerIds.includes(playerId);
                            if (!p) return null;
                            return (
                                <div key={p.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black text-black ${p.role === 'GOL' ? 'bg-amber-400' :
                                            p.role === 'ZAG' ? 'bg-blue-400' :
                                                p.role === 'MEI' ? 'bg-emerald-400' : 'bg-red-400'
                                            }`}>
                                            {p.role}
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase truncate max-w-[120px]">{p.nickname}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[9px] font-bold text-slate-500 uppercase">{p.totalRating} PTS</p>
                                                {isPending && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded uppercase">Aguardando</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleDraft(p)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                        title="Remover do Draft"
                                    >
                                        <Shield size={16} className="rotate-180" />
                                    </button>
                                </div>
                            );
                        })}
                        {(userTeam.squad.length + myProposalPlayerIds.length) === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 gap-3 glass-card-neon border-dashed border-white/5 rounded-3xl">
                                <Users size={48} strokeWidth={1} />
                                <p className="text-xs font-black uppercase tracking-widest italic">Sua lista de recrutamento está vazia</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
