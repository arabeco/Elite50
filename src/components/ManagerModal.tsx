import React from 'react';
import { Manager, Achievement } from '../types';
import { X, Trophy, Star, Shield, TrendingUp, Zap, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useGame } from '../store/GameContext';
import { calculateTeamPower } from '../engine/gameLogic';
import { getManagerCommandReadout } from '../utils/managerStats';
import { getStoreState } from '../utils/store';
import { STORE_ITEMS } from '../constants/storeCatalog';
import { groupAchievementsByTrophy } from '../utils/trophyAssets';

interface ManagerModalProps {
    manager: Manager;
    onClose: () => void;
    onResign?: () => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({ manager, onClose, onResign }) => {
    const { state } = useGame();

    const userTeam = manager.career.currentTeamId ? state.teams[manager.career.currentTeamId] : null;
    const isHumanManager = manager.isNPC === false || !manager.id.startsWith('m_');
    const isCurrentUserManager = manager.id === state.userManagerId;
    const store = getStoreState(state);
    const displayedItems = isCurrentUserManager
        ? store.equippedManagerItemIds
            .map(itemId => STORE_ITEMS.find(item => item.id === itemId))
            .filter((item): item is NonNullable<typeof item> => !!item && (item.category === 'ACCESSORY' || item.category === 'BADGE'))
            .slice(0, 3)
        : [];
    const teamPower = userTeam ? calculateTeamPower(userTeam, state.players) : 0;
    const powerCap = userTeam?.powerCap || 0;
    const squadFillPercent = powerCap > 0 ? (teamPower / powerCap) * 100 : 0;
    const commandReadout = getManagerCommandReadout(manager);
    const worldsPlayed = manager.career.worldIds?.length || (manager.career.historyTeamIds?.length ? 1 : 0);
    const trophyStacks = React.useMemo(() => groupAchievementsByTrophy(manager.achievements || []), [manager.achievements]);
    const tacticalMemoryRows = Object.entries(manager.tacticalMemory || {})
        .map(([style, value]) => [style, Number(value) || 0] as const)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg max-h-[90vh] bg-slate-950/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.2)] flex flex-col overflow-hidden slim-scrollbar"
            >
                {/* Header/Banner */}
                <div className="relative h-40 shrink-0 bg-gradient-to-br from-cyan-900/60 via-slate-900 to-slate-950 p-6 flex items-end">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="p-2 bg-black/40 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                        <Shield size={300} className="text-cyan-500 absolute -top-20 -left-20 rotate-12" />
                    </div>

                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
                                <Shield size={40} className="text-cyan-400" />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isHumanManager ? 'text-cyan-400' : 'text-violet-300'}`}>
                                    {isHumanManager ? 'Manager Humano' : 'Treinador IA'}
                                </span>
                                <div className="h-px w-8 bg-cyan-500/30" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                {manager.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-1 text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-widest">{manager.district} DISTRICT</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-xs font-bold text-emerald-400">LVL {Math.floor(manager.reputation / 10)}</span>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                    isHumanManager
                                        ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                                        : 'border-violet-400/30 bg-violet-400/10 text-violet-100'
                                }`}>
                                    {isHumanManager ? 'Perfil Global' : 'NPC do Mundo'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-3 opacity-10 text-cyan-400 group-hover:opacity-30 transition-opacity">
                                <Target size={24} />
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1">Score do Elenco</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">{teamPower}</span>
                                <span className="text-[10px] text-slate-500">/ {powerCap} Score Max.</span>
                            </div>
                            <div className="mt-3 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                    style={{ width: `${squadFillPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                            <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500 group-hover:opacity-30 transition-opacity">
                                <Trophy size={24} />
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold mb-1">Troféus Conquistados</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">{manager.career.titlesWon}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest">Títulos</span>
                            </div>
                            <div className="flex gap-1 mt-3">
                                {Array.from({ length: Math.min(manager.career.titlesWon, 8) }).map((_, i) => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Reputacao</p>
                            <span className="text-lg font-bold text-white">{manager.reputation}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Mundos</p>
                            <span className="text-lg font-bold text-white">{worldsPlayed}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Clubes</p>
                            <span className="text-lg font-bold text-white">{manager.career.historyTeamIds?.length || 0}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Ligas</p>
                            <span className="text-lg font-bold text-white">{manager.career.totalLeagueTitles}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Copas</p>
                            <span className="text-lg font-bold text-white">{manager.career.totalCupTitles}</span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Lendas</p>
                            <span className="text-lg font-bold text-white">{manager.career.hallOfFameEntries}</span>
                        </div>
                    </div>

                    <div className={`rounded-2xl border p-4 ${
                        isHumanManager
                            ? 'border-cyan-400/18 bg-cyan-400/10'
                            : 'border-violet-400/18 bg-violet-400/10'
                    }`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Shield size={16} className={isHumanManager ? 'text-cyan-200' : 'text-violet-200'} />
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                                    {isHumanManager ? 'Perfil publico' : 'Ficha de IA'}
                                </h3>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/35">
                                {isHumanManager ? 'humano' : 'bot'}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold uppercase leading-relaxed tracking-widest text-white/48">
                            {isHumanManager
                                ? 'Este manager representa um jogador real. Outros veem vitrine, trofeus e curriculo, mas nao o inventario completo.'
                                : 'Este tecnico e controlado pelo mundo. Tem tatica, reputacao e carreira simulada, mas nao possui inventario global.'}
                        </p>
                        {isHumanManager && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                                {[displayedItems[0], displayedItems[1], displayedItems[2]].map((item, index) => (
                                    <div key={item?.id || `manager-slot-${index}`} className="rounded-xl border border-white/10 bg-black/25 p-2">
                                        <div className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                                            {item ? <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1" /> : <Star size={16} className="text-white/20" />}
                                        </div>
                                        <p className="mt-1 truncate text-[7px] font-black uppercase tracking-wide text-white">{item?.name || 'Slot publico'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 p-4">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-amber-300" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Trofeus no perfil</h3>
                        </div>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
                            Trofeus sao curriculo conquistado. Eles aparecem aqui sem ocupar os 3 slots de exibicao de itens.
                        </p>
                    </div>

                    {/* Achievements Gallery */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy size={16} className="text-amber-400" />
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Galeria de Conquistas</h3>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">S{state.world.currentSeason} History</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {trophyStacks.length === 0 ? (
                                <div className="py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-xl">
                                    <p className="text-xs text-slate-500 italic">Sua estante de troféus está vazia.</p>
                                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest font-bold">Vença competições para ganhar glória!</p>
                                </div>
                            ) : (
                                trophyStacks.map((trophy, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={trophy.key}
                                        className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/10 transition-all"
                                    >
                                        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${trophy.type === 'Clube' ? 'bg-cyan-500/10' : trophy.type === 'Distrito' ? 'bg-amber-500/10' : 'bg-purple-500/10'}`}>
                                            <img src={trophy.asset} alt="" className="h-12 w-12 object-contain" />
                                            {trophy.count > 1 && (
                                                <span className="absolute -right-1 -top-1 rounded-full border border-black/50 bg-amber-300 px-1.5 py-0.5 text-[8px] font-black text-black">
                                                    x{trophy.count}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-200">{trophy.title}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Ultima S{trophy.latestSeason} - {trophy.type}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Zap size={14} className="text-cyan-400" />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Strategy & Attributes */}
                    <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-cyan-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Atributos de Comando</h3>
                        </div>
                        <div className="space-y-3">
                            <AttributeRow label="Evolução" value={manager.attributes.evolution} color="bg-cyan-500" />
                            <AttributeRow label="Negociação" value={manager.attributes.negotiation} color="bg-emerald-500" />
                            <AttributeRow label="Scouting" value={manager.attributes.scout} color="bg-purple-500" />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/10 p-3">
                                <p className="text-[8px] font-black uppercase tracking-widest text-cyan-100">Fechamento</p>
                                <p className="mt-1 text-sm font-black italic text-white">+{commandReadout.seasonGoldBonusPct}% ouro</p>
                            </div>
                            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3">
                                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-100">Draft</p>
                                <p className="mt-1 text-sm font-black italic text-white">{commandReadout.draftInfluence >= 0 ? '+' : ''}{commandReadout.draftInfluence}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Target size={16} className="text-emerald-400" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Memoria Tatica</h3>
                        </div>
                        {tacticalMemoryRows.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Nenhum metodo cravado no curriculo ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {tacticalMemoryRows.map(([style, value]) => (
                                    <div key={style} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{style}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">{value}%</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-950 border-t border-white/5 flex justify-center">
                    <div className="flex flex-wrap justify-center gap-3">
                        {onResign && (
                            <button
                                onClick={onResign}
                                className="px-6 py-2 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-rose-500/25 transition-colors"
                            >
                                Demitir-se
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-8 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:bg-cyan-400 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            Fechar Dossier
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const AttributeRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
            <span className="text-slate-400">{label}</span>
            <span className="text-white">{value}%</span>
        </div>
        <div className="h-1 bg-black/40 rounded-full overflow-hidden">
            <div className={`h-full ${color} shadow-[0_0_5px_rgba(255,255,255,0.2)]`} style={{ width: `${value}%` }} />
        </div>
    </div>
);
