export type HomePhase = 'preseason' | 'season' | 'matchday' | 'postgame' | 'offseason';

export type HomeChecklistItem = {
  label: string;
  done: boolean;
  status: 'done' | 'warning' | 'danger' | 'info';
  detail: string;
};

export type HomeFlowStep = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
};

type ResolveHomePhaseInput = {
  isPreseason: boolean;
  isOffseason: boolean;
  isMatchDay: boolean;
  isPostGame: boolean;
};

type BuildChecklistInput = {
  phase: HomePhase;
  squadSize: number;
  draftCount: number;
  lineupCount: number;
  isSquadComplete: boolean;
  isDraftResolved: boolean;
  isLineupReady: boolean;
  isTacticReady: boolean;
  hasPendingPostGame: boolean;
  joinWindowOpen: boolean;
  tacticLabel?: string | null;
  nextGameDetail?: string | null;
};

type BuildFlowStepsInput = {
  phase: HomePhase;
  isDraftResolved: boolean;
  isSquadComplete: boolean;
  isLineupReady: boolean;
  isTacticReady: boolean;
  hasPlayedMatch: boolean;
  hasRevealedMatch: boolean;
  isOffseasonActive: boolean;
  firstMatchStage: 'preview' | 'live' | 'report' | null;
};

export const resolveHomePhase = ({
  isPreseason,
  isOffseason,
  isMatchDay,
  isPostGame,
}: ResolveHomePhaseInput): HomePhase => {
  if (isPreseason) return 'preseason';
  if (isOffseason) return 'offseason';
  if (isMatchDay) return 'matchday';
  if (isPostGame) return 'postgame';
  return 'season';
};

export const buildHomeChecklistItems = ({
  phase,
  squadSize,
  draftCount,
  lineupCount,
  isSquadComplete,
  isDraftResolved,
  isLineupReady,
  isTacticReady,
  hasPendingPostGame,
  joinWindowOpen,
  tacticLabel,
  nextGameDetail,
}: BuildChecklistInput): HomeChecklistItem[] => {
  if (phase === 'preseason') {
    return [
      {
        label: 'Elenco completo',
        done: isSquadComplete,
        status: isSquadComplete ? 'done' : 'danger',
        detail: `${squadSize}/15`,
      },
      {
        label: 'Draft resolvido',
        done: isDraftResolved,
        status: isDraftResolved ? 'done' : 'warning',
        detail: draftCount > 0 ? `${draftCount} na lista` : 'sem pendencia',
      },
      {
        label: 'Escalacao minima',
        done: isLineupReady,
        status: isLineupReady ? 'done' : (isSquadComplete ? 'danger' : 'info'),
        detail: `${lineupCount}/11`,
      },
      {
        label: 'Tatica definida',
        done: isTacticReady,
        status: isTacticReady ? 'done' : (isLineupReady ? 'warning' : 'info'),
        detail: tacticLabel || 'pendente',
      },
      {
        label: 'Abertura da temporada',
        done: isSquadComplete && isLineupReady && isTacticReady,
        status: isSquadComplete && isLineupReady && isTacticReady ? 'done' : 'info',
        detail: isSquadComplete && isLineupReady && isTacticReady ? 'pronta' : 'depois dos ajustes',
      },
    ];
  }

  if (phase === 'offseason') {
    return [
      {
        label: 'Season report',
        done: !hasPendingPostGame,
        status: hasPendingPostGame ? 'warning' : 'done',
        detail: hasPendingPostGame ? 'leitura pendente' : 'em dia',
      },
      {
        label: 'Time pronto',
        done: isLineupReady && isTacticReady,
        status: isLineupReady && isTacticReady ? 'done' : 'warning',
        detail: isLineupReady && isTacticReady ? 'base ajustada' : 'revise time',
      },
      {
        label: 'Janela',
        done: joinWindowOpen,
        status: joinWindowOpen ? 'warning' : 'info',
        detail: joinWindowOpen ? 'movimentacao aberta' : 'fechada',
      },
      {
        label: 'Proxima season',
        done: false,
        status: 'info',
        detail: 'virada automatica',
      },
    ];
  }

  return [
    {
      label: 'Time pronto',
      done: isLineupReady && isTacticReady,
      status: isLineupReady && isTacticReady ? 'done' : 'warning',
      detail: isLineupReady && isTacticReady ? 'ok para jogar' : 'ajustes pendentes',
    },
    {
      label: 'Proximo jogo',
      done: !!nextGameDetail,
      status: nextGameDetail ? 'info' : 'warning',
      detail: nextGameDetail || 'sem horario',
    },
    {
      label: 'Pos-jogo',
      done: !hasPendingPostGame,
      status: hasPendingPostGame ? 'danger' : 'done',
      detail: hasPendingPostGame ? 'relatorio pendente' : 'limpo',
    },
    {
      label: 'Mercado',
      done: joinWindowOpen,
      status: joinWindowOpen ? 'info' : 'warning',
      detail: joinWindowOpen ? 'aberto' : 'fechado',
    },
  ];
};

export const buildHomeFlowSteps = ({
  phase,
  isDraftResolved,
  isSquadComplete,
  isLineupReady,
  isTacticReady,
  hasPlayedMatch,
  hasRevealedMatch,
  isOffseasonActive,
  firstMatchStage,
}: BuildFlowStepsInput): HomeFlowStep[] => ([
  { key: 'draft', label: 'Draft', done: isDraftResolved, active: phase === 'preseason' && !isDraftResolved },
  { key: 'squad', label: 'Elenco', done: isSquadComplete, active: phase === 'preseason' && isDraftResolved && !isSquadComplete },
  { key: 'lineup', label: 'Escalacao', done: isLineupReady, active: phase === 'preseason' && isSquadComplete && !isLineupReady },
  { key: 'tactics', label: 'Tatica', done: isTacticReady, active: phase === 'preseason' && isLineupReady && !isTacticReady },
  { key: 'match', label: 'Jogo', done: hasPlayedMatch, active: phase === 'matchday' || firstMatchStage === 'preview' },
  { key: 'postgame', label: 'Pos-jogo', done: hasRevealedMatch, active: phase === 'postgame' || firstMatchStage === 'report' },
  { key: 'offseason', label: 'Offseason', done: isOffseasonActive, active: isOffseasonActive },
]);
