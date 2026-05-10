import { Manager } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getManagerAttribute = (manager: Manager | null | undefined, key: keyof Manager['attributes']) =>
  clamp(Math.round(manager?.attributes?.[key] ?? 50), 0, 100);

export const getManagerSeasonGoldBonusPct = (manager: Manager | null | undefined) => {
  const evolution = getManagerAttribute(manager, 'evolution');
  return clamp(Math.floor((evolution - 50) / 6), 0, 8);
};

export const getManagerDraftInfluence = (manager: Manager | null | undefined) => {
  const negotiation = getManagerAttribute(manager, 'negotiation');
  const scout = getManagerAttribute(manager, 'scout');
  return Math.round((negotiation - 50) * 0.8 + (scout - 50) * 0.4);
};

export const getManagerCommandReadout = (manager: Manager | null | undefined) => ({
  seasonGoldBonusPct: getManagerSeasonGoldBonusPct(manager),
  draftInfluence: getManagerDraftInfluence(manager),
});
