import React from 'react';
import { Manager, Achievement } from '../types';
import { X, Trophy, Star, Shield, TrendingUp, Zap, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { useGame } from '../store/GameContext';
import { calculateTeamPower } from '../engine/gameLogic';

interface ManagerModalProps {
    manager: Manager;
    onClose: () => void;
    onResign?: () => void;
}

export const ManagerModal: React.FC<ManagerModalProps> = ({ manager, onClose, onResign }) => {
    const { state } = useGame();

    const userTeam = manager.career.currentTeamId ? state.teams[manager.career.currentTeamId] : null;
    const teamPower = userTeam ? calculateTeamPower(userTeam, state.players) : 0;
    const powerCap = userTeam?.powerCap || 0;
    const squadFillPercent = powerCap > 0 ? (teamPower / powerCap) * 100 : 0;

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
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Comandante de Elite</span>
                                <div className="h-px w-8 bg-cyan-500/30" />
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                                {manager.name}
                            </h2>
                            <div className="flex items-center gap-3 mt-1 text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-widest">{manager.district} DISTRICT</span>
                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-xs font-bold text-emerald-400">LVL {Math.floor(manager.reputation / 10)}</span>
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
                            {(!manager.achievements || manager.achievements.length === 0) ? (
                                <div className="py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-xl">
                                    <p className="text-xs text-slate-500 italic">Sua estante de troféus está vazia.</p>
                                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest font-bold">Vença competições para ganhar glória!</p>
                                </div>
                            ) : (
                                manager.achievements.map((ach, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={i}
                                        className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl group hover:bg-white/10 transition-all"
                                    >
                                        <div className={`p-2 rounded-lg ${ach.type === 'Clube' ? 'bg-cyan-500/10 text-cyan-400' : ach.type === 'Distrito' ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-400'}`}>
                                            <Trophy size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-200">{ach.title}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest">Temporada {ach.season} • {ach.type}</p>
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
