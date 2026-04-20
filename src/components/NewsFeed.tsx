import React from 'react';
import { NewsItem, SeasonReport } from '../types';

interface NewsFeedProps {
    news: NewsItem[];
    history: SeasonReport[];
}

const NewsFeed: React.FC<NewsFeedProps> = ({ news, history }) => {
    return (
        <div className="news-feed-container">
            <div className="news-feed-header">
                <h2>CENTRAL DE NOTÍCIAS — THE PULSE 📡</h2>
            </div>

            <div className="news-scroll-area">
                {news.length === 0 && (
                    <div className="no-news">Aguardando eventos do mundo...</div>
                )}

                {news.map((item) => (
                    <div key={item.id} className={`news-card importance-${item.importance} type-${item.type.toLowerCase()}`}>
                        <div className="news-card-badge">{item.type}</div>
                        <div className="news-card-body">
                            <h3 className="news-card-title">{item.title}</h3>
                            <p className="news-card-content">{item.content}</p>
                            <div className="news-card-footer">
                                <span className="news-card-date">{new Date(item.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}

                {history.length > 0 && (
                    <div className="history-section">
                        <h3>RESUMOS DE TEMPORADAS PASSADAS</h3>
                        {history.map((report, idx) => (
                            <div key={`report-${idx}`} className="season-report-card">
                                <h4>Temporada {report.season} — Recapitulativo</h4>
                                <div className="report-stats">
                                    <div className="stat-item">
                                        <strong>Score Máximo:</strong> {report.profitWinner.teamId} (+{report.profitWinner.capGain})
                                    </div>
                                    <div className="stat-item">
                                        <strong>MVP de Rating:</strong> {report.mvpRating.playerId} (+{report.mvpRating.ratingGain} pts)
                                    </div>
                                </div>
                                <p className="report-realloc">
                                    {report.reallocatedTeams.length} times foram realocados entre distritos.
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
        .news-feed-container {
          background: #0a0a0c;
          border: 2px solid #333;
          border-radius: 8px;
          color: #eee;
          font-family: 'Inter', sans-serif;
          max-height: 800px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .news-feed-header {
          padding: 15px;
          background: linear-gradient(90deg, #1a1a1a, #333);
          border-bottom: 2px solid #444;
          text-align: center;
        }

        .news-feed-header h2 {
          margin: 0;
          font-size: 1rem;
          letter-spacing: 2px;
          color: #00d2ff;
          text-transform: uppercase;
        }

        .news-scroll-area {
          padding: 15px;
          overflow-y: auto;
          flex: 1;
        }

        .news-card {
          background: #151518;
          border-left: 4px solid #666;
          margin-bottom: 12px;
          padding: 12px;
          border-radius: 4px;
          transition: transform 0.2s;
        }

        .news-card:hover {
          transform: translateX(5px);
          background: #1c1c21;
        }

        .importance-3 { border-left-color: #ff416c; } /* High Importance */
        .importance-2 { border-left-color: #ffb347; } /* Medium */
        
        .type-transfer { border-left-color: #00d2ff; }
        .type-exile { border-left-color: #ff4b2b; }
        .type-champion { border-left-color: #f7ff00; }
        .type-cup { border-left-color: #a18cd1; }

        .news-card-badge {
          font-size: 0.65rem;
          font-weight: bold;
          padding: 2px 6px;
          background: #333;
          border-radius: 4px;
          display: inline-block;
          margin-bottom: 8px;
          color: #fff;
        }

        .news-card-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 4px;
        }

        .news-card-content {
          margin: 0;
          font-size: 0.9rem;
          color: #bbb;
          line-height: 1.4;
        }

        .news-card-date {
          display: block;
          margin-top: 8px;
          font-size: 0.75rem;
          color: #666;
          font-family: monospace;
        }

        .no-news {
          text-align: center;
          color: #555;
          padding: 40px;
          font-style: italic;
        }

        .history-section {
          margin-top: 30px;
          border-top: 1px solid #333;
          padding-top: 20px;
        }

        .history-section h3 {
          font-size: 0.9rem;
          color: #888;
          text-align: center;
          margin-bottom: 15px;
        }

        .season-report-card {
          background: #0a0a0c;
          border: 1px dashed #444;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
        }

        .season-report-card h4 {
          margin: 0;
          font-size: 0.95rem;
          color: #ffd700;
          margin-bottom: 10px;
        }

        .report-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 10px;
        }

        .stat-item {
          font-size: 0.8rem;
          color: #aaa;
        }

        .stat-item strong {
          color: #fff;
        }

        .report-realloc {
          font-size: 0.75rem;
          color: #666;
          margin: 0;
        }
      `}</style>
        </div>
    );
};

export default NewsFeed;
