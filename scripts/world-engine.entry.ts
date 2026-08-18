/**
 * Superficie publica do motor consumida pela Edge Function `world-clock-runner`.
 *
 * Esta lista define exatamente o que entra em engine.mjs. Se a function passar a
 * precisar de outra funcao do motor, adicione aqui e rode `npm run build:engine`.
 * Nao edite engine.mjs diretamente — ele e gerado.
 */
export {
  advanceGameDay,
  applySafetyNet,
  autoCompleteDraft,
  calculateAttr,
  calculateTeamPower,
  canTeamGainMatchProgression,
  cancelDraftProposal,
  checkPowerCap,
  getDraftInterestReport,
  getMatchSquad,
  getSeasonDayNumber,
  getTeamPowerCap,
  isJoinWindowOpen,
  resolveDraftConflict,
  simulateAndRecordMatch,
  startNewSeason,
  submitProposals,
  updatePlayerSatisfaction,
  updateStandings,
} from '../src/engine/gameLogic';
