import { useEffect, useRef } from 'react';
import { GameState, Team } from '../types';
import { cancelScheduledMatchNotification, scheduleUpcomingMatchNotification } from '../utils/matchNotifications';
import { isMatchNotificationsEnabled } from '../utils/uiFeedback';

export const useMatchNotifications = (
  state: GameState,
  userTeam: Team | null,
  upcomingMatches: Array<{
    id: string;
    date: string;
    homeId?: string;
    awayId?: string;
    homeTeamId?: string;
    awayTeamId?: string;
    home?: string;
    away?: string;
  }>
) => {
  const lastScheduleKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isMatchNotificationsEnabled()) {
      if (lastScheduleKeyRef.current !== 'disabled') {
        lastScheduleKeyRef.current = 'disabled';
        cancelScheduledMatchNotification();
      }
      return;
    }

    if (!userTeam || !upcomingMatches.length || state.world.status === 'LOBBY') {
      if (lastScheduleKeyRef.current !== 'empty') {
        lastScheduleKeyRef.current = 'empty';
        cancelScheduledMatchNotification();
      }
      return;
    }

    const nextMatch = [...upcomingMatches]
      .filter(match => new Date(match.date).getTime() > new Date(state.world.currentDate).getTime())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (!nextMatch) {
      if (lastScheduleKeyRef.current !== 'no-next-match') {
        lastScheduleKeyRef.current = 'no-next-match';
        cancelScheduledMatchNotification();
      }
      return;
    }

    const homeId = nextMatch.homeTeamId || nextMatch.homeId;
    const awayId = nextMatch.awayTeamId || nextMatch.awayId;
    const isHome = homeId === userTeam.id;
    const opponentId = isHome ? awayId : homeId;
    const opponent = opponentId ? state.teams[opponentId] : null;
    const opponentName = opponent?.name || (isHome ? nextMatch.away : nextMatch.home) || 'adversario';
    const scheduleKey = `${nextMatch.id}:${state.world.clock?.timeSpeed || 'real'}`;
    if (lastScheduleKeyRef.current === scheduleKey) return;
    lastScheduleKeyRef.current = scheduleKey;

    scheduleUpcomingMatchNotification({
      matchId: nextMatch.id,
      matchDate: nextMatch.date,
      userTeamName: userTeam.name,
      opponentName,
      isHome,
      currentWorldDate: state.world.currentDate,
      timeSpeed: state.world.clock?.timeSpeed,
    }).catch(error => {
      console.warn('useMatchNotifications: failed to schedule match notification', error);
    });
  }, [
    state.teams,
    state.world.clock?.timeSpeed,
    state.world.currentDate,
    state.world.status,
    upcomingMatches,
    userTeam,
  ]);
};
