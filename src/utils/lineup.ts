import { Player, Team } from '../types';

export const FORMATION_SLOTS = [
  { id: 'ATA1', label: 'ATA', top: '20%', left: '20%' },
  { id: 'ATA2', label: 'ATA', top: '15%', left: '50%' },
  { id: 'ATA3', label: 'ATA', top: '20%', left: '80%' },
  { id: 'MEI1', label: 'MEI', top: '40%', left: '30%' },
  { id: 'MEI2', label: 'MEI', top: '40%', left: '70%' },
  { id: 'MEI3', label: 'MEI', top: '55%', left: '50%' },
  { id: 'ZAG1', label: 'ZAG', top: '65%', left: '15%' },
  { id: 'ZAG2', label: 'ZAG', top: '75%', left: '35%' },
  { id: 'ZAG3', label: 'ZAG', top: '75%', left: '65%' },
  { id: 'ZAG4', label: 'ZAG', top: '65%', left: '85%' },
  { id: 'GOL', label: 'GOL', top: '90%', left: '50%' },
] as const;

export const buildAutoLineup = (
  team: Team,
  players: Record<string, Player>,
  options?: { preserveExisting?: boolean }
) => {
  const preserveExisting = options?.preserveExisting ?? false;
  const usedPlayerIds = new Set<string>();
  const nextLineup: Record<string, string> = {};
  const squadPlayers = (team.squad || [])
    .map(playerId => players[playerId])
    .filter((player): player is Player => !!player)
    .sort((a, b) => b.totalRating - a.totalRating);

  if (preserveExisting) {
    FORMATION_SLOTS.forEach(slot => {
      const playerId = team.lineup?.[slot.id];
      const player = playerId ? players[playerId] : null;
      if (!player || usedPlayerIds.has(player.id) || !(team.squad || []).includes(player.id)) return;
      nextLineup[slot.id] = player.id;
      usedPlayerIds.add(player.id);
    });
  }

  FORMATION_SLOTS.forEach(slot => {
    if (nextLineup[slot.id]) return;
    const best = squadPlayers.find(player => player.role === slot.label && !usedPlayerIds.has(player.id));
    if (!best) return;
    nextLineup[slot.id] = best.id;
    usedPlayerIds.add(best.id);
  });

  FORMATION_SLOTS.forEach(slot => {
    if (nextLineup[slot.id]) return;
    const fallback = squadPlayers.find(player => !usedPlayerIds.has(player.id));
    if (!fallback) return;
    nextLineup[slot.id] = fallback.id;
    usedPlayerIds.add(fallback.id);
  });

  return nextLineup;
};

export const countLineupPlayers = (lineup?: Record<string, string>) =>
  Object.values(lineup || {}).filter(Boolean).length;
