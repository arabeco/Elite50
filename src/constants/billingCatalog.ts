export type BillingProductKind = 'consumable' | 'entitlement';
export type BillingProductCode =
  | 'elite2050_gold_100'
  | 'elite2050_gold_300'
  | 'elite2050_gold_700'
  | 'passe_circuito_neon_01';

export interface BillingCatalogEntry {
  code: BillingProductCode;
  kind: BillingProductKind;
  displayName: string;
  description: string;
  amountLabel: string;
  brlPrice: number;
  goldAmount?: number;
  premiumDays?: number;
  imagePath?: string;
  googlePlayProductId: string;
  appStoreProductId: string;
}

export const BILLING_CATALOG: BillingCatalogEntry[] = [
  {
    code: 'elite2050_gold_100',
    kind: 'consumable',
    displayName: 'Bolsa de Ouro',
    description: 'Saldo leve para comprar skins, logos e chuteiras comuns ou raras.',
    amountLabel: '100 ouro',
    brlPrice: 4.9,
    goldAmount: 100,
    googlePlayProductId: 'elite2050_gold_100',
    appStoreProductId: 'app.elite2050.gold.100',
  },
  {
    code: 'elite2050_gold_300',
    kind: 'consumable',
    displayName: 'Cofre de Ouro',
    description: 'Pacote principal para montar um elenco com visual mais premium.',
    amountLabel: '300 ouro',
    brlPrice: 12.9,
    goldAmount: 300,
    googlePlayProductId: 'elite2050_gold_300',
    appStoreProductId: 'app.elite2050.gold.300',
  },
  {
    code: 'elite2050_gold_700',
    kind: 'consumable',
    displayName: 'Tesouro Elite',
    description: 'Mais folga para colecionar chuteiras raras e skins de clube.',
    amountLabel: '700 ouro',
    brlPrice: 24.9,
    goldAmount: 700,
    googlePlayProductId: 'elite2050_gold_700',
    appStoreProductId: 'app.elite2050.gold.700',
  },
  {
    code: 'passe_circuito_neon_01',
    kind: 'entitlement',
    displayName: 'Passe do Circuito',
    description: 'Trilha premium de temporada, cosmeticos e prova social. Nao altera forca do time.',
    amountLabel: '90 dias',
    brlPrice: 19.9,
    premiumDays: 90,
    imagePath: '/assetas/avatars/pass/pass-circuit-neon-01.png',
    googlePlayProductId: 'passe_circuito_neon_01',
    appStoreProductId: 'app.elite2050.pass.circuit.neon01',
  },
] as const;

export const GOLD_PACKS = BILLING_CATALOG.filter((product) => product.goldAmount);

export const getBillingProduct = (code: string) =>
  BILLING_CATALOG.find((product) => product.code === code) || null;
