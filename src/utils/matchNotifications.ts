import { Capacitor } from '@capacitor/core';
import { DEFAULT_TIME_SPEED } from '../constants/gameConstants';

const LAST_MATCH_NOTIFICATION_ID_KEY = 'elite.matchNotification.lastId';
const LAST_MATCH_NOTIFICATION_IDS_KEY = 'elite.matchNotification.lastIds';
const LAST_MATCH_NOTIFICATION_KEY_KEY = 'elite.matchNotification.lastKey';
const REMINDERS = [
  { key: '2h', label: '2h', gameMs: 2 * 60 * 60 * 1000 },
  { key: '15m', label: '15 min', gameMs: 15 * 60 * 1000 },
];

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

const loadLastNotificationIds = () => {
  if (typeof window === 'undefined') return [];
  const rawList = window.localStorage.getItem(LAST_MATCH_NOTIFICATION_IDS_KEY);
  if (rawList) {
    try {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        return parsed.map(Number).filter(Number.isFinite);
      }
    } catch {
      // Fall back to the legacy single id below.
    }
  }

  const legacyId = loadLastNotificationId();
  return legacyId ? [legacyId] : [];
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

  const previousIds = loadLastNotificationIds();
  if (!previousIds.length) return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: previousIds.map(id => ({ id })) });
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
  const scheduleItems = REMINDERS.map(reminder => {
    const scheduleGameDeltaMs = Math.max(0, matchMs - currentWorldMs - reminder.gameMs);
    const scheduleRealDelayMs = Math.max(5000, scheduleGameDeltaMs / (speed * 60));
    const scheduleAt = new Date(Date.now() + scheduleRealDelayMs);
    return {
      ...reminder,
      scheduleAt,
      id: hashNotificationId(`match:${options.matchId}:${reminder.key}`),
    };
  }).filter((item, index, items) =>
    index === 0 ||
    Math.abs(item.scheduleAt.getTime() - items[index - 1].scheduleAt.getTime()) > 60000
  );

  const notificationKey = `${options.matchId}:${scheduleItems.map(item => `${item.key}:${Math.round(item.scheduleAt.getTime() / 60000)}`).join('|')}`;

  if (typeof window !== 'undefined' && window.localStorage.getItem(LAST_MATCH_NOTIFICATION_KEY_KEY) === notificationKey) {
    return { ok: true, reason: 'already_scheduled' as const };
  }

  const permission = await requestMatchNotificationPermission();
  if (!permission.granted) return { ok: false, reason: 'permission_denied' as const };

  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const previousIds = loadLastNotificationIds();
  const nextIds = scheduleItems.map(item => item.id);
  const idsToCancel = previousIds.filter(id => !nextIds.includes(id));

  if (idsToCancel.length) {
    await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) }).catch(() => undefined);
  }

  await LocalNotifications.schedule({
    notifications: scheduleItems.map(item => ({
      id: item.id,
      title: 'Jogo chegando',
      body: `${item.label}: ${options.userTeamName} ${options.isHome ? 'recebe' : 'visita'} ${options.opponentName}. Revise elenco e tatica.`,
      schedule: { at: item.scheduleAt, allowWhileIdle: true },
      sound: 'default',
    })),
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LAST_MATCH_NOTIFICATION_ID_KEY, String(nextIds[0] || ''));
    window.localStorage.setItem(LAST_MATCH_NOTIFICATION_IDS_KEY, JSON.stringify(nextIds));
    window.localStorage.setItem(LAST_MATCH_NOTIFICATION_KEY_KEY, notificationKey);
  }

  return { ok: true, scheduledAt: scheduleItems[0]?.scheduleAt, scheduledCount: scheduleItems.length };
};
