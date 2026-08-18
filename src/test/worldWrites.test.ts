import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Cobre o wrapper das RPCs de escrita pontual de mundo.
 *
 * O que NAO da para testar aqui: a logica SQL em si (jsonb_set, FOR UPDATE, as
 * checagens de conflito). Ela vive em
 * supabase/migrations/20260818003000_participant_world_writes.sql e precisa ser
 * validada contra o banco — nao ha Postgres local nesta maquina. Estes testes
 * cobrem o contrato do lado do cliente: parametros enviados e traducao de erro.
 */
const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: rpcMock },
}));

beforeEach(() => {
  rpcMock.mockReset();
});

describe('respondDistrictCupInviteRemote', () => {
  it('envia os parametros que a RPC espera', async () => {
    const { respondDistrictCupInviteRemote } = await import('../lib/worldWrites');
    rpcMock.mockResolvedValue({ data: { ok: true, district: 'NORTE', status: 'ACCEPTED' }, error: null });

    const r = await respondDistrictCupInviteRemote('world_1', 'invite_1', true);

    expect(rpcMock).toHaveBeenCalledWith('respond_district_cup_invite', {
      p_world_id: 'world_1',
      p_invite_id: 'invite_1',
      p_accept: true,
    });
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') expect(r.data.district).toBe('NORTE');
  });

  it('traduz DISTRICT_ALREADY_ASSIGNED em mensagem para o jogador', async () => {
    const { respondDistrictCupInviteRemote } = await import('../lib/worldWrites');
    // O PostgREST embrulha o raise exception do plpgsql em texto com ruido.
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'P0001: DISTRICT_ALREADY_ASSIGNED\nCONTEXT: PL/pgSQL function ...' },
    });

    const r = await respondDistrictCupInviteRemote('world_1', 'invite_1', true);

    expect(r.kind).toBe('erro');
    if (r.kind === 'erro') {
      expect(r.code).toBe('DISTRICT_ALREADY_ASSIGNED');
      expect(r.message).toBe('Outro tecnico ja assumiu essa selecao.');
    }
  });

  it('cai em mensagem generica quando o erro nao e conhecido', async () => {
    const { respondDistrictCupInviteRemote } = await import('../lib/worldWrites');
    rpcMock.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

    const r = await respondDistrictCupInviteRemote('world_1', 'invite_1', false);

    expect(r.kind).toBe('erro');
    if (r.kind === 'erro') {
      expect(r.code).toBe('UNKNOWN');
      expect(r.message).toBe('Nao foi possivel responder o convite.');
    }
  });
});

describe('submitClubApplicationRemote', () => {
  it('envia os parametros que a RPC espera', async () => {
    const { submitClubApplicationRemote } = await import('../lib/worldWrites');
    rpcMock.mockResolvedValue({ data: { ok: true, offer: { id: 'application_1' } }, error: null });

    const r = await submitClubApplicationRemote({
      worldId: 'world_1',
      teamId: 't_1',
      managerName: 'Afonso',
      status: 'PENDING',
      availableOnDay: 12,
      note: 'Pedido enviado.',
    });

    expect(rpcMock).toHaveBeenCalledWith('submit_club_application', {
      p_world_id: 'world_1',
      p_team_id: 't_1',
      p_manager_name: 'Afonso',
      p_status: 'PENDING',
      p_available_on_day: 12,
      p_note: 'Pedido enviado.',
    });
    expect(r.kind).toBe('ok');
  });

  it('traduz APPLICATION_ALREADY_OPEN', async () => {
    const { submitClubApplicationRemote } = await import('../lib/worldWrites');
    rpcMock.mockResolvedValue({ data: null, error: { message: 'APPLICATION_ALREADY_OPEN' } });

    const r = await submitClubApplicationRemote({
      worldId: 'world_1',
      teamId: 't_1',
      managerName: 'Afonso',
      status: 'PENDING',
      availableOnDay: 12,
      note: '',
    });

    expect(r.kind).toBe('erro');
    if (r.kind === 'erro') {
      expect(r.message).toBe('Ja existe uma negociacao aberta com esse clube.');
    }
  });
});
