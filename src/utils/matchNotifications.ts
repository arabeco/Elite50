import { Capacitor } from '@capacitor/core';
import { DEFAULT_TIME_SPEED } from '../constants/gameConstants';

const LAST_MATCH_NOTIFICATION_ID_KEY = 'elite.matchNotification.lastId';
const LAST_MATCH_NOTIFICATION_KEY_KEY = 'elite.matchNotification.lastKey';
const REMINDER_GAME_MS = 2 * 60 * 60 * 1000;

const hashNotificationId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash % 1000000000) + 1000;
};

const loadLastNotificationId = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(LAST_MATCH_NOTIFICATION_ID_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export const requestMatchNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform()) return { granted: false, reason: 'native_only' as const };

  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return { granted: true as const };

  const requested = await LocalNotifications.requestPermissions();
  return { granted: requested.display === 'granted' };
};

export const cancelScheduledMatchNotification = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const previousId = loadLastNotificationId();
  if (!previousId) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: previousId }] });
  } catch {
    // Notification cleanup is best-effort.
  }
};

export const scheduleUpcomingMatchNotification = async (options: {
  matchId: string;
  matchDate: string;
  userTeamName: string;
  opponentName: string;
  isHome: boolean;
  currentWorldDate: string;
  timeSpeed?: number | null;
}) => {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'native_only' as const };

  const matchDate = new Date(options.matchDate);
  const currentWorldDate = new Date(options.currentWorldDate);
  const matchMs = matchDate.getTime();
  const currentWorldMs = currentWorldDate.getTime();
  if (!Number.isFinite(matchMs) || !Number.isFinite(currentWorldMs) || matchMs <= currentWorldMs) {
    return { ok: false, reason: 'invalid_or_past_match' as const };
  }

  const speed = options.timeSpeed || DEFAULT_TIME_SPEED;
  const scheduleGameDeltaMs = Math.max(0, matchMs - currentWorldMs - REMINDER_GAME_MS);
  const scheduleRealDelayMs = Math.max(5000, scheduleGameDeltaMs / (speed * 60));
  const scheduleAt = new Date(Date.now() + scheduleRealDelayMs);
  const notificationKey = `${options.matchId}:${Math.round(scheduleAt.getTime() / 60000)}`;

  if (typeof window !== 'undefined' && window.localStorage.getItem(LAST_MATCH_NOTIFICATION_KEY_KEY) === notificationKey) {
    return { ok: true, reason: 'already_scheduled' as const };
  }

  const permission = await requestMatchNotificationPermission();
  if (!permission.granted) return { ok: false, reason: 'permission_denied' as const };

  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const previousId = loadLastNotificationId();
  const nextId = hashNotificationId(`match:${options.matchId}`);

  if (previousId && previousId !== nextId) {
    await LocalNotifications.cancel({ notifications: [{ id: previousId }] }).catch(() => undefined);
  }

  await LocalNotifications.schedule({
    notifications: [{
      id: nextId,
      title: 'Jogo chegando',
      body: `${options.userTeamName} ${options.isHome ? 'recebe' : 'visita'} ${options.opponentName}. Revise elenco e tatica.`,
      schedule: { at: scheduleAt, allowWhileIdle: true },
      sound: 'default',
    }],
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_MATCH_NOTIFICATION_ID_KEY, String(nextId));
    window.localStorage.setItem(LAST_MATCH_NOTIFICATION_KEY_KEY, notificationKey);
  }

  return { ok: true, scheduledAt: scheduleAt };
};
