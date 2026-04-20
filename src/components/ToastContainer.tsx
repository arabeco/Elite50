import React from 'react';
import { useGameState, useGameDispatch } from '../store/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, TriangleAlert } from 'lucide-react';

export const ToastContainer: React.FC = () => {
    const { toasts } = useGameState();
    const { removeToast } = useGameDispatch();

    return (
        <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-xs">
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' :
                            toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
                                toast.type === 'warning' ? 'bg-amber-500/20 border-amber-500/30 text-amber-100' :
                                'bg-cyan-500/20 border-cyan-500/30 text-cyan-100'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
                            {toast.type === 'error' && <AlertCircle size={18} className="text-red-400" />}
                            {toast.type === 'warning' && <TriangleAlert size={18} className="text-amber-400" />}
                            {toast.type === 'info' && <Info size={18} className="text-cyan-400" />}
                            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={14} className="opacity-50" />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
