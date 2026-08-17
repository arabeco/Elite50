import { Team, TeamLogoMetadata } from '../types';

const LOGO_BASE_PATH = '/assetas/avatars/logos';
const UNIFORM_BASE_PATH = '/assetas/avatars/uniforms';
const FOUNDER_LOGO_COUNT = 10;

type TeamVisualAsset = {
  logoFile: string;
  uniformFile: string;
};

const teamFile = (teamNumber: number, kind: 'logo' | 'uniform') =>
  `team-${String(teamNumber).padStart(2, '0')}-${kind}.png`;

export const TEAM_VISUAL_ASSETS: Record<string, TeamVisualAsset> = Object.fromEntries(
  Array.from({ length: 32 }, (_, index) => {
    const teamNumber = index + 1;
    return [
      `t_${teamNumber}`,
      {
        logoFile: teamFile(teamNumber, 'logo'),
        uniformFile: teamFile(teamNumber, 'uniform'),
      },
    ];
  })
);

export const TEAM_LOGO_ASSETS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(TEAM_VISUAL_ASSETS).map(([teamId, assets]) => [teamId, `${LOGO_BASE_PATH}/${assets.logoFile}`])
  ),
  d_norte: `${LOGO_BASE_PATH}/district-norte-logo.png`,
  d_sul: `${LOGO_BASE_PATH}/district-sul-logo.png`,
  d_leste: `${LOGO_BASE_PATH}/district-leste-logo.png`,
  d_oeste: `${LOGO_BASE_PATH}/district-oeste-logo.png`,
};

export const getTeamLogoAssetPath = (teamId?: string | null) => {
  if (!teamId) return null;
  return TEAM_LOGO_ASSETS[teamId] || null;
};

const getStableNumberFromId = (value: string) => (
  value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
);

export const getFounderLogoAssetPath = (teamId?: string | null) => {
  const number = ((getStableNumberFromId(teamId || 'founder') % FOUNDER_LOGO_COUNT) + 1)
    .toString()
    .padStart(2, '0');
  return `${LOGO_BASE_PATH}/founder-logo-${number}.png`;
};

export const getFallbackTeamLogoAssetPath = (team?: Pick<Team, 'id' | 'district' | 'logo'> | null) => {
  if (!team) return getFounderLogoAssetPath();
  if (team.logo?.assetPath) return team.logo.assetPath;
  const knownTeamAsset = getTeamLogoAssetPath(team.id);
  if (knownTeamAsset) return knownTeamAsset;
  if (team.id?.startsWith('d_')) return getTeamLogoAssetPath(team.id) || getFounderLogoAssetPath(team.id);
  return getFounderLogoAssetPath(team.id);
};

export const getTeamUniformFile = (teamId?: string | null) => {
  if (!teamId) return null;
  return TEAM_VISUAL_ASSETS[teamId]?.uniformFile || null;
};

export const getTeamUniformAssetPath = (teamId?: string | null) => {
  const uniformFile = getTeamUniformFile(teamId);
  return uniformFile ? `${UNIFORM_BASE_PATH}/${uniformFile}` : null;
};

export const getDistrictUniformAssetPath = (district?: string | null) => {
  switch (district) {
    case 'NORTE':
      return `${UNIFORM_BASE_PATH}/district-norte-uniform.png`;
    case 'SUL':
      return `${UNIFORM_BASE_PATH}/district-sul-uniform.png`;
    case 'LESTE':
      return `${UNIFORM_BASE_PATH}/district-leste-uniform.png`;
    case 'OESTE':
      return `${UNIFORM_BASE_PATH}/district-oeste-uniform.png`;
    default:
      return `${UNIFORM_BASE_PATH}/district-norte-uniform.png`;
  }
};

export const applyTeamLogoAsset = (teamId: string, logo?: TeamLogoMetadata): TeamLogoMetadata | undefined => {
  if (!logo) return logo;
  const assetPath = logo.assetPath || getTeamLogoAssetPath(teamId);
  if (!assetPath) return logo;

  return {
    ...logo,
    assetPath,
    symbolId: `asset:${assetPath}`,
  };
};

export const applyTeamLogoAssets = <T extends Record<string, Team>>(teams: T): T => {
  Object.values(teams).forEach((team) => {
    const assetPath = getFallbackTeamLogoAssetPath(team);
    const fallbackLogo: TeamLogoMetadata = team.logo || {
      primary: team.colors?.primary || '#22d3ee',
      secondary: team.colors?.secondary || '#0f172a',
      accent: '#f8fafc',
      assetPath,
      shapeId: 'circle_badge',
      patternId: 'solid',
      symbolId: `asset:${assetPath}`,
    };
    const colorSafeLogo = {
      ...fallbackLogo,
      primary: fallbackLogo.primary || team.colors?.primary || '#22d3ee',
      secondary: fallbackLogo.secondary || team.colors?.secondary || '#0f172a',
      assetPath: fallbackLogo.assetPath || assetPath,
      symbolId: fallbackLogo.symbolId?.startsWith('asset:')
        ? fallbackLogo.symbolId
        : `asset:${fallbackLogo.assetPath || assetPath}`,
    };
    team.logo = applyTeamLogoAsset(team.id, colorSafeLogo);
  });
  return teams;
};
