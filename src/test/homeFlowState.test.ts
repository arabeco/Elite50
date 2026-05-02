import { describe, expect, it } from 'vitest';
import { buildHomeChecklistItems, buildHomeFlowSteps, resolveHomePhase } from '../utils/homeFlow';

describe('homeFlow helpers', () => {
  it('resolves the current home phase with explicit priority', () => {
    expect(resolveHomePhase({
      isPreseason: true,
      isOffseason: true,
      isMatchDay: true,
      isPostGame: true,
    })).toBe('preseason');

    expect(resolveHomePhase({
      isPreseason: false,
      isOffseason: true,
      isMatchDay: true,
      isPostGame: true,
    })).toBe('offseason');

    expect(resolveHomePhase({
      isPreseason: false,
      isOffseason: false,
      isMatchDay: true,
      isPostGame: true,
    })).toBe('matchday');
  });

  it('builds checklist items with safe default details', () => {
    expect(buildHomeChecklistItems({
      phase: 'preseason',
      squadSize: 11,
      draftCount: 0,
      lineupCount: 9,
      isSquadComplete: false,
      isDraftResolved: false,
      isLineupReady: false,
      isTacticReady: false,
      hasPendingPostGame: false,
      joinWindowOpen: true,
      tacticLabel: null,
      nextGameDetail: null,
    })).toEqual([
      { label: 'Elenco completo', done: false, status: 'danger', detail: '11/15' },
      { label: 'Draft resolvido', done: false, status: 'warning', detail: 'sem pendencia' },
      { label: 'Escalacao minima', done: false, status: 'info', detail: '9/11' },
      { label: 'Tatica definida', done: false, status: 'info', detail: 'pendente' },
      { label: 'Abertura da temporada', done: false, status: 'info', detail: 'depois dos ajustes' },
    ]);
  });

  it('simplifies checklist once the season is already running', () => {
    expect(buildHomeChecklistItems({
      phase: 'season',
      squadSize: 15,
      draftCount: 0,
      lineupCount: 11,
      isSquadComplete: true,
      isDraftResolved: true,
      isLineupReady: true,
      isTacticReady: false,
      hasPendingPostGame: true,
      joinWindowOpen: false,
      tacticLabel: 'Equilibrado',
      nextGameDetail: 'sab. 10:00',
    })).toEqual([
      { label: 'Time pronto', done: false, status: 'warning', detail: 'ajustes pendentes' },
      { label: 'Proximo jogo', done: true, status: 'info', detail: 'sab. 10:00' },
      { label: 'Pos-jogo', done: false, status: 'danger', detail: 'relatorio pendente' },
      { label: 'Mercado', done: false, status: 'warning', detail: 'fechado' },
    ]);
  });

  it('builds flow steps with the active phase highlighted', () => {
    const steps = buildHomeFlowSteps({
      phase: 'matchday',
      isDraftResolved: true,
      isSquadComplete: true,
      isLineupReady: true,
      isTacticReady: true,
      hasPlayedMatch: false,
      hasRevealedMatch: false,
      isOffseasonActive: false,
      firstMatchStage: 'preview',
    });

    expect(steps.find(step => step.key === 'match')).toEqual({
      key: 'match',
      label: 'Jogo',
      done: false,
      active: true,
    });
    expect(steps.find(step => step.key === 'offseason')?.active).toBe(false);
  });
});
