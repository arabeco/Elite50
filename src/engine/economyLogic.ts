import { Player, Team, MatchResult, GameState } from '../types';
import { newsHeadlines } from './newsService';
import { applyBootProgressionBonus } from '../utils/store';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calculatePostMatchProgression = (player: Player, matchRating: number, state?: GameState): number => {
    let delta = 0;

    // Short seasons need progress that feels real without melting roster identity.
    if (matchRating >= 9.0) {
        delta = Math.floor(Math.random() * 2) + 2; // +2, +3
    } else if (matchRating >= 8.0) {
        delta = Math.floor(Math.random() * 2) + 1; // +1, +2
    } else if (matchRating >= 7.2) {
        delta = 1;
    } else if (matchRating >= 5.3) {
        delta = 0;
    } else if (matchRating >= 4.5) {
        delta = -1;
    } else {
        delta = -(Math.floor(Math.random() * 2) + 1); // -1, -2
    }

    // Form still matters, but less explosively.
    const phaseFactor = 0.9 + (player.currentPhase / 10) * 0.2;
    delta = Math.round(delta * phaseFactor);

    // Elite players should move more slowly unless they are special.
    const isGenius = player.badges.slot1 === 'GÃƒÂªnio' || player.badges.slot2 === 'GÃƒÂªnio' || player.badges.slot3 === 'GÃƒÂªnio' || player.badges.slot4 === 'GÃƒÂªnio';
    if (player.totalRating >= 800 && !isGenius) {
        delta *= 0.7;
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
    if (currentSeasonDelta + delta > 45) delta = 45 - currentSeasonDelta;
    if (currentSeasonDelta + delta < -35) delta = -35 - currentSeasonDelta;

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
    proposals: any[],
    teams: Record<string, Team>,
    players: Record<string, Player>
) => {
    const notifications: any[] = [];
    const remainingProposals = [...proposals];

    for (let i = remainingProposals.length - 1; i >= 0; i--) {
        const prop = remainingProposals[i];
        const player = players[prop.playerId];
        const toTeam = teams[prop.toTeamId];
        const fromTeam = prop.fromTeamId ? teams[prop.fromTeamId] : null;

        if (!player || !toTeam) continue;

        if (player.satisfaction >= 80) {
            prop.status = 'DECLINED';
            notifications.push({
                id: `refuse_${Date.now()}_${player.id}`,
                title: 'Proposta Recusada',
                message: `${player.nickname} está feliz no clube e recusou a proposta do ${toTeam.name}.`,
                type: 'transfer'
            });
            continue;
        }

        const currentPower = toTeam.squad.reduce((sum, id) => sum + (players[id]?.totalRating || 0), 0);
        if (currentPower + player.totalRating > (toTeam.powerCap || 9000)) {
            prop.status = 'DECLINED';
            continue;
        }

        const teammates = toTeam.squad.map(id => players[id]).filter(p => !!p);
        const mockPosition = toTeam.powerCap && toTeam.powerCap > 10000 ? 2 : 10;
        const attrScore = calculateAttractiveness(player, toTeam, teammates, mockPosition);

        if (attrScore > 65) {
            prop.status = 'ACCEPTED';
            newsHeadlines.transfer(state, player, toTeam);

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
                    note: `Transferencia por ${prop.value || 0} gold`,
                },
                ...(player.history.clubEvents || []),
            ].slice(0, 12);

            notifications.push({
                id: `accept_${Date.now()}_${player.id}`,
                title: 'Transferência Concluída',
                message: `${player.nickname} assinou com o ${toTeam.name}!`,
                type: 'transfer'
            });
        } else {
            prop.status = 'DECLINED';
        }
    }

    return { notifications, proposals: remainingProposals };
};

