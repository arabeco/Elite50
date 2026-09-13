import { District } from '../types';

export type ActiveDistrict = Exclude<District, 'EXILADO'>;

export interface DistrictTheme {
  district: District;
  label: string;
  color: string;
  rgb: string;
  text: string;
  textMuted: string;
  border: string;
  borderMuted: string;
  background: string;
  backgroundMuted: string;
  gradient: string;
  glow: string;
  badge: string;
}

export const DISTRICT_THEMES: Record<District, DistrictTheme> = {
  NORTE: {
    district: 'NORTE',
    label: 'Norte',
    color: '#38d7c6',
    rgb: '56, 215, 198',
    text: 'text-cyan-300',
    textMuted: 'text-cyan-300/70',
    border: 'border-cyan-400',
    borderMuted: 'border-cyan-400/40',
    background: 'bg-cyan-400/15',
    backgroundMuted: 'bg-cyan-950/35',
    gradient: 'from-zinc-800/95 to-zinc-950/95',
    glow: 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    badge: 'border-cyan-400/30 bg-cyan-950/75 text-cyan-300',
  },
  SUL: {
    district: 'SUL',
    label: 'Sul',
    color: '#f0a43c',
    rgb: '240, 164, 60',
    text: 'text-orange-300',
    textMuted: 'text-orange-300/70',
    border: 'border-orange-400',
    borderMuted: 'border-orange-400/40',
    background: 'bg-orange-400/15',
    backgroundMuted: 'bg-orange-950/35',
    gradient: 'from-zinc-800/95 to-zinc-950/95',
    glow: 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    badge: 'border-orange-400/30 bg-orange-950/75 text-orange-300',
  },
  LESTE: {
    district: 'LESTE',
    label: 'Leste',
    color: '#8fd36a',
    rgb: '143, 211, 106',
    text: 'text-lime-300',
    textMuted: 'text-lime-300/70',
    border: 'border-lime-400',
    borderMuted: 'border-lime-400/40',
    background: 'bg-lime-400/15',
    backgroundMuted: 'bg-lime-950/35',
    gradient: 'from-zinc-800/95 to-zinc-950/95',
    glow: 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    badge: 'border-lime-400/30 bg-lime-950/75 text-lime-300',
  },
  OESTE: {
    district: 'OESTE',
    label: 'Oeste',
    color: '#bd6cff',
    rgb: '189, 108, 255',
    text: 'text-purple-300',
    textMuted: 'text-purple-300/70',
    border: 'border-purple-400',
    borderMuted: 'border-purple-400/40',
    background: 'bg-purple-400/15',
    backgroundMuted: 'bg-purple-950/35',
    gradient: 'from-zinc-800/95 to-zinc-950/95',
    glow: 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    badge: 'border-purple-400/30 bg-purple-950/75 text-purple-300',
  },
  EXILADO: {
    district: 'EXILADO',
    label: 'Livre',
    color: '#94a3b8',
    rgb: '148, 163, 184',
    text: 'text-slate-300',
    textMuted: 'text-slate-400',
    border: 'border-slate-400',
    borderMuted: 'border-slate-500/40',
    background: 'bg-slate-400/10',
    backgroundMuted: 'bg-slate-900/55',
    gradient: 'from-zinc-800/95 to-zinc-950/95',
    glow: 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
    badge: 'border-slate-500/30 bg-slate-900/75 text-slate-300',
  },
};

export const getDistrictTheme = (district?: District | string | null): DistrictTheme => {
  const normalized = String(district || '').toUpperCase() as District;
  return DISTRICT_THEMES[normalized] || DISTRICT_THEMES.EXILADO;
};

export const getDistrictFromLeagueKey = (key?: string | null): District => {
  const normalized = String(key || '').toLowerCase();
  if (normalized.includes('norte') || normalized.includes('cyan')) return 'NORTE';
  if (normalized.includes('sul') || normalized.includes('orange')) return 'SUL';
  if (normalized.includes('leste') || normalized.includes('green') || normalized.includes('lime') || normalized.includes('emerald')) return 'LESTE';
  if (normalized.includes('oeste') || normalized.includes('purple') || normalized.includes('violet')) return 'OESTE';
  return 'EXILADO';
};
