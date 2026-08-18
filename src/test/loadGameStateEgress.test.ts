import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Trava o formato das consultas que loadGameState faz.
 *
 * Medido em producao (2026-08-18, mundo Nois): cada linha de participante carrega
 * uma copia integral do world_state do criador — 1.543 kB de JSON por linha — e o
 * merge nunca usa nenhuma delas. O pg_stat_statements mostrou o
 * `select games.* order by updated_at` com 23.605 chamadas, de longe a maior fonte
 * de egress do projeto.
 *
 * Se alguem voltar a usar select('*') aqui, o custo por carga triplica em silencio.
 * Este teste quebra antes disso chegar em producao.
 */
const selectCalls = vi.hoisted(() => [] as string[]);
const mockDb = vi.hoisted(() => ({
  user: { id: 'user_participante' },
  records: [] as any[],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockDb.user } })) },
    from: vi.fn(() => {
      const filters: Array<{ column: string; value: any }> = [];
      const apply = () => mockDb.records.filter(r => filters.every(f => r[f.column] === f.value));
      const api: any = {
        select(cols: string) { selectCalls.push(cols); return api; },
        eq(column: string, value: any) { filters.push({ column, value }); return api; },
        limit() { return api; },
        maybeSingle: vi.fn(async () => ({ data: apply()[0] || null, error: null })),
        order: vi.fn(async () => ({ data: apply(), error: null })),
        upsert: vi.fn(async () => ({ data: null, error: null })),
      };
      return api;
    }),
  }),
}));

const WORLD = {
  status: 'ACTIVE', currentDate: '2050-07-15T08:00:00.000Z', currentDay: 15,
  currentRound: 7, currentSeason: 2050, leagues: {}, districtCup: {}, eliteCup: {},
};

beforeEach(() => {
  selectCalls.length = 0;
  mockDb.records = [
    {
      user_id: 'creator_user', world_id: 'world_1', is_creator: true, updated_at: '2026-07-01T00:00:00Z',
      world_state: WORLD, teams_data: { t_1: { id: 't_1', squad: [] } },
      players_data: {}, managers_data: {}, user_team_id: 't_1', user_manager_id: 'creator_user',
      notifications: [], training_data: null,
    },
    {
      user_id: 'user_participante', world_id: 'world_1', is_creator: false, updated_at: '2026-07-02T00:00:00Z',
      world_state: WORLD, teams_data: {}, players_data: {}, managers_data: {},
      user_team_id: null, user_manager_id: null, notifications: [], training_data: null,
    },
  ];
  vi.resetModules();
});

describe('consultas de loadGameState', () => {
  it('nao usa select(*) nem pede world_state na consulta das linhas', async () => {
    const { loadGameState } = await import('../lib/supabase');

    await loadGameState('world_1');

    const consultaDasLinhas = selectCalls[0];
    expect(consultaDasLinhas).toBeDefined();
    expect(consultaDasLinhas).not.toBe('*');
    expect(consultaDasLinhas).not.toContain('world_state');

    // As colunas que o merge realmente consome continuam sendo pedidas.
    ['user_id', 'is_creator', 'updated_at', 'user_team_id', 'teams_data', 'players_data', 'managers_data']
      .forEach(coluna => expect(consultaDasLinhas).toContain(coluna));
  });

  it('busca world_state uma unica vez, so o do mestre', async () => {
    const { loadGameState } = await import('../lib/supabase');

    await loadGameState('world_1');

    const comWorldState = selectCalls.filter(cols => cols.includes('world_state'));
    expect(comWorldState).toHaveLength(1);
    expect(comWorldState[0]).toBe('world_state');
  });

  it('ainda monta o estado com o mundo do mestre', async () => {
    const { loadGameState } = await import('../lib/supabase');

    const state = await loadGameState('world_1');

    expect(state).not.toBeNull();
    expect(state!.world.currentDay).toBe(15);
    expect(state!.worldId).toBe('world_1');
    expect(state!.isCreator).toBe(false);
    expect(state!.participants).toHaveLength(2);
  });
});
