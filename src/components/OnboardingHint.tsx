import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Lightbulb, X } from 'lucide-react';

const STORAGE_KEY = 'elite2050:onboarding:v1';

export type OnboardingArea =
  | 'home'
  | 'observer'
  | 'team-draft'
  | 'team-squad'
  | 'team-lineup'
  | 'team-tactics'
  | 'team-training'
  | 'calendar'
  | 'world'
  | 'career';

interface HintContent {
  title: string;
  body: string;
  next: string;
  target: string;
}

export interface OnboardingActionHint extends HintContent {
  key: string;
  eyebrow?: string;
}

const HINTS: Record<OnboardingArea, HintContent> = {
  home: {
    title: 'Central do Dia',
    body: 'Essa tela e seu GPS. Ela mostra a fase atual, a acao principal e o que acontece depois.',
    next: 'Quando travar, volte aqui e siga o CTA principal.',
    target: 'home-gps'
  },
  observer: {
    title: 'Modo Observador',
    body: 'Voce entrou no mundo sem clube. Pode acompanhar a liga ou assumir um time de IA disponivel.',
    next: 'Escolha um clube para virar humano nesse mundo.',
    target: 'screen-observer'
  },
  'team-draft': {
    title: 'Draft da Pre-Season',
    body: 'Antes da temporada, monte sua wishlist e complete uma base jogavel dentro do Score Maximo.',
    next: 'Depois do draft, confira elenco e escalacao.',
    target: 'team-mode-tabs'
  },
  'team-squad': {
    title: 'Elenco',
    body: 'Aqui voce ve seus jogadores como cards completos. Clicar em atleta abre o perfil maior.',
    next: 'Use esta tela para entender score, potencial, traits e encaixe do time.',
    target: 'squad-power'
  },
  'team-lineup': {
    title: 'Escalacao',
    body: 'Defina titulares antes da temporada ou antes do proximo jogo. Sem base minima, o time fica vulneravel.',
    next: 'Depois disso, ajuste tatica ou volte para a Central do Dia.',
    target: 'team-mode-tabs'
  },
  'team-tactics': {
    title: 'Tatica',
    body: 'Aqui fica o plano de jogo. Mude estilo, mentalidade e cartas quando quiser preparar uma partida.',
    next: 'Salve so mudancas relevantes para evitar ruido.',
    target: 'team-mode-tabs'
  },
  'team-training': {
    title: 'Treino',
    body: 'Treino mexe com entendimento, laboratorio e evolucao individual. E o lugar de preparar medio prazo.',
    next: 'Use antes de rodadas importantes ou para lapidar um jogador-chave.',
    target: 'team-mode-tabs'
  },
  calendar: {
    title: 'Competicoes',
    body: 'Calendario, tabela, copas e relatorios vivem aqui. Times e jogadores clicaveis abrem detalhes.',
    next: 'Depois do jogo, venha aqui para rever resultado e contexto.',
    target: 'screen-calendar'
  },
  world: {
    title: 'Mundo',
    body: 'Noticias, rankings, mercado e outros clubes ficam aqui. E a tela para sentir o ecossistema vivo.',
    next: 'Clique em nomes de time ou jogador para investigar.',
    target: 'world-tabs'
  },
  career: {
    title: 'Carreira',
    body: 'Seu perfil de manager, codigo do mundo e ferramentas de GM ficam aqui.',
    next: 'Use o codigo para chamar outro jogador para o multiplayer.',
    target: 'screen-career'
  }
};

const readSeenHints = () => {
  if (typeof window === 'undefined') return new Set<string>();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
};

const writeSeenHints = (seen: Set<string>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
};

interface OnboardingHintProps {
  area: OnboardingArea;
  actionHint?: OnboardingActionHint | null;
}

export const OnboardingHint: React.FC<OnboardingHintProps> = ({ area, actionHint }) => {
  const [seenHints, setSeenHints] = useState<Set<string>>(() => readSeenHints());
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const hint = actionHint || HINTS[area];
  const hintKey = actionHint?.key || area;
  const allHintKeys = useMemo(() => Object.keys(HINTS) as OnboardingArea[], []);

  useEffect(() => {
    setIsVisible(!seenHints.has(hintKey));
  }, [hintKey, seenHints]);

  useEffect(() => {
    if (!isVisible || !hint?.target) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const element = document.querySelector(`[data-onboarding="${hint.target}"]`);
      setTargetRect(element ? element.getBoundingClientRect() : null);
    };

    updateTargetRect();
    const raf = window.requestAnimationFrame(updateTargetRect);
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [hint?.target, isVisible]);

  const markSeen = (keys: string[]) => {
    setSeenHints(prev => {
      const next = new Set<string>(prev);
      keys.forEach(key => next.add(key));
      writeSeenHints(next);
      return next;
    });
    setIsVisible(false);
  };

  if (!hint) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[78] bg-black/50 backdrop-blur-[1px]"
          />

          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="pointer-events-none fixed z-[79] rounded-[1.6rem] border-2 border-cyan-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.48),0_0_36px_rgba(34,211,238,0.75)]"
              style={{
                left: Math.max(8, targetRect.left - 8),
                top: Math.max(8, targetRect.top - 8),
                width: Math.min(window.innerWidth - Math.max(8, targetRect.left - 8) - 8, targetRect.width + 16),
                height: Math.min(window.innerHeight - Math.max(8, targetRect.top - 8) - 8, targetRect.height + 16)
              }}
            />
          )}

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 left-3 right-3 z-[80] mx-auto max-w-md overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950/95 shadow-[0_0_45px_rgba(6,182,212,0.20)] backdrop-blur-xl sm:bottom-32 sm:left-auto sm:right-8"
          >
            <div className="flex items-start gap-3 border-b border-white/10 bg-cyan-500/10 p-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/15 text-cyan-200">
                <Lightbulb size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300">
                  {actionHint?.eyebrow || 'Primeira vez nesta tela'}
                </p>
                <h3 className="mt-1 text-lg font-black uppercase italic tracking-tight text-white">{hint.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => markSeen([hintKey])}
                className="rounded-full border border-white/10 bg-black/35 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar dica"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-sm font-semibold leading-relaxed text-slate-200">{hint.body}</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-slate-300">
                <ArrowRight size={14} className="shrink-0 text-cyan-300" />
                {hint.next}
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => markSeen([hintKey])}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-cyan-300 active:scale-95"
                >
                  <Check size={15} /> Entendi
                </button>
                <button
                  type="button"
                  onClick={() => markSeen([...allHintKeys, hintKey])}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:bg-white/10 hover:text-white active:scale-95"
                >
                  Nao mostrar dicas
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
