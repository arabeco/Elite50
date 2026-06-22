export const getNextRealMidnight = (base = new Date()) => {
  const next = new Date(base);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const getNextGameMidnight = (currentDate?: string | null) => {
  const base = currentDate ? new Date(currentDate) : new Date();
  const next = Number.isFinite(base.getTime()) ? new Date(base) : new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next;
};

export const isLegacyGameSchedule = (scheduledAt?: string | null) => {
  if (!scheduledAt) return false;
  const scheduled = new Date(scheduledAt);
  if (!Number.isFinite(scheduled.getTime())) return false;
  return scheduled.getUTCFullYear() >= 2040;
};

export const isKickoffDue = (scheduledAt?: string | null, now = new Date()) => {
  if (!scheduledAt) return false;
  const scheduled = new Date(scheduledAt);
  if (!Number.isFinite(scheduled.getTime())) return false;
  if (isLegacyGameSchedule(scheduledAt)) return true;
  return now.getTime() >= scheduled.getTime();
};
