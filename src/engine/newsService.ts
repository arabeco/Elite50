import { GameState, Player, Team, NewsItem, SeasonReport, District } from '../types';

/**
 * Adds a news item to the global feed.
 */
export const addNews = (
    state: GameState,
    title: string,
    content: string,
    type: NewsItem['type'],
    importance: NewsItem['importance'] = 1,
    action?: NewsItem['action']
) => {
    const news: NewsItem = {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: state.world.currentDate,
        title,
        content,
        type,
        importance,
        action
    };
    state.world.news = [news, ...(state.world.news || [])].slice(0, 50); // Keep last 50
};

export const newsHeadlines = {
    transfer: (state: GameState, player: Player, team: Team) => {
        const title = `REFORÇO NA ÁREA!`;
        const content = `${team.name} assina com ${player.nickname}, o novo reforço de ${player.totalRating} pontos de rating!`;
        addNews(state, title, content, 'TRANSFER', 2, {
            kind: 'PLAYER_PROFILE',
            season: state.world.currentSeason || 2050,
            playerId: player.id,
            teamId: team.id
        });
    },
    exile: (state: GameState, player: Player) => {
        const title = `FIM DA LINHA!`;
        const content = `${player.nickname} é exilado do cenário profissional por baixo desempenho. Um novo desafiante surge da Shadow Pool.`;
        addNews(state, title, content, 'EXILE', 3, {
            kind: 'PLAYER_PROFILE',
            season: state.world.currentSeason || 2050,
            playerId: player.id
        });
    },
    champion: (state: GameState, team: Team, district: District) => {
        const title = `DOMINAÇÃO EM ${district}!`;
        const content = `${team.name} conquista o Distrito ${district} e garante vaga na Copa dos Distritos!`;
        addNews(state, title, content, 'CHAMPION', 3, {
            kind: 'TEAM_PROFILE',
            season: state.world.currentSeason || 2050,
            teamId: team.id
        });
    },
    cupWinner: (state: GameState, team: Team) => {
        const title = `SOBERANO DOS DISTRITOS!`;
        const content = `O time ${team.name} levanta a taça e unifica a região após vencer a Copa dos Distritos!`;
        addNews(state, title, content, 'CUP', 3, {
            kind: 'TEAM_PROFILE',
            season: state.world.currentSeason || 2050,
            teamId: team.id
        });
    },
    migration: (state: GameState, team: Team, newDist: District) => {
        const title = `MUDANÇA DE AR`;
        const content = `O ${team.name} foi realocado para o distrito ${newDist} para a próxima temporada.`;
        addNews(state, title, content, 'MIGRATION', 1, {
            kind: 'TEAM_PROFILE',
            season: state.world.currentSeason || 2050,
            teamId: team.id
        });
    },
    seasonEnded: (state: GameState, report: SeasonReport) => {
        const title = 'TEMPORADA ENCERRADA';
        const content = `A temporada ${report.season} foi arquivada no The Pulse: campeoes, realocacoes, destaque de rating e impacto economico estao disponiveis.`;
        addNews(state, title, content, 'SYSTEM', 3, {
            kind: 'SEASON_REPORT',
            season: report.season
        });
    }
};

/**
 * Generates the end-of-season report.
 */
export const generateSeasonReport = (
    state: GameState,
    reallocated: { teamId: string; from: District; to: District }[]
): SeasonReport => {
    const leagues = state.world.leagues;
    const finalStandings: Record<string, any> = {};
    Object.keys(leagues).forEach(k => {
        finalStandings[k] = leagues[k as keyof typeof leagues].standings;
    });

    // Find "Mestre do Lucro" (Highest Cap Gain)
    let profitWinner = { teamId: '', capGain: -1 };
    Object.values(state.teams).forEach(t => {
        // This assumes we tracked capGain somewhere or we calculate based on evolution delta
        // For now, let's pick one with high cap (placeholder logic or we could refine)
        const gain = (t.powerCap || 0) - (8000); // Rough comparison
        if (gain > profitWinner.capGain) {
            profitWinner = { teamId: t.id, capGain: gain };
        }
    });

    // Find "MVP de Rating" (Highest evolved player)
    let mvpRating = { playerId: '', ratingGain: -1 };
    Object.values(state.players).forEach(p => {
        const gain = p.history.seasonRatingDelta || 0;
        if (gain > mvpRating.ratingGain) {
            mvpRating = { playerId: p.id, ratingGain: gain };
        }
    });

    const getTeamSeasonScoreDelta = (team: Team) => {
        return (team.squad || []).reduce((sum, playerId) => {
            const player = state.players[playerId];
            return sum + (player?.history?.seasonRatingDelta || 0);
        }, 0);
    };

    let bestTeam = { teamId: '', scoreDelta: -Infinity };
    let worstTeam = { teamId: '', scoreDelta: Infinity };
    Object.values(state.teams)
        .filter(team => team.id.startsWith('t_'))
        .forEach(team => {
            const scoreDelta = getTeamSeasonScoreDelta(team);
            if (scoreDelta > bestTeam.scoreDelta) bestTeam = { teamId: team.id, scoreDelta };
            if (scoreDelta < worstTeam.scoreDelta) worstTeam = { teamId: team.id, scoreDelta };
        });

    const managerHighlight = bestTeam.teamId && state.teams[bestTeam.teamId]?.managerId
        ? {
            managerId: state.teams[bestTeam.teamId].managerId!,
            teamId: bestTeam.teamId,
            reason: 'Maior alta de score da temporada'
        }
        : null;

    const report: SeasonReport = {
        season: state.world.currentSeason || 2050,
        finalStandings,
        reallocatedTeams: reallocated,
        profitWinner,
        mvpRating,
        eliteCupWinnerId: state.world.eliteCup?.winnerId || null,
        districtCupWinnerId: state.world.districtCup?.winnerId || null,
        managerHighlight,
        teamRatingMovers: {
            best: bestTeam,
            worst: worstTeam
        }
    };

    state.world.history = [report, ...(state.world.history || [])];
    return report;
};
