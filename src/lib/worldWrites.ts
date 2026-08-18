import { supabase } from './supabase';

/**
 * Escritas pontuais no `world_state` feitas por quem NAO e o criador do mundo.
 *
 * Por que isto existe: `saveGameState` substitui o `world_state` pelo do criador
 * quando `isCreator` e false, para nao deixar um participante defasado sobrescrever
 * o mundo. O efeito colateral e que qualquer mudanca de nivel de mundo feita por
 * participante era descartada em silencio — convite da Copa dos Distritos aceito na
 * tela e perdido no save, candidatura a clube que nunca chegava.
 *
 * Estas funcoes chamam RPCs `security definer` que validam a operacao e aplicam
 * apenas o trecho do JSONB que mudou, direto na linha mestre.
 * Ver supabase/migrations/20260818003000_participant_world_writes.sql.
 */

/**
 * Discriminante de STRING, nao booleano, de proposito: o tsconfig do projeto nao
 * liga `strict`, e sem `strictNullChecks` o TypeScript nao estreita uniao
 * discriminada por literal booleano (`if (!r.ok)` nao filtra os membros).
 * Com literal de string ele estreita normalmente.
 */
export type WorldWriteResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'erro'; code: string; message: string };

/**
 * As RPCs sinalizam falha de regra de negocio via `raise exception` com um codigo
 * seco (INVITE_NOT_PENDING, DISTRICT_ALREADY_ASSIGNED, ...). O PostgREST devolve
 * isso dentro de `message`, junto de ruido. Aqui extraimos so o codigo.
 */
const KNOWN_CODES = [
  'NOT_AUTHENTICATED',
  'NOT_A_PARTICIPANT',
  'WORLD_NOT_FOUND',
  'INVITE_NOT_FOUND',
  'INVITE_NOT_PENDING',
  'INVITE_NOT_YOURS',
  'DISTRICT_ALREADY_ASSIGNED',
  'MANAGER_ALREADY_ASSIGNED',
  'APPLICATION_ALREADY_OPEN',
  'INVALID_STATUS',
];

const extractCode = (error: any): string => {
  const raw = String(error?.message || '');
  return KNOWN_CODES.find(code => raw.includes(code)) || 'UNKNOWN';
};

export const MENSAGEM_POR_CODIGO: Record<string, string> = {
  INVITE_NOT_PENDING: 'Esse convite ja foi respondido.',
  INVITE_NOT_YOURS: 'Esse convite nao e seu.',
  INVITE_NOT_FOUND: 'Convite nao encontrado.',
  DISTRICT_ALREADY_ASSIGNED: 'Outro tecnico ja assumiu essa selecao.',
  MANAGER_ALREADY_ASSIGNED: 'Voce ja comanda outra selecao nesta temporada.',
  APPLICATION_ALREADY_OPEN: 'Ja existe uma negociacao aberta com esse clube.',
  NOT_A_PARTICIPANT: 'Voce nao esta neste mundo.',
  WORLD_NOT_FOUND: 'Mundo nao encontrado.',
  NOT_AUTHENTICATED: 'Sessao expirada. Entre novamente.',
};

export type DistrictInviteResponse = {
  ok: boolean;
  district: string;
  status: 'ACCEPTED' | 'REJECTED';
};

export const respondDistrictCupInviteRemote = async (
  worldId: string,
  inviteId: string,
  accept: boolean
): Promise<WorldWriteResult<DistrictInviteResponse>> => {
  const { data, error } = await supabase.rpc('respond_district_cup_invite', {
    p_world_id: worldId,
    p_invite_id: inviteId,
    p_accept: accept,
  });

  if (error) {
    const code = extractCode(error);
    return { kind: 'erro', code, message: MENSAGEM_POR_CODIGO[code] || 'Nao foi possivel responder o convite.' };
  }

  return { kind: 'ok', data: data as DistrictInviteResponse };
};

export type ClubApplicationResponse = {
  ok: boolean;
  offer: Record<string, unknown>;
};

export const submitClubApplicationRemote = async (params: {
  worldId: string;
  teamId: string;
  managerName: string;
  status: 'PENDING' | 'WAITING_NEXT_SEASON';
  availableOnDay: number;
  note: string;
}): Promise<WorldWriteResult<ClubApplicationResponse>> => {
  const { data, error } = await supabase.rpc('submit_club_application', {
    p_world_id: params.worldId,
    p_team_id: params.teamId,
    p_manager_name: params.managerName,
    p_status: params.status,
    p_available_on_day: params.availableOnDay,
    p_note: params.note,
  });

  if (error) {
    const code = extractCode(error);
    return { kind: 'erro', code, message: MENSAGEM_POR_CODIGO[code] || 'Nao foi possivel enviar a proposta.' };
  }

  return { kind: 'ok', data: data as ClubApplicationResponse };
};
