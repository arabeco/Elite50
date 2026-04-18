import { District, LogoPattern, LogoShape, TeamLogoMetadata } from '../types';

const SHAPES: LogoShape[] = [
  'shield_classic',
  'shield_modern',
  'circle_badge',
  'hex_tech',
  'diamond',
];

const PATTERNS: LogoPattern[] = [
  'solid',
  'stripes_vertical',
  'stripes_horizontal',
  'diagonal_split',
  'radial',
];

const SYMBOLS = [
  'Zap',
  'Flame',
  'Shield',
  'Atom',
  'Skull',
  'Crown',
  'Waves',
  'Triangle',
] as const;

const DISTRICT_PALETTES: Record<Exclude<District, 'EXILADO'>, Array<[string, string, string]>> = {
  NORTE: [
    ['#00E5FF', '#0A2540', '#7C3AED'],
    ['#22D3EE', '#1D4ED8', '#A78BFA'],
    ['#67E8F9', '#1E293B', '#38BDF8'],
    ['#06B6D4', '#312E81', '#E879F9'],
  ],
  SUL: [
    ['#F97316', '#292524', '#FACC15'],
    ['#FB7185', '#3F3F46', '#F97316'],
    ['#EA580C', '#1C1917', '#FDBA74'],
    ['#DC2626', '#44403C', '#F59E0B'],
  ],
  LESTE: [
    ['#8B5CF6', '#1D4ED8', '#60A5FA'],
    ['#7C3AED', '#0F172A', '#38BDF8'],
    ['#6366F1', '#111827', '#A78BFA'],
    ['#4F46E5', '#1E3A8A', '#22D3EE'],
  ],
  OESTE: [
    ['#22C55E', '#14532D', '#A3E635'],
    ['#10B981', '#166534', '#FACC15'],
    ['#4ADE80', '#0F3D2E', '#2DD4BF'],
    ['#16A34A', '#1F2937', '#84CC16'],
  ],
};

const EXILED_PALETTE: [string, string, string] = ['#E5E7EB', '#1F2937', '#94A3B8'];

const hashString = (value: string) => {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
};

const createSeededRandom = (seed: number) => {
  let t = seed >>> 0;

  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const safeHex = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized;

  const numeric = Number.parseInt(safeHex, 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixColors = (colorA: string, colorB: string, ratio: number) => {
  const safeRatio = clamp(ratio, 0, 1);
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);

  return rgbToHex(
    a.r + (b.r - a.r) * safeRatio,
    a.g + (b.g - a.g) * safeRatio,
    a.b + (b.b - a.b) * safeRatio,
  );
};

const shiftColor = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
};

const getPaletteForDistrict = (district?: District) => {
  if (!district || district === 'EXILADO') {
    return EXILED_PALETTE;
  }

  const palettes = DISTRICT_PALETTES[district];
  return palettes[0];
};

const pick = <T,>(items: readonly T[], random: () => number) => {
  return items[Math.floor(random() * items.length)];
};

export const generateTeamStyle = (teamName: string, district?: District): TeamLogoMetadata => {
  const seed = hashString(`${teamName}:${district || 'GLOBAL'}`);
  const random = createSeededRandom(seed);
  const palettes = district && district !== 'EXILADO' ? DISTRICT_PALETTES[district] : [EXILED_PALETTE];
  const basePalette = palettes[Math.floor(random() * palettes.length)] || getPaletteForDistrict(district);

  const [primaryBase, secondaryBase, accentBase] = basePalette;
  const primary = shiftColor(primaryBase, Math.floor(random() * 26) - 13);
  const secondary = shiftColor(secondaryBase, Math.floor(random() * 22) - 11);
  const accent = mixColors(
    shiftColor(accentBase, Math.floor(random() * 18) - 9),
    primary,
    0.35 + (random() * 0.25),
  );

  const symbolId = pick(SYMBOLS, random);
  const secondarySymbolId = random() > 0.82 ? pick(SYMBOLS.filter(icon => icon !== symbolId), random) : undefined;

  return {
    primary,
    secondary,
    accent,
    shapeId: pick(SHAPES, random),
    patternId: pick(PATTERNS, random),
    symbolId,
    secondarySymbolId,
  };
};

export const deriveAccentColor = (primaryColor: string, secondaryColor: string) => {
  return mixColors(primaryColor, secondaryColor, 0.45);
};

export const deriveShapeFromSignature = (signature: string): LogoShape => {
  return SHAPES[hashString(signature) % SHAPES.length];
};
