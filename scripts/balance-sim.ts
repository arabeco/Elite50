import { simulateMatch, TeamStats } from '../src/engine/MatchEngine';
import { calculateAttractiveness, calculateTradeAcceptanceChance } from '../src/engine/economyLogic';
import { generatePlayer } from '../src/engine/generator';
import { Player, Team } from '../src/types';

type ScenarioStats = {
  games: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  totalGoals: number;
  totalShots: number;
  blowouts: number;
  ratingSamples: number[];
};

const roles: Player['role'][] = ['GOL', 'ZAG', 'ZAG', 'ZAG', 'ZAG', 'MEI', 'MEI', 'MEI', 'ATA', 'ATA', 'ATA'];

const makePlayer = (id: string, teamId: string, rating: number, role: Player['role']): Player => {
  const player = generatePlayer(id, 'NORTE', rating, role);
  player.contract.teamId = teamId;
  player.satisfaction = 50;
  player.currentPhase = 6;
  return player;
};

const makeSquad = (teamId: string, rating: number, traits: Partial<Player['badges']> = {}): Player[] =>
  roles.map((role, index) => {
    const player = makePlayer(`${teamId}_${index}_${Math.random().toString(16).slice(2)}`, teamId, rating, role);
    player.badges = { ...player.badges, ...traits };
    return player;
  });

const makeStats = (id: string, rating: number, overrides: Partial<TeamStats> = {}): TeamStats => ({
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

const emptyStats = (): ScenarioStats => ({
  games: 0,
  homeWins: 0,
  draws: 0,
  awayWins: 0,
  totalGoals: 0,
  totalShots: 0,
  blowouts: 0,
  ratingSamples: []
});

const runScenario = (
  name: string,
  games: number,
  homeRating: number,
  awayRating: number,
  homeOverrides: Partial<TeamStats> = {},
  awayOverrides: Partial<TeamStats> = {},
  homeTraits: Partial<Player['badges']> = {}
) => {
  const stats = emptyStats();

  for (let i = 0; i < games; i += 1) {
    const homeId = `${name}_h_${i}`;
    const awayId = `${name}_a_${i}`;
    const result = simulateMatch(
      makeStats(homeId, homeRating, homeOverrides),
      makeStats(awayId, awayRating, awayOverrides),
      makeSquad(homeId, homeRating, homeTraits),
      makeSquad(awayId, awayRating)
    );

    stats.games += 1;
    stats.totalGoals += result.homeScore + result.awayScore;
    stats.totalShots += result.stats.shots.home + result.stats.shots.away;
    if (result.homeScore > result.awayScore) stats.homeWins += 1;
    else if (result.homeScore < result.awayScore) stats.awayWins += 1;
    else stats.draws += 1;
    if ((result.homeScore + result.awayScore) >= 8 || Math.abs(result.homeScore - result.awayScore) >= 5) {
      stats.blowouts += 1;
    }
    stats.ratingSamples.push(...Object.values(result.ratings));
  }

  const avgRating = stats.ratingSamples.reduce((sum, value) => sum + value, 0) / stats.ratingSamples.length;
  const minRating = Math.min(...stats.ratingSamples);
  const maxRating = Math.max(...stats.ratingSamples);

  console.log(`\n${name}`);
  console.log(`  W-D-L home: ${stats.homeWins}-${stats.draws}-${stats.awayWins} (${((stats.homeWins / games) * 100).toFixed(1)}% home wins)`);
  console.log(`  Avg goals: ${(stats.totalGoals / games).toFixed(2)} | Avg shots: ${(stats.totalShots / games).toFixed(2)} | Blowouts: ${((stats.blowouts / games) * 100).toFixed(1)}%`);
  console.log(`  Ratings: avg ${avgRating.toFixed(2)} | min ${minRating.toFixed(1)} | max ${maxRating.toFixed(1)}`);
};

const makeTeam = (id: string, squad: Player[], powerCap: number): Team => ({
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

const runMarketProbe = () => {
  const requested = makePlayer('requested', 'ai', 760, 'ATA');
  const offers = [
    ['equal', 760],
    ['slightly_low', 720],
    ['bad', 620],
    ['terrible', 520],
    ['generous', 850]
  ] as const;

  console.log('\ntrade acceptance chance');
  offers.forEach(([label, rating]) => {
    const offered = makePlayer(`offered_${label}`, 'me', rating, 'ATA');
    console.log(`  ${label.padEnd(12)} offer ${rating} for 760: ${(calculateTradeAcceptanceChance(offered, requested) * 100).toFixed(1)}%`);
  });

  const star = makePlayer('market_star', 'source', 850, 'ATA');
  const elite = makeTeam('elite', makeSquad('elite', 640), 12000);
  const weak = makeTeam('weak', makeSquad('weak', 500), 8000);
  const eliteTeammates = elite.squad.map((id, index) => makePlayer(id, 'elite', 640 + index, roles[index] || 'MEI'));
  const weakTeammates = weak.squad.map((id, index) => makePlayer(id, 'weak', 500 + index, roles[index] || 'MEI'));

  let eliteScore = 0;
  let weakScore = 0;
  for (let i = 0; i < 300; i += 1) {
    eliteScore += calculateAttractiveness(star, elite, eliteTeammates, 2);
    weakScore += calculateAttractiveness(star, weak, weakTeammates, 10);
  }

  console.log('\nmarket attractiveness for 850 star');
  console.log(`  elite top club avg: ${(eliteScore / 300).toFixed(1)}/100`);
  console.log(`  weak mid club avg:  ${(weakScore / 300).toFixed(1)}/100`);
};

const games = Number(process.argv[2] || 300);

console.log(`Balance simulation: ${games} games per match scenario`);

runScenario('balanced_650_vs_650', games, 650, 650);
runScenario('score_gap_750_vs_650', games, 750, 650);
runScenario(
  'aggressive_vs_defensive',
  games,
  650,
  650,
  { playStyle: 'Blitzkrieg', mentality: 'Predadora', linePosition: 80, aggressiveness: 80, intensity: 85, width: 75, passing: 75 },
  { playStyle: 'Retranca Armada', mentality: 'Calculista', linePosition: 25, aggressiveness: 35, intensity: 35, width: 35, passing: 35 }
);
runScenario(
  'trait_stack_vs_normal',
  games,
  650,
  650,
  {},
  {},
  { slot1: 'M\u00e1quina', slot2: 'Catalisador', slot3: 'Finaliz Lend\u00e1ria' }
);
runMarketProbe();
