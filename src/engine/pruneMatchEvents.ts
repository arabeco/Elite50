import { GameState, Match } from '../types';

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

const shouldKeepEvents = (match: Match, currentRound: number, keepRounds: number) => {
  // Nunca poda o que o jogador ainda nao abriu: `revealed === false` e um relatorio
  // cego pendente, e a timeline e justamente o conteudo dele.
  if (match.revealed === false) return true;
  if (!match.played) return true;
  return (currentRound - (match.round ?? 0)) < keepRounds;
};

const pruneMatch = (match: Match, currentRound: number, keepRounds: number) => {
  if (!match?.result?.events?.length) return 0;
  if (shouldKeepEvents(match, currentRound, keepRounds)) return 0;

  const freed = match.result.events.length;
  match.result.events = [];
  return freed;
};

const collectCupMatches = (world: any): Match[] => {
  const bracket = world?.eliteCup?.bracket || {};
  const cupMatches = [
    ...(bracket.round1 || []),
    ...(bracket.oitavas || []),
    ...(bracket.quarters || []),
    ...(bracket.quartas || []),
    ...(bracket.semis || []),
    ...(bracket.final ? [bracket.final] : []),
    ...(world?.districtCup?.matches || []),
    ...(world?.districtCup?.final ? [world.districtCup.final] : []),
  ];
  return cupMatches.filter(Boolean) as Match[];
};

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
      freed += pruneMatch(match, currentRound, keepRounds);
    });
  });

  collectCupMatches(world).forEach(match => {
    freed += pruneMatch(match, currentRound, keepRounds);
  });

  return freed;
};
