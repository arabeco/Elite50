import { describe, expect, it, vi, afterEach } from 'vitest';
import { STORE_ITEMS } from '../constants/storeCatalog';
import { calculatePostMatchProgression } from '../engine/economyLogic';
import { generatePlayer } from '../engine/generator';
import { GameState } from '../types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('store boots', () => {
  it('ships a full starter boot catalog by rarity', () => {
    const boots = STORE_ITEMS.filter(item => item.category === 'BOOT');
    const byRarity = boots.reduce<Record<string, number>>((acc, item) => {
      acc[item.rarity] = (acc[item.rarity] || 0) + 1;
      return acc;
    }, {});

    expect(boots).toHaveLength(30);
    expect(byRarity.COMMON).toBe(14);
    expect(byRarity.UNCOMMON).toBe(6);
    expect(byRarity.RARE).toBe(6);
    expect(byRarity.EPIC).toBe(2);
    expect(byRarity.LEGENDARY).toBe(2);
  });

  it('gives rare and epic boots a small progression edge without touching base rating directly', () => {
    const player = generatePlayer('boot_test', 'NORTE', 760, 'ATA');
    player.currentPhase = 6;
    player.history.seasonRatingDelta = 0;

    const noBootState = {
      players: { [player.id]: player },
      store: {
        gold: 0,
        fragments: 0,
        ownedItemIds: [],
        equippedBootByPlayerId: {},
        equippedKitByTeamId: {},
        equippedLogoByTeamId: {},
        circuit: {
          id: 'c',
          name: 'c',
          premiumActive: false,
          seasonRunsCompleted: 0,
          targetSeasonRuns: 3,
          endsAt: new Date().toISOString(),
        },
      },
    } as unknown as GameState;

    const rareBootState = {
      ...noBootState,
      store: {
        ...noBootState.store,
        ownedItemIds: ['boot_31'],
        equippedBootByPlayerId: { [player.id]: 'boot_31' },
      },
    } as unknown as GameState;

    const epicBootState = {
      ...noBootState,
      store: {
        ...noBootState.store,
        ownedItemIds: ['boot_42'],
        equippedBootByPlayerId: { [player.id]: 'boot_42' },
      },
    } as unknown as GameState;

    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const basePositive = calculatePostMatchProgression(player, 9.2, noBootState);
    const rarePositive = calculatePostMatchProgression(player, 9.2, rareBootState);
    const epicPositive = calculatePostMatchProgression(player, 9.2, epicBootState);

    expect(rarePositive).toBeGreaterThanOrEqual(basePositive);
    expect(epicPositive).toBeGreaterThanOrEqual(rarePositive);

    const baseNegative = calculatePostMatchProgression(player, 4.2, noBootState);
    const rareNegative = calculatePostMatchProgression(player, 4.2, {
      ...noBootState,
      store: {
        ...noBootState.store,
        ownedItemIds: ['boot_34'],
        equippedBootByPlayerId: { [player.id]: 'boot_34' },
      },
    } as unknown as GameState);

    expect(Math.abs(rareNegative)).toBeLessThanOrEqual(Math.abs(baseNegative));
  });
});
