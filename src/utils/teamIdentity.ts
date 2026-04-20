import { Team, TeamLogoMetadata } from '../types';

const LOGO_BASE_PATH = '/assetas/avatars/logs';

export const TEAM_LOGO_ASSETS: Record<string, string> = {
  t_1: `${LOGO_BASE_PATH}/u-6-removebg-preview.png`,
  t_2: `${LOGO_BASE_PATH}/u-7-removebg-preview.png`,
  t_3: `${LOGO_BASE_PATH}/u-8-removebg-preview.png`,
  t_4: `${LOGO_BASE_PATH}/u-9-removebg-preview.png`,
  t_5: `${LOGO_BASE_PATH}/u-10-removebg-preview.png`,
  t_6: `${LOGO_BASE_PATH}/u-11-removebg-preview.png`,
  t_7: `${LOGO_BASE_PATH}/special1-removebg-preview.png`,
  t_8: `${LOGO_BASE_PATH}/u-13-removebg-preview.png`,
  t_9: `${LOGO_BASE_PATH}/u-14-removebg-preview.png`,
  t_10: `${LOGO_BASE_PATH}/u-15-removebg-preview.png`,
  t_11: `${LOGO_BASE_PATH}/u-16-removebg-preview.png`,
  t_12: `${LOGO_BASE_PATH}/u-17-removebg-preview.png`,
  t_13: `${LOGO_BASE_PATH}/u-18-removebg-preview.png`,
  t_14: `${LOGO_BASE_PATH}/u-19-removebg-preview-removebg-preview.png`,
  t_15: `${LOGO_BASE_PATH}/u-20-removebg-preview.png`,
  t_16: `${LOGO_BASE_PATH}/u-21-removebg-preview.png`,
  t_17: `${LOGO_BASE_PATH}/u-22-removebg-preview.png`,
  t_18: `${LOGO_BASE_PATH}/u-23-removebg-preview.png`,
  t_19: `${LOGO_BASE_PATH}/u-26-removebg-preview.png`,
  t_20: `${LOGO_BASE_PATH}/u-27-removebg-preview.png`,
  t_21: `${LOGO_BASE_PATH}/u-28-removebg-preview.png`,
  t_22: `${LOGO_BASE_PATH}/u-29-removebg-preview.png`,
  t_23: `${LOGO_BASE_PATH}/u-30-removebg-preview.png`,
  t_24: `${LOGO_BASE_PATH}/u-31-removebg-preview.png`,
  t_25: `${LOGO_BASE_PATH}/u-32-removebg-preview.png`,
  t_26: `${LOGO_BASE_PATH}/u-35-removebg-preview.png`,
  t_27: `${LOGO_BASE_PATH}/u-24-viper-removebg-preview.png`,
  t_28: `${LOGO_BASE_PATH}/u-36-removebg-preview.png`,
  t_29: `${LOGO_BASE_PATH}/u-37-removebg-preview.png`,
  t_30: `${LOGO_BASE_PATH}/u-39-removebg-preview.png`,
  t_31: `${LOGO_BASE_PATH}/u-40-removebg-preview.png`,
  t_32: `${LOGO_BASE_PATH}/image-removebg-preview - 2026-04-18T144116.917.png`,
  d_norte: `${LOGO_BASE_PATH}/u-cyan-removebg-preview.png`,
  d_sul: `${LOGO_BASE_PATH}/u-orange-removebg-preview.png`,
  d_leste: `${LOGO_BASE_PATH}/u-green-removebg-preview.png`,
  d_oeste: `${LOGO_BASE_PATH}/u-purple-removebg-preview.png`,
};

export const getTeamLogoAssetPath = (teamId?: string | null) => {
  if (!teamId) return null;
  return TEAM_LOGO_ASSETS[teamId] || null;
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
