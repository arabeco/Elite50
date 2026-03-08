import React from 'react';
import { useGame } from '../store/GameContext';
import { advanceGameDay } from '../engine/gameLogic';
import { Zap, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export const DevTimeController: React.FC = () => {
    const { state, setState, saveGame, addToast } = useGame();

    const handleAdvanceDay = async () => {
        console.log('--- DEV: Iniciando salto temporal (+1 dia) ---');

        // Use the functional update to ensure we have the latest state
        setState(prevState => {
            const newState = advanceGameDay(prevState);
            return newState;
        });

        addToast('Tempo avançado em 24h (Simulador Dev)', 'success');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2"
        >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 p-4 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)] flex flex-col gap-3 min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg">
                        <Clock size={16} className="text-amber-500" />
                    </div>
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Máquina do Tempo</span>
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 font-bold uppercase">Dia Atual:</span>
                        <span className="text-lg font-black text-white">{state.world.currentDay || 0}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">
                        Temporada {state.world.currentSeason || 2050}
                    </div>
                </div>

                <button
                    onClick={handleAdvanceDay}
                    className="w-full flex items-center justify-between gap-3 p-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-[11px] uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-[0.95] shadow-lg"
                >
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="fill-black" />
                        PRÓXIMO DIA
                    </div>
                    <ChevronRight size={14} />
                </button>

                <div className="text-[8px] text-center text-slate-500 font-bold italic">
                    * Somente para testes de progressão (DNA/Mercado)
                </div>
            </div>
        </motion.div>
    );
};
