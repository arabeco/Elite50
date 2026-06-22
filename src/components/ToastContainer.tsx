import React from 'react';
import { useGameState, useGameDispatch } from '../store/GameContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X, TriangleAlert } from 'lucide-react';

export const ToastContainer: React.FC = () => {
    const { toasts } = useGameState();
    const { removeToast } = useGameDispatch();

    const getToastStyle = (type: typeof toasts[number]['type']) => {
        switch (type) {
            case 'success':
                return {
                    shell: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.16)]',
                    icon: 'text-emerald-300',
                };
            case 'error':
                return {
                    shell: 'border-rose-400/35 bg-rose-500/15 text-rose-50 shadow-[0_0_24px_rgba(244,63,94,0.16)]',
                    icon: 'text-rose-300',
                };
            case 'warning':
                return {
                    shell: 'border-amber-400/35 bg-amber-500/15 text-amber-50 shadow-[0_0_24px_rgba(245,158,11,0.16)]',
                    icon: 'text-amber-300',
                };
            default:
                return {
                    shell: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)]',
                    icon: 'text-cyan-300',
                };
        }
    };

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[9999] flex flex-col-reverse items-center gap-2 px-4 pb-[max(env(safe-area-inset-bottom),0px)] sm:bottom-6">
            <AnimatePresence>
                {toasts.slice(-3).map(toast => {
                    const style = getToastStyle(toast.type);

                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 18, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                            className={`pointer-events-auto flex min-h-11 w-full max-w-[min(92vw,30rem)] items-center justify-between gap-3 rounded-full border px-3.5 py-2.5 backdrop-blur-xl ${style.shell}`}
                        >
                            <div className="flex min-w-0 items-center gap-2.5">
                                {toast.type === 'success' && <CheckCircle2 size={16} className={style.icon} />}
                                {toast.type === 'error' && <AlertCircle size={16} className={style.icon} />}
                                {toast.type === 'warning' && <TriangleAlert size={16} className={style.icon} />}
                                {toast.type === 'info' && <Info size={16} className={style.icon} />}
                                <span className="min-w-0 text-[11px] font-black uppercase leading-snug tracking-[0.14em] sm:text-xs">{toast.message}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeToast(toast.id)}
                                className="shrink-0 rounded-full border border-white/10 bg-black/20 p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                                aria-label="Fechar aviso"
                            >
                                <X size={12} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};
