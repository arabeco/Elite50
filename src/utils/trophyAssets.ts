import { Achievement, District } from '../types';

const TROPHY_BASE = '/assetas/avatars/trophies';

export const TROPHY_ASSETS = {
  leagueNorte: `${TROPHY_BASE}/trophy-league-norte.png`,
  leagueSul: `${TROPHY_BASE}/trophy-league-sul.png`,
  leagueLeste: `${TROPHY_BASE}/trophy-league-leste.png`,
  leagueOeste: `${TROPHY_BASE}/trophy-league-oeste.png`,
  eliteCup: `${TROPHY_BASE}/trophy-elite-cup.png`,
  districtCup: `${TROPHY_BASE}/trophy-district-cup.png`,
  managerOfSeason: `${TROPHY_BASE}/trophy-manager-of-season.png`,
} as const;

export const getLeagueTrophyAsset = (district?: District | string | null) => {
  switch (district) {
    case 'NORTE': return TROPHY_ASSETS.leagueNorte;
    case 'SUL': return TROPHY_ASSETS.leagueSul;
    case 'LESTE': return TROPHY_ASSETS.leagueLeste;
    case 'OESTE': return TROPHY_ASSETS.leagueOeste;
    default: return TROPHY_ASSETS.eliteCup;
  }
};

export const getLeagueTrophyAssetByKey = (leagueKey: string) => {
  const normalized = leagueKey.toLowerCase();
  if (normalized.includes('norte') || normalized.includes('cyan')) return TROPHY_ASSETS.leagueNorte;
  if (normalized.includes('sul') || normalized.includes('orange')) return TROPHY_ASSETS.leagueSul;
  if (normalized.includes('leste') || normalized.includes('green')) return TROPHY_ASSETS.leagueLeste;
  if (normalized.includes('oeste') || normalized.includes('purple')) return TROPHY_ASSETS.leagueOeste;
  return TROPHY_ASSETS.eliteCup;
};

export const getAchievementTrophyAsset = (achievement: Pick<Achievement, 'title' | 'type'>) => {
  const title = achievement.title.toLowerCase();
  if (achievement.type === 'Distrito' || title.includes('distrito')) return TROPHY_ASSETS.districtCup;
  if (title.includes('elite')) return TROPHY_ASSETS.eliteCup;
  if (title.includes('norte')) return TROPHY_ASSETS.leagueNorte;
  if (title.includes('sul')) return TROPHY_ASSETS.leagueSul;
  if (title.includes('leste')) return TROPHY_ASSETS.leagueLeste;
  if (title.includes('oeste')) return TROPHY_ASSETS.leagueOeste;
  if (achievement.type === 'Individual') return TROPHY_ASSETS.managerOfSeason;
  return TROPHY_ASSETS.eliteCup;
};

export const groupAchievementsByTrophy = (achievements: Achievement[]) => {
  const grouped = new Map<string, {
    key: string;
    title: string;
    type: Achievement['type'];
    count: number;
    latestSeason: number;
    asset: string;
  }>();

  achievements.forEach((achievement) => {
    const asset = getAchievementTrophyAsset(achievement);
    const key = `${achievement.type}:${achievement.title}:${asset}`;
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
      current.latestSeason = Math.max(current.latestSeason, achievement.season);
      return;
    }

    grouped.set(key, {
      key,
      title: achievement.title,
      type: achievement.type,
      count: 1,
      latestSeason: achievement.season,
      asset,
    });
  });

  return Array.from(grouped.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.latestSeason - a.latestSeason;
  });
};
