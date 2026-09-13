import { Manager, PlayStyle } from '../types';
import { ManagerProfileMetaRow } from '../lib/metaStore';

const PLAY_STYLES = new Set<PlayStyle>(['Equilibrado', 'Vertical', 'Tiki-Taka', 'Gegenpressing', 'Retranca Armada']);

/**
 * Um clube so conta como livre quando ninguem de verdade esta no comando.
 *
 * Duas telas decidem isso: o onboarding (escolher clube de herdeiro ou vaga a
 * substituir) e o painel de observador. Elas usavam regras diferentes, e a do
 * onboarding era mais frouxa: olhava so `isNPC !== false`. Um manager humano
 * vindo de save antigo, sem `isNPC` gravado, passava por NPC e o clube dele
 * aparecia como disponivel. O id tambem e sinal: NPC nasce como `m_...`,
 * humano carrega o user id do Supabase.
 */
export const isHumanManager = (
  managerId: string | null | undefined,
  managers: Record<string, Manager | undefined>
): boolean => {
  if (!managerId) return false;
  const manager = managers[managerId];
  if (!manager) return false;
  return manager.isNPC === false || !String(manager.id || managerId).startsWith('m_');
};

export const applyManagerProfileMeta = (manager: Manager, profile: ManagerProfileMetaRow | null): Manager => {
  if (!profile) return manager;

  const preferredPlayStyle = PLAY_STYLES.has(profile.preferred_play_style as PlayStyle)
    ? profile.preferred_play_style as PlayStyle
    : manager.preferredPlayStyle;

  return {
    ...manager,
    name: profile.display_name || manager.name,
    preferredPlayStyle,
    originTraitId: profile.origin_trait_id || manager.originTraitId,
    ownedTraitIds: profile.owned_trait_ids?.length ? profile.owned_trait_ids : manager.ownedTraitIds,
    equippedTraitIds: profile.equipped_trait_ids?.length ? profile.equipped_trait_ids : manager.equippedTraitIds,
    attributes: {
      ...manager.attributes,
      evolution: profile.evolution ?? manager.attributes.evolution,
      negotiation: profile.negotiation ?? manager.attributes.negotiation,
      scout: profile.scout ?? manager.attributes.scout,
    },
    career: {
      ...manager.career,
      titlesWon: Math.max(manager.career.titlesWon, profile.career_titles_total || 0),
    },
  };
};

export const buildManagerProfilePayload = (manager: Manager) => ({
  displayName: manager.name,
  preferredPlayStyle: manager.preferredPlayStyle || 'Equilibrado',
  evolution: manager.attributes.evolution,
  negotiation: manager.attributes.negotiation,
  scout: manager.attributes.scout,
  originTraitId: manager.originTraitId || manager.ownedTraitIds?.[0] || 'trait_cold_negotiator',
  ownedTraitIds: manager.ownedTraitIds?.length ? manager.ownedTraitIds : [manager.originTraitId || 'trait_cold_negotiator'],
  equippedTraitIds: manager.equippedTraitIds?.length ? manager.equippedTraitIds : [manager.originTraitId || 'trait_cold_negotiator'],
  careerTitlesTotal: manager.career.titlesWon,
  worldsPlayed: manager.career.worldIds?.length || 1,
});
