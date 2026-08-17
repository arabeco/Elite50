import React from 'react';
import { MatchBroadcastViewer } from '../components/MatchBroadcastViewer';
import { simulateNativeMatch2D } from '../engine/match2DPlayEngine';
import { Match, MatchEvent, Player, Team } from '../types';
import { getFounderLogoAssetPath, getTeamLogoAssetPath } from '../utils/teamIdentity';

const makePlayer = (id: string, nickname: string, role: string, teamId: string): Player => ({
  id,
  name: nickname,
  nickname,
  role,
  position: role === 'GOL' ? 'Goleiro' : 'Linha',
  district: 'OESTE',
  totalRating: 720,
  potential: 790,
  contract: { teamId, salary: 0, years: 1 },
  pentagon: { attack: 70, defense: 70, physical: 70, mental: 70, technique: 70 },
  traits: [],
  history: {
    gamesPlayed: 0,
    goals: 0,
    assists: 0,
    averageRating: 6,
    lastMatchRatings: [],
    phaseHistory: [],
    trophies: [],
    clubs: [],
    seasonRatingDelta: 0,
  },
  achievements: [],
  morale: 70,
  age: 22,
  appearance: { gender: 'M', bodyId: 1, hairId: 1, bootId: 1 },
} as unknown as Player);

const folksLogoPath = getFounderLogoAssetPath('t_founder_1781875191263');
const bioLogoPath = getTeamLogoAssetPath('t_25') || '/assetas/avatars/logos/team-25-logo.png';

const homeTeam: Team = {
  id: 't_founder_1781875191263',
  name: 'Folks FFC',
  district: 'OESTE',
  league: 'Purple',
  managerId: 'm_folks',
  squad: [
    'fol_gk', 'fol_z1', 'fol_z2', 'fol_z3', 'fol_z4',
    'fol_m1', 'fol_m2', 'fol_m3', 'fol_a1', 'fol_a2', 'fol_a3',
  ],
  lineup: {},
  colors: { primary: '#22d3ee', secondary: '#111827' },
  logo: { primary: '#22d3ee', secondary: '#111827', accent: '#f8fafc', assetPath: folksLogoPath, shapeId: 'circle_badge', patternId: 'solid', symbolId: `asset:${folksLogoPath}` },
  chemistry: 76,
  tactics: {
    playStyle: 'Gegenpressing',
    mentality: 'Agressiva',
    linePosition: 68,
    aggressiveness: 70,
    intensity: 74,
    width: 58,
    passing: 62,
    slots: [null, null, null],
    preferredFormation: '4-3-3',
  },
  hype: 70,
  powerCap: 8800,
  legacy: { scoreDeltaAllTime: 0, tacticalMastery: {}, signatureStyle: 'Gegenpressing' },
} as unknown as Team;

const awayTeam: Team = {
  id: 't_25',
  name: 'Bio WFC',
  district: 'OESTE',
  league: 'Purple',
  managerId: 'm_bio',
  squad: [
    'bio_gk', 'bio_z1', 'bio_z2', 'bio_z3', 'bio_z4',
    'bio_m1', 'bio_m2', 'bio_m3', 'bio_a1', 'bio_a2', 'bio_a3',
  ],
  lineup: {},
  colors: { primary: '#a3e635', secondary: '#14532d' },
  logo: { primary: '#a3e635', secondary: '#14532d', accent: '#ecfccb', assetPath: bioLogoPath, shapeId: 'circle_badge', patternId: 'solid', symbolId: `asset:${bioLogoPath}` },
  chemistry: 81,
  tactics: {
    playStyle: 'Tiki-Taka',
    mentality: 'Calculista',
    linePosition: 55,
    aggressiveness: 52,
    intensity: 58,
    width: 64,
    passing: 72,
    slots: [null, null, null],
    preferredFormation: '4-3-3',
  },
  hype: 66,
  powerCap: 9600,
  legacy: { scoreDeltaAllTime: 0, tacticalMastery: {}, signatureStyle: 'Tiki-Taka' },
} as unknown as Team;

const players: Record<string, Player> = {
  fol_gk: makePlayer('fol_gk', 'Veda', 'GOL', homeTeam.id),
  fol_z1: makePlayer('fol_z1', 'Nyra', 'ZAG', homeTeam.id),
  fol_z2: makePlayer('fol_z2', 'Oren', 'ZAG', homeTeam.id),
  fol_z3: makePlayer('fol_z3', 'Kian', 'ZAG', homeTeam.id),
  fol_z4: makePlayer('fol_z4', 'Juno', 'ZAG', homeTeam.id),
  fol_m1: makePlayer('fol_m1', 'Lia', 'MEI', homeTeam.id),
  fol_m2: makePlayer('fol_m2', 'Ryo', 'MEI', homeTeam.id),
  fol_m3: makePlayer('fol_m3', 'Zev', 'MEI', homeTeam.id),
  fol_a1: makePlayer('fol_a1', 'Niko', 'ATA', homeTeam.id),
  fol_a2: makePlayer('fol_a2', 'Levi', 'ATA', homeTeam.id),
  fol_a3: makePlayer('fol_a3', 'Vela', 'ATA', homeTeam.id),
  bio_gk: makePlayer('bio_gk', 'Mako', 'GOL', awayTeam.id),
  bio_z1: makePlayer('bio_z1', 'Taro', 'ZAG', awayTeam.id),
  bio_z2: makePlayer('bio_z2', 'Ilan', 'ZAG', awayTeam.id),
  bio_z3: makePlayer('bio_z3', 'Sora', 'ZAG', awayTeam.id),
  bio_z4: makePlayer('bio_z4', 'Vico', 'ZAG', awayTeam.id),
  bio_m1: makePlayer('bio_m1', 'Uma', 'MEI', awayTeam.id),
  bio_m2: makePlayer('bio_m2', 'Ciro', 'MEI', awayTeam.id),
  bio_m3: makePlayer('bio_m3', 'Kira', 'MEI', awayTeam.id),
  bio_a1: makePlayer('bio_a1', 'Lio', 'ATA', awayTeam.id),
  bio_a2: makePlayer('bio_a2', 'Kael', 'ATA', awayTeam.id),
  bio_a3: makePlayer('bio_a3', 'Rina', 'ATA', awayTeam.id),
};

const event = (
  id: string,
  minute: number,
  realTimeSecond: number,
  type: MatchEvent['type'],
  teamId: string,
  title: string,
  description: string,
  playerId?: string,
  assistantId?: string
): MatchEvent => ({ id, minute, realTimeSecond, type, teamId, title, description, playerId, assistantId });

const baseMatch: Match = {
  id: 'preview-folks-bio',
  homeTeamId: homeTeam.id,
  awayTeamId: awayTeam.id,
  date: '2050-06-26',
  round: 3,
  played: true,
  revealed: true,
  homeScore: 2,
  awayScore: 1,
  result: {
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeScore: 2,
    awayScore: 1,
    headline: 'Folks FFC vira em noite neon no Oeste',
    stats: {
      possession: { home: 53, away: 47 },
      shots: { home: 7, away: 5 },
      shotsOnTarget: { home: 4, away: 3 },
    },
    scorers: [
      { teamId: awayTeam.id, playerId: 'bio_a2' },
      { teamId: homeTeam.id, playerId: 'fol_a2' },
      { teamId: homeTeam.id, playerId: 'fol_a1' },
    ],
    assists: [
      { teamId: awayTeam.id, playerId: 'bio_m2' },
      { teamId: homeTeam.id, playerId: 'fol_m1' },
      { teamId: homeTeam.id, playerId: 'fol_m2' },
    ],
    ratings: {},
    events: [
      event('preview_start', 0, 0, 'COMMENTARY', 'system', 'INICIO', 'A bola rola no tapete sintetico.'),
      event('preview_chance_1', 8, 12, 'CHANCE', homeTeam.id, 'DEFESA', 'Folks acha corredor e obriga o goleiro a trabalhar.', 'fol_a2', 'fol_m1'),
      event('preview_goal_away', 21, 30, 'GOAL', awayTeam.id, 'GOL', 'Bio acelera por dentro e finaliza no canto.', 'bio_a2', 'bio_m2'),
      event('preview_card', 34, 48, 'CARD_YELLOW', homeTeam.id, 'CARTAO', 'Zev mata a transicao com contato duro.', 'fol_m3'),
      event('preview_wood', 43, 58, 'WOODWORK', homeTeam.id, 'NA TRAVE', 'Levi bate cruzado e a bola explode no poste.', 'fol_a2', 'fol_m2'),
      event('preview_goal_home_1', 57, 76, 'GOAL', homeTeam.id, 'GOL', 'Folks pressiona alto, rouba e empata.', 'fol_a2', 'fol_m1'),
      event('preview_block', 72, 96, 'BLOCKED', awayTeam.id, 'BLOQUEIO', 'Bio chega com perigo, mas Nyra corta no ultimo segundo.', 'bio_a1'),
      event('preview_counter', 84, 112, 'COUNTER', homeTeam.id, 'TRANSICAO', 'Contra-ataque em velocidade abre o campo.', 'fol_m2'),
      event('preview_goal_home_2', 88, 118, 'GOAL', homeTeam.id, 'GOL', 'Niko recebe em profundidade e vira a partida.', 'fol_a1', 'fol_m2'),
    ],
  },
};

const simulation = simulateNativeMatch2D(baseMatch, homeTeam, awayTeam, players, 'folks-bio-tactical-demo-v2');
const match = simulation.match;

export const Match2DPreview: React.FC = () => (
  <div className="min-h-screen bg-slate-950 p-3 text-white sm:p-6">
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Preview local</div>
        <h1 className="mt-2 text-2xl font-black uppercase italic tracking-tight">Folks FFC x Bio WFC - Transmissao</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-white/60">
          <span className="rounded-full border border-cyan-300/30 px-3 py-2 text-cyan-200">{homeTeam.tactics.playStyle}</span>
          <span className="rounded-full border border-lime-300/30 px-3 py-2 text-lime-200">{awayTeam.tactics.playStyle}</span>
        </div>
      </div>
      <div className="h-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
        <MatchBroadcastViewer
          match={match}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          players={players}
        />
      </div>
    </div>
  </div>
);
