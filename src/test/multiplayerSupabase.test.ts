import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  user: { id: 'user_joiner', email: 'joiner@elite.test' },
  records: [] as any[],
  upserts: [] as any[]
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockDb.user } }))
    },
    rpc: vi.fn(async (fnName: string, params: any) => {
      if (fnName !== 'join_world_by_code' || params.p_join_code !== 'ELITE-123456') {
        return { data: null, error: { message: 'invalid_join_code' } };
      }

      const master = mockDb.records.find(record => record.is_creator);
      mockDb.records.push({
        ...master,
        user_id: mockDb.user.id,
        is_creator: false,
        is_public: false,
        user_team_id: null,
        user_manager_id: null,
        teams_data: {},
        players_data: {},
        managers_data: {},
        notifications: [],
        last_headline: {}
      });

      return { data: master.world_id, error: null };
    }),
    from: vi.fn((table: string) => {
      const filters: Array<{ column: string; value: any }> = [];
      const applyFilters = () => mockDb.records.filter(record =>
        filters.every(filter => record[filter.column] === filter.value)
      );

      return {
        select() {
          return this;
        },
        eq(column: string, value: any) {
          filters.push({ column, value });
          return this;
        },
        order: vi.fn(async () => ({ data: applyFilters(), error: null })),
        upsert: vi.fn(async (payload: any) => {
          mockDb.upserts.push(payload);
          const index = mockDb.records.findIndex(record =>
            record.user_id === payload.user_id && record.world_id === payload.world_id
          );

          if (index >= 0) {
            mockDb.records[index] = { ...mockDb.records[index], ...payload };
          } else {
            mockDb.records.push(payload);
          }

          return { data: [payload], error: null };
        })
      };
    })
  })
}));

const createMasterRecord = () => ({
  user_id: 'creator_user',
  world_id: 'world_1',
  is_creator: true,
  is_public: true,
  user_team_id: 't_creator',
  user_manager_id: 'creator_user',
  world_state: {
    status: 'ACTIVE',
    currentDate: '2050-01-10T00:00:00.000Z',
    currentDay: 10,
    currentRound: 1,
    currentSeason: 2050,
    leagues: {},
    eliteCup: { teams: [], round: 0, matches: [], bracket: {}, winnerId: null },
    districtCup: { teams: [], round: 0, matches: [], standings: [], final: null, winnerId: null },
    phase: 'REGULAR_SEASON',
    news: [],
    history: [],
    isPublic: true
  },
  teams_data: {
    t_1: {
      id: 't_1',
      name: 'Grove WFC',
      city: 'Grove',
      district: 'NORTE',
      league: 'Cyan',
      colors: { primary: '#00ffff', secondary: '#111111' },
      tactics: { playStyle: 'Equilibrado', preferredFormation: '4-3-3' },
      managerId: 'm_npc',
      squad: ['p_1'],
      lineup: {}
    },
    t_creator: {
      id: 't_creator',
      name: 'Creator FC',
      city: 'Creator',
      district: 'SUL',
      league: 'Orange',
      colors: { primary: '#ff8800', secondary: '#111111' },
      tactics: { playStyle: 'Equilibrado', preferredFormation: '4-3-3' },
      managerId: 'creator_user',
      squad: [],
      lineup: {}
    }
  },
  players_data: {
    p_1: {
      id: 'p_1',
      name: 'Player One',
      nickname: 'ONE',
      role: 'ATA',
      totalRating: 500,
      potential: 700,
      district: 'NORTE',
      contract: { teamId: 't_1' },
      history: { goals: 0, assists: 0, gamesPlayed: 0 },
      achievements: []
    }
  },
  managers_data: {
    m_npc: {
      id: 'm_npc',
      name: 'NPC Manager',
      district: 'NORTE',
      reputation: 20,
      isNPC: true,
      attributes: { evolution: 20, negotiation: 20, scout: 20 },
      career: {
        titlesWon: 0,
        totalLeagueTitles: 0,
        totalCupTitles: 0,
        hallOfFameEntries: 0,
        consecutiveTitles: 0,
        currentTeamId: 't_1',
        historyTeamIds: []
      },
      achievements: []
    }
  },
  notifications: [],
  last_headline: {},
  training_data: null,
  updated_at: '2026-04-18T00:00:00.000Z'
});

describe('Supabase multiplayer smoke', () => {
  beforeEach(() => {
    mockDb.records = [createMasterRecord()];
    mockDb.upserts = [];
  });

  it('lets a participant claim an NPC club without becoming world creator', async () => {
    const { claimTeamInWorld } = await import('../lib/supabase');

    const state = await claimTeamInWorld('world_1', 't_1', 'Joiner Manager');

    expect(state?.userTeamId).toBe('t_1');
    expect(state?.userManagerId).toBe('user_joiner');
    expect(state?.isCreator).toBe(false);
    expect(state?.teams.t_1.managerId).toBe('user_joiner');
    expect(state?.managers.user_joiner.name).toBe('Joiner Manager');
    expect(state?.managers.user_joiner.isNPC).toBe(false);
    expect(state?.participants?.some(participant => participant.userId === 'user_joiner' && participant.teamId === 't_1')).toBe(true);
    expect(mockDb.upserts[0].teams_data.t_1.managerId).toBe('user_joiner');
  });

  it('joins a private world by code as observer', async () => {
    const { joinWorldByCode } = await import('../lib/supabase');

    const state = await joinWorldByCode('elite-123456');

    expect(state?.worldId).toBe('world_1');
    expect(state?.isCreator).toBe(false);
    expect(state?.userTeamId).toBeNull();
    expect(state?.participants?.some(participant => participant.userId === 'user_joiner' && participant.isObserver)).toBe(true);
  });

  it('blocks claiming a club already owned by another participant', async () => {
    mockDb.records.push({
      ...createMasterRecord(),
      user_id: 'other_user',
      is_creator: false,
      is_public: false,
      user_team_id: 't_1',
      user_manager_id: 'other_user',
      teams_data: { t_1: { ...createMasterRecord().teams_data.t_1, managerId: 'other_user' } },
      players_data: {},
      managers_data: {}
    });

    const { claimTeamInWorld } = await import('../lib/supabase');

    await expect(claimTeamInWorld('world_1', 't_1', 'Joiner Manager')).rejects.toThrow('TEAM_ALREADY_CLAIMED');
  });
});
