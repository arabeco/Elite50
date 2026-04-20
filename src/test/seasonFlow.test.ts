import { describe, expect, it } from 'vitest';
import { generateInitialState } from '../engine/generator';
import { advanceGameDay, startNewSeason } from '../engine/gameLogic';
import { SEASON_DAYS, SQUAD_SIZE_MAX, TOTAL_ROUNDS } from '../constants/gameConstants';
import { GameState, Manager } from '../types';

const attachUserManager = (state: GameState, teamId = 't_1') => {
  const managerId = 'qa_manager';
  const team = state.teams[teamId];

  const manager: Manager = {
    id: managerId,
    name: 'QA Manager',
    district: team.district,
    reputation: 50,
    attributes: {
      evolution: 50,
      negotiation: 50,
      scout: 50
    },
    career: {
      titlesWon: 0,
      totalLeagueTitles: 0,
      totalCupTitles: 0,
      hallOfFameEntries: 0,
      consecutiveTitles: 0,
      currentTeamId: teamId,
      historyTeamIds: []
    },
    achievements: []
  };

  state.managers[managerId] = manager;
  state.teams[teamId].managerId = managerId;
  state.userManagerId = managerId;
  state.userTeamId = teamId;
  state.isCreator = true;
  state.world.status = 'LOBBY';
  state.world.currentDay = 0;
};

const runCompleteSeason = (state: GameState) => {
  let nextState = state;
  for (let day = 0; day < SEASON_DAYS; day += 1) {
    nextState = advanceGameDay(nextState);
  }
  nextState = advanceGameDay(nextState);
  expect(nextState.world.phase).toBe('OFFSEASON');
  return nextState;
};

describe('full season QA flow', () => {
  it('runs draft, league, Elite Cup, District Cup, offseason and next season without dead state', () => {
    let state = generateInitialState();
    attachUserManager(state);

    for (let day = 0; day < SEASON_DAYS; day += 1) {
      state = advanceGameDay(state);
    }

    const clubTeams = Object.values(state.teams).filter(team => team.id.startsWith('t_'));
    expect(clubTeams.length).toBe(32);
    expect(clubTeams.every(team => team.squad.length === SQUAD_SIZE_MAX)).toBe(true);

    Object.values(state.world.leagues).forEach(league => {
      expect(league.standings).toHaveLength(8);
      expect(league.matches.every(match => match.played)).toBe(true);
      expect(league.standings.every(row => row.played === 14)).toBe(true);
    });

    expect(state.world.currentRound).toBe(TOTAL_ROUNDS);
    expect(state.world.eliteCup.winnerId).toBeTruthy();
    expect(state.world.eliteCup.bracket.final?.played).toBe(true);
    expect(state.teams[state.world.eliteCup.winnerId!].titles?.cup).toBeGreaterThanOrEqual(1);
    expect(state.world.districtCup.teams).toEqual(['d_norte', 'd_sul', 'd_leste', 'd_oeste']);
    expect(state.world.districtCup.winnerId).toBeTruthy();
    expect(state.world.districtCup.final?.played).toBe(true);
    expect(state.teams[state.world.districtCup.winnerId!].titles?.cup).toBeGreaterThanOrEqual(1);

    const leagueChampions = Object.values(state.world.leagues).map(league => [...league.standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    })[0].teamId);
    expect(leagueChampions.every(teamId => (state.teams[teamId].titles?.league || 0) >= 1)).toBe(true);
    expect(Object.values(state.players).some(player => player.achievements.some(achievement => achievement.title.includes('Artilheiro')))).toBe(true);

    state = advanceGameDay(state);
    expect(state.world.phase).toBe('OFFSEASON');

    const nextState = startNewSeason(state);
    expect(nextState.world.history[0].season).toBe(state.world.currentSeason || 2050);
    expect(nextState.world.news[0].title).toBe('TEMPORADA ENCERRADA');
    expect(nextState.world.news[0].action).toEqual({
      kind: 'SEASON_REPORT',
      season: state.world.currentSeason || 2050
    });
    expect(nextState.world.currentSeason).toBe((state.world.currentSeason || 2050) + 1);
    expect(nextState.world.status).toBe('LOBBY');
    expect(nextState.world.currentDay).toBe(0);
    expect(nextState.world.currentRound).toBe(1);
    expect(nextState.world.eliteCup.winnerId).toBeNull();
    expect(nextState.world.districtCup.winnerId).toBeNull();
    expect(nextState.world.offseasonDecision).toBeUndefined();
  });

  it('keeps a multi-season world playable without rating inflation or dead news actions', () => {
    let state = generateInitialState();
    attachUserManager(state);

    const initialAverageRating = Math.round(
      Object.values(state.players).reduce((sum, player) => sum + player.totalRating, 0) / Object.values(state.players).length
    );

    for (let seasonIndex = 0; seasonIndex < 3; seasonIndex += 1) {
      state = runCompleteSeason(state);

      Object.values(state.players).forEach(player => {
        expect(player.totalRating).toBeGreaterThanOrEqual(0);
        expect(player.totalRating).toBeLessThanOrEqual(1000);
      });

      Object.values(state.teams)
        .filter(team => team.id.startsWith('t_'))
        .forEach(team => {
          expect(team.squad.length).toBe(SQUAD_SIZE_MAX);
          expect(team.squad.every(playerId => !!state.players[playerId])).toBe(true);
        });

      const endedState = state;
      state = startNewSeason(state);

      expect(state.world.history[0].season).toBe(endedState.world.currentSeason || 2050);
      expect(state.world.news[0].action).toEqual({
        kind: 'SEASON_REPORT',
        season: endedState.world.currentSeason || 2050
      });
      expect(state.world.news.some(item => item.action?.kind === 'TEAM_PROFILE' && item.action.teamId && !!state.teams[item.action.teamId])).toBe(true);
    }

    expect(state.world.history).toHaveLength(3);
    expect(state.world.currentSeason).toBe(2053);

    const finalAverageRating = Math.round(
      Object.values(state.players).reduce((sum, player) => sum + player.totalRating, 0) / Object.values(state.players).length
    );

    expect(finalAverageRating).toBeLessThanOrEqual(initialAverageRating + 90);
    expect(state.world.history.every(report => Object.keys(report.finalStandings).length === 4)).toBe(true);
  }, 30000);
});
