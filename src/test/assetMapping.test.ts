import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TEAM_LOGO_ASSETS, getTeamUniformFile } from '../utils/teamIdentity';

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
    const missing = Array.from({ length: 32 }, (_, index) => `t_${index + 1}`)
      .map(teamId => ({ teamId, file: getTeamUniformFile(teamId) }))
      .filter(item => !item.file || !existsSync(join(process.cwd(), 'public', 'assetas', 'avatars', 'uniforms', item.file)));

    expect(missing).toEqual([]);
  });

  it('keeps team logo and uniform pairs aligned by team slot', () => {
    const teamIds = Array.from({ length: 32 }, (_, index) => `t_${index + 1}`);

    const mismatches = teamIds
      .map(teamId => {
        const slot = String(Number(teamId.replace('t_', ''))).padStart(2, '0');
        return {
          teamId,
          logoPath: TEAM_LOGO_ASSETS[teamId],
          uniformFile: getTeamUniformFile(teamId),
          slot,
        };
      })
      .filter(item => !item.logoPath?.includes(`team-${item.slot}-logo.png`) || item.uniformFile !== `team-${item.slot}-uniform.png`);

    expect(mismatches).toEqual([]);
  });

  it('keeps district uniforms available for free agents and district cup contexts', () => {
    const districtUniforms = [
      'district-norte-uniform.png',
      'district-sul-uniform.png',
      'district-leste-uniform.png',
      'district-oeste-uniform.png',
    ];

    const missing = districtUniforms.filter(file =>
      !existsSync(join(process.cwd(), 'public', 'assetas', 'avatars', 'uniforms', file))
    );

    expect(missing).toEqual([]);
  });
});
