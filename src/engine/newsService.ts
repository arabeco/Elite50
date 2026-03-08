import { GameState, Player, Team, NewsItem, SeasonReport, District } from '../types';

/**
 * Adds a news item to the global feed.
 */
export const addNews = (
    state: GameState,
    title: string,
    content: string,
    type: NewsItem['type'],
    importance: NewsItem['importance'] = 1
) => {
    const news: NewsItem = {
        id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: state.world.currentDate,
        title,
        content,
        type,
        importance
    };
    state.world.news = [news, ...(state.world.news || [])].slice(0, 50); // Keep last 50
};

export const newsHeadlines = {
    transfer: (state: GameState, player: Player, team: Team) => {
        const title = `REFORÇO NA ÁREA!`;
        const content = `${team.name} assina com ${player.nickname}, o novo reforço de ${player.totalRating} pontos de rating!`;
        addNews(state, title, content, 'TRANSFER', 2);
    },
    exile: (state: GameState, player: Player) => {
        const title = `FIM DA LINHA!`;
        const content = `${player.nickname} é exilado do cenário profissional por baixo desempenho. Um novo desafiante surge da Shadow Pool.`;
        addNews(state, title, content, 'EXILE', 3);
    },
    champion: (state: GameState, team: Team, district: District) => {
        const title = `DOMINAÇÃO EM ${district}!`;
        const content = `${team.name} conquista o Distrito ${district} e garante vaga na Copa dos Distritos!`;
        addNews(state, title, content, 'CHAMPION', 3);
    },
    cupWinner: (state: GameState, team: Team) => {
        const title = `SOBERANO DOS DISTRITOS!`;
        const content = `O time ${team.name} levanta a taça e unifica a região após vencer a Copa dos Distritos!`;
        addNews(state, title, content, 'CUP', 3);
    },
    migration: (state: GameState, team: Team, newDist: District) => {
        const title = `MUDANÇA DE AR`;
        const content = `O ${team.name} foi realocado para o distrito ${newDist} para a próxima temporada.`;
        addNews(state, title, content, 'MIGRATION', 1);
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

    const report: SeasonReport = {
        season: state.world.currentSeason || 2050,
        finalStandings,
        reallocatedTeams: reallocated,
        profitWinner,
        mvpRating
    };

    state.world.history = [report, ...(state.world.history || [])];
    return report;
};
