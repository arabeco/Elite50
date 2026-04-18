import React from 'react';
import { Player, TeamLogoMetadata } from '../types';
import { Star, Zap, Trophy, Venus, Mars, Clock, X } from 'lucide-react';
import { motion } from 'motion/react';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { useGame } from '../store/GameContext';
import { useTransfers } from '../hooks/useTransfers';

interface PlayerCardProps {
  player: Player;
  onClick: (player: Player) => void;
  onProposta?: (player: Player) => void;
  variant?: 'full' | 'compact' | 'banner' | 'block' | 'micro';
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, player: Player) => void;
  teamLogo?: TeamLogoMetadata;
  onTeamClick?: (teamId: string) => void;
}

const PlayerCardComponent: React.FC<PlayerCardProps> = ({ player, onClick, onProposta, variant = 'full', draggable, onDragStart, teamLogo, onTeamClick }) => {
  const { state } = useGame();
  const { handleCancelDraftProposal } = useTransfers(null, 0, 0);
  const isDraftPending = state.world.status === 'LOBBY' &&
    state.world.draftProposals?.some(p => p.playerId === player.id && p.managerId === state.userManagerId);

  const playerTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;

  const getDistrictStyle = () => {
    switch (player.district) {
      case 'NORTE':
        return {
          bg: 'from-cyan-900/80 to-fuchsia-900/80',
          border: 'border-cyan-400/50',
          text: 'text-cyan-300',
          shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]',
          badge: 'bg-cyan-950 text-cyan-400 border-cyan-500/30'
        };
      case 'SUL':
        return {
          bg: 'from-orange-900/80 to-stone-800/80',
          border: 'border-orange-500/50',
          text: 'text-orange-400',
          shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
          badge: 'bg-orange-950 text-orange-400 border-orange-500/30'
        };
      case 'LESTE':
        return {
          bg: 'from-emerald-900/80 to-amber-900/80',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
          badge: 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
        };
      case 'OESTE':
        return {
          bg: 'from-purple-950/90 to-black/90',
          border: 'border-purple-500/50',
          text: 'text-purple-400',
          shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
          badge: 'bg-purple-950 text-purple-400 border-purple-500/30'
        };
      default:
        return {
          bg: 'from-slate-800/80 to-slate-900/80',
          border: 'border-slate-500/50',
          text: 'text-slate-300',
          shadow: 'shadow-[0_0_10px_rgba(100,116,139,0.2)]',
          badge: 'bg-slate-800 text-slate-400 border-slate-600/30'
        };
    }
  };

  const style = getDistrictStyle();

  if (variant === 'block') {
    return (
      <motion.div
        layoutId={`player-card-${player.id}`}
        onClick={() => onClick(player)}
        draggable={draggable}
        onDragStart={(e: any) => onDragStart && onDragStart(e, player)}
        className={`w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors shadow-[0_0_10px_rgba(0,0,0,0.3)] ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${style.bg} ${style.border} ${style.text} border`}>
            {player.totalRating}
          </div>
          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white truncate">{player.nickname}</span>
              {player.appearance.gender === 'F' ? (
                <Venus size={8} className="text-pink-400" />
              ) : (
                <Mars size={8} className="text-blue-400" />
              )}
            </div>
            <span className="text-[8px] text-slate-400 uppercase tracking-widest">
              <span
                className={`cursor-pointer hover:text-white transition-colors`}
                onClick={(e) => {
                  if (player.contract.teamId && onTeamClick) {
                    e.stopPropagation();
                    onTeamClick(player.contract.teamId);
                  }
                }}
              >
                {playerTeam ? playerTeam.name : player.district}
              </span> • {player.role === 'GOL' ? 'GOL' : player.role === 'ZAG' ? 'ZAG' : player.role === 'MEI' ? 'MEI' : 'ATA'}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        layoutId={`player-card-${player.id}`}
        onClick={() => onClick(player)}
        draggable={draggable}
        onDragStart={(e: any) => onDragStart && onDragStart(e, player)}
        className={`w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors shadow-[0_0_15px_rgba(0,0,0,0.2)] group relative overflow-hidden ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${style.bg} opacity-50 group-hover:opacity-100 transition-opacity`} />

        <div className="relative">
          <PlayerAvatar player={player} size="sm" mode="no-boots" className="rounded-xl border border-white/10" />
          <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${style.bg} ${style.border} ${style.text} border shadow-lg`}>
            {player.totalRating}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black text-white truncate">{player.nickname}</h3>
            {player.appearance.gender === 'F' ? (
              <Venus size={10} className="text-pink-400" />
            ) : (
              <Mars size={10} className="text-blue-400" />
            )}
            <span
              onClick={(e) => {
                if (player.contract.teamId && onTeamClick) {
                  e.stopPropagation();
                  onTeamClick(player.contract.teamId);
                }
              }}
              className={`text-[8px] px-1.5 py-0.5 rounded-lg uppercase tracking-widest font-bold border ${style.badge} cursor-pointer hover:white-gradient-sheen transition-all`}
            >
              {playerTeam ? playerTeam.name : `#${player.district}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              {player.role === 'GOL' ? 'GOLEIRO' : player.role === 'ZAG' ? 'ZAGUEIRO' : player.role === 'MEI' ? 'MEIA' : 'ATACANTE'}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'micro') {
    return (
      <motion.div
        layoutId={`player-card-${player.id}`}
        onClick={() => onClick(player)}
        className={`w-full bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-1.5 flex flex-col justify-between cursor-pointer hover:bg-white/10 transition-colors shadow-lg overflow-hidden min-h-[50px]`}
      >
        <div className="flex justify-between items-start">
          <span className={`text-[10px] font-black leading-none ${style.text}`}>{player.totalRating}</span>
          <div className="flex items-center gap-1">
            <span className="text-[6px] font-bold text-white/40 uppercase">{player.role}</span>
            {isDraftPending && <Clock size={6} className="text-amber-500 animate-pulse" />}
          </div>
        </div>
        <div className="flex flex-col truncate">
          <div className="flex items-center gap-1">
            <h3 className="text-[9px] font-black text-white truncate uppercase tracking-tighter">{player.nickname}</h3>
            {player.appearance.gender === 'F' ? (
              <Venus size={6} className="text-pink-400" />
            ) : (
              <Mars size={6} className="text-blue-400" />
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.div
        layoutId={`player-card-${player.id}`}
        onClick={() => onClick(player)}
        draggable={draggable}
        onDragStart={(e: any) => onDragStart && onDragStart(e, player)}
        className={`relative w-full aspect-[1/1.3] sm:aspect-[1/1.5] rounded-xl border bg-gradient-to-br ${style.bg} ${style.border} shadow-[0_2px_8px_rgba(0,0,0,0.2)] ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:scale-[1.05] transition-transform flex flex-col justify-between p-1 sm:p-1.5 overflow-hidden backdrop-blur-md`}
      >
        {/* Background Avatar */}
        <div className="absolute inset-0 z-10">
          <PlayerAvatar
            player={player}
            size="xl"
            mode="full"
            className="w-full h-full object-cover object-top opacity-60 group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none z-20" />

        {/* Top Section */}
        <div className="relative z-30 flex justify-between items-start">
          <div className="flex flex-col items-center">
            <span className={`text-base sm:text-lg font-black leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] ${style.text}`}>{player.totalRating}</span>
            <span className="text-[5px] sm:text-[6px] font-bold uppercase tracking-widest text-white/80 mt-0.5">
              {player.role === 'GOL' ? 'GOL' : player.role === 'DEF' ? 'ZAG' : player.role === 'MEI' ? 'MEI' : 'ATA'}
            </span>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-[4px] sm:text-[5px] font-mono text-white/50 bg-black/40 px-1 py-0.5 rounded-lg border border-white/10">#{player.id.replace('p_', '')}</span>
            {teamLogo && (
              <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                <TeamLogo
                  primaryColor={teamLogo.primary}
                  secondaryColor={teamLogo.secondary}
                  accentColor={teamLogo.accent}
                  shapeId={teamLogo.shapeId}
                  patternId={teamLogo.patternId as any}
                  symbolId={teamLogo.symbolId}
                  size={window.innerWidth < 640 ? 10 : 12}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="relative z-30 flex flex-col gap-0.5">
          <div className="text-center">
            {isDraftPending && (
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock size={8} className="text-amber-400 animate-pulse" />
                <span className="text-[6px] font-black text-amber-500 uppercase">Pendente</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-1">
              <h3 className="text-[7px] sm:text-[8px] font-black leading-tight uppercase tracking-tight text-white drop-shadow-md truncate">{player.nickname}</h3>
              {player.appearance.gender === 'F' ? (
                <Venus size={5} className="text-pink-400 sm:size-[6px]" />
              ) : (
                <Mars size={5} className="text-blue-400 sm:size-[6px]" />
              )}
            </div>
            <div
              onClick={(e) => {
                if (player.contract.teamId && onTeamClick) {
                  e.stopPropagation();
                  onTeamClick(player.contract.teamId);
                }
              }}
              className={`inline-block px-1 py-0.5 mt-0.5 rounded-lg text-[4px] sm:text-[5px] uppercase tracking-widest font-bold border ${style.badge} opacity-80 cursor-pointer hover:opacity-100 transition-opacity`}
            >
              {playerTeam ? playerTeam.name : player.district}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={`player-card-${player.id}`}
      onClick={() => onClick(player)}
      draggable={draggable}
      onDragStart={(e: any) => onDragStart && onDragStart(e, player)}
      className={`relative w-full aspect-[1/1.4] sm:aspect-[1/1.6] rounded-xl sm:rounded-2xl glass-card-neon overflow-hidden group 
        ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} 
        hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 shadow-2xl`}
    >
      {isDraftPending && (
        <div className="absolute inset-0 bg-amber-500/10 backdrop-blur-[2px] z-[60] flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-black/80 p-4 rounded-2xl border border-amber-500/30 flex flex-col items-center gap-3 shadow-2xl">
            <Clock size={32} className="text-amber-400 animate-pulse" />
            <div>
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Escolha Pendente</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">AGUARDANDO RESOLUÇÃO</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelDraftProposal(player.id);
              }}
              className="bg-red-500/20 text-red-400 border border-red-500/30 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
            >
              <X size={12} /> Cancelar Proposta
            </button>
          </div>
        </div>
      )}

      {/* Holographic Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full z-30" />

      {/* Background Avatar with Glass Overlay */}
      <div className="absolute inset-0 z-10">
        <PlayerAvatar
          player={player}
          size="xl"
          mode="full"
          className="w-full h-full object-cover object-top opacity-100 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a15] via-[#0a0a15]/20 to-transparent z-20" />
        <div className="absolute inset-0 bg-black/5 z-20" />
      </div>

      {/* Top Bar: Rating & Badges */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-40 flex justify-between items-start">
        <div className="flex flex-col items-start">
          <div className="relative">
            <div className={`absolute inset-0 blur-xl opacity-60 ${style.bg}`} />
            <span className={`relative text-xl sm:text-3xl font-black italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] ${style.text}`}>
              {player.totalRating}
            </span>
          </div>
          <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.3em] text-white/50 mt-0.5 sm:mt-1">
            {player.role === 'GOL' ? 'GOL' : player.role === 'ZAG' ? 'ZAG' : player.role === 'MEI' ? 'MEI' : 'ATA'}
          </span>
        </div>

        <div className="flex flex-col items-end gap-2">
          {(teamLogo || (playerTeam && playerTeam.logo)) && (
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 sm:p-1.5 backdrop-blur-2xl shadow-inner group-hover:border-white/30 transition-all">
              <TeamLogo
                primaryColor={teamLogo?.primary || playerTeam?.logo?.primary || '#fff'}
                secondaryColor={teamLogo?.secondary || playerTeam?.logo?.secondary || '#000'}
                patternId={(teamLogo?.patternId || playerTeam?.logo?.patternId || 'none') as any}
                symbolId={teamLogo?.symbolId || playerTeam?.logo?.symbolId || 'Shield'}
                size={window.innerWidth < 640 ? 16 : 20}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Info Section */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-2 sm:p-4 pt-4 sm:pt-10 bg-gradient-to-t from-[#0a0a15] via-[#0a0a15]/80 to-transparent">
        {/* Name Area */}
        <div className="relative mb-2 sm:mb-3">
          <h3 className="text-sm sm:text-lg font-black italic uppercase tracking-tight text-white leading-none mb-1 sm:mb-1.5 drop-shadow-2xl truncate neon-text-white">
            {player.nickname}
          </h3>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className={`text-[6px] sm:text-[8px] font-black uppercase tracking-widest ${style.text} px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-lg bg-white/5 border border-white/10 backdrop-blur-md`}>
              {playerTeam ? playerTeam.name : player.district}
            </span>
            {player.appearance.gender === 'F' ? (
              <Venus size={8} className="text-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.5)] sm:size-3" />
            ) : (
              <Mars size={8} className="text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)] sm:size-3" />
            )}
          </div>
        </div>

        {/* Minimalist Stats */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 pt-1 sm:pt-2">
          <div className="space-y-0.5 sm:space-y-1.5">
            <div className="flex justify-between items-center text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-white/30 px-1">
              <span>SCORE</span>
              <span className="text-white/80">{player.totalRating}</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className={`h-full rounded-full ${style.bg} transition-all duration-1000 shadow-[0_0_10px_rgba(34,211,238,0.4)]`}
                style={{ width: `${Math.max(0, ((player.totalRating - 400) / 600) * 100)}%` }}
              />
            </div>
          </div>
          <div className="space-y-0.5 sm:space-y-1.5">
            <div className="flex justify-between items-center text-[6px] sm:text-[8px] font-black uppercase tracking-widest text-white/30 px-1">
              <span>POT</span>
              <span className="text-white/80">{player.potential}</span>
            </div>
            <div className="h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                style={{ width: `${Math.max(0, ((player.potential - 400) / 600) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {onProposta && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onProposta(player);
            }}
            className="w-full h-7 sm:h-10 mt-2 sm:mt-4 bg-white text-black text-[8px] sm:text-[10px] font-black rounded sm:rounded-xl transition-all active:scale-95 uppercase tracking-[0.2em] hover:bg-cyan-400 hover:text-black shadow-[0_10px_20px_rgba(0,0,0,0.4)] flex items-center justify-center gap-1.5 sm:gap-2 group/btn"
          >
            <Zap size={10} fill="currentColor" className="group-hover/btn:animate-pulse sm:size-[14px]" />
            {state.world.status === 'DRAFT' ? 'CONTRATAR' : 'PROPOR ROUBO'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export const PlayerCard = React.memo(PlayerCardComponent);
