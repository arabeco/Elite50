import { Player, Team, MatchResult, GameState, TransferProposal } from '../types';
import { newsHeadlines } from './newsService';
import { applyBootProgressionBonus } from '../utils/store';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calculatePostMatchProgression = (player: Player, matchRating: number, state?: GameState): number => {
    let delta = 0;

    // Short seasons need progress that feels real without melting roster identity.
    if (matchRating >= 8.8) {
        delta = Math.floor(Math.random() * 2) + 2; // +2, +3
    } else if (matchRating >= 7.6) {
        delta = 2;
    } else if (matchRating >= 6.6) {
        delta = 1;
    } else if (matchRating >= 5.1) {
        delta = 0;
    } else if (matchRating >= 4.4) {
        delta = -1;
    } else {
        delta = -(Math.floor(Math.random() * 2) + 1); // -1, -2
    }

    // Form still matters, but less explosively.
    const phaseFactor = 0.9 + (player.currentPhase / 10) * 0.2;
    delta = Math.round(delta * phaseFactor);

    // Elite players should move more slowly unless they are special.
    const isGenius = player.badges.slot1 === 'Gênio' || player.badges.slot2 === 'Gênio' || player.badges.slot3 === 'Gênio' || player.badges.slot4 === 'Gênio';
    if (player.totalRating >= 800 && !isGenius) {
        delta *= delta > 0 ? 0.8 : 0.45;
    }

    // A merely average game should not erode an established elite player.
    // They still fall when performances are genuinely poor.
    if (player.totalRating >= 900 && matchRating >= 5.0 && delta < 0) {
        delta = 0;
    }

    delta = Math.round(delta);

    // Active legacy training slows overall evolution slightly while occupied.
    if (player.badges.trainingSlot4) {
        delta *= 0.8;
    }

    delta = Math.round(delta);

    delta = applyBootProgressionBonus(state, player.id, delta);

    // Preserve identity over one short season.
    const currentSeasonDelta = player.history.seasonRatingDelta || 0;
    if (currentSeasonDelta + delta > 55) delta = 55 - currentSeasonDelta;
    if (currentSeasonDelta + delta < -24) delta = -24 - currentSeasonDelta;

    return delta;
};

export const calculateTradeAcceptanceChance = (offeredPlayer: Player, requestedPlayer: Player): number => {
    const diff = offeredPlayer.totalRating - requestedPlayer.totalRating;

    if (diff >= 0) {
        return clamp(0.75 + Math.min(diff, 200) / 1000, 0.75, 0.95);
    }

    return clamp(0.35 + diff / 250, 0.02, 0.35);
};

/**
 * Updates player satisfaction based on match performance, team success and playtime.
 */
export const calculateSatisfactionUpdate = (
    player: Player,
    matchRating: number | null,
    teamWon: boolean,
    isTitular: boolean
): number => {
    let change = 0;

    if (matchRating !== null) {
        if (matchRating > 7.0) change += Math.floor(Math.random() * 5) + 3;
        else if (matchRating < 5.0) change -= 2;
    }

    if (teamWon) change += 3;

    if (isTitular) {
        player.history.benchGamesCount = 0;
        if (player.satisfaction < 75) change += 2;
    } else {
        player.history.benchGamesCount = (player.history.benchGamesCount || 0) + 1;
        if (player.history.benchGamesCount >= 4) {
            change -= 2;
        }
    }

    const newSatisfaction = Math.min(100, Math.max(0, player.satisfaction + change));
    return newSatisfaction;
};

export const calculateAttractiveness = (
    player: Player,
    team: Team,
    teammates: Player[],
    teamPosition: number
): number => {
    let score = 40;

    const isHighTier = player.totalRating >= 800;
    const isEliteTeam = (team.powerCap || 0) >= 10000;

    if (isHighTier) {
        if (isEliteTeam) score += 15;
        else score -= 30;
    }

    const sameRolePlayers = teammates.filter(p => p.role === player.role);
    const betterPlayers = sameRolePlayers.filter(p => p.totalRating > player.totalRating).length;

    if (betterPlayers === 0) {
        score += 35;
        if (!isEliteTeam && isHighTier) score += 5;
    } else if (betterPlayers >= 1) {
        score -= 25;
    }

    if (teamPosition <= 4) score += 20;
    else if (teamPosition >= 12) score -= 15;

    const chemistryBonus = (team.chemistry || 50) / 10;
    score += chemistryBonus;

    const chaos = Math.floor(Math.random() * 10);
    score += chaos;

    return clamp(score, 0, 100);
};

/**
 * Night Market Logic: Process proposals and expand powerCap on Profit.
 */
export const processNightMarket = (
    state: GameState,
    proposals: TransferProposal[],
    teams: Record<string, Team>,
    players: Record<string, Player>
) => {
    const notifications: any[] = [];
    const remainingProposals = [...proposals];
    const proposalsByPlayer = remainingProposals
        .filter(prop => prop.status === 'PENDING')
        .reduce<Record<string, TransferProposal[]>>((acc, prop) => {
            acc[prop.playerId] = acc[prop.playerId] || [];
            acc[prop.playerId].push(prop);
            return acc;
        }, {});

    const declineProposal = (prop: TransferProposal, message?: string) => {
        prop.status = 'DECLINED';
        const player = players[prop.playerId];
        const toTeam = teams[prop.toTeamId];
        if (message && player && toTeam) {
            notifications.push({
                id: `refuse_${Date.now()}_${prop.id}`,
                title: 'Proposta Recusada',
                message,
                type: 'transfer'
            });
        }
    };

    Object.entries(proposalsByPlayer).forEach(([playerId, playerProposals]) => {
        const player = players[playerId];
        if (!player) {
            playerProposals.forEach(prop => declineProposal(prop));
            return;
        }

        if (player.satisfaction >= 80) {
            playerProposals.forEach(prop => {
                const toTeam = teams[prop.toTeamId];
                declineProposal(prop, toTeam ? `${player.nickname} est? feliz no clube e recusou a proposta do ${toTeam.name}.` : undefined);
            });
            return;
        }

        const valid = playerProposals
            .map(prop => {
                const toTeam = teams[prop.toTeamId];
                if (!toTeam) return null;

                const currentPower = toTeam.squad.reduce((sum, id) => sum + (players[id]?.totalRating || 0), 0);
                if (currentPower + player.totalRating > (toTeam.powerCap || 9000)) return null;

                const teammates = toTeam.squad.map(id => players[id]).filter(p => !!p);
                const mockPosition = toTeam.powerCap && toTeam.powerCap > 10000 ? 2 : 10;
                const attrScore = calculateAttractiveness(player, toTeam, teammates, mockPosition);
                const tieBreaker = Math.abs(`${prop.id}:${playerId}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 17;
                const valueBonus = Math.min(12, Math.max(0, (prop.value - player.totalRating) / 20));
                const score = attrScore + valueBonus + tieBreaker / 10;

                return { prop, toTeam, score, attrScore };
            })
            .filter((item): item is { prop: TransferProposal; toTeam: Team; score: number; attrScore: number } => Boolean(item))
            .sort((a, b) => b.score - a.score);

        const winner = valid[0];
        if (!winner || winner.attrScore <= 65) {
            playerProposals.forEach(prop => declineProposal(prop));
            return;
        }

        const winningProp = winner.prop;
        const toTeam = winner.toTeam;
        const fromTeam = winningProp.fromTeamId ? teams[winningProp.fromTeamId] : null;

        winningProp.status = 'ACCEPTED';
        newsHeadlines.transfer(state, player, toTeam, winningProp.value || player.totalRating);

        if (fromTeam) {
            fromTeam.squad = fromTeam.squad.filter(id => id !== player.id);
        }
        toTeam.squad.push(player.id);
        player.contract.teamId = toTeam.id;
        player.satisfaction = 100;
        player.history.clubEvents = [
            {
                season: state.world.currentSeason || 2050,
                date: state.world.currentDate,
                type: 'TRANSFERRED' as const,
                fromTeamId: fromTeam?.id || null,
                fromTeamName: fromTeam?.name,
                toTeamId: toTeam.id,
                toTeamName: toTeam.name,
                value: winningProp.value || player.totalRating,
                note: `Transferencia por ${winningProp.value || 0} gold`,
            },
            ...(player.history.clubEvents || []),
        ].slice(0, 12);

        notifications.push({
            id: `accept_${Date.now()}_${player.id}`,
            title: 'Transfer?ncia Conclu?da',
            message: `${player.nickname} assinou com o ${toTeam.name}!`,
            type: 'transfer'
        });

        playerProposals
            .filter(prop => prop.id !== winningProp.id)
            .forEach(prop => declineProposal(prop));
    });

    return { notifications, proposals: remainingProposals };
};

