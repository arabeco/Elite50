import { describe, expect, it } from 'vitest';
import { simulateNativeMatch2D } from '../engine/match2DPlayEngine';
import { Match, Player, Team } from '../types';

const roles: Player['role'][] = ['GOL', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];

const makeTeam = (id: string, style: Team['tactics']['playStyle'], rating: number) => {
  const squad = roles.map((_, index) => `${id}_p${index}`);
  const team = {
    id, name: id, city: 'Teste', district: 'OESTE', league: 'Purple', managerId: null,
    squad, lineup: {}, chemistry: 76, colors: { primary: '#00ffff', secondary: '#111111' },
    tactics: { playStyle: style, preferredFormation: '4-3-3', intensity: 60, aggressiveness: 55, passing: 60, width: 50, linePosition: 55, slots: [] },
  } as unknown as Team;
  const players = Object.fromEntries(squad.map((playerId, index) => [playerId, {
    id: playerId, name: playerId, nickname: playerId, role: roles[index], totalRating: rating,
    district: 'OESTE', position: roles[index] === 'GOL' ? 'Goleiro' : 'Linha', contract: { teamId: id },
  } as unknown as Player]));
  return { team, players };
};

const baseMatch: Match = { id: 'qa', homeTeamId: 'home', awayTeamId: 'away', date: '2050-01-01', round: 1 };

const assignLineup = (team: Team, scrambled = false) => {
  const slots = ['GOL_1', 'ZAG_1', 'ZAG_2', 'ZAG_3', 'ZAG_4', 'MEI_1', 'MEI_2', 'MEI_3', 'ATA_1', 'ATA_2', 'ATA_3'];
  const ids = scrambled ? [...team.squad.slice(5), ...team.squad.slice(0, 5)] : team.squad;
  team.lineup = Object.fromEntries(slots.map((slot, index) => [slot, ids[index]]));
};

describe('native possession-chain match engine', () => {
  it('is deterministic for the same seed', () => {
    const home = makeTeam('home', 'Gegenpressing', 720);
    const away = makeTeam('away', 'Tiki-Taka', 720);
    const players = { ...home.players, ...away.players };
    const first = simulateNativeMatch2D(baseMatch, home.team, away.team, players, 'same-seed').match.result;
    const second = simulateNativeMatch2D(baseMatch, home.team, away.team, players, 'same-seed').match.result;
    expect(second).toEqual(first);
    const differentRun = simulateNativeMatch2D(baseMatch, home.team, away.team, players, 'different-seed').match.result;
    expect(differentRun).not.toEqual(first);
  });

  it('gives a sustained advantage to a clearly stronger team', () => {
    const strong = makeTeam('home', 'Gegenpressing', 860);
    const weak = makeTeam('away', 'Tiki-Taka', 560);
    const players = { ...strong.players, ...weak.players };
    const samples = Array.from({ length: 80 }, (_, index) => simulateNativeMatch2D(baseMatch, strong.team, weak.team, players, `power-gap-${index}`).match.result!);
    const strongGoals = samples.reduce((sum, result) => sum + result.homeScore, 0);
    const weakGoals = samples.reduce((sum, result) => sum + result.awayScore, 0);
    const strongShots = samples.reduce((sum, result) => sum + result.stats!.shots.home, 0);
    const weakShots = samples.reduce((sum, result) => sum + result.stats!.shots.away, 0);
    const wins = samples.filter(result => result.homeScore > result.awayScore).length;
    const losses = samples.filter(result => result.homeScore < result.awayScore).length;
    expect(strongGoals).toBeGreaterThan(weakGoals);
    expect(strongShots).toBeGreaterThan(weakShots);
    expect(wins).toBeGreaterThan(losses);
  }, 15_000);

  it('rewards a correct lineup against the same power out of position', () => {
    const organized = makeTeam('home', 'Equilibrado', 720);
    const scrambled = makeTeam('away', 'Equilibrado', 720);
    assignLineup(organized.team, false);
    assignLineup(scrambled.team, true);
    const players = { ...organized.players, ...scrambled.players };
    const samples = Array.from({ length: 80 }, (_, index) => simulateNativeMatch2D(baseMatch, organized.team, scrambled.team, players, `lineup-${index}`).match.result!);
    const organizedGoals = samples.reduce((sum, result) => sum + result.homeScore, 0);
    const scrambledGoals = samples.reduce((sum, result) => sum + result.awayScore, 0);
    const wins = samples.filter(result => result.homeScore > result.awayScore).length;
    const losses = samples.filter(result => result.homeScore < result.awayScore).length;
    expect(organizedGoals).toBeGreaterThan(scrambledGoals);
    expect(wins).toBeGreaterThan(losses);
  }, 15_000);

  it('lets mentality and equipped tactical cards change future outcomes', () => {
    const baseline = makeTeam('home', 'Equilibrado', 720);
    const opponent = makeTeam('away', 'Equilibrado', 720);
    const tuned = { ...baseline.team, tactics: {
      ...baseline.team.tactics,
      mentality: 'Predadora' as const,
      slots: [{ id: 'super-shot', name: 'Super Chute', effect: '+ ataque' }],
    } };
    const players = { ...baseline.players, ...opponent.players };
    let baselineGoals = 0;
    let tunedGoals = 0;

    for (let index = 0; index < 120; index += 1) {
      const seed = `decision-impact-${index}`;
      baselineGoals += simulateNativeMatch2D(baseMatch, baseline.team, opponent.team, players, seed).match.result!.homeScore;
      tunedGoals += simulateNativeMatch2D(baseMatch, tuned, opponent.team, players, seed).match.result!.homeScore;
    }

    expect(tunedGoals).toBeGreaterThan(baselineGoals);
  }, 15_000);

  it('keeps a balanced batch inside football ranges', () => {
    const home = makeTeam('home', 'Gegenpressing', 720);
    const away = makeTeam('away', 'Tiki-Taka', 720);
    const players = { ...home.players, ...away.players };
    const samples = Array.from({ length: 80 }, (_, index) => simulateNativeMatch2D(baseMatch, home.team, away.team, players, `batch-${index}`).match.result!);
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const totalShots = samples.map(result => result.stats!.shots.home + result.stats!.shots.away);
    const totalGoals = samples.map(result => result.homeScore + result.awayScore);
    const homePossession = samples.map(result => result.stats!.possession.home);
    expect(average(totalShots)).toBeGreaterThanOrEqual(8);
    expect(average(totalShots)).toBeLessThanOrEqual(24);
    expect(average(totalGoals)).toBeGreaterThanOrEqual(1.2);
    expect(average(totalGoals)).toBeLessThanOrEqual(4.2);
    expect(Math.min(...homePossession)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...homePossession)).toBeLessThanOrEqual(70);
    expect(samples.every(result => result.events.every(event => !event.type.toLowerCase().includes('injur')))).toBe(true);
  }, 15_000);
});
