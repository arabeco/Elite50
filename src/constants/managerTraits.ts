import { PlayStyle } from '../types';

export type ManagerTraitUnlockType = 'ORIGIN' | 'CAREER' | 'COLLECTION' | 'PATRIMONY';

export interface ManagerTrait {
  id: string;
  name: string;
  description: string;
  unlockType: ManagerTraitUnlockType;
  preferredPlayStyle?: PlayStyle;
  influence: number;
}

export const STARTER_MANAGER_TRAITS: ManagerTrait[] = [
  {
    id: 'trait_tactical_architect',
    name: 'Arquiteto Tatico',
    description: 'Enxerga padroes antes do jogo abrir. Boa identidade para managers de treino e ajuste fino.',
    unlockType: 'ORIGIN',
    preferredPlayStyle: 'Tiki-Taka',
    influence: 8,
  },
  {
    id: 'trait_cold_negotiator',
    name: 'Negociador Frio',
    description: 'Fala pouco, pesa muito. Origem voltada a mercado, proposta e leitura de oportunidade.',
    unlockType: 'ORIGIN',
    preferredPlayStyle: 'Equilibrado',
    influence: 8,
  },
  {
    id: 'trait_street_scout',
    name: 'Olheiro de Rua',
    description: 'Acha valor antes da vitrine. Combina com manager que vive de garimpar jogador.',
    unlockType: 'ORIGIN',
    preferredPlayStyle: 'Vertical',
    influence: 8,
  },
  {
    id: 'trait_club_symbol',
    name: 'Simbolo Local',
    description: 'Chega com torcida, bairro e historia. Menos tecnica fria, mais peso social.',
    unlockType: 'ORIGIN',
    preferredPlayStyle: 'Gegenpressing',
    influence: 8,
  },
];

export const MANAGER_TRAITS_BY_ID = Object.fromEntries(
  STARTER_MANAGER_TRAITS.map(trait => [trait.id, trait])
);

