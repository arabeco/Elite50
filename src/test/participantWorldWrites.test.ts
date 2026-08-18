import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Documenta o que acontece com mudancas de mundo feitas por um PARTICIPANTE
 * (nao criador): responder convite da Copa dos Distritos, mandar candidatura a
 * um clube, aceitar proposta. Todas vivem em `world_state`.
 */
const mockDb = vi.hoisted(() => ({
  user: { id: 'user_participante' },
  records: [] as any[],
  upserts: [] as any[],
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: mockDb.user } })) },
    from: vi.fn(() => {
      const filters: Array<{ column: string; value: any }> = [];
      const apply = () => mockDb.records.filter(r => filters.every(f => r[f.column] === f.value));
      const api: any = {
        select() { return api; },
        eq(column: string, value: any) { filters.push({ column, value }); return api; },
        limit() { return api; },
        maybeSingle: vi.fn(async () => ({ data: apply()[0] || null, error: null })),
        order: vi.fn(async () => ({ data: apply(), error: null })),
        upsert: vi.fn(async (payload: any) => {
          mockDb.upserts.push(payload);
          return { data: null, error: null };
        }),
      };
      return api;
    }),
  }),
}));

const MASTER_WORLD = {
  status: 'ACTIVE',
  currentDate: '2050-07-15T08:00:00.000Z',
  currentDay: 15,
  currentRound: 7,
  currentSeason: 2050,
  leagues: {},
  clubOffers: [],
  districtCup: {
    teams: [], round: 0, matches: [], standings: [], final: null, winnerId: null,
    managerInvites: [{
      id: 'district_invite_2050_NORTE_user_participante',
      season: 2050,
      district: 'NORTE',
      managerId: 'user_participante',
      status: 'PENDING',
      rank: 1,
      score: 100,
      createdAt: '2050-07-15T08:00:00.000Z',
      respondedAt: null,
      note: 'A Federacao NORTE te indicou.',
    }],
    managerAssignments: {},
  },
};

beforeEach(() => {
  mockDb.records = [{
    user_id: 'creator_user',
    world_id: 'world_1',
    is_creator: true,
    world_state: MASTER_WORLD,
  }];
  mockDb.upserts = [];
  vi.resetModules();
});

describe('escritas de mundo feitas por participante', () => {
  it('descarta a resposta do participante ao convite da Copa dos Distritos', async () => {
    const { saveGameState } = await import('../lib/supabase');

    // O participante aceita o convite: o estado local reflete a aceitacao.
    const estadoLocal: any = {
      isCreator: false,
      userTeamId: 't_1',
      userManagerId: 'user_participante',
      teams: {}, players: {}, managers: {}, notifications: [], training: {},
      world: JSON.parse(JSON.stringify(MASTER_WORLD)),
    };
    estadoLocal.world.districtCup.managerInvites[0].status = 'ACCEPTED';
    estadoLocal.world.districtCup.managerAssignments = { NORTE: 'user_participante' };

    await saveGameState(estadoLocal, 'world_1');

    expect(mockDb.upserts).toHaveLength(1);
    const gravado = mockDb.upserts[0].world_state;

    // saveGameState substitui world_state pelo do criador quando isCreator e false
    // (src/lib/supabase.ts). Entao a aceitacao NAO chega ao banco: o jogador ve
    // "aceito" na tela, e no proximo loadGameState o convite volta como PENDING.
    expect(gravado.districtCup.managerInvites[0].status).toBe('PENDING');
    expect(gravado.districtCup.managerAssignments).toEqual({});
  });

  it('descarta a candidatura do participante a um clube', async () => {
    const { saveGameState } = await import('../lib/supabase');

    const estadoLocal: any = {
      isCreator: false,
      userTeamId: null,
      userManagerId: 'user_participante',
      teams: {}, players: {}, managers: {}, notifications: [], training: {},
      world: JSON.parse(JSON.stringify(MASTER_WORLD)),
    };
    estadoLocal.world.clubOffers = [{
      id: 'application_1', teamId: 't_1', targetUserId: 'user_participante',
      status: 'PENDING', source: 'APPLICATION',
    }];

    await saveGameState(estadoLocal, 'world_1');

    const gravado = mockDb.upserts[0].world_state;
    expect(gravado.clubOffers).toEqual([]);
  });

  it('preserva o que o criador escreve no mundo', async () => {
    const { saveGameState } = await import('../lib/supabase');

    const estadoCriador: any = {
      isCreator: true,
      userTeamId: 't_creator',
      userManagerId: 'creator_user',
      teams: {}, players: {}, managers: {}, notifications: [], training: {},
      world: JSON.parse(JSON.stringify(MASTER_WORLD)),
    };
    estadoCriador.world.districtCup.managerInvites[0].status = 'ACCEPTED';

    await saveGameState(estadoCriador, 'world_1');

    const gravado = mockDb.upserts[0].world_state;
    expect(gravado.districtCup.managerInvites[0].status).toBe('ACCEPTED');
  });
});
