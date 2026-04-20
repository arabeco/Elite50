import { describe, expect, it, vi } from 'vitest';
import { processNightMarket, calculateAttractiveness, calculatePostMatchProgression, calculateTradeAcceptanceChance } from '../engine/economyLogic';
import { simulateMatch, TeamStats } from '../engine/MatchEngine';
import { generatePlayer } from '../engine/generator';
import { GameState, Player, Team } from '../types';

const makePlayer = (id: string, teamId: string | null, rating: number, role: Player['role']): Player => {
  const player = generatePlayer(id, 'NORTE', rating, role);
  player.contract.teamId = teamId;
  player.satisfaction = 50;
  player.currentPhase = 6;
  return player;
};

const makeSquad = (teamId: string, rating: number): Player[] => {
  const roles: Player['role'][] = ['GOL', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];
  return roles.map((role, index) => makePlayer(`${teamId}_${index}`, teamId, rating, role));
};

const makeTeamStats = (id: string, rating: number, overrides: Partial<TeamStats> = {}): TeamStats => ({
  id,
  name: id,
  attack: rating / 10,
  midfield: rating / 10,
  defense: rating / 10,
  goalkeeper: rating / 10,
  playStyle: 'Equilibrado',
  mentality: 'Calculista',
  linePosition: 50,
  aggressiveness: 50,
  intensity: 50,
  width: 50,
  passing: 50,
  slots: [null, null, null],
  chemistry: 80,
  ...overrides
});

const makeTeam = (id: string, squad: Player[], powerCap = 10000): Team => ({
  id,
  name: id,
  city: 'QA',
  district: 'NORTE',
  league: 'Cyan',
  colors: { primary: '#00ffff', secondary: '#111111' },
  tactics: {
    playStyle: 'Equilibrado',
    mentality: 'Calculista',
    linePosition: 50,
    aggressiveness: 50,
    intensity: 50,
    width: 50,
    passing: 50,
    slots: [null, null, null],
    preferredFormation: '4-3-3'
  },
  managerId: null,
  squad: squad.map(player => player.id),
  lineup: {},
  chemistry: 70,
  powerCap
});

describe('balance QA', () => {
  it('keeps neutral match scorelines and player ratings in sane ranges over repeated sims', () => {
    const totals: number[] = [];
    const ratingAverages: number[] = [];
    let blowouts = 0;

    for (let i = 0; i < 80; i += 1) {
      const homePlayers = makeSquad(`h${i}`, 650);
      const awayPlayers = makeSquad(`a${i}`, 650);
      const result = simulateMatch(
        makeTeamStats(`h${i}`, 650),
        makeTeamStats(`a${i}`, 650),
        homePlayers,
        awayPlayers
      );

      const totalGoals = result.homeScore + result.awayScore;
      totals.push(totalGoals);
      if (totalGoals >= 8 || Math.abs(result.homeScore - result.awayScore) >= 5) blowouts += 1;

      const ratings = Object.values(result.ratings);
      expect(ratings).toHaveLength(22);
      expect(ratings.every(rating => rating >= 3 && rating <= 10)).toBe(true);
      ratingAverages.push(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
    }

    const avgGoals = totals.reduce((sum, value) => sum + value, 0) / totals.length;
    const avgRating = ratingAverages.reduce((sum, value) => sum + value, 0) / ratingAverages.length;

    expect(avgGoals).toBeGreaterThanOrEqual(1.4);
    expect(avgGoals).toBeLessThanOrEqual(5.6);
    expect(blowouts / totals.length).toBeLessThanOrEqual(0.22);
    expect(avgRating).toBeGreaterThanOrEqual(5.0);
    expect(avgRating).toBeLessThanOrEqual(7.5);
  });

  it('makes tactics visible in aggregate without turning them into automatic wins', () => {
    let aggressiveGoals = 0;
    let defensiveGoals = 0;
    let aggressiveCards = 0;
    let defensiveCards = 0;
    let aggressiveShots = 0;
    let defensiveShots = 0;

    for (let i = 0; i < 70; i += 1) {
      const result = simulateMatch(
        makeTeamStats(`agg${i}`, 650, {
          playStyle: 'Blitzkrieg',
          mentality: 'Predadora',
          linePosition: 80,
          intensity: 85,
          width: 75,
          passing: 75
        }),
        makeTeamStats(`def${i}`, 650, {
          playStyle: 'Retranca Armada',
          mentality: 'Calculista',
          linePosition: 25,
          intensity: 35,
          width: 35,
          passing: 35
        }),
        makeSquad(`agg${i}`, 650),
        makeSquad(`def${i}`, 650)
      );

      aggressiveGoals += result.homeScore;
      defensiveGoals += result.awayScore;
      aggressiveShots += result.stats.shots.home;
      defensiveShots += result.stats.shots.away;
      aggressiveCards += result.events.filter(event => event.teamId === `agg${i}` && (event.type === 'CARD_YELLOW' || event.type === 'CARD_RED')).length;
      defensiveCards += result.events.filter(event => event.teamId === `def${i}` && (event.type === 'CARD_YELLOW' || event.type === 'CARD_RED')).length;
    }

    expect(aggressiveGoals).toBeGreaterThan(0);
    expect(defensiveGoals).toBeGreaterThan(0);
    expect(Math.max(aggressiveGoals, defensiveGoals)).toBeLessThan(Math.min(aggressiveGoals, defensiveGoals) * 3 + 20);
    expect(aggressiveShots).toBeGreaterThan(0);
    expect(defensiveShots).toBeGreaterThan(0);
    expect(aggressiveCards).toBeGreaterThanOrEqual(defensiveCards);
  });

  it('keeps post-match rating movement bounded for normal match ratings', () => {
    const player = makePlayer('growth_check', 't_1', 720, 'ATA');
    player.history.seasonRatingDelta = 0;

    const strongDelta = calculatePostMatchProgression(player, 8.4);
    const badDelta = calculatePostMatchProgression(player, 4.4);
    const neutralDelta = calculatePostMatchProgression(player, 6.0);

    expect(strongDelta).toBeGreaterThanOrEqual(1);
    expect(strongDelta).toBeLessThanOrEqual(5);
    expect(badDelta).toBeGreaterThanOrEqual(-3);
    expect(badDelta).toBeLessThanOrEqual(0);
    expect(Math.abs(neutralDelta)).toBeLessThanOrEqual(1);
  });

  it('makes AI market decisions reject happy/cap-breaking moves and accept attractive legal moves', () => {
    const targetSquad = makeSquad('target', 520);
    const sourceSquad = makeSquad('source', 560);
    const targetTeam = makeTeam('target', targetSquad, 9200);
    const sourceTeam = makeTeam('source', sourceSquad, 9200);
    const wanted = makePlayer('wanted', 'source', 610, 'ATA');
    wanted.satisfaction = 50;
    sourceTeam.squad.push(wanted.id);

    const state = {
      world: { currentDate: new Date().toISOString(), news: [] },
      teams: { target: targetTeam, source: sourceTeam },
      players: Object.fromEntries([...targetSquad, ...sourceSquad, wanted].map(player => [player.id, player])),
      notifications: []
    } as unknown as GameState;

    const randomMock = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const accepted = processNightMarket(state, [{
      id: 'p1',
      playerId: wanted.id,
      fromTeamId: 'source',
      toTeamId: 'target',
      status: 'PENDING'
    }], state.teams, state.players);

    expect(accepted.proposals[0].status).toBe('ACCEPTED');
    expect(state.players[wanted.id].contract.teamId).toBe('target');

    randomMock.mockReturnValue(0.01);
    const happyPlayer = makePlayer('happy', 'source', 610, 'ATA');
    happyPlayer.satisfaction = 90;
    state.players[happyPlayer.id] = happyPlayer;
    sourceTeam.squad.push(happyPlayer.id);

    const declinedHappy = processNightMarket(state, [{
      id: 'p2',
      playerId: happyPlayer.id,
      fromTeamId: 'source',
      toTeamId: 'target',
      status: 'PENDING'
    }], state.teams, state.players);

    expect(declinedHappy.proposals[0].status).toBe('DECLINED');

    const cappedTeam = makeTeam('capped', targetSquad, 6200);
    state.teams.capped = cappedTeam;

    const capBreaker = makePlayer('cap_breaker', 'source', 900, 'ATA');
    capBreaker.satisfaction = 40;
    state.players[capBreaker.id] = capBreaker;
    sourceTeam.squad.push(capBreaker.id);

    const declinedCap = processNightMarket(state, [{
      id: 'p3',
      playerId: capBreaker.id,
      fromTeamId: 'source',
      toTeamId: 'capped',
      status: 'PENDING'
    }], state.teams, state.players);

    expect(declinedCap.proposals[0].status).toBe('DECLINED');
    expect(state.players[capBreaker.id].contract.teamId).toBe('source');

    vi.restoreAllMocks();
  });

  it('keeps trade acceptance fair by rating gap', () => {
    const requested = makePlayer('requested', 'ai', 760, 'ATA');
    const equalOffer = makePlayer('equal', 'me', 760, 'ATA');
    const badOffer = makePlayer('bad', 'me', 560, 'ATA');
    const generousOffer = makePlayer('generous', 'me', 850, 'ATA');

    expect(calculateTradeAcceptanceChance(equalOffer, requested)).toBeGreaterThanOrEqual(0.7);
    expect(calculateTradeAcceptanceChance(generousOffer, requested)).toBeGreaterThan(calculateTradeAcceptanceChance(equalOffer, requested));
    expect(calculateTradeAcceptanceChance(badOffer, requested)).toBeLessThanOrEqual(0.08);
  });

  it('scores target club attractiveness in the expected direction', () => {
    const star = makePlayer('star', null, 850, 'ATA');
    const eliteTeam = makeTeam('elite', makeSquad('elite', 640), 12000);
    const weakTeam = makeTeam('weak', makeSquad('weak', 500), 8000);

    const eliteScore = calculateAttractiveness(star, eliteTeam, eliteTeam.squad.map(id => makePlayer(id, 'elite', 640, 'ZAG')), 2);
    const weakScore = calculateAttractiveness(star, weakTeam, weakTeam.squad.map(id => makePlayer(id, 'weak', 500, 'ZAG')), 10);

    expect(eliteScore).toBeGreaterThan(weakScore);
  });
});
