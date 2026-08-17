import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, CircleDot, Clock, Pause, Play, Shield, Target, Zap } from 'lucide-react';
import { Match, Player, Team } from '../types';
import { getMatch2DTeamColor, Match2DHighlight, Match2DPlayerDot } from '../utils/match2D';
import { buildNativeMatch2DPlays } from '../engine/match2DPlayEngine';
import { TeamLogo } from './TeamLogo';
import { getFallbackTeamLogoAssetPath } from '../utils/teamIdentity';

type Match2DViewerProps = {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  players: Record<string, Player>;
  onPlayerClick?: (player: Player) => void;
  onTeamClick?: (teamId: string) => void;
};

const stepDuration = (action: string) => {
  if (action === 'goal') return 2300;
  if (action === 'celebration') return 2600;
  if (action === 'shot' || action === 'save' || action === 'woodwork' || action === 'blocked') return 1750;
  if (action === 'pass' || action === 'carry' || action === 'dribble') return 1450;
  return 1300;
};

const getTeamLogoProps = (team: Team) => ({
  primaryColor: team.logo?.primary || team.colors?.primary || '#22d3ee',
  secondaryColor: team.logo?.secondary || team.colors?.secondary || '#0f172a',
  accentColor: team.logo?.accent || '#f8fafc',
  shapeId: team.logo?.shapeId,
  patternId: (team.logo?.patternId || 'solid') as any,
  assetPath: team.logo?.assetPath || getFallbackTeamLogoAssetPath(team),
  symbolId: team.logo?.symbolId?.startsWith('asset:')
    ? team.logo.symbolId
    : `asset:${team.logo?.assetPath || getFallbackTeamLogoAssetPath(team)}`,
  secondarySymbolId: team.logo?.secondarySymbolId,
});

const eventIcon = (type: string) => {
  if (type === 'GOAL') return <CircleDot size={16} />;
  if (type === 'CHANCE') return <Target size={16} />;
  if (type === 'WOODWORK') return <Zap size={16} />;
  if (type === 'BLOCKED') return <Shield size={16} />;
  if (type.includes('CARD') || type === 'FOUL') return <AlertTriangle size={16} />;
  return <Zap size={16} />;
};

const eventTone = (type: string) => {
  if (type === 'GOAL') return 'from-emerald-400 to-cyan-300 text-black';
  if (type === 'WOODWORK') return 'from-amber-400 to-orange-500 text-black';
  if (type === 'BLOCKED') return 'from-sky-400 to-blue-500 text-black';
  if (type.includes('CARD')) return 'from-yellow-300 to-red-500 text-black';
  if (type === 'FOUL' || type === 'MISTAKE') return 'from-red-500 to-fuchsia-500 text-white';
  return 'from-cyan-400 to-fuchsia-400 text-black';
};

const Dot: React.FC<{
  dot: Match2DPlayerDot;
  color: string;
  onClick?: (playerId: string) => void;
}> = ({ dot, color, onClick }) => (
  <button
    type="button"
    onClick={() => onClick?.(dot.id)}
    className={`absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[8px] font-black shadow-lg transition-[left,top,transform] duration-1000 ease-linear sm:h-8 sm:w-8 ${dot.active ? 'scale-110 border-white shadow-white/30' : 'border-white/25'}`}
    style={{
      left: `${dot.point.x}%`,
      top: `${dot.point.y}%`,
      background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 34%, #020617 105%)`,
      color: '#020617',
    }}
    title={dot.label}
  >
    {dot.label}
  </button>
);

const HighlightRail: React.FC<{
  highlights: Match2DHighlight[];
  currentIndex: number;
  onSelect: (index: number) => void;
}> = ({ highlights, currentIndex, onSelect }) => (
  <div className="flex gap-2 overflow-x-auto border-t border-white/10 bg-black/30 px-3 py-3 scrollbar-hide">
    {highlights.map((highlight, index) => (
      <button
        key={highlight.id}
        type="button"
        onClick={() => onSelect(index)}
        className={`flex min-w-[92px] items-center gap-2 rounded-full border px-3 py-2 text-left transition ${index === currentIndex ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'}`}
      >
        <span className="text-[10px] font-black tabular-nums">{highlight.minute}'</span>
        <span className="truncate text-[9px] font-black uppercase tracking-wider">{highlight.type.replace('CARD_', '')}</span>
      </button>
    ))}
  </div>
);

export const Match2DViewer: React.FC<Match2DViewerProps> = ({
  match,
  homeTeam,
  awayTeam,
  players,
  onPlayerClick,
  onTeamClick,
}) => {
  const highlights = useMemo(
    () => buildNativeMatch2DPlays(match, homeTeam, awayTeam, players),
    [match, homeTeam, awayTeam, players]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentHighlight = highlights[currentIndex];
  const currentStep = currentHighlight?.steps[Math.min(stepIndex, (currentHighlight?.steps.length || 1) - 1)];
  const homeColor = getMatch2DTeamColor(homeTeam, '#22d3ee');
  const awayColor = getMatch2DTeamColor(awayTeam, '#f472b6');
  const isGoalMoment = currentStep?.action === 'goal' || currentStep?.action === 'celebration';
  const goalNotYetConfirmed = currentHighlight?.type === 'GOAL' && !isGoalMoment;
  const displayedHomeScore = currentHighlight.homeScore - (goalNotYetConfirmed && currentHighlight.teamId === homeTeam.id ? 1 : 0);
  const displayedAwayScore = currentHighlight.awayScore - (goalNotYetConfirmed && currentHighlight.teamId === awayTeam.id ? 1 : 0);
  const possessionTeam = currentHighlight?.teamId === homeTeam.id ? homeTeam : currentHighlight?.teamId === awayTeam.id ? awayTeam : null;
  const possessionColor = possessionTeam?.id === homeTeam.id ? homeColor : awayColor;

  useEffect(() => {
    setStepIndex(0);
  }, [currentIndex]);

  useEffect(() => {
    if (!isPlaying || !currentHighlight) return;

    const timer = window.setTimeout(() => {
      if (stepIndex < currentHighlight.steps.length - 1) {
        setStepIndex(prev => prev + 1);
      } else if (currentIndex < highlights.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, stepDuration(currentStep?.action || 'shape'));

    return () => window.clearTimeout(timer);
  }, [currentHighlight, currentIndex, currentStep?.action, highlights.length, isPlaying, stepIndex]);

  if (!currentHighlight || !currentStep) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 bg-slate-950 text-white/35">
        <Target size={38} />
        <span className="text-[10px] font-black uppercase tracking-[0.28em]">Sem lances 2D</span>
      </div>
    );
  }

  const handlePlayerClick = (playerId: string) => {
    const player = players[playerId];
    if (player) onPlayerClick?.(player);
  };

  const goTo = (nextIndex: number) => {
    setCurrentIndex(Math.max(0, Math.min(highlights.length - 1, nextIndex)));
    setIsPlaying(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950">
      <div className="shrink-0 border-b border-white/10 bg-black/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => onTeamClick?.(homeTeam.id)} className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 text-left hover:bg-white/5">
            <TeamLogo {...getTeamLogoProps(homeTeam)} size={34} />
            <span className="truncate text-[10px] font-black uppercase tracking-wider text-white">{homeTeam.name}</span>
          </button>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
            <span className="text-2xl font-black tabular-nums text-white">{displayedHomeScore}</span>
            <span className="text-white/20">-</span>
            <span className="text-2xl font-black tabular-nums text-white">{displayedAwayScore}</span>
          </div>

          <button type="button" onClick={() => onTeamClick?.(awayTeam.id)} className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-xl p-1 text-right hover:bg-white/5">
            <span className="truncate text-[10px] font-black uppercase tracking-wider text-white">{awayTeam.name}</span>
            <TeamLogo {...getTeamLogoProps(awayTeam)} size={34} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className={`flex min-w-0 items-center gap-2 rounded-full bg-gradient-to-r px-3 py-2 ${eventTone(currentHighlight.type)}`}>
            {eventIcon(currentHighlight.type)}
            <span className="truncate text-[10px] font-black uppercase tracking-wider">{currentHighlight.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {possessionTeam && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_12px_currentColor]" style={{ color: possessionColor, backgroundColor: possessionColor }} />
                <span className="max-w-[120px] truncate text-[9px] font-black uppercase tracking-wider text-white">{possessionTeam.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-cyan-200">
              <Clock size={14} />
              <span className="text-xs font-black tabular-nums">{currentHighlight.minute}'</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative min-h-[360px] flex-1 overflow-hidden bg-[#07150f]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[length:8.33%_10%]" />
        {isGoalMoment && (
          <>
            <div className="absolute inset-0 z-10 bg-emerald-300/10 animate-pulse" />
            <div className="absolute left-1/2 top-1/2 z-10 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/40 bg-emerald-300/10 shadow-[0_0_80px_rgba(52,211,153,0.55)]" />
            <div className="absolute left-1/2 top-10 z-40 -translate-x-1/2 rounded-full bg-emerald-300 px-6 py-2 text-xl font-black uppercase italic tracking-tight text-black shadow-[0_0_40px_rgba(52,211,153,0.8)]">
              GOL
            </div>
          </>
        )}
        <div className="absolute inset-3 rounded-md border border-white/20" />
        <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/15" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 sm:h-32 sm:w-32" />
        <div className="absolute left-3 top-1/2 h-32 w-12 -translate-y-1/2 rounded-r-xl border border-l-0 border-white/15 sm:h-44 sm:w-20" />
        <div className="absolute right-3 top-1/2 h-32 w-12 -translate-y-1/2 rounded-l-xl border border-r-0 border-white/15 sm:h-44 sm:w-20" />
        <div className="absolute left-0 top-[38%] h-[24%] w-2 rounded-r-full bg-white/25 shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
        <div className="absolute right-0 top-[38%] h-[24%] w-2 rounded-l-full bg-white/25 shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-400/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-fuchsia-500/10 to-transparent" />

        {currentStep.home.map(dot => (
          <Dot key={`h-${dot.id}`} dot={dot} color={homeColor} onClick={handlePlayerClick} />
        ))}
        {currentStep.away.map(dot => (
          <Dot key={`a-${dot.id}`} dot={dot} color={awayColor} onClick={handlePlayerClick} />
        ))}

        <div
          className={`absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)] transition-[left,top,transform] duration-1000 ease-linear ${currentStep.action === 'goal' ? 'scale-125 bg-emerald-200 shadow-[0_0_28px_rgba(52,211,153,1)]' : ''}`}
          style={{ left: `${currentStep.ball.x}%`, top: `${currentStep.ball.y}%` }}
        />
        {possessionTeam && !isGoalMoment && (
          <div
            className="pointer-events-none absolute z-20 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-45 transition-all duration-[1500ms]"
            style={{
              left: `${currentStep.ball.x}%`,
              top: `${currentStep.ball.y}%`,
              borderColor: possessionColor,
              boxShadow: `0 0 28px ${possessionColor}`,
            }}
          />
        )}

        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-md">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">{currentStep.action}</span>
              <span className="text-[10px] font-black text-white/40">{currentStep.focusPlayerId ? players[currentStep.focusPlayerId]?.nickname || players[currentStep.focusPlayerId]?.name : ''}</span>
          </div>
          <p className="line-clamp-2 text-xs font-bold leading-relaxed text-white/75">{currentStep.label}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-slate-950 p-3">
        <button type="button" onClick={() => goTo(currentIndex - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <button type="button" onClick={() => setIsPlaying(prev => !prev)} className="flex h-10 min-w-28 items-center justify-center gap-2 rounded-full bg-cyan-300 px-4 text-[10px] font-black uppercase tracking-wider text-black hover:bg-white">
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Pausar' : 'Play'}
        </button>
        <button type="button" onClick={() => goTo(currentIndex + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10">
          <ChevronRight size={18} />
        </button>
      </div>

      <HighlightRail highlights={highlights} currentIndex={currentIndex} onSelect={(index) => {
        setCurrentIndex(index);
        setIsPlaying(false);
      }} />
    </div>
  );
};
