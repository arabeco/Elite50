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
import { TeamModal } from '../TeamModal';
import { TeamLogo } from '../TeamLogo';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { getMatchStatus } from '../../utils/matchUtils';
import { Player } from '../../types';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save } = LucideIcons;


export const CompetitionTab = (props: any) => {
  const { state, setState } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches, userTeamMatches } = dashData;
  const {
    handleMockReport,
    selectedMatchReport,
    setSelectedMatchReport,
    setReportSecond
  } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const [selectedTeamView, setSelectedTeamView] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handleRevealMatch = (matchId: string) => {
    setState(prev => {
      const newState = { ...prev };
      // Search in all leagues
      Object.keys(newState.world.leagues).forEach(key => {
        const league = newState.world.leagues[key as any];
        const match = league.matches.find(m => m.id === matchId);
        if (match) match.revealed = true;
      });
      // Search in cups
      const ecMatch = [...(newState.world.eliteCup.bracket.oitavas || []), ...(newState.world.eliteCup.bracket.quartas || []), ...(newState.world.eliteCup.bracket.semis || []), newState.world.eliteCup.bracket.final].find(m => m?.id === matchId);
      if (ecMatch) ecMatch.revealed = true;

      const dcMatch = newState.world.districtCup.matches.find(m => m.id === matchId);
      if (dcMatch) dcMatch.revealed = true;
      if (newState.world.districtCup.final?.id === matchId) newState.world.districtCup.final.revealed = true;

      return newState;
    });
  };

  const [timeLeft, setTimeLeft] = useState<string>('');

  React.useEffect(() => {
    const nextMatch = upcomingMatches[0];
    if (!nextMatch) return;

    const timer = setInterval(() => {
      if (state.world.status === 'LOBBY') {
        setTimeLeft('--D • --H');
        return;
      }

      const matchDate = new Date(`${nextMatch.date}T${nextMatch.time}`);
      const now = new Date(state.world.currentDate);
      const diff = matchDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('AGORA');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}D • ${hours}H`);
      } else {
        setTimeLeft(`${hours}H • ${minutes}M`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [upcomingMatches, state.world.currentDate]);

  const calendarEvents = React.useMemo(() => {
    const events: any[] = [];

    if (userTeamMatches) {
      userTeamMatches.forEach(m => {
        const matchDate = new Date(`${m.date}T${m.time}`);

        events.push({
          id: `match_${m.id}`,
          type: 'match',
          date: matchDate,
          status: m.played ? 'played' : 'scheduled',
          data: m
        });

        // Generate news for played matches
        if (m.played) {
          const isRevealed = m.revealed !== false;
          const isWin = (m.homeId === userTeam?.id && m.homeScore > m.awayScore) ||
            (m.awayId === userTeam?.id && m.awayScore > m.homeScore);
          const isDraw = m.homeScore === m.awayScore;

          if (isWin) {
            events.push({
              id: `news_win_${m.id}`,
              type: 'news',
              date: new Date(matchDate.getTime() + 7200000), // 2 hours after match
              title: isRevealed ? 'Vitória Convincente' : 'Fim de Jogo',
              subtitle: isRevealed ? `O ${userTeam?.name} superou o ${m.homeId === userTeam?.id ? m.away : m.home} e subiu na tabela.` : 'O resultado desta partida já foi processado e aguarda sua leitura.'
            });
          } else if (!isDraw) {
            events.push({
              id: `news_loss_${m.id}`,
              type: 'news',
              date: new Date(matchDate.getTime() + 7200000),
              title: isRevealed ? 'Derrota Dolorosa' : 'Fim de Jogo',
              subtitle: isRevealed ? `O técnico precisa rever a estratégia após o revés contra o ${m.homeId === userTeam?.id ? m.away : m.home}.` : 'O resultado desta partida já foi processado e aguarda sua leitura.'
            });
          }
        }
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [userTeamMatches, userTeam]);

  const nextMatch = upcomingMatches[0];
  if (!nextMatch) return (
    <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
      <Calendar size={48} className="opacity-20" />
      <span className="text-xs font-black uppercase tracking-widest italic">Nenhuma partida agendada</span>
    </div>
  );

  const homeTeam = state.teams[nextMatch.homeId];
  const awayTeam = state.teams[nextMatch.awayId];

  const matchDateTime = new Date(`${nextMatch.date}T${nextMatch.time}`);
  const formattedDate = matchDateTime.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  }).replace('.', '').toUpperCase();

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto pb-12 px-2 sm:px-0">
      {/* Main Highlight Match - Futuristic Redesign */}
      <div className="glass-card-neon white-gradient-sheen relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border-cyan-400/30 p-5 sm:p-12 shadow-[0_0_50px_rgba(34,211,238,0.15)] group transition-all duration-700 hover:border-cyan-400/50">
        {/* Neon Glow Effects */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 blur-[80px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 blur-[80px] translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-12">
          {/* Left Side: Info */}
          <div className="flex-1 space-y-3 sm:space-y-6 text-center md:text-left">
            <div className="space-y-0.5 sm:space-y-2">
              <h3 className="text-[9px] sm:text-xs font-black text-cyan-400 uppercase tracking-[0.4em] sm:tracking-[0.5em] italic">
                PRÓXIMO JOGO
              </h3>
              <div className="text-3xl sm:text-7xl font-black text-white tracking-tighter italic leading-tight">
                {state.world.status === 'LOBBY' ? '--D • --H' : timeLeft}
              </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 text-white/80 font-black text-xs sm:text-lg uppercase tracking-tight italic">
                        <button
                          type="button"
                          onClick={() => setSelectedTeamView(nextMatch.homeId)}
                          className={`truncate max-w-[100px] text-left transition hover:text-cyan-300 sm:max-w-none ${nextMatch.homeId === userTeam?.id ? 'text-cyan-400' : ''}`}
                        >
                          {nextMatch.home}
                        </button>
                        <span className="text-white/20 shrink-0 text-[10px] sm:text-base">VS</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTeamView(nextMatch.awayId)}
                          className={`truncate max-w-[100px] text-left transition hover:text-cyan-300 sm:max-w-none ${nextMatch.awayId === userTeam?.id ? 'text-cyan-400' : ''}`}
                        >
                          {nextMatch.away}
                        </button>
              </div>
              <p className="text-[8px] sm:text-xs text-slate-500 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                {state.world.status === 'LOBBY' ? '--/--' : formattedDate} • {state.world.status === 'LOBBY' ? '--:--' : nextMatch.time} • RODADA {nextMatch.id.split('_')[1]}
              </p>
            </div>
          </div>

          {/* Right Side: Logos */}
          <div className="flex items-center gap-3 sm:gap-8 relative scale-90 sm:scale-100">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden sm:block" />

            <button type="button" onClick={() => setSelectedTeamView(nextMatch.homeId)} className="relative group/home">
              <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full opacity-0 group-hover/home:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 sm:w-28 sm:h-28 rounded-xl sm:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-md transition-transform duration-500 group-hover/home:scale-110 group-hover/home:border-cyan-500/50">
                {homeTeam?.logo ? (
                  <TeamLogo
                    primaryColor={homeTeam.logo.primary}
                    secondaryColor={homeTeam.logo.secondary}
                    accentColor={homeTeam.logo.accent}
                    shapeId={homeTeam.logo.shapeId}
                    patternId={homeTeam.logo.patternId as any}
                    symbolId={homeTeam.logo.symbolId}
                    size={window.innerWidth < 640 ? 28 : 64}
                  />
                ) : (
                  <Shield size={window.innerWidth < 640 ? 28 : 40} className="text-white/20 sm:size-[48px]" />
                )}
              </div>
            </button>

            <div className="text-base sm:text-2xl font-black text-white/10 italic z-10">VS</div>

            <button type="button" onClick={() => setSelectedTeamView(nextMatch.awayId)} className="relative group/away">
              <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full opacity-0 group-hover/away:opacity-100 transition-opacity duration-500" />
              <div className="w-14 h-14 sm:w-28 sm:h-28 rounded-xl sm:rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl relative overflow-hidden backdrop-blur-md transition-transform duration-500 group-hover/away:scale-110 group-hover/away:border-purple-500/50">
                {awayTeam?.logo ? (
                  <TeamLogo
                    primaryColor={awayTeam.logo.primary}
                    secondaryColor={awayTeam.logo.secondary}
                    accentColor={awayTeam.logo.accent}
                    shapeId={awayTeam.logo.shapeId}
                    patternId={awayTeam.logo.patternId as any}
                    symbolId={awayTeam.logo.symbolId}
                    size={window.innerWidth < 640 ? 28 : 64}
                  />
                ) : (
                  <Shield size={window.innerWidth < 640 ? 28 : 40} className="text-white/20 sm:size-[48px]" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Events Redesign */}
      <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
        <div className="flex items-center justify-between px-1 sm:px-2">
          <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2 sm:gap-3">
            <Calendar size={window.innerWidth < 640 ? 14 : 16} className="text-cyan-400" />
            Cronograma & Notícias
          </h3>
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Temporada 2050</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {calendarEvents.map((event: any) => {
            if (event.type === 'match') {
              const homeTeam = state.teams[event.data.homeId];
              const awayTeam = state.teams[event.data.awayId];
              const isPlayed = event.status === 'played';
              const isHomeUser = event.data.homeId === userTeam?.id;
              const isAwayUser = event.data.awayId === userTeam?.id;

              return (
                <div
                  key={event.id}
                  onClick={() => isPlayed && setSelectedMatchReport(event.data)}
                  className={`group relative overflow-hidden rounded-lg sm:rounded-xl border transition-all duration-300 ${isPlayed
                    ? 'cursor-pointer bg-slate-900/40 border-slate-500/10 opacity-60 hover:opacity-100 hover:border-cyan-500/30'
                    : 'bg-gradient-to-r from-cyan-950/20 to-black/40 border-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]'
                    }`}
                >
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-2 sm:p-3 flex items-center justify-between gap-2 relative z-10 h-12 sm:h-16">
                    {/* Date & Time */}
                    <div className="flex flex-col items-center justify-center min-w-[2.5rem] sm:min-w-[4rem] pr-2 sm:pr-3 border-r border-white/5 h-full">
                      <span className="text-[7px] sm:text-[10px] font-black text-white/50 uppercase leading-none mb-0.5">
                        {state.world.status === 'LOBBY' ? '--/--' : event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()}
                      </span>
                      <span className={`text-[8px] sm:text-[11px] font-bold ${isPlayed ? 'text-slate-500' : 'text-cyan-400'} leading-none`}>
                        {isPlayed ? 'FIM' : state.world.status === 'LOBBY' ? '--:--' : event.data.time}
                      </span>
                    </div>

                    {/* Teams & Score */}
                    <div className="flex-1 flex items-center justify-between gap-1.5 sm:gap-3 min-w-0">
                      {/* Home */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-end min-w-0">
                        <button
                          type="button"
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            setSelectedTeamView(event.data.homeId);
                          }}
                          className={`truncate text-right text-[8px] font-bold uppercase transition hover:text-cyan-300 sm:text-[11px] ${isHomeUser ? 'text-cyan-400' : 'text-slate-400'}`}
                        >
                          {homeTeam?.name || event.data.home}
                        </button>
                        <div className="w-4 h-4 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center">
                          {homeTeam?.logo ? (
                            <TeamLogo
                              primaryColor={homeTeam.logo.primary}
                              secondaryColor={homeTeam.logo.secondary}
                              accentColor={homeTeam.logo.accent}
                              shapeId={homeTeam.logo.shapeId}
                              patternId={homeTeam.logo.patternId as any}
                              symbolId={homeTeam.logo.symbolId}
                              size={window.innerWidth < 640 ? 16 : 28}
                            />
                          ) : (
                            <div className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-slate-700" />
                          )}
                        </div>
                      </div>

                      {/* VS/Score */}
                      <div className="flex items-center justify-center min-w-[1.5rem] sm:min-w-[2rem]">
                        {isPlayed ? (
                          <span className="text-[9px] sm:text-[12px] font-black text-white tracking-wider bg-white/5 px-1 sm:px-1.5 py-0.5 rounded border border-white/5">
                            {event.data.revealed !== false ? `${event.data.homeScore}-${event.data.awayScore}` : '??-??'}
                          </span>
                        ) : (
                          <span className="text-[7px] sm:text-[10px] font-black text-white/10 italic">VS</span>
                        )}
                      </div>

                      {/* Away */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className="w-4 h-4 sm:w-7 sm:h-7 shrink-0 flex items-center justify-center">
                          {awayTeam?.logo ? (
                            <TeamLogo
                              primaryColor={awayTeam.logo.primary}
                              secondaryColor={awayTeam.logo.secondary}
                              accentColor={awayTeam.logo.accent}
                              shapeId={awayTeam.logo.shapeId}
                              patternId={awayTeam.logo.patternId as any}
                              symbolId={awayTeam.logo.symbolId}
                              size={window.innerWidth < 640 ? 16 : 28}
                            />
                          ) : (
                            <div className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-slate-700" />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            setSelectedTeamView(event.data.awayId);
                          }}
                          className={`truncate text-left text-[8px] font-bold uppercase transition hover:text-cyan-300 sm:text-[11px] ${isAwayUser ? 'text-cyan-400' : 'text-slate-400'}`}
                        >
                          {awayTeam?.name || event.data.away}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // News Item (Simplified)
            return (
              <div
                key={event.id}
                className="group relative overflow-hidden rounded-lg sm:rounded-xl border border-purple-500/20 bg-purple-900/10 p-2.5 sm:p-4 flex items-center gap-3 sm:gap-4 hover:border-purple-500/50 transition-all"
              >
                <div className="p-2 sm:p-3 bg-purple-500/20 rounded-lg sm:rounded-xl text-purple-400">
                  <Newspaper size={window.innerWidth < 640 ? 16 : 20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] sm:text-[13px] font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                    {event.title}
                  </h4>
                  <p className="text-[9px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                    {event.subtitle}
                  </p>
                </div>
                <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                  {event.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Report Modal */}
      {selectedMatchReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 sm:bg-black/80 backdrop-blur-md sm:backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedMatchReport(null)}
              className="fixed sm:absolute top-4 sm:-top-12 right-4 sm:right-0 z-[60] p-2 bg-black/50 sm:bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
            >
              <X size={window.innerWidth < 640 ? 20 : 24} />
            </button>
            <div className="pb-8">
              <PostGameReport
                match={selectedMatchReport}
                homeTeam={state.teams[selectedMatchReport.homeTeamId || selectedMatchReport.homeId]}
                awayTeam={state.teams[selectedMatchReport.awayTeamId || selectedMatchReport.awayId]}
                players={state.players}
                onClose={() => setSelectedMatchReport(null)}
                onReveal={handleRevealMatch}
                onTeamClick={setSelectedTeamView}
                onPlayerClick={setSelectedPlayer}
              />
            </div>
          </div>
        </div>
      )}

      {selectedTeamView && state.teams[selectedTeamView] && (
        <TeamModal
          team={state.teams[selectedTeamView]}
          players={state.players}
          onClose={() => setSelectedTeamView(null)}
          onPlayerClick={(player) => {
            setSelectedPlayer(player);
            setSelectedTeamView(null);
          }}
          onTeamClick={setSelectedTeamView}
        />
      )}

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
