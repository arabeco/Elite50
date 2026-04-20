import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_LOGO_ASSETS } from '../utils/teamIdentity';
import { TEAM_UNIFORM_FILES, getTeamUniformFile } from '../components/PlayerAvatar';

const publicPath = (assetPath: string) => {
  const normalized = decodeURI(assetPath).replace(/^\//, '').replace(/\//g, '\\');
  return join(process.cwd(), 'public', normalized);
};

describe('asset mapping QA', () => {
  it('maps every main team to an existing logo asset', () => {
    const teamIds = Array.from({ length: 32 }, (_, index) => `t_${index + 1}`);
    const missing = teamIds
      .map(teamId => ({ teamId, path: TEAM_LOGO_ASSETS[teamId] }))
      .filter(item => !item.path || !existsSync(publicPath(item.path)));

    expect(missing).toEqual([]);
  });

  it('maps every district to an existing logo asset', () => {
    const districtIds = ['d_norte', 'd_sul', 'd_leste', 'd_oeste'];
    const missing = districtIds
      .map(teamId => ({ teamId, path: TEAM_LOGO_ASSETS[teamId] }))
      .filter(item => !item.path || !existsSync(publicPath(item.path)));

    expect(missing).toEqual([]);
  });

  it('maps every main team to an existing uniform asset', () => {
    expect(TEAM_UNIFORM_FILES).toHaveLength(32);

    const missing = Array.from({ length: 32 }, (_, index) => `t_${index + 1}`)
      .map(teamId => ({ teamId, file: getTeamUniformFile(teamId) }))
      .filter(item => !item.file || !existsSync(join(process.cwd(), 'public', 'assetas', 'avatars', 'uniforms', item.file)));

    expect(missing).toEqual([]);
  });
});
