import { GameState, Match } from '../types';
import { ELITE_CUP_ROUNDS, SEASON_ROUNDS } from '../constants/gameConstants';

/**
 * Quantas rodadas de play-by-play manter no world_state.
 *
 * O `events` de uma partida ocupa ~11 KB. Com 112 partidas por temporada isso vira
 * ~1,2 MB — medido em producao, 91% de todo o peso de `world.leagues` e 76% do
 * `world_state` inteiro. Como o world_state trafega em cada leitura do mundo, esse
 * array e a maior fonte isolada de egress do projeto.
 *
 * O que a poda NAO remove: placar, scorers, assists, ratings, stats e headline.
 * Some apenas a timeline minuto a minuto de partidas antigas que o jogador ja viu.
 */
export const MATCH_EVENT_RETENTION_ROUNDS = 2;

/**
 * ATENCAO: `match.round` NAO esta na mesma escala em todas as competicoes.
 *
 * - Liga:        round 1..SEASON_ROUNDS, ja na escala global.
 * - Copa Elite:  `eliteRound = round - SEASON_ROUNDS`, ou seja 1..4.
 * - Copa Distritos: `districtRound = round - (SEASON_ROUNDS + ELITE_CUP_ROUNDS)`, 1..4.
 *
 * Mas `world.currentRound` e sempre a rodada GLOBAL (1..TOTAL_ROUNDS). Comparar
 * `currentRound - match.round` direto em uma partida de copa da uma diferenca
 * inflada: a final da Copa Elite (round 4) com currentRound 11 pareceria ter 7
 * rodadas de idade e seria podada no exato dia em que foi jogada.
 *
 * Por isso cada grupo de partidas e podado com o offset da sua competicao.
 */
const ELITE_CUP_ROUND_OFFSET = SEASON_ROUNDS;
const DISTRICT_CUP_ROUND_OFFSET = SEASON_ROUNDS + ELITE_CUP_ROUNDS;

const shouldKeepEvents = (
  match: Match,
  currentRound: number,
  keepRounds: number,
  roundOffset: number
) => {
  // Nunca poda o que o jogador ainda nao abriu: `revealed === false` e um relatorio
  // cego pendente, e a timeline e justamente o conteudo dele.
  if (match.revealed === false) return true;
  if (!match.played) return true;

  const globalRound = roundOffset + (match.round ?? 0);
  return (currentRound - globalRound) < keepRounds;
};

const pruneMatch = (
  match: Match,
  currentRound: number,
  keepRounds: number,
  roundOffset: number
) => {
  if (!match?.result?.events?.length) return 0;
  if (shouldKeepEvents(match, currentRound, keepRounds, roundOffset)) return 0;

  const freed = match.result.events.length;
  match.result.events = [];
  return freed;
};

const eliteCupMatches = (world: any): Match[] => {
  const bracket = world?.eliteCup?.bracket || {};
  return [
    ...(bracket.round1 || []),
    ...(bracket.oitavas || []),
    ...(bracket.quarters || []),
    ...(bracket.quartas || []),
    ...(bracket.semis || []),
    ...(bracket.final ? [bracket.final] : []),
  ].filter(Boolean) as Match[];
};

const districtCupMatches = (world: any): Match[] => [
  ...(world?.districtCup?.matches || []),
  ...(world?.districtCup?.final ? [world.districtCup.final] : []),
].filter(Boolean) as Match[];

/**
 * Esvazia `result.events` de partidas ja jogadas, ja reveladas e mais antigas que
 * `keepRounds` rodadas. Muta `state.world` no lugar e devolve quantos eventos sairam.
 *
 * Idempotente: rodar duas vezes na mesma temporada nao muda nada na segunda.
 */
export const pruneOldMatchEvents = (
  state: GameState,
  keepRounds: number = MATCH_EVENT_RETENTION_ROUNDS
): number => {
  const world: any = state?.world;
  if (!world) return 0;

  const currentRound = world.currentRound ?? 0;
  let freed = 0;

  Object.values(world.leagues || {}).forEach((league: any) => {
    (league?.matches || []).forEach((match: Match) => {
      freed += pruneMatch(match, currentRound, keepRounds, 0);
    });
  });

  eliteCupMatches(world).forEach(match => {
    freed += pruneMatch(match, currentRound, keepRounds, ELITE_CUP_ROUND_OFFSET);
  });

  districtCupMatches(world).forEach(match => {
    freed += pruneMatch(match, currentRound, keepRounds, DISTRICT_CUP_ROUND_OFFSET);
  });

  return freed;
};
