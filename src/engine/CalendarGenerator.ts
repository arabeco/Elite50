import { Match, Team } from '../types';

/**
 * Generates a single round-robin calendar for the given teams.
 * Teams play each other once.
 * Total rounds = (N-1)
 *
 * @param teams - Array of teams in the league
 * @param leagueId - Unique identifier for the league
 * @param seasonStartDate - ISO date string for when the season starts (e.g. '2050-02-28T00:00:00.000Z')
 */
export const generateCalendar = (teams: Team[], leagueId: string, seasonStartDate?: string): Match[] => {
  const matches: Match[] = [];
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const matchesPerRound = n / 2;
  const roundsPerHalf = n - 1;

  // Use provided season start or default to tomorrow in 2050
  const baseDate = seasonStartDate
    ? new Date(seasonStartDate)
    : (() => {
      const now = new Date();
      const d = new Date(2050, now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      return d;
    })();

  // Rotation teams for next round
  let rotation = [...teamIds];

  for (let roundNum = 1; roundNum <= roundsPerHalf; roundNum++) {
    // Each round happens every 2 days
    // Round 1 = seasonStart + 2 days (Day 3 of season)
    const roundDate = new Date(baseDate);
    roundDate.setDate(roundDate.getDate() + (roundNum * 2));
    const dateStr = roundDate.toISOString().split('T')[0];

    for (let i = 0; i < matchesPerRound; i++) {
      const home = roundNum % 2 === 0 ? rotation[n - 1 - i] : rotation[i];
      const away = roundNum % 2 === 0 ? rotation[i] : rotation[n - 1 - i];

      // Distribute times: 16:00, 18:00, 20:00
      const hours = [16, 18, 20];
      const timeStr = `${hours[i % hours.length]}:00`;

      matches.push({
        id: `m_${leagueId}_r${roundNum}_${i}`,
        homeTeamId: home,
        awayTeamId: away,
        date: dateStr,
        time: timeStr,
        status: 'SCHEDULED',
        result: null,
        round: roundNum
      });
    }

    // Rotate teams for next round (keep first team fixed)
    const last = rotation.pop();
    if (last) {
      rotation.splice(1, 0, last);
    }
  }

  // Sort matches by date and time
  return matches.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time!.localeCompare(b.time!);
  });
};
