import { Team, TeamLogoMetadata } from '../types';

const LOGO_BASE_PATH = '/assetas/avatars/logos';
const UNIFORM_BASE_PATH = '/assetas/avatars/uniforms';

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
  const assetPath = getTeamLogoAssetPath(teamId);
  if (!assetPath) return logo;

  return {
    ...logo,
    assetPath,
    symbolId: `asset:${assetPath}`,
  };
};

export const applyTeamLogoAssets = <T extends Record<string, Team>>(teams: T): T => {
  Object.values(teams).forEach((team) => {
    team.logo = applyTeamLogoAsset(team.id, team.logo);
  });
  return teams;
};
