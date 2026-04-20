import { Player, Team, MatchResult, GameState } from '../types';
import { newsHeadlines } from './newsService';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calculatePostMatchProgression = (player: Player, matchRating: number): number => {
    let delta = 0;

    // Anime Style point ranges (More aggressive gains)
    if (matchRating >= 9.0) {
        delta = Math.floor(Math.random() * 3) + 4; // +4, +5, +6
    } else if (matchRating >= 7.8) {
        delta = Math.floor(Math.random() * 2) + 2; // +2, +3
    } else if (matchRating >= 6.5) {
        delta = 1; // Basic duty done
    } else if (matchRating >= 5.5) {
        delta = 0; // Average, no change
    } else if (matchRating < 5.0) {
        delta = -(Math.floor(Math.random() * 2) + 1); // -1, -2 (Softer loss)
    }

    // Phase/Moral multiplier (0.8x to 1.2x)
    const phaseFactor = 0.8 + (player.currentPhase / 10) * 0.4;
    delta = Math.round(delta * phaseFactor);

    // DNA Gênio: No reduction after 800 (Implicitly handles the 0.5x cap elsewhere if we add it)
    const isGenius = player.badges.slot1 === 'Gênio' || player.badges.slot2 === 'Gênio' || player.badges.slot3 === 'Gênio' || player.badges.slot4 === 'Gênio';
    if (player.totalRating >= 800 && !isGenius) {
        delta *= 0.5; // Apply the 0.5x penalty for non-geniuses
    }

    delta = Math.round(delta);

    // DNA Training Slot 4 Penalty: -30% evolution during training
    if (player.badges.trainingSlot4) {
        delta *= 0.7;
    }

    delta = Math.round(delta);

    // Season Limit Check (+/- 90)
    const currentSeasonDelta = player.history.seasonRatingDelta || 0;
    if (currentSeasonDelta + delta > 90) delta = 90 - currentSeasonDelta;
    if (currentSeasonDelta + delta < -90) delta = -90 - currentSeasonDelta;

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

    // 1. Performance Pessoal (More rewarding)
    if (matchRating !== null) {
        if (matchRating > 7.0) change += Math.floor(Math.random() * 5) + 3; // +3% to +7%
        else if (matchRating < 5.0) change -= 2;
    }

    // 2. Sucesso do Time
    if (teamWon) change += 3;

    // 3. Protagonismo (Bench logic - Softer)
    if (isTitular) {
        player.history.benchGamesCount = 0;
        if (player.satisfaction < 75) change += 2;
    } else {
        player.history.benchGamesCount = (player.history.benchGamesCount || 0) + 1;
        if (player.history.benchGamesCount >= 4) {
            change -= 2; // -2% per game after 4 games on bench
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
    let score = 40; // Base score lower to make it harder

    const isHighTier = player.totalRating >= 800; // Tier S or A
    const isEliteTeam = (team.powerCap || 0) >= 10000;

    // 1. Tier Bias (Higher tiers prefer Elite teams)
    if (isHighTier) {
        if (isEliteTeam) score += 15;
        else score -= 30; // Stars still want status, not only minutes.
    }

    // 2. Protagonism (High Weight)
    const sameRolePlayers = teammates.filter(p => p.role === player.role);
    const betterPlayers = sameRolePlayers.filter(p => p.totalRating > player.totalRating).length;

    if (betterPlayers === 0) {
        score += 35; // Star of the team
        if (!isEliteTeam && isHighTier) score += 5; // Protagonism helps, but should not fully cancel weak-club status.
    } else if (betterPlayers >= 1) {
        score -= 25; // Will have competition
    }

    // 3. Team Standing (League Position)
    // teamPosition is 1-indexed. Top 4 is very attractive.
    if (teamPosition <= 4) score += 20;
    else if (teamPosition >= 12) score -= 15;

    // 4. Chemistry (Medium Weight)
    const chemistryBonus = (team.chemistry || 50) / 10; // 0 to 10
    score += chemistryBonus;

    // 5. Chaos (Luck)
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

        // 1. Satisfaction Filter
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

        // 2. Cap Filter
        const currentPower = toTeam.squad.reduce((sum, id) => sum + (players[id]?.totalRating || 0), 0);
        if (currentPower + player.totalRating > (toTeam.powerCap || 9000)) {
            prop.status = 'DECLINED';
            continue;
        }

        // 3. Choice Logic (Attractiveness)
        const teammates = toTeam.squad.map(id => players[id]).filter(p => !!p);

        // Mock team position for AI attractiveness calculation (could be refined)
        const mockPosition = toTeam.powerCap && toTeam.powerCap > 10000 ? 2 : 10;
        const attrScore = calculateAttractiveness(player, toTeam, teammates, mockPosition);

        if (attrScore > 65) {
            // ACCEPTED
            prop.status = 'ACCEPTED';
            newsHeadlines.transfer(state, player, toTeam);

            // Handle Power Cap Profit for FROM team
            if (fromTeam) {
                // If player was sold for more than his original rating when he joined? 
                // Actually the rule says: "Se um jogador ganha rating enquanto está no clube, o powerCap máximo SOBE na mesma proporção."
                // This should be handled DURING the rating gain. 
            }

            // Transfer execution
            if (fromTeam) {
                fromTeam.squad = fromTeam.squad.filter(id => id !== player.id);
            }
            toTeam.squad.push(player.id);
            player.contract.teamId = toTeam.id;
            player.satisfaction = 100;

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
