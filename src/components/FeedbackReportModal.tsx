import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { FeedbackCategory, submitFeedbackReport } from '../lib/feedback';
import { useGameDispatch, useGameState } from '../store/GameContext';

interface FeedbackReportModalProps {
  currentTab: string;
  onClose: () => void;
}

const CATEGORIES: Array<{ id: FeedbackCategory; label: string }> = [
  { id: 'bug', label: 'Bug' },
  { id: 'confusing', label: 'Confuso' },
  { id: 'balance', label: 'Balanceamento' },
  { id: 'visual', label: 'Visual' },
  { id: 'other', label: 'Outro' }
];

export const FeedbackReportModal: React.FC<FeedbackReportModalProps> = ({ currentTab, onClose }) => {
  const { state, worldId } = useGameState();
  const { addToast } = useGameDispatch();
  const [category, setCategory] = React.useState<FeedbackCategory>('bug');
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);

  const handleSubmit = async () => {
    const cleanMessage = message.trim();
    if (cleanMessage.length < 8) {
      addToast('Descreva um pouco mais o problema.', 'warning');
      return;
    }

    try {
      setIsSending(true);
      await submitFeedbackReport({
        worldId,
        currentTab,
        currentDay: state.world.currentDay,
        currentSeason: state.world.currentSeason,
        userTeamId: state.userTeamId,
        userManagerId: state.userManagerId,
        category,
        message: cleanMessage
      });
      addToast('Relato enviado. Valeu, isso ajuda muito.', 'success');
      onClose();
    } catch (error) {
      console.error('Feedback report failed', error);
      addToast('Nao consegui enviar o relato. Confira se o SQL de feedback foi rodado.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-xl">
      <div className="w-full max-w-lg rounded-[2rem] border border-cyan-500/25 bg-slate-950 p-5 shadow-[0_0_45px_rgba(34,211,238,0.18)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-300">Feedback de teste</p>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Reportar problema</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:text-white"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CATEGORIES.map(item => (
            <button
              type="button"
              key={item.id}
              onClick={() => setCategory(item.id)}
              className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-widest transition ${
                category === item.id
                  ? 'border-cyan-400 bg-cyan-400 text-black'
                  : 'border-white/10 bg-white/[0.03] text-white/40 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={event => setMessage(event.target.value)}
          placeholder="O que aconteceu? Em que tela? O que voce esperava?"
          className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-4 text-sm font-bold leading-relaxed text-white outline-none transition placeholder:text-white/20 focus:border-cyan-400/50"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">
            Tela: {currentTab} · Dia {state.world.currentDay || 0}
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSending}
            className="rounded-xl bg-cyan-400 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {isSending ? 'Enviando' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};
