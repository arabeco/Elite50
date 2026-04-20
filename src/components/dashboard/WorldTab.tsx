import React, { useState } from 'react';
import { useGame } from '../../store/GameContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMatchSimulation } from '../../hooks/useMatchSimulation';
import { useTransfers } from '../../hooks/useTransfers';
import { useTactics } from '../../hooks/useTactics';
import { useGameDay } from '../../hooks/useGameDay';
import { useTraining } from '../../hooks/useTraining';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { TeamLogo } from '../TeamLogo';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { getMatchStatus } from '../../utils/matchUtils';
import { Player, Team, GameNotification } from '../../types';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Rocket, LayoutGrid, Rows3 } = LucideIcons;


export const WorldTab = (props: any) => {
  const { state, setState } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const { handleMockReport, setSelectedMatchReport } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const { handleMakeProposal } = useTransfers(userTeam?.id || null, dashData.totalPoints, dashData.powerCap);

  // Local states for WorldTab
  const [selectedTeamView, setSelectedTeamView] = useState<string | null>(null);
  const [worldTeamSubTab, setWorldTeamSubTab] = useState<'squad' | 'tactics'>('squad');
  const [activeWorldTab, setActiveWorldTab] = useState<'news' | 'leagues' | 'market' | 'ranking' | 'teams'>('news');
  const [activeLeague, setActiveLeague] = useState<string>('norte');
  const [activeCompetition, setActiveCompetition] = useState<'league' | 'elite' | 'district'>('league');
  const [activeLeagueTab, setActiveLeagueTab] = useState<'standings' | 'scorers' | 'all-teams'>('standings');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  React.useEffect(() => {
    if (activeWorldTab === 'leagues') {
      const keys = Object.keys(dashData.leaguesData || {});
      if (keys.length > 0 && !keys.includes(activeLeague)) {
        setActiveLeague(keys[0]);
      }
    }
  }, [activeWorldTab, dashData.leaguesData, activeLeague]);

  // Market filters
  const [marketSearch, setMarketSearch] = useState('');
  const [marketDistrict, setMarketDistrict] = useState('all');
  const [marketPosition, setMarketPosition] = useState('all');
  const [marketSatisfactionMax, setMarketSatisfactionMax] = useState(100);
  const [marketPointsMin, setMarketPointsMin] = useState(0);
  const [marketPointsMax, setMarketPointsMax] = useState(1000);
  const [marketOnlyExiled, setMarketOnlyExiled] = useState(false);
  const [marketPotentialMin, setMarketPotentialMin] = useState(0);
  const [marketLimit, setMarketLimit] = useState(50);
  const [showMarketFilters, setShowMarketFilters] = useState(false);
  const [marketViewMode, setMarketViewMode] = useState<'cards' | 'list'>('cards');
  const [rankingSearch, setRankingSearch] = useState('');
  const [rankingDistrict, setRankingDistrict] = useState('all');
  const [rankingLeague, setRankingLeague] = useState('all');
  const [rankingPosition, setRankingPosition] = useState('all');
  const [rankingRatingBand, setRankingRatingBand] = useState('all');
  const [rankingAvailability, setRankingAvailability] = useState('all');
  const [showRankingFilters, setShowRankingFilters] = useState(false);
  const [rankingViewMode, setRankingViewMode] = useState<'cards' | 'list'>('list');

  // Derived data
  const players = Object.values(state.players);
  const { leaguesData } = dashData as any;
  const filteredMarketPlayers = players
    .filter(p => {
      const isExiled = !p.contract.teamId;
      if (marketOnlyExiled && !isExiled) return false;

      const matchesSearch = p.name.toLowerCase().includes(marketSearch.toLowerCase()) || p.nickname.toLowerCase().includes(marketSearch.toLowerCase());
      const matchesDistrict = marketDistrict === 'all' || p.district === marketDistrict;
      const matchesPosition = marketPosition === 'all' || p.role === marketPosition;
      const matchesPoints = p.totalRating >= marketPointsMin && p.totalRating <= marketPointsMax;
      const matchesSatisfaction = p.satisfaction <= marketSatisfactionMax;
      const matchesPotential = p.potential >= marketPotentialMin;
      return matchesSearch && matchesDistrict && matchesPosition && matchesPoints && matchesSatisfaction && matchesPotential;
    })
    .slice(0, marketLimit);
  const filteredRankingPlayers = [...players]
    .filter(player => {
      const playerTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;
      const matchesSearch = player.name.toLowerCase().includes(rankingSearch.toLowerCase()) || player.nickname.toLowerCase().includes(rankingSearch.toLowerCase());
      const matchesDistrict = rankingDistrict === 'all' || player.district === rankingDistrict;
      const matchesLeague = rankingLeague === 'all' || playerTeam?.league === rankingLeague;
      const matchesPosition = rankingPosition === 'all' || player.role === rankingPosition;
      const matchesAvailability = rankingAvailability === 'all'
        || (rankingAvailability === 'free' && !player.contract.teamId)
        || (rankingAvailability === 'signed' && !!player.contract.teamId);
      const matchesRatingBand = rankingRatingBand === 'all'
        || (rankingRatingBand === '900+' && player.totalRating >= 900)
        || (rankingRatingBand === '800-899' && player.totalRating >= 800 && player.totalRating <= 899)
        || (rankingRatingBand === '700-799' && player.totalRating >= 700 && player.totalRating <= 799)
        || (rankingRatingBand === '0-699' && player.totalRating < 700);
      return matchesSearch && matchesDistrict && matchesLeague && matchesPosition && matchesAvailability && matchesRatingBand;
    })
    .sort((a, b) => b.totalRating - a.totalRating)
    .slice(0, 120);
  const rankingPlayersByPosition = {
    GOL: filteredRankingPlayers.filter(player => player.role === 'GOL'),
    ZAG: filteredRankingPlayers.filter(player => player.role === 'ZAG'),
    MEI: filteredRankingPlayers.filter(player => player.role === 'MEI'),
    ATA: filteredRankingPlayers.filter(player => player.role === 'ATA'),
  };
  const rankingIndexMap = filteredRankingPlayers.reduce<Record<string, number>>((acc, player, index) => {
    acc[player.id] = index + 1;
    return acc;
  }, {});

  if (selectedTeamView) {
    const team = state.teams[selectedTeamView];
    if (!team) return null;
    return (
      <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-24">
        <header className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
          <button
            onClick={() => setSelectedTeamView(null)}
            className="w-10 h-10 sm:w-12 sm:h-12 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 shadow-xl group"
          >
            <ChevronRight size={window.innerWidth < 640 ? 20 : 24} className="text-white rotate-180 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl glass-card-neon border-white/5 flex items-center justify-center shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {team.logo ? (
                <TeamLogo
                  primaryColor={team.logo.primary}
                  secondaryColor={team.logo.secondary}
                  accentColor={team.logo.accent}
                  shapeId={team.logo.shapeId}
                  patternId={team.logo.patternId as any}
                  symbolId={team.logo.symbolId}
                  size={window.innerWidth < 640 ? 44 : 64}
                />
              ) : (
                <div className="w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center">
                  <TeamLogo
                    primaryColor={team.colors.primary || '#fff'}
                    secondaryColor={team.colors.secondary || '#333'}
                    patternId="none"
                    symbolId="Shield"
                    size={window.innerWidth < 640 ? 32 : 40}
                  />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl sm:text-4xl font-black text-white tracking-tight uppercase italic neon-text-white truncate max-w-[200px] sm:max-w-none">{team.name}</h2>
              <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                <span className="text-cyan-400 font-black tracking-[0.15em] sm:tracking-[0.2em] text-[8px] sm:text-[10px] uppercase">Clube Profissional</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-white/40 font-bold tracking-widest text-[8px] sm:text-[10px] uppercase">{team.district}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-4">
          <button
            onClick={() => setWorldTeamSubTab('squad')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all ${worldTeamSubTab === 'squad' ? 'glass-card-neon border-cyan-500/50 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'glass-card border-white/5 text-white/40 hover:text-white/60'}`}
          >
            Elenco
          </button>
          <button
            onClick={() => setWorldTeamSubTab('tactics')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all ${worldTeamSubTab === 'tactics' ? 'glass-card-neon border-fuchsia-500/50 text-white shadow-[0_0_20px_rgba(217,70,239,0.2)]' : 'glass-card border-white/5 text-white/40 hover:text-white/60'}`}
          >
            Tática
          </button>
        </div>

        {worldTeamSubTab === 'squad' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {(team.squad || []).map((playerId) => {
              const player = state.players[playerId];
              if (!player) return null;
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  onClick={setSelectedPlayer}
                  onProposta={handleMakeProposal}
                  onTeamClick={setSelectedTeamView}
                />
              );
            })}
          </div>
        )}

        {worldTeamSubTab === 'tactics' && (
          <div className="glass-card-neon white-gradient-sheen border-cyan-500/20 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 shadow-[0_0_50px_rgba(34,211,238,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/5 blur-[100px] pointer-events-none" />

            <h3 className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-4 sm:mb-8 flex items-center gap-3">
              <div className="w-4 sm:w-8 h-[1px] bg-cyan-500/50" />
              Formação e Estilo
            </h3>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="relative aspect-square sm:aspect-[3/4] glass-card rounded-2xl sm:rounded-[2rem] border-white/5 overflow-hidden group shadow-inner">
                {/* Field Markings */}
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-20" />
                <div className="absolute inset-4 sm:inset-8 border border-white/10 rounded-xl sm:rounded-2xl pointer-events-none" />
                <div className="absolute top-1/2 left-4 sm:left-8 right-4 sm:right-8 h-[1px] bg-white/10 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 sm:w-32 h-20 sm:h-32 border border-white/10 rounded-full pointer-events-none" />

                <div className="relative h-full flex flex-col items-center justify-center z-10">
                  <div className="text-5xl sm:text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-500">
                    {team.tactics.preferredFormation}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-cyan-400 font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    Formação Padrão
                  </div>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="glass-card border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-white/10 transition-all group">
                  <div className="text-[8px] sm:text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-1 sm:mb-2 group-hover:text-cyan-400 transition-colors">Estilo de Jogo</div>
                  <div className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tight">{team.tactics.playStyle}</div>
                </div>

                <div className="glass-card border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-white/10 transition-all">
                  <div className="text-[8px] sm:text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-4 sm:mb-6">Tendências de Jogo</div>
                  <div className="space-y-4 sm:space-y-6">
                    <div>
                      <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-3">
                        <span className="text-white/60">Agressividade</span>
                        <span className="text-fuchsia-400 neon-text-fuchsia">80%</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div className="h-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 rounded-full shadow-[0_0_15px_rgba(217,70,239,0.5)] w-[80%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-3">
                        <span className="text-white/60">Posse de Bola</span>
                        <span className="text-cyan-400 neon-text-cyan">50%</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)] w-[50%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 animate-in fade-in duration-700 pb-24">
      {/* Navigation Tabs */}
      <div className="flex gap-2 sm:gap-3 overflow-x-auto hide-scrollbar py-2 px-1">
        {[
          { id: 'news', icon: Newspaper, label: 'Notícias', color: 'purple' },
          { id: 'leagues', icon: Trophy, label: 'Ligas', color: 'emerald' },
          { id: 'market', icon: ShoppingCart, label: 'Mercado', color: 'orange' },
          { id: 'ranking', icon: Award, label: 'Ranking', color: 'cyan' },
          { id: 'teams', icon: Users, label: 'Clubes', color: 'fuchsia' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveWorldTab(tab.id as any)}
            className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all whitespace-nowrap backdrop-blur-xl border ${activeWorldTab === tab.id
              ? `bg-${tab.color}-500/20 border-${tab.color}-500/50 text-white shadow-[0_0_20px_rgba(var(--color-glow),0.3)]`
              : 'glass-card border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              }`}
          >
            <tab.icon size={window.innerWidth < 640 ? 14 : 16} className={activeWorldTab === tab.id ? `text-${tab.color}-400` : ''} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeWorldTab === 'news' && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {state.notifications?.length > 0 ? (
            state.notifications.map(notification => (
              <div
                key={notification.id}
                className={`glass-card rounded-xl sm:rounded-2xl p-3 sm:p-5 flex gap-3 sm:gap-5 transition-all group hover:bg-white/5 ${!notification.read
                  ? 'glass-card-neon border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                  : 'border-white/5'
                  }`}
              >
                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-all group-hover:scale-110 shadow-lg ${notification.type === 'transfer' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  notification.type === 'match' ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400' :
                    notification.type === 'crisis' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                      'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  }`}>
                  {notification.type === 'transfer' ? (
                    notification.message.includes('assinou com o') ? (() => {
                      const teamName = notification.message.split('assinou com o')[1].replace('!', '').trim();
                      const team = Object.values(state.teams).find(t => t.name === teamName);
                      return team?.logo ? (
                        <TeamLogo
                          primaryColor={team.logo.primary}
                          secondaryColor={team.logo.secondary}
                          accentColor={team.logo.accent}
                          shapeId={team.logo.shapeId}
                          patternId={team.logo.patternId as any}
                          symbolId={team.logo.symbolId}
                          size={window.innerWidth < 640 ? 20 : 28}
                        />
                      ) : <Briefcase size={window.innerWidth < 640 ? 20 : 28} />;
                    })() : <Briefcase size={window.innerWidth < 640 ? 20 : 28} />
                  ) :
                    notification.type === 'match' ? (
                      notification.message.includes('vs') ? (() => {
                        const matchParts = notification.message.split('vs');
                        const teamName = matchParts[0].trim();
                        const team = Object.values(state.teams).find(t => t.name === teamName);
                        return team?.logo ? (
                          <TeamLogo
                            primaryColor={team.logo.primary}
                            secondaryColor={team.logo.secondary}
                            accentColor={team.logo.accent}
                            shapeId={team.logo.shapeId}
                            patternId={team.logo.patternId as any}
                            symbolId={team.logo.symbolId}
                            size={window.innerWidth < 640 ? 20 : 28}
                          />
                        ) : (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                            <TeamLogo
                              primaryColor="#334155"
                              secondaryColor="#1e293b"
                              patternId="none"
                              symbolId="Shield"
                              size={window.innerWidth < 640 ? 20 : 28}
                            />
                          </div>
                        )
                      })() : (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                          <TeamLogo
                            primaryColor="#334155"
                            secondaryColor="#1e293b"
                            patternId="none"
                            symbolId="Shield"
                            size={window.innerWidth < 640 ? 20 : 28}
                          />
                        </div>
                      )
                    ) :
                      notification.type === 'crisis' ? <AlertTriangle size={window.innerWidth < 640 ? 20 : 28} /> :
                        <Newspaper size={window.innerWidth < 640 ? 20 : 28} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <h3 className="font-black text-white uppercase tracking-wider text-[10px] sm:text-xs italic truncate max-w-[120px] sm:max-w-none">{notification.title}</h3>
                      {!notification.read && (
                        <div className="flex gap-1">
                          <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(34,211,238,1)]" />
                          <span className="text-[7px] sm:text-[8px] font-black text-cyan-400 uppercase tracking-widest hidden sm:inline">Novo</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-[0.1em] sm:tracking-[0.2em]">
                      {new Date(notification.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-white/50 font-bold leading-relaxed">
                    {notification.message.includes('|') ? (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        {notification.message.split('|').map((line, i) => (
                          <span key={i} className="inline-block glass-card px-2 sm:px-3 py-1 sm:py-1.5 rounded sm:rounded-lg text-[8px] sm:text-[9px] border-white/5 text-white/70 font-black uppercase tracking-wider italic">
                            {line.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="line-clamp-2 sm:line-clamp-none">{notification.message}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card-neon white-gradient-sheen rounded-2xl sm:rounded-[2rem] border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)] p-12 sm:p-20 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10 mb-4 sm:mb-6">
                <Newspaper size={window.innerWidth < 640 ? 32 : 48} />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-white/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Nenhuma notícia</h3>
              <p className="text-[8px] sm:text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1 sm:mt-2">Fique atento às atualizações</p>
            </div>
          )}
        </div>
      )}

      {activeWorldTab === 'leagues' && (() => {
        const activeLeagueData = leaguesData[activeLeague as keyof typeof leaguesData];
        if (!activeLeagueData) return <div className="text-center text-slate-500 p-10 font-black uppercase tracking-widest text-[10px] italic">Dados da liga indisponíveis.</div>;

        return (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Seção de Copas com destaque horizontal */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 pb-2 px-1">
              <div
                onClick={() => setActiveCompetition('elite')}
                className={`w-full relative overflow-hidden glass-card rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all group border-white/5 ${activeCompetition === 'elite' ? 'glass-card-neon border-fuchsia-500/50 shadow-[0_0_30px_rgba(217,70,239,0.2)]' : 'hover:border-white/10'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center border shrink-0 transition-all ${activeCompetition === 'elite' ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]' : 'glass-card border-white/5 text-white/20'}`}>
                  <Flame size={window.innerWidth < 640 ? 18 : 24} className={activeCompetition === 'elite' ? 'animate-pulse' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-white italic truncate">Copa Elite</h4>
                  <p className="text-[8px] sm:text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 truncate">Continental • Top 32</p>
                </div>
                {activeCompetition === 'elite' && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,1)]" />
                )}
              </div>

              <div
                onClick={() => setActiveCompetition('district')}
                className={`w-full relative overflow-hidden glass-card rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all group border-white/5 ${activeCompetition === 'district' ? 'glass-card-neon border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.2)]' : 'hover:border-white/10'}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className={`w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center border shrink-0 transition-all ${activeCompetition === 'district' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'glass-card border-white/5 text-white/20'}`}>
                  <Globe size={window.innerWidth < 640 ? 18 : 24} className={activeCompetition === 'district' ? 'animate-pulse' : ''} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-white italic truncate">Copa Distritos</h4>
                  <p className="text-[8px] sm:text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 truncate">Regional • Top 16</p>
                </div>
                {activeCompetition === 'district' && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,1)]" />
                )}
              </div>
            </div>

            {/* Seletor de Ligas Horizontal Compacto */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 pb-4 px-1">
              {(Object.keys(leaguesData) as Array<keyof typeof leaguesData>).map((leagueKey) => {
                const league = leaguesData[leagueKey];
                if (!league) return null;
                const isActive = activeLeague === leagueKey && activeCompetition === 'league';

                const getClasses = () => {
                  const keyStr = String(leagueKey);
                  switch (true) {
                    case keyStr.includes('norte') || keyStr.includes('cyan'):
                      return {
                        glow: 'rgba(34,211,238,0.4)',
                        color: 'cyan',
                        border: 'border-cyan-500/50',
                        bg: 'bg-cyan-500/10'
                      };
                    case keyStr.includes('sul') || keyStr.includes('orange'):
                      return {
                        glow: 'rgba(249,115,22,0.4)',
                        color: 'orange',
                        border: 'border-orange-500/50',
                        bg: 'bg-orange-500/10'
                      };
                    case keyStr.includes('leste') || keyStr.includes('green') || keyStr.includes('emerald'):
                      return {
                        glow: 'rgba(16,185,129,0.4)',
                        color: 'emerald',
                        border: 'border-emerald-500/50',
                        bg: 'bg-emerald-500/10'
                      };
                    case keyStr.includes('oeste') || keyStr.includes('purple'):
                      return {
                        glow: 'rgba(168,85,247,0.4)',
                        color: 'purple',
                        border: 'border-purple-500/50',
                        bg: 'bg-purple-500/10'
                      };
                    default:
                      return {
                        glow: 'rgba(255,255,255,0.4)',
                        color: 'white',
                        border: 'border-white/50',
                        bg: 'bg-white/10'
                      };
                  }
                };

                const styles = getClasses();

                return (
                  <div
                    key={leagueKey}
                    onClick={() => {
                      setActiveLeague(leagueKey);
                      setActiveCompetition('league');
                    }}
                    className={`w-full glass-card rounded-lg sm:rounded-2xl p-2 sm:p-4 cursor-pointer transition-all group flex flex-col items-center gap-1 sm:gap-3 border-white/5 ${isActive ? `glass-card-neon ${styles.border} ${styles.bg} shadow-[0_0_20px_${styles.glow}]` : 'hover:border-white/20'}`}
                  >
                    <div className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all ${isActive ? `${styles.bg} ${styles.border} text-${styles.color}-400` : 'glass-card border-white/5 text-white/20 group-hover:text-white/40'}`}>
                      <Trophy size={window.innerWidth < 640 ? 14 : 20} />
                    </div>
                    <div className="text-center">
                      <span className={`text-[7px] sm:text-[10px] font-black uppercase tracking-[0.05em] sm:tracking-[0.2em] block italic ${isActive ? `text-${styles.color}-400 neon-text-${styles.color}` : 'text-white/40 group-hover:text-white/60'}`}>{league.name.split(' ')[1] || league.name}</span>
                      <span className="text-[5px] sm:text-[7px] text-white/10 font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] mt-0.5 block italic truncate">{(league.teams?.length || 0)} CLB</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {activeCompetition === 'league' && (
              <div className="space-y-3 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 px-1">
                  <div className="flex gap-1.5 sm:gap-2 glass-card p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border-white/5 w-full sm:w-auto overflow-x-auto hide-scrollbar">
                    {[
                      { id: 'standings', label: 'Tabelas', icon: Trophy },
                      { id: 'scorers', label: 'Artilheiros', icon: Target },
                      { id: 'all-teams', label: 'Clubes', icon: Users },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveLeagueTab(tab.id as any)}
                        className={`flex-1 sm:flex-none px-3 sm:px-5 py-2 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all flex items-center justify-center gap-1.5 sm:gap-2 italic whitespace-nowrap ${activeLeagueTab === tab.id ? 'glass-card-neon border-white/20 text-white shadow-lg' : 'text-white/30 hover:text-white/50'}`}
                      >
                        <tab.icon size={window.innerWidth < 640 ? 12 : 14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="glass-card-neon border-cyan-500/30 px-3 sm:px-4 py-2 sm:py-2 rounded-lg sm:rounded-xl flex items-center gap-2 sm:gap-3 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex-1 sm:flex-none">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,1)]" />
                      <span className="text-cyan-400 font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[9px] sm:text-[10px] italic truncate">
                        {activeLeagueData?.name || 'LIGA'}
                      </span>
                    </div>
                    <div className="relative group flex-1 sm:flex-none">
                      <select
                        value={activeLeague}
                        onChange={(e) => {
                          setActiveLeague(e.target.value);
                          setActiveCompetition('league');
                        }}
                        className="w-full appearance-none bg-black/60 glass-card border border-white/10 rounded-lg sm:rounded-xl px-4 sm:px-6 py-2 sm:py-2 text-[9px] sm:text-[10px] text-white font-black focus:outline-none focus:border-cyan-500/50 transition-all uppercase tracking-[0.1em] sm:tracking-[0.2em] cursor-pointer pr-8 sm:pr-10 italic"
                      >
                        {Object.entries(state.world.leagues).map(([id, l]: [string, any]) => (
                          <option key={id} value={id} className="bg-slate-900">{l.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={window.innerWidth < 640 ? 12 : 14} className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>

                {activeLeagueTab === 'standings' ? (
                  <div className="glass-card-neon white-gradient-sheen border-emerald-500/20 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left relative z-10">
                        <thead>
                          <tr className="bg-white/5 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/20 font-black border-b border-white/5 italic">
                            <th className="px-4 py-3 sm:px-8 sm:py-6 text-center w-12 sm:w-20">Pos</th>
                            <th className="px-2 py-3 sm:px-8 sm:py-6">Clube de Elite</th>
                            <th className="px-3 py-3 sm:px-8 sm:py-6 text-center w-24 sm:w-32 hidden sm:table-cell">Power Score</th>
                            <th className="px-4 py-3 sm:px-8 sm:py-6 text-center w-16 sm:w-24">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {activeLeagueData?.standings?.map((row, idx) => {
                            const team = state.teams[row.teamId];
                            const totalRating = team ? team.squad.reduce((acc, id) => acc + (state.players[id]?.totalRating || 0), 0) : 0;
                            const isUserTeam = row.teamId === userTeam?.id;

                            return (
                              <tr
                                key={`league-standing-${row.teamId}-${idx}`}
                                onClick={() => setSelectedTeamView(row.teamId)}
                                className={`group transition-all cursor-pointer ${isUserTeam ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                              >
                                <td className="px-4 py-3 sm:px-8 sm:py-5 text-center">
                                  <span className={`text-sm sm:text-xl font-black italic ${idx < 3 ? 'text-white' : 'text-white/10 group-hover:text-white/30'} transition-colors`}>
                                    {row.position}
                                  </span>
                                </td>
                                <td className="px-2 py-3 sm:px-8 sm:py-5">
                                  <div className="flex items-center gap-2 sm:gap-5">
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 glass-card rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-white/5 group-hover:border-white/20 transition-all group-hover:scale-110">
                                      {team?.logo ? (
                                        <TeamLogo
                                          primaryColor={team.logo.primary}
                                          secondaryColor={team.logo.secondary}
                                          accentColor={team.logo.accent}
                                          shapeId={team.logo.shapeId}
                                          patternId={team.logo.patternId as any}
                                          symbolId={team.logo.symbolId}
                                          size={window.innerWidth < 640 ? 20 : 32}
                                        />
                                      ) : (
                                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                                          <TeamLogo
                                            primaryColor={isUserTeam ? '#10b981' : '#fff'}
                                            secondaryColor={isUserTeam ? '#065f46' : '#333'}
                                            patternId="none"
                                            symbolId="Shield"
                                            size={window.innerWidth < 640 ? 16 : 24}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] sm:text-sm font-black text-white uppercase italic tracking-tight group-hover:translate-x-1 transition-transform truncate max-w-[120px] sm:max-w-none">{row.team}</span>
                                      <span className="text-[7px] sm:text-[9px] text-white/20 font-bold uppercase tracking-widest mt-0.5 truncate">{team?.district || 'DISTRITO'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 sm:px-8 sm:py-5 text-center hidden sm:table-cell">
                                  <div className="inline-flex items-center gap-2 px-3 py-1 glass-card rounded-full border border-cyan-500/20">
                                    <Zap size={10} className="text-cyan-400" />
                                    <span className="text-xs font-black text-white italic">{totalRating}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 sm:px-8 sm:py-5 text-center">
                                  <span className="text-lg sm:text-2xl font-black text-white italic drop-shadow-lg">{row.points}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeLeagueTab === 'scorers' ? (
                  <div className="glass-card-neon border-white/5 rounded-2xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left relative z-10">
                        <thead>
                          <tr className="bg-white/5 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/20 font-black border-b border-white/5 italic">
                            <th className="px-4 py-3 sm:px-8 sm:py-6 text-center w-12 sm:w-20">Rank</th>
                            <th className="px-3 py-3 sm:px-8 sm:py-6">Atleta de Elite</th>
                            <th className="px-4 py-3 sm:px-8 sm:py-6 text-right w-20 sm:w-32">Gols</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {activeLeagueData?.scorers?.map((scorer, idx) => (
                            <tr key={idx} className="group hover:bg-white/5 transition-all">
                              <td className="px-4 py-3 sm:px-8 sm:py-5 text-center">
                                <span className={`text-sm sm:text-xl font-black italic ${idx < 3 ? 'text-amber-400' : 'text-white/10 group-hover:text-white/30'} transition-colors`}>
                                  #{idx + 1}
                                </span>
                              </td>
                              <td className="px-3 py-3 sm:px-8 sm:py-5">
                                <div className="flex flex-col min-w-0">
                                  <div className="text-[11px] sm:text-base font-black text-white uppercase italic tracking-tight group-hover:translate-x-1 transition-transform truncate max-w-[180px] sm:max-w-none">{scorer.name}</div>
                                  <div className="text-[7px] sm:text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5 sm:gap-2 truncate">
                                    <Shield size={window.innerWidth < 640 ? 8 : 10} />
                                    {scorer.team}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 sm:px-8 sm:py-5 text-right">
                                <span className="text-xl sm:text-3xl font-black text-amber-400 italic drop-shadow-[0_0_15px_rgba(251,191,36,0.4)] neon-text-amber">{scorer.goals}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeLeagueTab === 'all-teams' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-6">
                    {activeLeagueData?.standings?.map((row) => {
                      const team = state.teams[row.teamId];
                      const totalRating = team ? team.squad.reduce((acc, id) => acc + (state.players[id]?.totalRating || 0), 0) : 0;
                      return (
                        <div
                          key={row.teamId}
                          onClick={() => setSelectedTeamView(row.teamId)}
                          className="glass-card-neon border-white/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center gap-3 sm:gap-5 hover:scale-105 transition-all group cursor-pointer shadow-xl relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="w-16 h-16 sm:w-20 sm:h-20 group-hover:rotate-6 transition-transform duration-500 glass-card rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-white/20">
                            {team?.logo ? (
                              <TeamLogo
                                primaryColor={team.logo.primary}
                                secondaryColor={team.logo.secondary}
                                accentColor={team.logo.accent}
                                shapeId={team.logo.shapeId}
                                patternId={team.logo.patternId as any}
                                symbolId={team.logo.symbolId}
                                size={window.innerWidth < 640 ? 44 : 56}
                              />
                            ) : (
                              <TeamLogo
                                primaryColor="#fff"
                                secondaryColor="#333"
                                patternId="none"
                                symbolId="Shield"
                                size={window.innerWidth < 640 ? 32 : 40}
                              />
                            )}
                          </div>
                          <div className="text-center w-full relative z-10">
                            <span className="text-[10px] sm:text-xs font-black text-white uppercase italic truncate block tracking-tight group-hover:text-cyan-400 transition-colors">{row.team}</span>
                            <div className="flex items-center justify-center gap-2 mt-2 sm:mt-3">
                              <div className="px-2 sm:px-3 py-0.5 sm:py-1 glass-card rounded-full border border-cyan-500/20 flex items-center gap-1.5 sm:gap-2">
                                <Zap size={window.innerWidth < 640 ? 8 : 10} className="text-cyan-400" />
                                <span className="text-[9px] sm:text-[10px] text-white font-black italic">{totalRating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}

            {activeCompetition === 'elite' && (
              <div className="space-y-4 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between glass-card-neon border-fuchsia-500/30 p-3 sm:p-4 rounded-xl sm:rounded-[2rem] shadow-[0_0_30px_rgba(217,70,239,0.1)]">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 glass-card rounded-xl flex items-center justify-center text-fuchsia-400 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.3)]">
                      <Trophy size={window.innerWidth < 640 ? 20 : 24} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight neon-text-fuchsia">Copa Elite 2050</h3>
                      <p className="text-[8px] sm:text-[10px] text-fuchsia-400/70 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 italic">
                        {state.world.eliteCup.winnerId ? 'Grande Final Finalizada' :
                          state.world.eliteCup.round === 0 ? 'Aguardando Início' :
                            `Fase Atual: ${state.world.eliteCup.round === 1 ? 'Oitavas de Final' : state.world.eliteCup.round === 2 ? 'Quartas de Final' : state.world.eliteCup.round === 3 ? 'Semifinais' : 'Grande Final'}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-x-auto pb-6 hide-scrollbar">
                  {/* Round 1 */}
                  <div className="space-y-4 min-w-[280px]">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-1 h-4 bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,1)]" />
                      <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Oitavas</h4>
                    </div>
                    <div className="space-y-4 sm:space-y-6">
                      {state.world.eliteCup.bracket.round1.map((match) => {
                        const hTeam = state.teams[match.homeTeamId];
                        const aTeam = state.teams[match.awayTeamId];
                        return (
                          <div key={match.id} className="glass-card border-white/5 rounded-2xl p-4 transition-all hover:border-fuchsia-500/30 group">
                            <div
                              onClick={() => setSelectedTeamView(match.homeTeamId)}
                              className={`flex justify-between items-center mb-3 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.homeScore > match.awayScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {hTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={hTeam.logo.primary}
                                      secondaryColor={hTeam.logo.secondary}
                                      accentColor={hTeam.logo.accent}
                                      shapeId={hTeam.logo.shapeId}
                                      patternId={hTeam.logo.patternId as any}
                                      symbolId={hTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{hTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.homeScore : '-'}</span>
                            </div>
                            <div
                              onClick={() => setSelectedTeamView(match.awayTeamId)}
                              className={`flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.awayScore > match.homeScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {aTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={aTeam.logo.primary}
                                      secondaryColor={aTeam.logo.secondary}
                                      accentColor={aTeam.logo.accent}
                                      shapeId={aTeam.logo.shapeId}
                                      patternId={aTeam.logo.patternId as any}
                                      symbolId={aTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{aTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.awayScore : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {state.world.eliteCup.bracket.round1.length === 0 && (
                        <div className="glass-card border-white/5 rounded-2xl p-8 text-center border-dashed">
                          <span className="text-[10px] text-white/10 font-black uppercase tracking-[0.3em] italic">A definir</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quarters */}
                  <div className="space-y-3 sm:space-y-4 min-w-[240px] sm:min-w-[280px]">
                    <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
                      <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,1)]" />
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Quartas</h4>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {state.world.eliteCup.bracket.quarters.map((match) => {
                        const hTeam = state.teams[match.homeTeamId];
                        const aTeam = state.teams[match.awayTeamId];
                        return (
                          <div key={match.id} className="glass-card border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all hover:border-fuchsia-500/30 group">
                            <div
                              onClick={() => setSelectedTeamView(match.homeTeamId)}
                              className={`flex justify-between items-center mb-2 sm:mb-3 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.homeScore > match.awayScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {hTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={hTeam.logo.primary}
                                      secondaryColor={hTeam.logo.secondary}
                                      accentColor={hTeam.logo.accent}
                                      shapeId={hTeam.logo.shapeId}
                                      patternId={hTeam.logo.patternId as any}
                                      symbolId={hTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{hTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.homeScore : '-'}</span>
                            </div>
                            <div
                              onClick={() => setSelectedTeamView(match.awayTeamId)}
                              className={`flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.awayScore > match.homeScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {aTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={aTeam.logo.primary}
                                      secondaryColor={aTeam.logo.secondary}
                                      accentColor={aTeam.logo.accent}
                                      shapeId={aTeam.logo.shapeId}
                                      patternId={aTeam.logo.patternId as any}
                                      symbolId={aTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{aTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.awayScore : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {state.world.eliteCup.bracket.quarters.length === 0 && (
                        <div className="glass-card border-white/5 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center border-dashed">
                          <span className="text-[9px] sm:text-[10px] text-white/10 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">A definir</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Semis */}
                  <div className="space-y-3 sm:space-y-4 min-w-[240px] sm:min-w-[280px]">
                    <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
                      <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,1)]" />
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Semifinal</h4>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      {state.world.eliteCup.bracket.semis.map((match) => {
                        const hTeam = state.teams[match.homeTeamId];
                        const aTeam = state.teams[match.awayTeamId];
                        return (
                          <div key={match.id} className="glass-card border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all hover:border-fuchsia-500/30 group">
                            <div
                              onClick={() => setSelectedTeamView(match.homeTeamId)}
                              className={`flex justify-between items-center mb-2 sm:mb-3 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.homeScore > match.awayScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {hTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={hTeam.logo.primary}
                                      secondaryColor={hTeam.logo.secondary}
                                      accentColor={hTeam.logo.accent}
                                      shapeId={hTeam.logo.shapeId}
                                      patternId={hTeam.logo.patternId as any}
                                      symbolId={hTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{hTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.homeScore : '-'}</span>
                            </div>
                            <div
                              onClick={() => setSelectedTeamView(match.awayTeamId)}
                              className={`flex justify-between items-center cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all ${match.awayScore > match.homeScore ? 'text-white' : 'text-white/30'}`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 glass-card rounded-lg flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10">
                                  {aTeam?.logo && (
                                    <TeamLogo
                                      primaryColor={aTeam.logo.primary}
                                      secondaryColor={aTeam.logo.secondary}
                                      accentColor={aTeam.logo.accent}
                                      shapeId={aTeam.logo.shapeId}
                                      patternId={aTeam.logo.patternId as any}
                                      symbolId={aTeam.logo.symbolId}
                                      size={window.innerWidth < 640 ? 16 : 20}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] sm:text-[11px] font-black uppercase italic tracking-tight truncate w-24 sm:w-32">{aTeam?.name}</span>
                              </div>
                              <span className="text-base sm:text-lg font-black italic">{match.played ? match.awayScore : '-'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {state.world.eliteCup.bracket.semis.length === 0 && (
                        <div className="glass-card border-white/5 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center border-dashed">
                          <span className="text-[9px] sm:text-[10px] text-white/10 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">A definir</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Final */}
                  <div className="space-y-3 sm:space-y-4 min-w-[240px] sm:min-w-[320px]">
                    <div className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2">
                      <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,1)]" />
                      <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Grande Final</h4>
                    </div>
                    {state.world.eliteCup.bracket.final ? (() => {
                      const hTeam = state.teams[state.world.eliteCup.bracket.final.homeTeamId];
                      const aTeam = state.teams[state.world.eliteCup.bracket.final.awayTeamId];
                      return (
                        <div className="bg-gradient-to-br from-fuchsia-900/40 to-black border border-yellow-500/50 rounded-xl sm:rounded-[2rem] p-4 sm:p-6 shadow-[0_0_30px_rgba(234,179,8,0.1)] relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div
                            onClick={() => setSelectedTeamView(state.world.eliteCup.bracket.final!.homeTeamId)}
                            className={`flex justify-between items-center mb-4 sm:mb-6 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all ${state.world.eliteCup.bracket.final.homeScore > state.world.eliteCup.bracket.final.awayScore ? 'text-yellow-400 font-bold' : 'text-white'}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-8 h-8 sm:w-12 sm:h-12 glass-card rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border border-white/5 group-hover:border-yellow-500/30 transition-all">
                                {hTeam?.logo && (
                                  <TeamLogo
                                    primaryColor={hTeam.logo.primary}
                                    secondaryColor={hTeam.logo.secondary}
                                    accentColor={hTeam.logo.accent}
                                    shapeId={hTeam.logo.shapeId}
                                    patternId={hTeam.logo.patternId as any}
                                    symbolId={hTeam.logo.symbolId}
                                    size={window.innerWidth < 640 ? 24 : 32}
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate w-24 sm:w-36">{hTeam?.name}</span>
                            </div>
                            <span className="text-xl sm:text-3xl font-black italic">{state.world.eliteCup.bracket.final.played ? state.world.eliteCup.bracket.final.homeScore : '-'}</span>
                          </div>
                          <div
                            onClick={() => setSelectedTeamView(state.world.eliteCup.bracket.final!.awayTeamId)}
                            className={`flex justify-between items-center cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all ${state.world.eliteCup.bracket.final.awayScore > state.world.eliteCup.bracket.final.homeScore ? 'text-yellow-400 font-bold' : 'text-white'}`}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className="w-8 h-8 sm:w-12 sm:h-12 glass-card rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border border-white/5 group-hover:border-yellow-500/30 transition-all">
                                {aTeam?.logo && (
                                  <TeamLogo
                                    primaryColor={aTeam.logo.primary}
                                    secondaryColor={aTeam.logo.secondary}
                                    accentColor={aTeam.logo.accent}
                                    shapeId={aTeam.logo.shapeId}
                                    patternId={aTeam.logo.patternId as any}
                                    symbolId={aTeam.logo.symbolId}
                                    size={window.innerWidth < 640 ? 24 : 32}
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-sm font-black uppercase italic tracking-tight truncate w-24 sm:w-36">{aTeam?.name}</span>
                            </div>
                            <span className="text-xl sm:text-3xl font-black italic">{state.world.eliteCup.bracket.final.played ? state.world.eliteCup.bracket.final.awayScore : '-'}</span>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="glass-card border-white/5 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center border-dashed">
                        <span className="text-[9px] sm:text-[10px] text-white/10 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">A definir</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeCompetition === 'district' && (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between glass-card-neon border-cyan-500/30 p-3 sm:p-4 rounded-xl sm:rounded-[2rem] shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 glass-card rounded-xl flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                      <Globe size={window.innerWidth < 640 ? 20 : 24} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight neon-text-cyan">Copa Distritos</h3>
                      <p className="text-[8px] sm:text-[10px] text-cyan-400/70 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1 italic">
                        {state.world.districtCup.winnerId ? 'Campeão Definido!' :
                          state.world.districtCup.round === 0 ? 'Não Iniciada' :
                            state.world.districtCup.round <= 3 ? 'Fase de Grupos' : 'Final'}
                      </p>
                    </div>
                  </div>
                </div>

                {state.world.districtCup.round >= 1 && (
                  <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-cyan-900/20 text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-cyan-400 font-bold border-b border-cyan-500/20">
                          <tr>
                            <th className="px-3 py-3 sm:px-6 sm:py-4">Pos</th>
                            <th className="px-3 py-3 sm:px-6 sm:py-4 w-full">Seleção</th>
                            <th className="px-2 py-3 sm:px-4 sm:py-4 text-center">J</th>
                            <th className="px-2 py-3 sm:px-4 sm:py-4 text-center hidden sm:table-cell">V</th>
                            <th className="px-2 py-3 sm:px-4 sm:py-4 text-center hidden sm:table-cell">E</th>
                            <th className="px-2 py-3 sm:px-4 sm:py-4 text-center hidden sm:table-cell">D</th>
                            <th className="px-2 py-3 sm:px-4 sm:py-4 text-center">SG</th>
                            <th className="px-3 py-3 sm:px-6 sm:py-4 text-center">Pts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/10">
                          {state.world.districtCup.standings
                            .sort((a, b) => b.points !== a.points ? b.points - a.points : (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst))
                            .map((row, index) => {
                              const team = state.teams[row.teamId];
                              return (
                                <tr
                                  key={row.teamId}
                                  onClick={() => setSelectedTeamView(row.teamId)}
                                  className="hover:bg-cyan-500/5 transition-colors cursor-pointer group"
                                >
                                  <td className="px-3 py-3 sm:px-6 sm:py-4 font-mono text-cyan-500/50 text-[10px] sm:text-xs">#{index + 1}</td>
                                  <td className="px-3 py-3 sm:px-6 sm:py-4 font-bold text-white">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform group-hover:scale-110">
                                        {team?.logo ? (
                                          <TeamLogo
                                            primaryColor={team.logo.primary}
                                            secondaryColor={team.logo.secondary}
                                            accentColor={team.logo.accent}
                                            shapeId={team.logo.shapeId}
                                            patternId={team.logo.patternId as any}
                                            symbolId={team.logo.symbolId}
                                            size={window.innerWidth < 640 ? 16 : 20}
                                          />
                                        ) : (
                                          <Globe size={window.innerWidth < 640 ? 14 : 16} className="text-cyan-600" />
                                        )}
                                      </div>
                                      <span className="text-[10px] sm:text-xs uppercase italic truncate max-w-[80px] sm:max-w-none group-hover:text-cyan-400 transition-colors">{team?.name || row.teamId}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-3 sm:px-4 sm:py-4 text-center text-slate-400 text-[10px] sm:text-xs">{row.played}</td>
                                  <td className="px-2 py-3 sm:px-4 sm:py-4 text-center text-slate-500 text-[10px] sm:text-xs hidden sm:table-cell">{row.won}</td>
                                  <td className="px-2 py-3 sm:px-4 sm:py-4 text-center text-slate-500 text-[10px] sm:text-xs hidden sm:table-cell">{row.drawn}</td>
                                  <td className="px-2 py-3 sm:px-4 sm:py-4 text-center text-slate-500 text-[10px] sm:text-xs hidden sm:table-cell">{row.lost}</td>
                                  <td className="px-2 py-3 sm:px-4 sm:py-4 text-center text-slate-400 text-[10px] sm:text-xs">{row.goalsFor - row.goalsAgainst}</td>
                                  <td className="px-3 py-3 sm:px-6 sm:py-4 text-center font-black text-cyan-400 text-[10px] sm:text-xs">{row.points}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {(state.world.districtCup.final || state.world.districtCup.winnerId) && (
                  <div className="flex flex-col items-center py-6 sm:py-10 gap-4 sm:gap-8">
                    <h4 className="text-sm sm:text-lg font-black text-yellow-400 uppercase tracking-widest border-b border-yellow-500/30 pb-2">Grande Final</h4>
                    {state.world.districtCup.final && (() => {
                      const match = state.world.districtCup.final;
                      const home = state.teams[match.homeTeamId];
                      const away = state.teams[match.awayTeamId];
                      const winnerId = state.world.districtCup.winnerId;

                      return (
                        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12 bg-black/60 border border-yellow-500/30 p-6 sm:p-10 rounded-2xl sm:rounded-[2.5rem] shadow-[0_0_30px_rgba(234,179,8,0.15)] relative overflow-hidden group w-full sm:w-auto">
                          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div
                            onClick={() => setSelectedTeamView(home.id)}
                            className={`flex flex-col items-center gap-3 sm:gap-4 ${winnerId === home.id ? 'scale-110 transition-transform' : 'opacity-80'} relative z-10 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all`}
                          >
                            <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-4 ${winnerId === home.id ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-white/5 bg-white/5'}`}>
                              {home?.logo ? (
                                <TeamLogo
                                  primaryColor={home.logo.primary}
                                  secondaryColor={home.logo.secondary}
                                  accentColor={home.logo.accent}
                                  shapeId={home.logo.shapeId}
                                  patternId={home.logo.patternId as any}
                                  symbolId={home.logo.symbolId}
                                  size={window.innerWidth < 640 ? 40 : 64}
                                />
                              ) : (
                                <Globe size={window.innerWidth < 640 ? 32 : 48} className={winnerId === home.id ? 'text-yellow-400' : 'text-slate-500'} />
                              )}
                            </div>
                            <span className={`font-black text-xs sm:text-xl uppercase italic tracking-tight ${winnerId === home.id ? 'text-yellow-400 neon-text-amber' : 'text-white'}`}>{home.name}</span>
                          </div>

                          <div className="flex flex-col items-center gap-1 sm:gap-3 relative z-10">
                            <div className="text-4xl sm:text-7xl font-black text-white tracking-tighter flex gap-4 sm:gap-8 italic drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                              <span>{match.homeScore}</span>
                              <span className="text-white/10">:</span>
                              <span>{match.awayScore}</span>
                            </div>
                            <div className="px-3 py-1 glass-card rounded-full border border-white/5">
                              <span className="text-[8px] sm:text-[10px] text-white/40 uppercase tracking-[0.2em] font-black italic">Tempo Normal</span>
                            </div>
                          </div>

                          <div
                            onClick={() => setSelectedTeamView(away.id)}
                            className={`flex flex-col items-center gap-3 sm:gap-4 ${winnerId === away.id ? 'scale-110 transition-transform' : 'opacity-80'} relative z-10 cursor-pointer hover:bg-white/5 p-2 rounded-xl transition-all`}
                          >
                            <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-4 ${winnerId === away.id ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-white/5 bg-white/5'}`}>
                              {away?.logo ? (
                                <TeamLogo
                                  primaryColor={away.logo.primary}
                                  secondaryColor={away.logo.secondary}
                                  accentColor={away.logo.accent}
                                  shapeId={away.logo.shapeId}
                                  patternId={away.logo.patternId as any}
                                  symbolId={away.logo.symbolId}
                                  size={window.innerWidth < 640 ? 40 : 64}
                                />
                              ) : (
                                <Globe size={window.innerWidth < 640 ? 32 : 48} className={winnerId === away.id ? 'text-yellow-400' : 'text-slate-500'} />
                              )}
                            </div>
                            <span className={`font-black text-xs sm:text-xl uppercase italic tracking-tight ${winnerId === away.id ? 'text-yellow-400 neon-text-amber' : 'text-white'}`}>{away.name}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {(state.world.districtCup?.teams?.length || 0) === 0 && (
                  <div className="col-span-full text-center py-10 text-slate-500">
                    A Copa dos Distritos começa após a Copa Elite.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {
        activeWorldTab === 'market' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            {state.world.status === 'LOBBY' && (
              <div className="glass-card-neon border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between bg-cyan-500/5 group hover:bg-cyan-500/10 transition-all cursor-pointer mb-6"
                onClick={() => props.onTabChange?.('draft')}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(34,211,238,0.4)] group-hover:scale-110 transition-transform">
                    <Rocket size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase italic">Draft Genesis em Aberto</h4>
                    <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-tighter">Clique aqui para ir ao HUB DE DRAFT e montar seu elenco</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-cyan-500 group-hover:translate-x-1 transition-transform" />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between gap-3 sm:gap-4 w-full">
                <div className="flex-1 relative group">
                  <Search size={window.innerWidth < 640 ? 12 : 14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    placeholder="BUSCAR ATLETA..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-[9px] sm:text-xs text-white font-bold focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-slate-600 uppercase tracking-widest shadow-inner"
                  />
                </div>
                <button
                  onClick={() => setShowMarketFilters(!showMarketFilters)}
                  className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 font-black text-[8px] sm:text-[10px] uppercase tracking-widest transition-all border shrink-0 ${showMarketFilters ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-white/5 text-cyan-400 border-white/10'}`}
                >
                  <Sliders size={window.innerWidth < 640 ? 12 : 14} />
                  <span className="hidden sm:inline">{showMarketFilters ? 'Fechar' : 'Filtrar'}</span>
                  <span className="sm:hidden">{showMarketFilters ? 'X' : 'Filtro'}</span>
                </button>
              </div>

              {showMarketFilters && (
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  {/* District Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Setor</label>
                    <select
                      value={marketDistrict}
                      onChange={(e) => setMarketDistrict(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer"
                    >
                      <option value="all">TODOS OS SETORES</option>
                      <option value="NORTE">SETOR NORTE</option>
                      <option value="SUL">SETOR SUL</option>
                      <option value="LESTE">SETOR LESTE</option>
                      <option value="OESTE">SETOR OESTE</option>
                    </select>
                  </div>

                  {/* Position Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Posição</label>
                    <select
                      value={marketPosition}
                      onChange={(e) => setMarketPosition(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer"
                    >
                      <option value="all">TODAS POSIÇÕES</option>
                      <option value="GOL">GOLEIRO</option>
                      <option value="ZAG">ZAGUEIRO</option>
                      <option value="MEI">MEIO-CAMPISTA</option>
                      <option value="ATA">ATACANTE</option>
                    </select>
                  </div>

                  {/* Satisfaction Filter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Satisfação Máxima</label>
                      <span className="text-cyan-400 font-black text-[9px] sm:text-[10px]">{marketSatisfactionMax}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={marketSatisfactionMax}
                      onChange={(e) => setMarketSatisfactionMax(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Exiled Only Toggle */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 glass-card p-3 rounded-xl border-white/5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Apenas Exilados</label>
                    <button
                      onClick={() => setMarketOnlyExiled(!marketOnlyExiled)}
                      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${marketOnlyExiled ? 'bg-cyan-500' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${marketOnlyExiled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Points Slider */}
                  <div className="space-y-4 sm:space-y-6 scrollbar-hide">
                    <div className="flex justify-between items-center">
                      <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Rating Range</label>
                      <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400 font-black">{marketPointsMin} - {marketPointsMax}</span>
                    </div>
                    <div className="flex gap-4">
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={marketPointsMin}
                        onChange={(e) => setMarketPointsMin(parseInt(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                      />
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="10"
                        value={marketPointsMax}
                        onChange={(e) => setMarketPointsMax(parseInt(e.target.value))}
                        className="flex-1 h-1 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] text-white/35">
                Mercado filtrado: {filteredMarketPlayers.length} atletas
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
                {[
                  { id: 'cards', label: 'Cards', icon: LayoutGrid },
                  { id: 'list', label: 'Lista', icon: Rows3 },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setMarketViewMode(mode.id as 'cards' | 'list')}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      marketViewMode === mode.id ? 'bg-cyan-500 text-black' : 'text-white/45 hover:text-white'
                    }`}
                  >
                    <mode.icon size={12} />
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {marketViewMode === 'cards' ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                {filteredMarketPlayers.map(player => (
                  <PlayerCard key={player.id} player={player} onClick={setSelectedPlayer} onProposta={handleMakeProposal} onTeamClick={setSelectedTeamView} variant="micro" />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-white/5 bg-white/[0.03] px-4 py-3 text-[8px] font-black uppercase tracking-[0.25em] text-white/35">
                  <span>Jogador</span>
                  <span>Pos</span>
                  <span>Distrito</span>
                  <span>Score</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {filteredMarketPlayers.map(player => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayer(player)}
                      className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{player.nickname}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">{player.name}</p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">{player.role}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/45">{player.district}</span>
                      <span className="text-lg font-black italic text-white">{player.totalRating}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      {
        activeWorldTab === 'ranking' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1 group">
                <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center glass-card border-white/5 rounded-2xl overflow-hidden transition-all focus-within:border-cyan-500/50">
                  <div className="pl-4 sm:pl-6 pr-2 text-white/20 group-focus-within:text-cyan-400 transition-colors">
                    <Search size={window.innerWidth < 640 ? 14 : 20} />
                  </div>
                  <input
                    value={rankingSearch}
                    onChange={(event) => setRankingSearch(event.target.value)}
                    type="text"
                    placeholder="BUSCAR ATLETA DE ELITE..."
                    className="bg-transparent px-2 py-3 sm:py-5 text-[9px] sm:text-[10px] font-black text-white w-full focus:outline-none uppercase tracking-[0.2em] placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowRankingFilters(!showRankingFilters)}
                  className={`px-4 py-2 rounded-xl flex items-center gap-2 font-black text-[8px] sm:text-[10px] uppercase tracking-widest transition-all border ${showRankingFilters ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 text-cyan-400 border-white/10'}`}
                >
                  <Sliders size={12} />
                  Filtros
                </button>
                <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
                  {[
                    { id: 'list', label: 'Lista', icon: Rows3 },
                    { id: 'cards', label: 'Cards', icon: LayoutGrid },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRankingViewMode(mode.id as 'cards' | 'list')}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                        rankingViewMode === mode.id ? 'bg-cyan-500 text-black' : 'text-white/45 hover:text-white'
                      }`}
                    >
                      <mode.icon size={12} />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {showRankingFilters && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-black/35 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Setor</label>
                    <select value={rankingDistrict} onChange={(e) => setRankingDistrict(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer">
                      <option value="all">TODOS OS SETORES</option>
                      <option value="NORTE">SETOR NORTE</option>
                      <option value="SUL">SETOR SUL</option>
                      <option value="LESTE">SETOR LESTE</option>
                      <option value="OESTE">SETOR OESTE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Liga</label>
                    <select value={rankingLeague} onChange={(e) => setRankingLeague(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer">
                      <option value="all">TODAS AS LIGAS</option>
                      <option value="Cyan">LIGA CYAN</option>
                      <option value="Orange">LIGA ORANGE</option>
                      <option value="Purple">LIGA PURPLE</option>
                      <option value="Green">LIGA GREEN</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Posicao</label>
                    <select value={rankingPosition} onChange={(e) => setRankingPosition(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer">
                      <option value="all">TODAS POSICOES</option>
                      <option value="GOL">GOLEIRO</option>
                      <option value="ZAG">ZAGUEIRO</option>
                      <option value="MEI">MEIO-CAMPISTA</option>
                      <option value="ATA">ATACANTE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Faixa de Rating</label>
                    <select value={rankingRatingBand} onChange={(e) => setRankingRatingBand(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer">
                      <option value="all">QUALQUER RATING</option>
                      <option value="900+">900+</option>
                      <option value="800-899">800 A 899</option>
                      <option value="700-799">700 A 799</option>
                      <option value="0-699">ATE 699</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Contrato</label>
                    <select value={rankingAvailability} onChange={(e) => setRankingAvailability(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[9px] sm:text-[10px] text-white font-bold focus:outline-none appearance-none uppercase tracking-widest cursor-pointer">
                      <option value="all">TODOS</option>
                      <option value="free">LIVRES</option>
                      <option value="signed">EM CLUBE</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {rankingViewMode === 'list' ? (
              <div className="space-y-4">
                {(['GOL', 'ZAG', 'MEI', 'ATA'] as const).map(role => {
                  const rolePlayers = rankingPlayersByPosition[role];
                  if (rolePlayers.length === 0) return null;

                  return (
                    <div key={role} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                      <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                          {role === 'GOL' ? 'Goleiros' : role === 'ZAG' ? 'Zagueiros' : role === 'MEI' ? 'Meio-Campistas' : 'Atacantes'}
                        </h3>
                      </div>
                      <div className="divide-y divide-white/[0.04]">
                        {rolePlayers.map(player => {
                          const overallIndex = rankingIndexMap[player.id];
                          const isTop3 = overallIndex <= 3;

                          return (
                            <div
                              key={player.id}
                              onClick={() => setSelectedPlayer(player)}
                              className="glass-card-neon border-white/5 p-3 sm:p-4 cursor-pointer hover:scale-[1.01] transition-all flex items-center justify-between group relative overflow-hidden"
                            >
                              <div className="flex items-center gap-3 sm:gap-6 relative z-10 min-w-0">
                                <div className="w-8 sm:w-12 text-center shrink-0">
                                  <span className={`text-base sm:text-2xl font-black italic ${overallIndex === 1 ? 'text-amber-400 neon-text-amber' :
                                    overallIndex === 2 ? 'text-slate-300 neon-text-white' :
                                      overallIndex === 3 ? 'text-amber-700' : 'text-white/10'
                                    }`}>
                                    #{overallIndex}
                                  </span>
                                </div>

                                <div className="w-10 h-10 sm:w-14 sm:h-14 glass-card rounded-lg sm:rounded-xl border border-white/5 flex items-center justify-center group-hover:border-cyan-500/30 transition-all shrink-0 overflow-hidden relative">
                                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent" />
                                  <span className="text-sm sm:text-xl font-black text-white italic drop-shadow-md">{player.totalRating}</span>
                                </div>

                                <div className="flex flex-col min-w-0">
                                  <div className="text-xs sm:text-lg font-black text-white uppercase italic tracking-tight group-hover:translate-x-1 transition-transform truncate">{player.name}</div>
                                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                                    <span className="text-[7px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest px-1.5 sm:px-2 py-0.5 glass-card rounded-md border border-cyan-500/20">
                                      {player.role}
                                    </span>
                                    <span className="text-[7px] sm:text-[9px] text-white/30 font-bold uppercase tracking-widest truncate">
                                      {player.contract.teamId ? state.teams[player.contract.teamId]?.name : 'Livre'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1 sm:gap-2 relative z-10 shrink-0 ml-2">
                                <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 glass-card rounded-full border border-white/5 ${player.satisfaction > 80 ? 'text-emerald-400' : player.satisfaction > 50 ? 'text-amber-400' : 'text-rose-400'
                                  }`}>
                                  <Activity size={window.innerWidth < 640 ? 8 : 10} />
                                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest">{player.satisfaction}%</span>
                                </div>
                                <div className="flex gap-0.5 sm:gap-1">
                                  {player.badges.slot1 && <div className="w-5 h-5 sm:w-6 sm:h-6 glass-card rounded-lg border border-white/5 flex items-center justify-center"><Star size={window.innerWidth < 640 ? 8 : 10} className="text-white/20" /></div>}
                                  {player.badges.slot2 && <div className="w-5 h-5 sm:w-6 sm:h-6 glass-card rounded-lg border border-white/5 flex items-center justify-center"><Star size={window.innerWidth < 640 ? 8 : 10} className="text-white/20" /></div>}
                                </div>
                              </div>

                              {isTop3 && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                {filteredRankingPlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onClick={setSelectedPlayer}
                    variant="compact"
                    onTeamClick={setSelectedTeamView}
                  />
                ))}
              </div>
            )}
          </div>
        )
      }

      {
        activeWorldTab === 'teams' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {(Object.values(state.teams) as Team[])
              .map(team => {
                const totalRating = team.squad.reduce((acc, id) => acc + (state.players[id]?.totalRating || 0), 0);
                return { ...team, totalRating };
              })
              .sort((a, b) => b.totalRating - a.totalRating)
              .map((team, index) => (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamView(team.id)}
                  className="glass-card-neon border-white/5 rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 cursor-pointer hover:scale-[1.02] transition-all flex flex-col gap-4 sm:gap-6 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 glass-card rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-fuchsia-500/30 transition-all overflow-hidden">
                      {team.logo ? (
                        <TeamLogo
                          primaryColor={team.logo.primary}
                          secondaryColor={team.logo.secondary}
                          accentColor={team.logo.accent}
                          shapeId={team.logo.shapeId}
                          patternId={team.logo.patternId as any}
                          symbolId={team.logo.symbolId}
                          size={window.innerWidth < 640 ? 32 : 40}
                        />
                      ) : (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                          <TeamLogo
                            primaryColor="#a855f7"
                            secondaryColor="#7e22ce"
                            patternId="none"
                            symbolId="Shield"
                            size={window.innerWidth < 640 ? 24 : 32}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-0.5 sm:mb-1 italic">Ranking</div>
                      <div className="text-xl sm:text-3xl font-black text-white italic drop-shadow-lg group-hover:text-fuchsia-400 transition-colors">#{index + 1}</div>
                    </div>
                  </div>

                  <div className="space-y-0.5 sm:space-y-1">
                    <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight group-hover:translate-x-1 transition-transform truncate">{team.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] sm:text-[10px] text-fuchsia-400 font-black uppercase tracking-widest">{team.squad.length} Atletas</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[8px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest truncate">{team.district}</span>
                    </div>
                  </div>

                  <div className="pt-4 sm:pt-6 border-t border-white/5 flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[7px] sm:text-[8px] text-white/20 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Power Score</span>
                      <span className="text-xl sm:text-3xl font-black text-white neon-text-white italic">{team.totalRating}</span>
                    </div>
                    <div className="p-2 sm:p-3 glass-card rounded-lg sm:rounded-xl border-white/5 group-hover:bg-white/10 transition-all">
                      <ChevronRight size={window.innerWidth < 640 ? 16 : 20} className="text-white/40 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )
      }

      {
        selectedPlayer && (
          <PlayerModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )
      }
    </div >
  );
}

