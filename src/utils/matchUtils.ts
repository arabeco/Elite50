import { Match, MatchStatus } from '../types';
import { MATCH_REAL_TIME_SECONDS } from '../constants/gameConstants';

export interface NextMatchResult {
  match: Match;
  status: MatchStatus;
  phase: 'before' | 'live' | 'after';
  startDateTime: Date;
  endDateTime: Date;
  msUntilStart: number;
  msSinceEnd: number;
}

export const getMatchDateTime = (match: Match): Date => {
  const safeTime = match.time || '16:00';
  return new Date(`${match.date.split('T')[0]}T${safeTime}:00`);
};

export const getMatchEndDateTime = (match: Match): Date => {
  return new Date(getMatchDateTime(match).getTime() + (MATCH_REAL_TIME_SECONDS * 1000));
};

export const getCountdown = (ms: number): string => {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');

  return days > 0 ? `${days}d ${clock}` : clock;
};

export const getNextMatch = (matches: Match[], currentDate: string): NextMatchResult | null => {
  if (!matches.length) return null;

  const now = new Date(currentDate);
  const normalized = matches
    .filter(match => !!match && !!match.date)
    .map((match) => {
      const safeMatch = {
        ...match,
        time: match.time || '16:00',
      };
      const startDateTime = getMatchDateTime(safeMatch);
      const endDateTime = getMatchEndDateTime(safeMatch);
      const status = getMatchStatus(safeMatch, currentDate);

      return {
        match: safeMatch,
        status,
        startDateTime,
        endDateTime,
      };
    })
    .sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());

  const liveMatch = normalized.find(entry => entry.status === 'PLAYING');
  if (liveMatch) {
    return {
      ...liveMatch,
      phase: 'live',
      msUntilStart: Math.max(0, liveMatch.startDateTime.getTime() - now.getTime()),
      msSinceEnd: Math.max(0, now.getTime() - liveMatch.endDateTime.getTime()),
    };
  }

  const upcomingMatch = normalized.find(entry => entry.startDateTime.getTime() > now.getTime());
  if (upcomingMatch) {
    return {
      ...upcomingMatch,
      phase: 'before',
      msUntilStart: Math.max(0, upcomingMatch.startDateTime.getTime() - now.getTime()),
      msSinceEnd: 0,
    };
  }

  const recentMatch = [...normalized]
    .reverse()
    .find(entry => entry.endDateTime.getTime() <= now.getTime());

  if (!recentMatch) return null;

  return {
    ...recentMatch,
    phase: 'after',
    msUntilStart: 0,
    msSinceEnd: Math.max(0, now.getTime() - recentMatch.endDateTime.getTime()),
  };
};

/**
 * Checks if a match should be in 'LOCKED' status based on current game time.
 * A match is locked 1 hour (60 minutes) before its scheduled time.
 */
export const getMatchStatus = (match: Match, currentDate: string): MatchStatus => {
  if (match.status === 'FINISHED') {
    return 'FINISHED';
  }

  // Ensure match has date and time properties before processing
  if (!match || !match.date || !match.time) {
    console.warn(`Match ${match?.id || 'unknown'} is missing date or time properties`);
    return match?.status || 'SCHEDULED';
  }

  const matchDateTime = getMatchDateTime(match);
  const currentGameDateTime = new Date(currentDate);
  
  const diffInMs = matchDateTime.getTime() - currentGameDateTime.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);

  // Match duration in game minutes
  // With 1:1 time scale (1 real sec = 1 game sec), the match lasts 6 real minutes.
  // So it lasts 6 game minutes.
  // MATCH_REAL_TIME_SECONDS = 360.
  const matchDurationMinutes = MATCH_REAL_TIME_SECONDS / 60;

  if (diffInMinutes <= 0) {
    // If it's past the time + duration, it's finished
    if (diffInMinutes <= -matchDurationMinutes) {
      return 'FINISHED';
    }
    return 'PLAYING';
  }

  if (diffInMinutes <= 60) {
    return 'LOCKED';
  }

  return 'SCHEDULED';
};

/**
 * Checks if a match is currently in the "LIVE" window.
 */
export const isMatchLive = (match: Match, currentDate: string): boolean => {
  if (!match || !match.date || !match.time) return false;
  const matchDateTime = getMatchDateTime(match);
  const currentGameDateTime = new Date(currentDate);
  
  const diffInMs = currentGameDateTime.getTime() - matchDateTime.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);

  return diffInMinutes >= 0 && diffInMinutes < MATCH_REAL_TIME_SECONDS;
};

/**
 * Calculates the current progress (0-360) for a live match.
 * Maps 1:1 from game minutes to VOD seconds.
 */
export const getLiveMatchSecond = (match: Match, currentDate: string): number => {
  if (!match || !match.date || !match.time) return 0;
  const matchDateTime = getMatchDateTime(match);
  const currentGameDateTime = new Date(currentDate);
  
  const diffInMs = currentGameDateTime.getTime() - matchDateTime.getTime();
  const diffInSeconds = diffInMs / 1000;

  return Math.max(0, Math.min(MATCH_REAL_TIME_SECONDS, Math.floor(diffInSeconds)));
};
