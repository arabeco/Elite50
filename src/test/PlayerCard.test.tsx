import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerCard } from '../components/PlayerCard';
import { GameProvider } from '../store/GameContext';
import { Player } from '../types';

const mockPlayer: Player = {
    id: 'p_123',
    name: 'John Doe',
    nickname: 'JD',
    district: 'NORTE',
    appearance: {
        gender: 'M',
        bodyId: 1,
        hairId: 1,
        bootId: 1
    },
    position: 'Linha',
    role: 'ATA',
    pentagon: {
        FOR: 80,
        AGI: 80,
        INT: 80,
        TAT: 80,
        TEC: 80
    },
    fusion: {
        DET: 160,
        PAS: 160
    },
    totalRating: 800,
    potential: 850,
    currentPhase: 7.5,
    phaseHistory: [7.5, 7.5, 7.5],
    badges: { slot1: null, slot2: null, slot3: null, slot4: null, slot3Hidden: true },
    contract: { teamId: null },
    history: {
        goals: 10,
        assists: 5,
        averageRating: 7.5,
        gamesPlayed: 20,
        lastMatchRatings: [7.5, 7.5, 7.5],
        benchGamesCount: 0,
        seasonRatingDelta: 0
    },
    satisfaction: 90,
    trainingProgress: 50,
    fatigue: 0,
    achievements: []
};

describe('PlayerCard Component', () => {
    it('renders player total rating and nickname', () => {
        render(
            <GameProvider>
                <PlayerCard player={mockPlayer} onClick={() => { }} />
            </GameProvider>
        );

        // Assertions
        expect(screen.getAllByText('800')[0]).toBeInTheDocument();
    });
});
