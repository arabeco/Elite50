import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('world clock participant persistence', () => {
  it('returns accepted market roster changes to every participant row', () => {
    const source = readFileSync(
      join(process.cwd(), 'supabase/functions/world-clock-runner/index.ts'),
      'utf8'
    );

    expect(source).toContain('teams_data: participantTeamId && participantTeam');
    expect(source).toContain('players_data: participantPlayers');
    expect(source).toContain('managers_data: participantManagers');
    expect(source).toContain('updated_at: now.toISOString()');
  });
});
