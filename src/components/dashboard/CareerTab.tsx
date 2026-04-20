import React, { useState } from 'react';
import { useGame, useGameState, useGameDispatch } from '../../store/GameContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMatchSimulation } from '../../hooks/useMatchSimulation';
import { useTransfers } from '../../hooks/useTransfers';
import { useTactics } from '../../hooks/useTactics';
import { useGameDay } from '../../hooks/useGameDay';
import { useTraining } from '../../hooks/useTraining';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { HairCalibrationPanel } from '../HairCalibrationPanel';
import { TeamLogo } from '../TeamLogo';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { getMatchStatus } from '../../utils/matchUtils';
import { Player } from '../../types';
import { SEASON_DAYS } from '../../constants/gameConstants';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Play, Copy } = LucideIcons;


export const CareerTab = (props: any) => {
  const { setState, addToast, togglePause, setTimeSpeed } = useGameDispatch();
  const { state, isPaused, timeSpeed, worldId } = useGameState();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const {
    handleStartReport,
    handleMockReport,
    selectedMatchReport,
    setSelectedMatchReport,
    isWatchingReport,
    setIsWatchingReport,
    reportSecond,
    setReportSecond
  } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay, handleStartNewSeason } = useGameDay();
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [gmRandomPlayer, setGmRandomPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const handleSimulateGameReport = (mode: 'live' | 'finished') => {
    handleMockReport(mode, "MANCHETE GM: Escândalo em Neo-City! Time mockado vence de goleada histórica!");
  };

  const handleOpenRandomPlayer = () => {
    // Generate a random player from the state for preview
    const playerIds = Object.keys(state.players);
    if (playerIds.length > 0) {
      const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
      setGmRandomPlayer(state.players[randomId]);
    }
  };

  const worldJoinCode = state.world.access?.joinCode || (worldId ? `ELITE-${worldId.slice(-6)}` : 'ELITE-LOCAL');
  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(worldJoinCode);
      addToast('Codigo do mundo copiado', 'success');
    } catch {
      addToast(`Codigo do mundo: ${worldJoinCode}`, 'info');
    }
  };

  console.log('Dashboard: Renderizando aba Carreira...');

  if (selectedMatchReport) {
    const homeTeam = state.teams[selectedMatchReport.homeTeamId];
    const awayTeam = state.teams[selectedMatchReport.awayTeamId];

    if (homeTeam && awayTeam) {
      const matchStatus = selectedMatchReport.status;

      if (matchStatus === 'PLAYING' || (isWatchingReport && reportSecond < 360)) {
        return (
          <div className="max-w-2xl mx-auto py-8">
            <LiveReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              currentSecond={reportSecond}
            />
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setSelectedMatchReport(null);
                  setIsWatchingReport(false);
                  setReportSecond(0);
                }}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
              >
                VOLTAR AO GM PANEL
              </button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="max-w-2xl mx-auto py-8 animate-in zoom-in-95 duration-500">
            <PostGameReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              onClose={() => {
                setSelectedMatchReport(null);
                setReportSecond(0);
              }}
            />
            <button
              onClick={() => {
                setSelectedMatchReport(null);
                setReportSecond(0);
              }}
              className="mt-6 w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
            >
              FECHAR RELATÓRIO
            </button>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column - Team Context */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          {/* User Team Card */}
          <div className="glass-card-neon white-gradient-sheen border-cyan-500/30 p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-[0_0_30px_rgba(34,211,238,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-cyan-500/10 transition-colors duration-700" />

            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
                <div className="w-14 h-14 sm:w-20 sm:h-20 glass-card rounded-xl sm:rounded-2xl flex items-center justify-center border border-cyan-500/30">
                  {userTeam ? (
                    <TeamLogo
                      primaryColor={userTeam.logo?.primary || '#fff'}
                      secondaryColor={userTeam.logo?.secondary || '#000'}
                      patternId={userTeam.logo?.patternId as any}
                      symbolId={userTeam.logo?.symbolId}
                      size={window.innerWidth < 640 ? 36 : 56}
                    />
                  ) : (
                    <Users size={window.innerWidth < 640 ? 24 : 36} className="text-cyan-400/50" />
                  )}
                </div>
              </div>

              <div className="text-left flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight neon-text-cyan truncate">
                    {userTeam?.name || 'SEM CLUBE'}
                  </h2>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                    <Trophy size={8} className="text-cyan-400" />
                    <span className="text-[7px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                      {userTeam?.district || 'DISTRITO'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 sm:mt-2">
                  <div className="flex items-center gap-1">
                    <Star size={8} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] sm:text-sm font-mono font-black text-white">4.8</span>
                    <span className="text-[7px] text-cyan-400/50 uppercase tracking-widest ml-1">Reputação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tactics & Training Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="glass-card-neon border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)] p-3 sm:p-5 rounded-2xl transition-all duration-500">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Target size={14} />
                </div>
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Resumo Tático</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Estilo</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-purple-400 uppercase italic truncate">{userTeam?.tactics.playStyle}</span>
                </div>
                <div className="flex flex-col gap-1 border-x border-white/5 px-2">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Mente</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-fuchsia-400 uppercase italic truncate">{userTeam?.tactics.mentality}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest text-right">Ataque</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-white uppercase italic truncate">
                    {userTeam?.tactics.linePosition <= 30 ? 'Recuada' : userTeam?.tactics.linePosition >= 70 ? 'Alta' : 'Média'}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card-neon border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] p-3 sm:p-5 rounded-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                    <Flame size={14} />
                  </div>
                  <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Card Lab</h3>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[6px] sm:text-[8px] font-black text-emerald-400 uppercase tracking-widest">Ativo</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-black">Próxima Evolução:</span>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">02 DIAS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Side Panels */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Calendar Mini View */}
          <div className="glass-card-neon white-gradient-sheen border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)] p-3 sm:p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <Calendar size={14} />
                </div>
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Calendário</h3>
              </div>
            </div>

            <div className="space-y-2">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.slice(0, 2).map((match, idx) => {
                  const opponent = state.teams[match.homeTeamId === userTeam?.id ? match.awayTeamId : match.homeTeamId];
                  return (
                    <div key={match.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center border border-white/10">
                          {opponent ? (
                            <TeamLogo
                              primaryColor={opponent.logo?.primary || '#fff'}
                              secondaryColor={opponent.logo?.secondary || '#000'}
                              patternId={opponent.logo?.patternId as any}
                              symbolId={opponent.logo?.symbolId}
                              size={16}
                            />
                          ) : <Users size={12} className="text-white/20" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] sm:text-[11px] font-black text-white uppercase truncate max-w-[100px]">
                            {opponent?.name || 'DESCONHECIDO'}
                          </span>
                          <span className="text-[7px] sm:text-[8px] text-cyan-400/50 font-black uppercase tracking-widest">
                            {state.world.status === 'LOBBY' ? '--/--' : new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase italic">
                        {match.homeTeamId === userTeam?.id ? 'CASA' : 'FORA'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center border border-dashed border-white/5 rounded-xl">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Sem jogos</span>
                </div>
              )}
            </div>
          </div>

          {/* Trade Inbox */}
          {state.tradeOffers && state.tradeOffers.filter(t => t.toTeamId === userTeam?.id && t.status === 'PENDING').length > 0 && (
            <div className="glass-card-neon white-gradient-sheen border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col gap-3">
              <h3 className="text-[9px] sm:text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Search size={14} className="text-purple-400" />
                Propostas de Troca
              </h3>
              <div className="flex flex-col gap-2">
                {state.tradeOffers.filter(t => t.toTeamId === userTeam?.id && t.status === 'PENDING').map(offer => {
                  const offeredPlayer = state.players[offer.offeredPlayerId];
                  const requestedPlayer = state.players[offer.requestedPlayerId];
                  const fromTeam = state.teams[offer.fromTeamId];

                  if (!offeredPlayer || !requestedPlayer || !fromTeam) return null;

                  return (
                    <div key={offer.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/70">
                        <span>{fromTeam.name} oferece:</span>
                        <span className="text-purple-400">{offer.date}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white/5 border border-white/10 p-2 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-cyan-400 font-bold mb-1">Eles dão</span>
                          <span className="text-sm font-black text-white">{offeredPlayer.nickname}</span>
                          <span className="text-xs text-white/50">{offeredPlayer.totalRating} pts</span>
                        </div>
                        <Activity size={16} className="text-white/30" />
                        <div className="flex-1 bg-white/5 border border-white/10 p-2 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-orange-400 font-bold mb-1">Eles pedem</span>
                          <span className="text-sm font-black text-white">{requestedPlayer.nickname}</span>
                          <span className="text-xs text-white/50">{requestedPlayer.totalRating} pts</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            // Accept Trade
                            setState(prev => {
                              const s = { ...prev };
                              const myTeam = s.teams[userTeam!.id];
                              const otherTeam = s.teams[fromTeam.id];

                              // Trade arrays
                              myTeam.squad = myTeam.squad.filter(id => id !== requestedPlayer.id);
                              myTeam.squad.push(offeredPlayer.id);
                              otherTeam.squad = otherTeam.squad.filter(id => id !== offeredPlayer.id);
                              otherTeam.squad.push(requestedPlayer.id);

                              // Lineups
                              Object.keys(myTeam.lineup).forEach(pos => { if (myTeam.lineup[pos as any] === requestedPlayer.id) delete myTeam.lineup[pos as any]; });
                              Object.keys(otherTeam.lineup).forEach(pos => { if (otherTeam.lineup[pos as any] === offeredPlayer.id) delete otherTeam.lineup[pos as any]; });

                              // Players
                              s.players[requestedPlayer.id].contract.teamId = otherTeam.id;
                              s.players[offeredPlayer.id].contract.teamId = myTeam.id;

                              s.tradeOffers = s.tradeOffers.map(t => t.id === offer.id ? { ...t, status: 'ACCEPTED' as const } : t);
                              return s;
                            });
                          }}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-[10px] text-white uppercase font-black tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => {
                            // Decline Trade
                            setState(prev => ({
                              ...prev,
                              tradeOffers: prev.tradeOffers.map(t => t.id === offer.id ? { ...t, status: 'DECLINED' as const } : t)
                            }));
                          }}
                          className="flex-1 py-2 bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-500/30 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GM Panel */}
          <div className="glass-card-neon white-gradient-sheen border border-red-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col gap-2 sm:gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
            <h3 className="text-[9px] sm:text-[11px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1 relative z-10">
              <Database size={window.innerWidth < 640 ? 12 : 16} className="drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
              GM Panel <span className="text-[7px] opacity-50 font-normal ml-1">(DEV)</span>
            </h3>

            {state.isCreator && (
              <div className="relative z-10 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-200">Codigo do mundo</p>
                    <p className="mt-1 font-mono text-lg font-black tracking-[0.18em] text-white">{worldJoinCode}</p>
                    <p className="mt-1 text-[7px] font-bold uppercase tracking-widest text-cyan-100/45">
                      Envie para alguem entrar como observador quando a entrada por codigo estiver ativa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="shrink-0 rounded-xl border border-cyan-400/30 bg-black/35 p-3 text-cyan-200 transition hover:bg-cyan-400 hover:text-black"
                    title="Copiar codigo"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:gap-4 relative z-10">
              <button
                onClick={handleOpenRandomPlayer}
                className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/5 hover:border-red-500/50 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                  <User size={window.innerWidth < 640 ? 16 : 20} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter">Skins</span>
                  <span className="text-[7px] sm:text-[9px] text-slate-500 uppercase font-bold">Mini Card</span>
                </div>
              </button>

              <button
                onClick={() => handleSimulateGameReport('live')}
                className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/5 hover:border-red-500/50 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                  <Activity size={window.innerWidth < 640 ? 16 : 20} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter">Mock</span>
                  <span className="text-[7px] sm:text-[9px] text-slate-500 uppercase font-bold">Relatório</span>
                </div>
              </button>
            </div>
          </div>

          <HairCalibrationPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* World Clock Control */}
        <div className="p-3 sm:p-6 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${isPaused ? 'bg-amber-500/10 border-amber-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
                <Clock size={window.innerWidth < 640 ? 16 : 20} className={isPaused ? 'text-amber-500' : 'text-cyan-400 animate-pulse'} />
              </div>
              <div>
                <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest">Relógio Global</h4>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase">{isPaused ? 'Pausado' : 'Ativo'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tighter italic flex flex-col items-end">
                <span>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}, 2050</span>
                <span className="text-xs opacity-40">{new Date(state.world.currentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-[8px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest mt-1">
                {state.world.status === 'LOBBY' ? 'Dia da Season: 0' : `Dia da Season: ${Math.floor((new Date(state.world.currentDate).getTime() - new Date(state.world.seasonStartReal || state.world.currentDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={togglePause}
              className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isPaused ? 'bg-cyan-500 text-black hover:bg-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              {isPaused ? <Play size={12} fill="currentColor" /> : <Clock size={12} />}
              {isPaused ? 'RETOMAR' : 'PAUSAR'}
            </button>
            <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
              {[1, 60, 1440].map((s) => (
                <button
                  key={s}
                  onClick={() => setTimeSpeed(s)}
                  className={`flex-1 py-3 rounded-xl text-[8px] font-black tracking-tighter transition-all ${timeSpeed === s ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                >
                  {s === 1 ? '1m' : s === 60 ? '1h' : '1d'}/s
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const currentDayNumber = state.world.status === 'LOBBY' ? 0 : Math.floor((new Date(state.world.currentDate).getTime() - new Date(state.world.seasonStartReal || state.world.currentDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            if (state.world.status !== 'LOBBY' && currentDayNumber > SEASON_DAYS) {
              return (
                <button
                  onClick={handleStartNewSeason}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 border border-emerald-400 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all group hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
                >
                  <Award size={16} className="text-black" />
                  <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-widest">Próxima Temporada</span>
                </button>
              );
            }

            return (
              <button
                onClick={handleAdvanceDay}
                className="w-full flex items-center justify-center gap-2 bg-black/40 border border-white/5 hover:border-red-500/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all group"
              >
                <FastForward size={14} className="text-red-400" />
                <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">Avançar Dia</span>
              </button>
            );
          })()}
        </div>

        {/* Mini Card Display Area */}
        <div className="bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center p-6 relative min-h-[300px] shadow-inner overflow-hidden">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none" />

          {gmRandomPlayer ? (
            <div className="w-[180px] sm:w-[200px] transform hover:scale-105 transition-transform duration-500 relative z-10 group">
              <div className="absolute -inset-4 bg-red-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <PlayerCard
                player={gmRandomPlayer}
                variant="full"
                onClick={() => setSelectedPlayer(gmRandomPlayer)}
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-[7px] font-black text-white px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.5)] z-20 border border-white/20 whitespace-nowrap">
                Skin Preview Mode
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-20 text-slate-500">
              <User size={32} />
              <span className="text-[8px] uppercase font-bold">Aguardando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Evolução / Pontos de Poder Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 px-0">
        <div className="md:col-span-2 glass-card border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h3 className="text-[9px] sm:text-[11px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3">
              <TrendingUp size={window.innerWidth < 640 ? 12 : 16} className="text-cyan-400" />
              Evolução (pts)
            </h3>
            <span className="text-[8px] sm:text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-emerald-500/20 italic">+12%</span>
          </div>

          <div className="h-24 sm:h-40 flex items-end justify-between gap-1 sm:gap-1.5 px-1 relative border-l border-b border-white/10">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="h-px bg-white/20 w-full border-dashed" />
              <div className="h-px bg-white/20 w-full border-dashed" />
              <div className="h-px bg-white/20 w-full border-dashed" />
            </div>

            {/* Mock Chart Bars */}
            {[30, 45, 40, 55, 60, 50, 65, 75, 70, 85, 90, 80].map((h, i) => (
              <div key={i} className="w-full bg-white/5 rounded-t-[2px] sm:rounded-t-xl relative group z-10 overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-white group-hover:to-white transition-all rounded-t-[2px] sm:rounded-t-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 sm:mt-3 px-1">
            <span className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-widest">R1</span>
            <span className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-widest">R12</span>
          </div>
        </div>

        {/* Top Player Variations */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)] flex flex-col gap-2 sm:gap-4">
          <h3 className="text-[9px] sm:text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-0.5">
            <Zap size={window.innerWidth < 640 ? 12 : 16} className="text-purple-400" />
            Variação Atletas
          </h3>

          <div className="flex flex-col gap-2 sm:gap-3">
            {[
              { pos: 'ATA', name: 'K. Nexus', val: '+45', color: 'cyan', up: true },
              { pos: 'MEI', name: 'J. Storm', val: '+32', color: 'purple', up: true },
              { pos: 'DEF', name: 'M. Steel', val: '-15', color: 'red', up: false }
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/5 group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-${p.color}-500/10 rounded sm:rounded-lg border border-${p.color}-500/20 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-${p.color}-400`}>
                    {p.pos}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[9px] sm:text-[12px] font-black text-white group-hover:text-${p.color}-300 transition-colors truncate max-w-[80px] sm:max-w-none`}>
                      {p.name}
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] sm:text-[12px] font-mono font-black ${p.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
