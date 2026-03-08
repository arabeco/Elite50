import React, { useState, useEffect } from 'react';
import { Match, MatchEvent, Team, Player } from '../types';
import {
  Trophy, Clock, Activity, Zap, Shield,
  ChevronRight, AlertCircle, Award, Target,
  TrendingUp, Users, Play, Pause, FastForward,
  Info, BarChart3, Star, History, AlertTriangle, Skull
} from 'lucide-react';
import { TeamLogo } from './TeamLogo';

import { MATCH_REAL_TIME_SECONDS } from '../constants/gameConstants';

interface LiveReportProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  players: Record<string, Player>;
  currentSecond: number; // 0-MATCH_REAL_TIME_SECONDS
}

export const LiveReport: React.FC<LiveReportProps> = ({
  match,
  homeTeam,
  awayTeam,
  players,
  currentSecond
}) => {
  const result = match.result;
  if (!result) return null;

  // Filter events that have happened up to currentSecond
  const visibleEvents = [...result.events]
    .filter(e => e.realTimeSecond <= currentSecond)
    .sort((a, b) => b.realTimeSecond - a.realTimeSecond);

  const currentHomeScore = result.events
    .filter(e => e.type === 'GOAL' && e.teamId === homeTeam.id && e.realTimeSecond <= currentSecond)
    .length;

  const currentAwayScore = result.events
    .filter(e => e.type === 'GOAL' && e.teamId === awayTeam.id && e.realTimeSecond <= currentSecond)
    .length;

  const progress = (currentSecond / MATCH_REAL_TIME_SECONDS) * 100;
  const matchMinute = Math.floor((currentSecond / MATCH_REAL_TIME_SECONDS) * 90);

  // Stats interpolation based on time
  const interpolateStat = (finalValue: number) => Math.round(finalValue * (currentSecond / MATCH_REAL_TIME_SECONDS));

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
      {/* Header / Scoreboard */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">AO VIVO</span>
          </div>
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <span className="text-xs font-mono font-bold text-cyan-400">{matchMinute}'</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1">
            <div className="mb-2">
              {homeTeam.logo ? (
                <TeamLogo
                  primaryColor={homeTeam.logo.primary}
                  secondaryColor={homeTeam.logo.secondary}
                  patternId={homeTeam.logo.patternId as any}
                  symbolId={homeTeam.logo.symbolId}
                  size={48}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white/20 tracking-tighter uppercase italic">Club</span>
                </div>
              )}
            </div>
            <span className="text-xs font-black text-white uppercase text-center truncate w-full">{homeTeam.name}</span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
              <span className={currentHomeScore > currentAwayScore ? 'text-cyan-400' : ''}>{currentHomeScore}</span>
              <span className="text-white/20">-</span>
              <span className={currentAwayScore > currentHomeScore ? 'text-cyan-400' : ''}>{currentAwayScore}</span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1">
            <div className="mb-2">
              {awayTeam.logo ? (
                <TeamLogo
                  primaryColor={awayTeam.logo.primary}
                  secondaryColor={awayTeam.logo.secondary}
                  patternId={awayTeam.logo.patternId as any}
                  symbolId={awayTeam.logo.symbolId}
                  size={48}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white/20 tracking-tighter uppercase italic">Club</span>
                </div>
              )}
            </div>
            <span className="text-xs font-black text-white uppercase text-center truncate w-full">{awayTeam.name}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-4 bg-black/40 border-b border-white/5 grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Finalizações</span>
          <span className="text-xs font-black text-white italic">{interpolateStat(result.stats.shots.home)} - {interpolateStat(result.stats.shots.away)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Posse</span>
          <span className="text-xs font-black text-white italic">{result.stats.possession.home}% - {result.stats.possession.away}%</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">No Alvo</span>
          <span className="text-xs font-black text-white italic">{interpolateStat(result.stats.shotsOnTarget.home)} - {interpolateStat(result.stats.shotsOnTarget.away)}</span>
        </div>
      </div>

      {/* Events Timeline */}
      <Timeline events={visibleEvents} players={players} />
    </div>
  );
};

const Timeline: React.FC<{ events: MatchEvent[], players: Record<string, Player> }> = ({ events, players }) => (
  <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-950/50">
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-cyan-500/50 rounded-full" />

      <div className="space-y-6">
        {events.length > 0 ? (
          events.map((event, idx) => (
            <div
              key={event.id}
              className="relative pl-12 animate-in slide-in-from-left-4 duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Event Dot/Icon */}
              <div className={`absolute left-0 top-0 w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 shadow-lg ${event.type === 'GOAL'
                ? 'bg-cyan-500 border-cyan-400 shadow-cyan-500/40'
                : event.type === 'CARD_RED'
                  ? 'bg-red-500 border-red-400 shadow-red-500/40'
                  : 'bg-slate-900 border-white/20 shadow-black'
                }`}>
                {event.type === 'GOAL' && <Trophy className="text-white" size={18} />}
                {event.type === 'CHANCE' && <Zap className="text-yellow-400" size={18} />}
                {event.type === 'WOODWORK' && <Target className="text-orange-400" size={18} />}
                {event.type === 'VAR' && <AlertCircle className="text-purple-400" size={18} />}
                {event.type === 'BLOCKED' && <Shield className="text-blue-400" size={18} />}
                {event.type === 'OFFSIDE' && <Clock className="text-slate-400" size={18} />}
                {event.type === 'COUNTER' && <FastForward className="text-green-400" size={18} />}
                {event.type === 'CARD_YELLOW' && <div className="w-3 h-4 bg-yellow-400 rounded-sm" />}
                {event.type === 'CARD_RED' && <div className="w-3 h-4 bg-red-500 rounded-sm" />}
                {event.type === 'COMMENTARY' && <Info className="text-cyan-400" size={18} />}
                {event.type === 'FOUL' && <AlertTriangle className="text-orange-300" size={18} />}
                {event.type === 'MISTAKE' && <Skull className="text-red-600" size={18} />}
              </div>

              {/* Balloon / Card */}
              <div className={`relative p-4 rounded-2xl border transition-all hover:scale-[1.02] duration-300 ${event.type === 'GOAL'
                ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                : 'bg-white/5 border-white/10'
                }`}>
                {/* Connector Arrow */}
                <div className={`absolute left-[-8px] top-4 w-4 h-4 rotate-45 border-l border-b ${event.type === 'GOAL' ? 'bg-cyan-950 border-cyan-500/30' : 'bg-slate-900 border-white/10'
                  }`} />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-cyan-400 tabular-nums">{event.minute}'</span>
                      <div className="h-3 w-px bg-white/10" />
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                        {(event.type === 'COMMENTARY' || event.type === 'VAR') ? 'Narrador' : (players[event.playerId || '']?.nickname || 'Partida')}
                      </span>
                    </div>
                    {event.type === 'GOAL' && (
                      <div className="px-2 py-0.5 bg-cyan-500 rounded text-[8px] font-black text-black uppercase animate-pulse">
                        GOL!
                      </div>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-white uppercase mb-1 leading-tight tracking-tight">
                    {event.title}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-64 flex flex-col items-center justify-center opacity-20">
            <Activity size={48} className="mb-4 text-slate-400 animate-pulse" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Analisando táticas...</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

interface PostGameReportProps {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  players: Record<string, Player>;
  onClose?: () => void;
  onReveal?: (matchId: string) => void;
}

export const PostGameReport: React.FC<PostGameReportProps> = ({
  match,
  homeTeam,
  awayTeam,
  players,
  onClose,
  onReveal
}) => {
  const result = match.result;
  const isRevealed = match.revealed !== false;
  const [activeTab, setActiveTab] = useState<'stats' | 'timeline'>('stats');

  if (!result) return null;

  const topPlayers = Object.entries(result.ratings)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([id, rating]) => ({ player: players[id], rating: rating as number }));

  // Sort events for timeline (newest first)
  const sortedEvents = [...result.events].sort((a, b) => b.realTimeSecond - a.realTimeSecond);

  return (
    <div className="flex flex-col bg-slate-950 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl max-w-2xl mx-auto h-[600px]">
      {/* Header / Headline */}
      <div className="relative p-8 bg-gradient-to-br from-slate-900 to-black border-b border-white/5 overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Award size={120} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-2 py-0.5 bg-cyan-500 rounded text-[8px] font-black text-black uppercase tracking-widest">RELATÓRIO FINAL</div>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{match.date}</span>
          </div>

          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-6 leading-[0.9]">
            {result.headline || 'Fim de Jogo'}
          </h2>

          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-2">
              {homeTeam.logo ? (
                <TeamLogo
                  primaryColor={homeTeam.logo.primary}
                  secondaryColor={homeTeam.logo.secondary}
                  patternId={homeTeam.logo.patternId as any}
                  symbolId={homeTeam.logo.symbolId}
                  size={64}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-black text-white/20 tracking-tighter uppercase italic">Club</span>
                </div>
              )}
              <span className={`text-4xl font-black text-white italic transition-all duration-1000 ${!isRevealed ? 'blur-md select-none' : ''}`}>
                {isRevealed ? result.homeScore : '0'}
              </span>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="text-xl font-black text-white/20 italic">VS</div>
              {!isRevealed && (
                <button
                  onClick={() => onReveal?.(match.id)}
                  className="px-4 py-1.5 bg-cyan-500 rounded-full text-[10px] font-black text-black uppercase hover:scale-105 transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                >
                  Revelar Placar
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              {awayTeam.logo ? (
                <TeamLogo
                  primaryColor={awayTeam.logo.primary}
                  secondaryColor={awayTeam.logo.secondary}
                  patternId={awayTeam.logo.patternId as any}
                  symbolId={awayTeam.logo.symbolId}
                  size={64}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-black text-white/20 tracking-tighter uppercase italic">Club</span>
                </div>
              )}
              <span className={`text-4xl font-black text-white italic transition-all duration-1000 ${!isRevealed ? 'blur-md select-none' : ''}`}>
                {isRevealed ? result.awayScore : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 bg-white/5">
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'stats' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
        >
          Estatísticas
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'timeline' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
        >
          Linha do Tempo
        </button>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto bg-slate-950 scrollbar-hide">
        {activeTab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
            {/* Match Stats */}
            <div className="bg-slate-950 p-6">
              <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <BarChart3 size={14} /> ESTATÍSTICAS
              </h3>
              <div className="space-y-4">
                {result.stats && (
                  <>
                    <StatBar label="Posse de Bola" home={result.stats.possession.home} away={result.stats.possession.away} suffix="%" />
                    <StatBar label="Finalizações" home={result.stats.shots.home} away={result.stats.shots.away} />
                    <StatBar label="No Alvo" home={result.stats.shotsOnTarget.home} away={result.stats.shotsOnTarget.away} />
                  </>
                )}
              </div>
            </div>

            {/* Top Players */}
            <div className="bg-slate-950 p-6">
              <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Star size={14} /> MELHORES EM CAMPO
              </h3>
              <div className="space-y-3">
                {topPlayers.map(({ player, rating }, idx) => (
                  <div key={player?.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/40'
                        }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-tight">{player?.nickname}</div>
                        <div className="text-[8px] font-bold text-white/40 uppercase">{player?.role}</div>
                      </div>
                    </div>
                    <div className={`text-sm font-black text-cyan-400 italic ${!isRevealed ? 'blur-sm select-none opacity-20' : ''}`}>
                      {isRevealed ? (rating / 10).toFixed(1) : '??'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Timeline events={sortedEvents} players={players} />
        )}
      </div>

      {/* Action Bar */}
      <div className="p-6 bg-slate-900/50 flex justify-end shrink-0 border-t border-white/5">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-cyan-400 transition-colors"
        >
          FECHAR RELATÓRIO
        </button>
      </div>
    </div>
  );
};

const StatBar: React.FC<{ label: string; home: number; away: number; suffix?: string }> = ({ label, home, away, suffix = '' }) => {
  const total = home + away;
  const homePercent = total > 0 ? (home / total) * 100 : 50;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] font-black text-white/40 uppercase">
        <span>{home}{suffix}</span>
        <span className="text-white/20">{label}</span>
        <span>{away}{suffix}</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
        <div className="h-full bg-cyan-500" style={{ width: `${homePercent}%` }} />
        <div className="h-full bg-slate-800" style={{ width: `${100 - homePercent}%` }} />
      </div>
    </div>
  );
};
