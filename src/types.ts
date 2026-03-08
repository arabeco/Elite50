export type PositionType = 'Linha' | 'Goleiro';
export type PlayerRole = 'GOL' | 'ZAG' | 'MEI' | 'ATA';
export type District = 'NORTE' | 'SUL' | 'LESTE' | 'OESTE' | 'EXILADO';

export interface Pentagon {
  FOR: number; // Força
  AGI: number; // Agilidade
  INT: number; // Inteligência
  TAT: number; // Tática
  TEC: number; // Técnica
}

export interface FusionSkills {
  DET: number; // FOR + INT
  DRI?: number; // AGI + INT (Linha)
  REF?: number; // AGI + INT (Goleiro)
  FIN?: number; // FOR + TEC (Linha)
  DEF?: number; // FOR + TEC (Goleiro)
  PAS: number; // TAT + TEC
  MOV?: number; // AGI + TAT (Linha)
  POS?: number; // AGI + TAT (Goleiro)
}

export interface Badges {
  slot1: string | null; // DNA BASE: 70% Bronze, 30% Prata
  slot2: string | null; // DNA ELITE: 60% Prata, 40% Ouro
  slot3: string | null; // DNA POTENCIAL: 70% Ouro, 25% Épico, 5% Lendário
  slot4: string | null; // DNA LEGADO: Fardos (25% chance) ou Aprendizado
  slot3Hidden: boolean; // Revela no Rating 800
  trainingSlot4?: {
    trait: string;
    daysLeft: number;
    type: 'CURE' | 'LEARN';
    targetRarity: 'Bronze' | 'Prata' | 'Ouro' | 'Épico' | 'Lendário';
  };
}

export interface Contract {
  teamId: string | null;
}

export interface Achievement {
  season: number;
  title: string;
  type: 'Clube' | 'Distrito' | 'Individual';
}

export interface PlayerHistory {
  goals: number;
  assists: number;
  averageRating: number;
  gamesPlayed: number;
  lastMatchRatings: number[]; // Array of last 5 match ratings (0.0 - 10.0)
  benchGamesCount: number; // For satisfaction logic
  seasonRatingDelta: number; // Cap at +/- 90
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  district: District;
  appearance: {
    gender: 'M' | 'F';
    bodyId: number; // 1, 2, 3
    hairId: number; // 1..6
    bootId: number; // 1..15
  };
  position: PositionType;
  role: PlayerRole;
  pentagon: Pentagon;
  fusion: FusionSkills;
  totalRating: number; // 0-1000
  potential: number; // Max rating ceiling
  currentPhase: number; // Current form/phase (0.0 - 10.0)
  phaseHistory: number[]; // Last 3-5 match ratings for phase calculation
  badges: Badges;
  contract: Contract;
  history: PlayerHistory;
  satisfaction: number; // 0-100
  trainingProgress: number; // 0-100
  fatigue: number; // 0-100 (New for District Cup)
  achievements: Achievement[];
}

export type LeagueColor = 'Cyan' | 'Orange' | 'Green' | 'Purple';

export type PlayStyle = 'Blitzkrieg' | 'Tiki-Taka' | 'Retranca Armada' | 'Motor Lento' | 'Equilibrado' | 'Gegenpressing' | 'Catenaccio' | 'Vertical';

export type Mentality = 'Calculista' | 'Emocional' | 'Predadora';

export interface TacticalCard {
  id: string;
  name: string;
  description?: string;
  type?: string;
  rarity?: string;
  effect: string;
}

export interface TeamTactics {
  playStyle: PlayStyle;
  mentality?: Mentality;
  linePosition?: number; // 0 (Recuada) to 100 (Alta)
  aggressiveness?: number; // 0 (Sombra) to 100 (Caçada)
  intensity?: number; // 0 to 100
  width?: number; // 0 to 100
  passing?: number; // 0 to 100
  slots?: (TacticalCard | null)[]; // Max 3 slots
  preferredFormation: string;
}

export interface TeamLogoMetadata {
  primary: string;
  secondary: string;
  patternId: string;
  symbolId: string;
  secondarySymbolId?: string;
}

export interface Team {
  id: string;
  name: string;
  city: string;
  district: District;
  league: LeagueColor;
  colors: {
    primary: string;
    secondary: string;
  };
  logo?: TeamLogoMetadata;
  tactics: TeamTactics;
  inventory?: TacticalCard[]; // Cards available to use in slots
  managerId: string | null;
  squad: string[]; // Player IDs
  lineup: Record<string, string>; // Position -> Player ID
  chemistry?: number; // 0-100
  powerCap?: number; // Teto de score dinâmico
}

export interface Manager {
  id: string;
  name: string;
  district: District;
  reputation: number; // 0-100
  attributes: {
    evolution: number;
    negotiation: number;
    scout: number;
  };
  career: {
    titlesWon: number;
    totalLeagueTitles: number;
    totalCupTitles: number;
    hallOfFameEntries: number;
    consecutiveTitles: number;
    currentTeamId: string | null;
    historyTeamIds: string[];
  };
  achievements: Achievement[];
}

export type MatchStatus = 'SCHEDULED' | 'LOCKED' | 'PLAYING' | 'FINISHED';

export type CardType = 'CARD_YELLOW' | 'CARD_RED' | 'COMMENTARY' | 'HALF_TIME';

export interface TradeOffer {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offeredPlayerId: string;
  requestedPlayerId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  date: string;
}

export interface TransferProposal {
  id: string;
  playerId: string;
  fromTeamId: string | null;
  toTeamId: string;
  value: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WAITING_WINDOW';
  date: string;
}

export interface MatchEvent {
  id: string;
  minute: number; // 0-90
  realTimeSecond: number; // 0-360 (6 minutes)
  type: 'GOAL' | 'CARD_YELLOW' | 'CARD_RED' | 'CHANCE' | 'FOUL' | 'SUBSTITUTION' | 'COMMENTARY' | 'WOODWORK' | 'VAR' | 'BLOCKED' | 'OFFSIDE' | 'COUNTER' | 'MISTAKE';
  title: string;
  description: string;
  playerId?: string;
  assistantId?: string;
  teamId: string;
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  scorers: Array<{ playerId: string; teamId: string }>;
  assists: Array<{ playerId: string; teamId: string }>;
  ratings: Record<string, number>;
  events: MatchEvent[];
  headline?: string;
  stats?: {
    possession: { home: number; away: number };
    shots: { home: number; away: number };
    shotsOnTarget: { home: number; away: number };
  };
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  time?: string; // HH:mm
  date: string; // ISO String
  status?: MatchStatus;
  result?: MatchResult | null;
  homeScore?: number;
  awayScore?: number;
  played?: boolean;
  revealed?: boolean; // New: Hidden scores for user impact
  round: number;
}

export interface Round {
  matches: Match[];
}

export interface LeagueTeamStats {
  teamId: string;
  team?: string;
  position?: number;
  logo?: TeamLogoMetadata;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  gd?: number;
  points: number;
}

export interface LeagueScorer {
  rank: number;
  name: string;
  team: string;
  goals: number;
  teamId: string;
}

export type LogoPattern = string;

export interface GameNotification {
  id: string;
  date: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'alert' | 'match' | 'transfer' | 'warning' | 'crisis';
  read: boolean;
}

// Re-export as Notification so existing code doesn't break
export { type GameNotification as Notification };

export interface TeamStats {
  id: string;
  name: string;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  playStyle: PlayStyle;
  mentality: Mentality;
  linePosition: number;
  aggressiveness: number;
  slots: (TacticalCard | null)[];
  chemistry: number;
}

export interface EliteCupBracket {
  round1: Match[];
  quarters: Match[];
  semis: Match[];
  final: Match | null;
}

export interface EliteCupState {
  teams: string[];
  round: number;
  bracket: EliteCupBracket;
  winnerId: string | null;
}

export interface DistrictCupState {
  teams: string[];
  round: number;
  matches: Match[];
  standings: LeagueTeamStats[];
  final: Match | null;
  winnerId: string | null;
}

export interface LeagueState {
  id: string;
  name: string;
  district?: District;
  standings: LeagueTeamStats[];
  scorers?: LeagueScorer[];
  rounds?: Round[];
  matches: Match[];
  difficulty?: string;
  teams?: string[];
}

export type WorldStatus = 'DRAFT' | 'LOBBY' | 'ACTIVE' | 'FINISHED';
export type SeasonPhase = 'REGULAR_SEASON' | 'ELITE_CUP' | 'DISTRICT_CUP' | 'OFFSEASON';

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  content: string;
  type: 'TRANSFER' | 'EXILE' | 'CHAMPION' | 'CUP' | 'MIGRATION' | 'SYSTEM';
  importance: 1 | 2 | 3; // 3 is highest
}

export interface SeasonReport {
  season: number;
  finalStandings: Record<string, LeagueTeamStats[]>;
  reallocatedTeams: { teamId: string; from: District; to: District }[];
  profitWinner: { teamId: string; capGain: number };
  mvpRating: { playerId: string; ratingGain: number };
}

export interface WorldState {
  id?: string;
  name?: string;
  status: WorldStatus;
  currentDate: string;
  currentDay: number;
  currentRound: number;
  currentSeason?: number;
  totalRounds?: number;
  transferWindowOpen?: boolean;
  seasonStartReal?: string | null;
  rank1000PlayerId?: string | null;
  leagues: Record<string, LeagueState>;
  eliteCup: EliteCupState;
  districtCup: DistrictCupState;
  phase: SeasonPhase;
  news: NewsItem[];
  history: SeasonReport[];
  isInitialSeed?: boolean;
  draftProposals?: { playerId: string; managerId: string; teamId: string; priority: number }[];
}

export interface TrainingState {
  chemistryBoostLastUsed?: string; // ISO Date
  playstyleTraining: {
    currentStyle: PlayStyle | null;
    understanding: Record<string, number>; // PlayStyle -> 0-100
  };
  cardLaboratory: {
    slots: Array<{
      cardId: string | null;
      finishTime: string | null; // ISO Date
    }>;
  };
  individualFocus: {
    evolutionSlot: string | null; // Player ID (1.5x Rating gain)
    stabilizationSlot: string | null; // Player ID (Reduced Rating loss)
  };
}

export interface GameState {
  world: WorldState;
  worldId?: string;
  userId?: string;
  isCreator?: boolean;
  teams: Record<string, Team>;
  players: Record<string, Player>;
  managers: Record<string, Manager>;
  userTeamId: string | null;
  userManagerId?: string | null;
  notifications: GameNotification[];
  lastHeadline?: {
    title: string;
    message: string;
  };
  training: TrainingState;
  transferProposals?: TransferProposal[];
  tradeOffers?: TradeOffer[];
}
