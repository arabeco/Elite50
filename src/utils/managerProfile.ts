import { Manager, PlayStyle } from '../types';
import { ManagerProfileMetaRow } from '../lib/metaStore';

const PLAY_STYLES = new Set<PlayStyle>(['Equilibrado', 'Vertical', 'Tiki-Taka', 'Gegenpressing', 'Retranca Armada']);

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
