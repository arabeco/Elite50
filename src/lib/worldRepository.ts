import { GameState, LeagueState, LeagueTeamStats, Manager, Match, Player, Team } from '../types';

const CHUNK_SIZE = 250;
type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => any;
};

const chunk = <T,>(items: T[], size = CHUNK_SIZE): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const toJsonArray = (value: unknown[] | undefined | null) => value || [];
const toIsoDate = (value?: string | null) => value || new Date().toISOString();

const getWorldRules = (state: GameState) => ({
  totalRounds: state.world.totalRounds,
  access: state.world.access || null,
  transferWindowOpen: state.world.transferWindowOpen ?? null,
  rank1000PlayerId: state.world.rank1000PlayerId || null,
  offseasonDecision: state.world.offseasonDecision || null,
  draftProposals: state.world.draftProposals || [],
  clubOffers: state.world.clubOffers || [],
});

const mapManagerRow = (worldId: string, manager: Manager) => ({
  world_id: worldId,
  manager_id: manager.id,
  user_id: manager.isNPC ? null : manager.id,
  name: manager.name,
  district: manager.district,
  reputation: manager.reputation,
  is_npc: manager.isNPC !== false,
  attributes: manager.attributes || {},
  career: manager.career || {},
  achievements: toJsonArray(manager.achievements),
});

const mapTeamRow = (worldId: string, team: Team) => ({
  world_id: worldId,
  team_id: team.id,
  name: team.name,
  city: team.city,
  district: team.district,
  league: team.league,
  manager_id: team.managerId,
  colors: team.colors || {},
  logo: team.logo || {},
  tactics: team.tactics || {},
  lineup: team.lineup || {},
  squad: team.squad || [],
  chemistry: team.chemistry ?? 50,
  power_cap: team.powerCap ?? null,
  inventory: team.inventory || [],
  titles: team.titles || {},
  achievements: toJsonArray(team.achievements),
});

const mapPlayerRow = (worldId: string, player: Player) => ({
  world_id: worldId,
  player_id: player.id,
  name: player.name,
  nickname: player.nickname,
  district: player.district,
  position: player.position,
  role: player.role,
  total_rating: player.totalRating,
  potential: player.potential,
  current_phase: player.currentPhase,
  contract_team_id: player.contract?.teamId || null,
  appearance: player.appearance || {},
  pentagon: player.pentagon || {},
  fusion: player.fusion || {},
  badges: player.badges || {},
  history: player.history || {},
  phase_history: player.phaseHistory || [],
  satisfaction: player.satisfaction,
  training_progress: player.trainingProgress,
  fatigue: player.fatigue,
  achievements: toJsonArray(player.achievements),
});

const mapMatchRow = (
  worldId: string,
  season: number,
  competition: string,
  leagueId: string | null,
  match: Match
) => ({
  world_id: worldId,
  match_id: `${competition}_${leagueId || 'cup'}_${match.id}`,
  season,
  competition,
  league_id: leagueId,
  round: match.round,
  home_team_id: match.homeTeamId,
  away_team_id: match.awayTeamId,
  scheduled_at: toIsoDate(match.date),
  match_time: match.time || null,
  status: match.status || (match.played ? 'FINISHED' : 'SCHEDULED'),
  played: match.played === true,
  revealed: match.revealed === true,
  home_score: match.homeScore ?? null,
  away_score: match.awayScore ?? null,
  result: match.result || null,
  events: match.result?.events || [],
});

const mapStandingRow = (
  worldId: string,
  season: number,
  leagueId: string,
  standing: LeagueTeamStats,
  index: number
) => ({
  world_id: worldId,
  season,
  league_id: leagueId,
  team_id: standing.teamId,
  points: standing.points,
  played: standing.played,
  won: standing.won,
  drawn: standing.drawn,
  lost: standing.lost,
  goals_for: standing.goalsFor,
  goals_against: standing.goalsAgainst,
  position: standing.position || index + 1,
});

const collectMatches = (state: GameState, worldId: string) => {
  const season = state.world.currentSeason || 2050;
  const leagueMatches = Object.values(state.world.leagues || {}).flatMap((league: LeagueState) =>
    (league.matches || []).map(match => mapMatchRow(worldId, season, 'REGULAR_SEASON', league.id, match))
  );

  const eliteCupMatches = [
    ...(state.world.eliteCup?.bracket?.round1 || []),
    ...(state.world.eliteCup?.bracket?.quarters || []),
    ...(state.world.eliteCup?.bracket?.semis || []),
    ...(state.world.eliteCup?.bracket?.final ? [state.world.eliteCup.bracket.final] : []),
  ].map(match => mapMatchRow(worldId, season, 'ELITE_CUP', null, match));

  const districtCupMatches = [
    ...(state.world.districtCup?.matches || []),
    ...(state.world.districtCup?.final ? [state.world.districtCup.final] : []),
  ].map(match => mapMatchRow(worldId, season, 'DISTRICT_CUP', null, match));

  return [...leagueMatches, ...eliteCupMatches, ...districtCupMatches];
};

const collectStandings = (state: GameState, worldId: string) => {
  const season = state.world.currentSeason || 2050;
  const leagueStandings = Object.values(state.world.leagues || {}).flatMap((league: LeagueState) =>
    (league.standings || []).map((standing, index) => mapStandingRow(worldId, season, league.id, standing, index))
  );

  const districtCupStandings = (state.world.districtCup?.standings || []).map((standing, index) =>
    mapStandingRow(worldId, season, 'district_cup', standing, index)
  );

  return [...leagueStandings, ...districtCupStandings];
};

const upsertChunks = async <T extends Record<string, unknown>>(
  client: SupabaseClientLike,
  table: string,
  rows: T[],
  onConflict: string
) => {
  for (const rowsChunk of chunk(rows)) {
    if (rowsChunk.length === 0) continue;
    const { error } = await client
      .from(table)
      .upsert(rowsChunk, { onConflict });

    if (error) throw error;
  }
};

export const syncNormalizedWorldFromState = async (
  client: SupabaseClientLike,
  state: GameState,
  legacyWorldId: string,
  reason = 'parallel_save'
) => {
  const { data: { user } } = await client.auth.getUser();
  if (!user || state.isCreator !== true) return null;

  const worldPayload = {
    legacy_world_id: legacyWorldId,
    creator_user_id: user.id,
    name: state.world.name || `Mundo ${legacyWorldId}`,
    status: state.world.status,
    phase: state.world.phase,
    current_season: state.world.currentSeason || 2050,
    current_day: state.world.currentDay,
    current_round: state.world.currentRound,
    current_game_date: state.world.currentDate,
    season_start_at: state.world.seasonStartReal || null,
    is_public: state.world.isPublic === true,
    join_code: state.world.access?.joinCode || null,
    rules: getWorldRules(state),
    source: 'LEGACY_GAMES_PARALLEL',
  };

  const { data: worldRow, error: worldError } = await client
    .from('worlds')
    .upsert(worldPayload, { onConflict: 'legacy_world_id' })
    .select('id')
    .single();

  if (worldError) throw worldError;
  const worldId = worldRow.id as string;

  await client
    .from('world_participants')
    .upsert({
      world_id: worldId,
      user_id: user.id,
      team_id: state.userTeamId,
      manager_id: state.userManagerId || null,
      role: state.userTeamId ? 'MANAGER' : 'OBSERVER',
      is_creator: true,
      is_observer: !state.userTeamId,
    }, { onConflict: 'world_id,user_id' });

  await client
    .from('world_user_state')
    .upsert({
      world_id: worldId,
      user_id: user.id,
      notifications: state.notifications || [],
      training: state.training || {},
      last_headline: state.lastHeadline || {},
      store_overlay: state.store || {},
    }, { onConflict: 'world_id,user_id' });

  await upsertChunks(client, 'world_managers', Object.values(state.managers || {}).map(manager => mapManagerRow(worldId, manager)), 'world_id,manager_id');
  await upsertChunks(client, 'world_teams', Object.values(state.teams || {}).map(team => mapTeamRow(worldId, team)), 'world_id,team_id');
  await upsertChunks(client, 'world_players', Object.values(state.players || {}).map(player => mapPlayerRow(worldId, player)), 'world_id,player_id');
  await upsertChunks(client, 'world_matches', collectMatches(state, worldId), 'world_id,match_id');
  await upsertChunks(client, 'world_standings', collectStandings(state, worldId), 'world_id,season,league_id,team_id');

  if (state.world.news?.length) {
    const newsRows = state.world.news.slice(-30).map(news => ({
      world_id: worldId,
      season: news.action?.season || state.world.currentSeason || 2050,
      day: state.world.currentDay,
      type: news.type,
      title: news.title,
      message: news.content,
      payload: news,
      created_at: news.date || new Date().toISOString(),
    }));

    await client
      .from('world_news')
      .insert(newsRows);
  }

  await client
    .from('world_snapshots')
    .insert({
      world_id: worldId,
      reason,
      state,
      created_by: user.id,
    });

  return worldId;
};
