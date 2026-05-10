import { StoreItem } from '../types';

export const APP_CIRCUIT = {
  id: 'circuito-neon-01',
  name: 'Circuito Neon 01',
  durationDays: 90,
  targetSeasonRuns: 3,
  finalRewardItemId: 'badge_elite_original_s1',
  premiumName: 'Passe do Circuito',
};

type BootSeed = {
  fileNo: number;
  name: string;
  collectionLabel: string;
  rarity: StoreItem['rarity'];
  currency: StoreItem['currency'];
  price: number;
  description: string;
  effectLabel: string;
  effectDescription: string;
  bootBonus?: StoreItem['bootBonus'];
};

const formatBootNumber = (value: number) => String(value).padStart(2, '0');
const buildBootImagePath = (fileNo: number) => `/assetas/avatars/boots/boot_${formatBootNumber(fileNo)}.png`;
const buildBootId = (fileNo: number) => `boot_${formatBootNumber(fileNo)}`;

const bootSeeds: BootSeed[] = [
  { fileNo: 1, name: 'Velocity Cyan', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 12, description: 'Base neon leve para abrir a colecao do elenco.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Sem bonus competitivo.' },
  { fileNo: 2, name: 'Orbit Violet', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 12, description: 'Visual escuro com acento violeta para jogadores de lado.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Ideal para variar estilo.' },
  { fileNo: 3, name: 'Static Aqua', collectionLabel: 'Linha Tecnica', rarity: 'COMMON', currency: 'GOLD', price: 13, description: 'Modelo frio e tecnico para titulares de posse.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Mantem o jogo limpo.' },
  { fileNo: 4, name: 'Blade Silver', collectionLabel: 'Linha Tecnica', rarity: 'COMMON', currency: 'GOLD', price: 13, description: 'Acabamento prateado com detalhe verde de controle.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Boa para meias e armadores.' },
  { fileNo: 5, name: 'Sky Pulse', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 14, description: 'Leve e brilhante, com leitura imediata de velocidade.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Sem impacto em score.' },
  { fileNo: 6, name: 'Solar Gold', collectionLabel: 'Linha Tecnica', rarity: 'COMMON', currency: 'GOLD', price: 14, description: 'Visual dourado esportivo para atletas chamativos.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Valor de estilo apenas.' },
  { fileNo: 7, name: 'Frost Edge', collectionLabel: 'Linha Estabilidade', rarity: 'COMMON', currency: 'GOLD', price: 14, description: 'Base branca e fria para elenco equilibrado.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Boa para colecao inicial.' },
  { fileNo: 8, name: 'Mint Flow', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 15, description: 'Tom verde-agua com assinatura de aceleração.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Sem efeito competitivo.' },
  { fileNo: 9, name: 'Inferno Red', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 15, description: 'Peça vibrante para quem quer atacante aparecendo.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Ideal para vitrine.' },
  { fileNo: 10, name: 'Night Sprint', collectionLabel: 'Linha Velocidade', rarity: 'COMMON', currency: 'GOLD', price: 15, description: 'Preto e violeta com cara de corrida curta e agressiva.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Sem bonus escondido.' },
  { fileNo: 11, name: 'Copper Touch', collectionLabel: 'Linha Tecnica', rarity: 'COMMON', currency: 'GOLD', price: 16, description: 'Bronze polido para jogadores de refinamento.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Valor de estilo.' },
  { fileNo: 12, name: 'Graph Surge', collectionLabel: 'Linha Estabilidade', rarity: 'COMMON', currency: 'GOLD', price: 16, description: 'Visual escuro com sola ácida para elenco firme.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Boa para defesa e base.' },
  { fileNo: 13, name: 'Cloud White', collectionLabel: 'Linha Tecnica', rarity: 'COMMON', currency: 'GOLD', price: 16, description: 'Modelo claro e limpo para equipe premium.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Sem alterar atributos.' },
  { fileNo: 14, name: 'Deep Current', collectionLabel: 'Linha Estabilidade', rarity: 'COMMON', currency: 'GOLD', price: 17, description: 'Aqua escuro com leitura de firmeza e presença.', effectLabel: 'Visual Base', effectDescription: 'Cosmetica pura. Fecha a base comum da linha.' },

  { fileNo: 21, name: 'Rune Flash', collectionLabel: 'Linha Velocidade', rarity: 'UNCOMMON', currency: 'GOLD', price: 18, description: 'Primeira faixa acima da base, mais marcante e agressiva.', effectLabel: 'Estilo de Colecao', effectDescription: 'Ainda sem bonus. Serve para deixar o elenco mais premium.' },
  { fileNo: 23, name: 'Arc Sigil', collectionLabel: 'Linha Tecnica', rarity: 'UNCOMMON', currency: 'GOLD', price: 19, description: 'Modelo simbolico para jogadores de controle e leitura.', effectLabel: 'Estilo de Colecao', effectDescription: 'Cosmetica intermediaria. Sem impacto no balance.' },
  { fileNo: 24, name: 'Void Core', collectionLabel: 'Linha Tecnica', rarity: 'UNCOMMON', currency: 'GOLD', price: 19, description: 'Centro escuro com visual de energia concentrada.', effectLabel: 'Estilo de Colecao', effectDescription: 'Colecao visual acima das comuns.' },
  { fileNo: 25, name: 'Lotus Veil', collectionLabel: 'Linha Estabilidade', rarity: 'UNCOMMON', currency: 'GOLD', price: 20, description: 'Visual lilas suave para atletas de ritmo constante.', effectLabel: 'Estilo de Colecao', effectDescription: 'Sem bonus. Foco em identidade visual.' },
  { fileNo: 26, name: 'Blaze Crest', collectionLabel: 'Linha Velocidade', rarity: 'UNCOMMON', currency: 'GOLD', price: 20, description: 'Visual de chama viva para peças explosivas do elenco.', effectLabel: 'Estilo de Colecao', effectDescription: 'Cosmetica intermediaria. Boa para destaque.' },
  { fileNo: 27, name: 'Verdant Shell', collectionLabel: 'Linha Estabilidade', rarity: 'UNCOMMON', currency: 'GOLD', price: 21, description: 'Camada verde densa com presença de jogador confiável.', effectLabel: 'Estilo de Colecao', effectDescription: 'Sem bonus. Fecha a faixa incomum.' },

  { fileNo: 31, name: 'Nebula Drive', collectionLabel: 'Linha Velocidade', rarity: 'RARE', currency: 'GOLD', price: 23, description: 'Faixa rara com impulso leve para dias muito bons.', effectLabel: 'Assinatura Rara', effectDescription: 'Leve empurrao na evolucao pos-jogo de atleta em alta.', bootBonus: { progressionGainPct: 10 } },
  { fileNo: 32, name: 'Prism Cryst', collectionLabel: 'Linha Tecnica', rarity: 'RARE', currency: 'GOLD', price: 24, description: 'Peça rara de vitrine para jogadores tecnicos.', effectLabel: 'Assinatura Rara', effectDescription: 'Equilibra ganho e estabilidade em dose pequena.', bootBonus: { progressionGainPct: 8, progressionLossMitigationPct: 10 } },
  { fileNo: 33, name: 'Chrono Mesh', collectionLabel: 'Linha Tecnica', rarity: 'RARE', currency: 'GOLD', price: 24, description: 'Trama rara com leitura premium e refinada.', effectLabel: 'Assinatura Rara', effectDescription: 'Leve bonus para evolucao positiva quando o atleta entrega nota alta.', bootBonus: { progressionGainPct: 12 } },
  { fileNo: 34, name: 'Crown Gleam', collectionLabel: 'Linha Estabilidade', rarity: 'RARE', currency: 'GOLD', price: 25, description: 'Visual claro com aura de segurança e regularidade.', effectLabel: 'Assinatura Rara', effectDescription: 'Amortece perdas pequenas sem mexer em score bruto.', bootBonus: { progressionLossMitigationPct: 18 } },
  { fileNo: 35, name: 'Tide Breaker', collectionLabel: 'Linha Velocidade', rarity: 'RARE', currency: 'GOLD', price: 25, description: 'Splash azul para atletas de rompimento e estourada.', effectLabel: 'Assinatura Rara', effectDescription: 'Reforca um pouco os bons dias do atleta.', bootBonus: { progressionGainPct: 15 } },
  { fileNo: 36, name: 'Obsidian Reef', collectionLabel: 'Linha Estabilidade', rarity: 'RARE', currency: 'GOLD', price: 26, description: 'Faixa rara escura para titulares de sustentacao.', effectLabel: 'Assinatura Rara', effectDescription: 'Segura quedas ruins e deixa a temporada mais estavel.', bootBonus: { progressionLossMitigationPct: 22 } },

  { fileNo: 41, name: 'Halo Dominion', collectionLabel: 'Linha Tecnica', rarity: 'EPIC', currency: 'FRAGMENT', price: 16, description: 'Faixa epica preparada para atletas realmente especiais.', effectLabel: 'Assinatura Epica', effectDescription: 'Aumenta levemente ganhos e reduz perdas na evolucao pos-jogo.', bootBonus: { progressionGainPct: 18, progressionLossMitigationPct: 20 } },
  { fileNo: 42, name: 'Ice Seraph', collectionLabel: 'Linha Velocidade', rarity: 'EPIC', currency: 'FRAGMENT', price: 17, description: 'Epica clara e agressiva para jogador de temporada.', effectLabel: 'Assinatura Epica', effectDescription: 'Prioriza crescimento sem tocar em rating bruto.', bootBonus: { progressionGainPct: 22, progressionLossMitigationPct: 16 } },
  { fileNo: 43, name: 'Winged Crown', collectionLabel: 'Linha Estabilidade', rarity: 'LEGENDARY', currency: 'FRAGMENT', price: 20, description: 'Faixa lendaria para simbolos de clube e elite original.', effectLabel: 'Assinatura Lendaria', effectDescription: 'Entrega o melhor pacote de estabilidade da colecao sem virar pay-to-win.', bootBonus: { progressionGainPct: 16, progressionLossMitigationPct: 30 } },
  { fileNo: 44, name: 'Solar Relic', collectionLabel: 'Linha Tecnica', rarity: 'LEGENDARY', currency: 'FRAGMENT', price: 22, description: 'Topo absoluto da colecao atual de chuteiras.', effectLabel: 'Assinatura Lendaria', effectDescription: 'Pacote lendario com crescimento melhor e queda mais suave.', bootBonus: { progressionGainPct: 20, progressionLossMitigationPct: 28 } },
];

const bootItems: StoreItem[] = bootSeeds.map(seed => ({
  id: buildBootId(seed.fileNo),
  category: 'BOOT',
  name: seed.name,
  description: seed.description,
  collectionLabel: seed.collectionLabel,
  effectLabel: seed.effectLabel,
  effectDescription: seed.effectDescription,
  rarity: seed.rarity,
  currency: seed.currency,
  price: seed.price,
  imagePath: buildBootImagePath(seed.fileNo),
  bootVisualId: seed.fileNo,
  bootBonus: seed.bootBonus,
}));

const cosmeticItems: StoreItem[] = [
  {
    id: 'kit_circuit_chrome',
    category: 'KIT',
    name: 'Circuit Chrome',
    description: 'Uniforme especial cromado para o clube atual.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 24,
    imagePath: '/assetas/avatars/uniforms/special1.png',
    assetPath: '/assetas/avatars/uniforms/special1.png',
  },
  {
    id: 'kit_holo_wave',
    category: 'KIT',
    name: 'Holo Wave',
    description: 'Skin holografica para usar fora dos kits de distrito.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 26,
    imagePath: '/assetas/avatars/uniforms/special2.png',
    assetPath: '/assetas/avatars/uniforms/special2.png',
  },
  {
    id: 'kit_carbon_grid',
    category: 'KIT',
    name: 'Carbon Grid',
    description: 'Visual escuro com linhas tecnicas.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 27,
    imagePath: '/assetas/avatars/uniforms/special3.png',
    assetPath: '/assetas/avatars/uniforms/special3.png',
  },
  {
    id: 'kit_pulse_white',
    category: 'KIT',
    name: 'Pulse White',
    description: 'Uniforme claro com cara de clube premium.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 18,
    imagePath: '/assetas/avatars/uniforms/sspecial4.png',
    assetPath: '/assetas/avatars/uniforms/sspecial4.png',
  },
  {
    id: 'kit_neon_flux',
    category: 'KIT',
    name: 'Neon Flux',
    description: 'Skin chamativa para quem quer marcar presenca.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 20,
    imagePath: '/assetas/avatars/uniforms/special5.png',
    assetPath: '/assetas/avatars/uniforms/special5.png',
  },
  {
    id: 'logo_quantum_vault',
    category: 'LOGO',
    name: 'Quantum Vault',
    description: 'Logo especial fora da pool padrao dos clubes.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 22,
    imagePath: '/assetas/store/logos/logo_quantum_vault.png',
    logoPreview: {
      primary: '#0f172a',
      secondary: '#22d3ee',
      accent: '#f8fafc',
      patternId: 'radial',
      symbolId: 'asset:/assetas/store/logos/logo_quantum_vault.png',
      assetPath: '/assetas/store/logos/logo_quantum_vault.png',
    },
  },
  {
    id: 'logo_holo_tiger',
    category: 'LOGO',
    name: 'Holo Tiger',
    description: 'Placeholder para logo premium de energia alta.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 23,
    imagePath: '/assetas/store/logos/logo_holo_tiger.png',
    logoPreview: {
      primary: '#1d4ed8',
      secondary: '#ec4899',
      accent: '#facc15',
      patternId: 'diagonal_split',
      symbolId: 'asset:/assetas/store/logos/logo_holo_tiger.png',
      assetPath: '/assetas/store/logos/logo_holo_tiger.png',
    },
  },
  {
    id: 'logo_blackout_crown',
    category: 'LOGO',
    name: 'Blackout Crown',
    description: 'Placeholder para logo de streak de vitorias.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 16,
    imagePath: '/assetas/store/logos/logo_blackout_crown.png',
    logoPreview: {
      primary: '#020617',
      secondary: '#e2e8f0',
      accent: '#38bdf8',
      patternId: 'solid',
      symbolId: 'asset:/assetas/store/logos/logo_blackout_crown.png',
      assetPath: '/assetas/store/logos/logo_blackout_crown.png',
    },
  },
  {
    id: 'logo_pulse_hex',
    category: 'LOGO',
    name: 'Pulse Hex',
    description: 'Placeholder para logo com cara de tec arena.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 17,
    imagePath: '/assetas/store/logos/logo_pulse_hex.png',
    logoPreview: {
      primary: '#14532d',
      secondary: '#a3e635',
      accent: '#f8fafc',
      patternId: 'stripes_vertical',
      symbolId: 'asset:/assetas/store/logos/logo_pulse_hex.png',
      assetPath: '/assetas/store/logos/logo_pulse_hex.png',
    },
  },
  {
    id: 'logo_solar_wire',
    category: 'LOGO',
    name: 'Solar Wire',
    description: 'Placeholder para logo raro de assinatura visual.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 18,
    imagePath: '/assetas/store/logos/logo_solar_wire.png',
    logoPreview: {
      primary: '#7c2d12',
      secondary: '#fb923c',
      accent: '#fde68a',
      patternId: 'stripes_horizontal',
      symbolId: 'asset:/assetas/store/logos/logo_solar_wire.png',
      assetPath: '/assetas/store/logos/logo_solar_wire.png',
    },
  },
];

const profileItems: StoreItem[] = [
  {
    id: 'accessory_founder_whistle',
    category: 'ACCESSORY',
    name: 'Apito de Fundador',
    description: 'Acessorio de perfil para manager que carrega mundos nas costas.',
    collectionLabel: 'Perfil Global',
    effectLabel: 'Aura de Manager',
    effectDescription: 'Marca publica de prestigio. Bonus leve de reputacao visual entre mundos.',
    rarity: 'RARE',
    currency: 'GOLD',
    price: 32,
    imagePath: '/logo.png',
    managerBonus: { reputationAura: 1 },
  },
  {
    id: 'accessory_scout_lens',
    category: 'ACCESSORY',
    name: 'Lente de Scout',
    description: 'Acessorio transversal para deixar o perfil com cara de observador elite.',
    collectionLabel: 'Perfil Global',
    effectLabel: 'Clareza de Scout',
    effectDescription: 'Futuro bonus leve de leitura e filtros. Nao aumenta rating nem resultado de partida.',
    rarity: 'EPIC',
    currency: 'FRAGMENT',
    price: 12,
    imagePath: '/logo.png',
    managerBonus: { scoutingClarityPct: 5 },
  },
  {
    id: 'badge_elite_original_s1',
    category: 'BADGE',
    name: 'Elite Original S1',
    description: 'Badge de perfil para quem fechou o primeiro circuito com honra.',
    collectionLabel: 'Perfil Global',
    effectLabel: 'Prova Social',
    effectDescription: 'Item de perfil atravessando mundos. Valor de historia, nao de poder.',
    rarity: 'LEGENDARY',
    currency: 'FRAGMENT',
    price: 0,
    premiumOnly: true,
    imagePath: '/logo.png',
    circuitTag: APP_CIRCUIT.id,
  },
];

export const STORE_ITEMS: StoreItem[] = [...bootItems, ...cosmeticItems, ...profileItems];

export const STORE_ITEMS_BY_ID = Object.fromEntries(STORE_ITEMS.map(item => [item.id, item]));
