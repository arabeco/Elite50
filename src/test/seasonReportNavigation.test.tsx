import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SeasonReportModal } from '../components/SeasonReportModal';
import { SeasonReport } from '../types';

const makeReport = (season: number): SeasonReport => ({
  season,
  finalStandings: {},
  reallocatedTeams: [],
  profitWinner: { teamId: '', capGain: 0 },
  mvpRating: { playerId: '', ratingGain: 0 },
  eliteCupWinnerId: null,
  districtCupWinnerId: null,
});

describe('SeasonReportModal navigation', () => {
  it('opens the previous archived season from the arrow', async () => {
    const user = userEvent.setup();
    const reports = [makeReport(2052), makeReport(2051)];
    const onSelectSeason = vi.fn();

    render(
      <SeasonReportModal
        report={reports[0]}
        reports={reports}
        teams={{}}
        players={{}}
        managers={{}}
        onClose={vi.fn()}
        onSelectSeason={onSelectSeason}
      />
    );

    await user.click(screen.getByRole('button', { name: /Temporada anterior/i }));
    expect(onSelectSeason).toHaveBeenCalledWith(2051);
  });
});
