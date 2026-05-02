import { beforeEach, describe, expect, it } from 'vitest';
import { generateInitialState } from '../engine/generator';
import { deleteSavedState, getLastSavedWorldId, listSavedWorlds, loadGameState, loadStoredWorldEnvelope, saveGameState } from '../engine/persistence';

describe('local world persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and restores a world snapshot locally', () => {
    const state = generateInitialState();
    state.world.name = 'Persist Test';
    state.worldId = 'world_local_1';

    saveGameState(state, 'world_local_1', 'qa_user');

    const loaded = loadGameState('world_local_1');
    expect(loaded?.world.name).toBe('Persist Test');
    expect(getLastSavedWorldId()).toBe('world_local_1');
  });

  it('tracks saved worlds in the local index', () => {
    const first = generateInitialState();
    first.world.name = 'Alpha';
    const second = generateInitialState();
    second.world.name = 'Beta';

    saveGameState(first, 'world_alpha', 'qa_user');
    saveGameState(second, 'world_beta', 'qa_user');

    const worlds = listSavedWorlds();
    expect(worlds.map(world => world.id)).toEqual(['world_beta', 'world_alpha']);
    expect(worlds[0]?.name).toBe('Beta');
  });

  it('marks synced worlds as no longer local-only', () => {
    const state = generateInitialState();
    state.world.name = 'Synced World';

    saveGameState(state, 'world_sync', 'qa_user', { isLocalOnly: false });

    expect(listSavedWorlds()[0]?.isLocalOnly).toBe(false);
    expect(loadStoredWorldEnvelope('world_sync')?.isLocalOnly).toBe(false);
  });

  it('deletes snapshots and updates fallback world selection', () => {
    const first = generateInitialState();
    first.world.name = 'Alpha';
    const second = generateInitialState();
    second.world.name = 'Beta';

    saveGameState(first, 'world_alpha', 'qa_user');
    saveGameState(second, 'world_beta', 'qa_user');
    deleteSavedState('world_beta');

    expect(loadGameState('world_beta')).toBeNull();
    expect(getLastSavedWorldId()).toBe('world_alpha');
    expect(listSavedWorlds().map(world => world.id)).toEqual(['world_alpha']);
  });
});
