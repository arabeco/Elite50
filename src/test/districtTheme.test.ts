import { describe, expect, it } from 'vitest';
import { DISTRICT_THEMES, getDistrictFromLeagueKey, getDistrictTheme } from '../utils/districtTheme';

describe('district visual identity', () => {
  it('keeps league keys, assets and UI on the same district palette', () => {
    expect(getDistrictTheme('NORTE').color).toBe('#38d7c6');
    expect(getDistrictTheme('SUL').color).toBe('#f0a43c');
    expect(getDistrictTheme('LESTE').color).toBe('#8fd36a');
    expect(getDistrictTheme('OESTE').color).toBe('#bd6cff');

    expect(getDistrictFromLeagueKey('l_cyan')).toBe('NORTE');
    expect(getDistrictFromLeagueKey('l_orange')).toBe('SUL');
    expect(getDistrictFromLeagueKey('l_green')).toBe('LESTE');
    expect(getDistrictFromLeagueKey('l_purple')).toBe('OESTE');
  });

  it('provides complete styles for every district and free agents', () => {
    expect(Object.keys(DISTRICT_THEMES)).toEqual(['NORTE', 'SUL', 'LESTE', 'OESTE', 'EXILADO']);
    Object.values(DISTRICT_THEMES).forEach(theme => {
      expect(theme.text).toBeTruthy();
      expect(theme.borderMuted).toBeTruthy();
      expect(theme.gradient).toBeTruthy();
      expect(theme.glow).toBeTruthy();
    });
  });
});
