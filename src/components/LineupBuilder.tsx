
import React, { useState, useMemo } from 'react';
import { useGame } from '../store/GameContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { getMatchStatus } from '../utils/matchUtils';
import { Player, Team } from '../types';
import { PlayerCard } from './PlayerCard';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { UserMinus, Save, Activity, Users, Zap, AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LineupBuilderProps {
  team: Team;
  allPlayers: Record<string, Player>;
  onPlayerSelect: (player: Player) => void;
}

const FORMATION_SLOTS = [
  { id: 'ATA1', label: 'ATA', top: '20%', left: '20%' },
  { id: 'ATA2', label: 'ATA', top: '15%', left: '50%' },
  { id: 'ATA3', label: 'ATA', top: '20%', left: '80%' },
  { id: 'MEI1', label: 'MEI', top: '40%', left: '30%' },
  { id: 'MEI2', label: 'MEI', top: '40%', left: '70%' },
  { id: 'MEI3', label: 'MEI', top: '55%', left: '50%' },
  { id: 'ZAG1', label: 'ZAG', top: '65%', left: '15%' },
  { id: 'ZAG2', label: 'ZAG', top: '75%', left: '35%' },
  { id: 'ZAG3', label: 'ZAG', top: '75%', left: '65%' },
  { id: 'ZAG4', label: 'ZAG', top: '65%', left: '85%' },
  { id: 'GOL', label: 'GOL', top: '90%', left: '50%' },
];

export const LineupBuilder: React.FC<LineupBuilderProps> = ({ team, allPlayers, onPlayerSelect }) => {
  const { state, setState, saveGame } = useGame();
  const { upcomingMatches } = useDashboardData();
  const nextMatch = upcomingMatches?.[0];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isLocked = useMemo(() => {
    if (!nextMatch) return false;
    // Ensure the match involves the current team
    if (nextMatch.homeTeamId !== team.id && nextMatch.awayTeamId !== team.id) return false;
    
    const status = getMatchStatus(nextMatch, state.world.currentDate);
    return status === 'LOCKED' || status === 'PLAYING';
  }, [nextMatch, state.world.currentDate, team.id]);

  // Stats Calculation
  const lineupStats = useMemo(() => {
    const players = Object.values(team.lineup || {})
      .map((id: string | null) => id ? allPlayers[id] : null)
      .filter((p): p is Player => !!p);

    if (players.length === 0) return { avgRating: 0, chemistry: 0, pace: 0 };

    const avgRating = Math.round(players.reduce((acc, p) => acc + p.totalRating, 0) / players.length);

    // Simple chemistry mock: based on if they are in correct generic position (GOL vs others)
    const chemistry = Math.min(100, 70 + (players.length * 2)); // Base 70 + bonus for full squad

    return { avgRating, chemistry, pace: 85 }; // Mock pace for now
  }, [team.lineup, allPlayers]);

  const handlePlayerClick = (e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(playerId);
    }
  };

  const handleSlotClick = (e: React.MouseEvent, slotId: string) => {
    e.stopPropagation();

    if (isLocked) return;

    if (!selectedPlayerId) {
      // If no player selected, try to select the player in this slot
      const playerInSlot = team.lineup?.[slotId];
      if (playerInSlot) {
        setSelectedPlayerId(playerInSlot);
      }
      return;
    }

    // Place selected player in slot
    const newState = { ...state };
    const newTeams = { ...newState.teams };
    const currentTeam = { ...newTeams[team.id] };
    const newLineup = { ...currentTeam.lineup };

    // Check if player is already in another slot and remove them
    Object.keys(newLineup).forEach(key => {
      if (newLineup[key] === selectedPlayerId) {
        delete newLineup[key];
      }
    });

    newLineup[slotId] = selectedPlayerId;

    currentTeam.lineup = newLineup;
    newTeams[team.id] = currentTeam;
    newState.teams = newTeams;

    setState(newState);
    saveGame(newState);

    setSelectedPlayerId(null);
  };

  const handleRemoveFromLineup = (playerId: string) => {
    if (isLocked) return;

    const newState = { ...state };
    const newTeams = { ...newState.teams };
    const currentTeam = { ...newTeams[team.id] };
    const newLineup = { ...currentTeam.lineup };

    Object.keys(newLineup).forEach(key => {
      const slotKey = key;
      if (newLineup[slotKey] === playerId) {
        delete newLineup[slotKey];
      }
    });

    currentTeam.lineup = newLineup;
    newTeams[team.id] = currentTeam;
    newState.teams = newTeams;

    setState(newState);
    saveGame(newState);
  };

  const handleSaveLineup = async () => {
    setIsSaving(true);
    await saveGame();
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Get players in lineup
  const lineupPlayerIds = Object.values(team.lineup || {}).filter(Boolean) as string[];

  // Get bench players (squad - lineup)
  const benchPlayerIds = team.squad.filter(id => !lineupPlayerIds.includes(id));

  return (
    <div className="flex flex-col gap-3 sm:gap-6 animate-in fade-in duration-500 h-full min-h-[500px] sm:min-h-[700px]">

      {/* Top Section: Pitch & Stats */}
      <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-[350px] sm:min-h-[450px]">
        {/* Pitch Stats Header */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 shadow-lg">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 overflow-hidden">
                {team.logo ? (
                  <TeamLogo
                    primaryColor={team.logo.primary}
                    secondaryColor={team.logo.secondary}
                    accentColor={team.logo.accent}
                    shapeId={team.logo.shapeId}
                    patternId={team.logo.patternId as any}
                    symbolId={team.logo.symbolId}
                    size={window.innerWidth < 640 ? 18 : 24}
                  />
                ) : (
                  <TeamLogo
                    primaryColor="#10b981"
                    secondaryColor="#065f46"
                    patternId="none"
                    symbolId="Shield"
                    size={window.innerWidth < 640 ? 14 : 18}
                  />
                )}
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Geral</div>
                <div className="text-base sm:text-xl font-black text-white leading-none">{lineupStats.avgRating}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <Activity size={14} className="text-blue-400 sm:size-[18px]" />
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Química</div>
                <div className="text-base sm:text-xl font-black text-white leading-none">{lineupStats.chemistry}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                <Zap size={14} className="text-amber-400 sm:size-[18px]" />
              </div>
              <div>
                <div className="text-[8px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-bold">Ritmo</div>
                <div className="text-base sm:text-xl font-black text-white leading-none">{lineupStats.pace}</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveLineup}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 rounded-xl font-bold transition-all shadow-lg border ${isSaving
                ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-500/50 cursor-wait'
                : 'bg-black/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 hover:scale-105 active:scale-95'
              }`}
          >
            <Save size={16} />
            <span className="text-xs sm:text-sm">{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>

        {/* The Pitch */}
        <div className="flex-1 glass-card-neon border-white/5 rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center min-h-[400px] sm:min-h-[500px] group/pitch">
          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
          
          {/* Pitch markings with Neon Effect */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay pointer-events-none" />
          
          {/* Neon Field Lines */}
          <div className="absolute inset-4 sm:inset-8 border border-white/10 rounded-xl sm:rounded-2xl pointer-events-none shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]" />
          <div className="absolute top-1/2 left-4 sm:left-8 right-4 sm:right-8 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-40 sm:h-40 border border-white/10 rounded-full pointer-events-none flex items-center justify-center">
             <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 bg-cyan-400/40 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          </div>

          {/* Goal Areas */}
          <div className="absolute top-4 sm:top-8 left-1/2 -translate-x-1/2 w-48 sm:w-72 h-24 sm:h-36 border border-t-0 border-white/10 rounded-b-2xl sm:rounded-b-3xl pointer-events-none bg-gradient-to-b from-white/[0.02] to-transparent" />
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-48 sm:w-72 h-24 sm:h-36 border border-b-0 border-white/10 rounded-t-2xl sm:rounded-t-3xl pointer-events-none bg-gradient-to-t from-white/[0.02] to-transparent" />

          {/* Locked Overlay */}
          {isLocked && (
            <div className="absolute inset-0 z-50 bg-[#0a0a15]/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-700">
              <div className="glass-card-neon p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col items-center gap-3 sm:gap-4 scale-90 sm:scale-110">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 animate-pulse">
                  <Lock size={28} className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] sm:size-[36px]" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-[0.2em] italic neon-text-white">Escalação Travada</h3>
                  <p className="text-amber-500/60 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1 sm:mt-2">
                    {getMatchStatus(nextMatch!, state.world.currentDate) === 'PLAYING' 
                      ? 'Partida em Tempo Real'
                      : 'Pré-Jogo em Andamento'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Slots */}
          {FORMATION_SLOTS.map(slot => {
            const playerId = team.lineup?.[slot.id];
            const player = playerId ? allPlayers[playerId] : null;
            const isSelected = player?.id === selectedPlayerId;
            const canReceiveDrop = !!selectedPlayerId;

            return (
              <div
                key={slot.id}
                onClick={(e) => handleSlotClick(e, slot.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 w-16 h-20 sm:w-24 sm:h-32 z-10 cursor-pointer ${canReceiveDrop
                    ? 'scale-110 z-20'
                    : 'hover:scale-105'
                  }`}
                style={{ top: slot.top, left: slot.left }}
              >
                {player ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <div
                      onClick={(e) => {
                        if (selectedPlayerId && selectedPlayerId !== player.id) {
                          return;
                        }
                        handlePlayerClick(e, player.id);
                      }}
                      onDoubleClick={(e) => { e.stopPropagation(); onPlayerSelect(player); }}
                      className={`relative z-20 w-10 h-10 sm:w-16 sm:h-16 cursor-pointer flex items-center justify-center transition-all duration-300 ${isSelected
                          ? 'ring-2 ring-cyan-400 rounded-lg sm:rounded-2xl scale-110 shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                          : player.role !== slot.label
                            ? 'ring-2 ring-red-500 rounded-lg sm:rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                            : 'ring-2 ring-white/20 rounded-lg sm:rounded-2xl group-hover:ring-cyan-400/50 group-hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] shadow-xl'
                        }`}
                    >
                      <PlayerAvatar player={player} size="sm" mode="head" className="rounded-lg sm:rounded-2xl bg-white/5 backdrop-blur-md" />

                      {/* Rating Overlay */}
                      <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 bg-white text-black rounded-md sm:rounded-lg px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-black italic shadow-2xl">
                        {player.totalRating}
                      </div>

                      {/* Wrong position warning badge */}
                      {player.role !== slot.label && (
                        <div className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 z-30 bg-red-500 text-white rounded-md sm:rounded-lg p-0.5 sm:p-1 shadow-lg border border-white/20 animate-bounce">
                          <AlertTriangle size={10} className="sm:size-[12px]" />
                        </div>
                      )}
                    </div>

                    <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-30 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromLineup(player.id);
                        }}
                        className="bg-red-500 text-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-2xl hover:bg-red-600 transition-colors border border-white/20"
                      >
                        <UserMinus size={12} className="sm:size-[14px]" />
                      </button>
                    </div>

                    <div className={`mt-2 sm:mt-3 whitespace-nowrap px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[7px] sm:text-[9px] font-black backdrop-blur-xl border uppercase tracking-[0.2em] shadow-2xl transition-all ${player.role === slot.label
                        ? 'bg-black/60 text-cyan-400 border-white/10 neon-text-cyan'
                        : 'bg-red-500/20 text-red-500 border-red-500/30 animate-pulse'
                      }`}>
                      {slot.label}
                    </div>
                  </div>
                ) : (
                  <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-2xl border border-dashed flex items-center justify-center transition-all duration-300 group/slot ${canReceiveDrop
                      ? 'border-cyan-400 bg-cyan-400/10 animate-pulse scale-110 shadow-[0_0_25px_rgba(34,211,238,0.4)]'
                      : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}>
                    <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${canReceiveDrop ? 'text-cyan-400' : 'text-white/20 group-hover/slot:text-white/40'}`}>
                      {slot.label}
                    </span>
                    
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-1 sm:w-2 h-1 sm:h-2 border-t border-l border-white/10 rounded-tl-md sm:rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-1 sm:w-2 h-1 sm:h-2 border-t border-r border-white/10 rounded-tr-md sm:rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-1 sm:w-2 h-1 sm:h-2 border-b border-l border-white/10 rounded-bl-md sm:rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-1 sm:w-2 h-1 sm:h-2 border-b border-r border-white/10 rounded-br-md sm:rounded-br-lg" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Bench (Horizontal Deck) */}
      <div className="glass-card-neon border-white/5 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3 sm:gap-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3 sm:gap-4 px-1 sm:px-2">
          <div className="p-1.5 sm:p-2 glass-card rounded-lg sm:rounded-xl border-white/10">
            <Users size={14} className="text-cyan-400 sm:size-[18px]" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-white font-black tracking-[0.2em] uppercase text-[10px] sm:text-xs italic neon-text-white">
              Banco de Reservas
            </h3>
            <span className="text-[7px] sm:text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5 sm:mt-1">
              {benchPlayerIds.length} Atletas em Espera
            </span>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-[8px] text-white/40 uppercase font-black tracking-widest">
              Toque para Escalar
            </span>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-4 sm:gap-6 p-1 sm:p-2 pb-4 sm:pb-6 snap-x no-scrollbar min-h-[120px] sm:min-h-[180px] items-center">
          {benchPlayerIds.length > 0 ? (
            benchPlayerIds.map(playerId => {
              const player = allPlayers[playerId];
              if (!player) return null;
              const isSelected = player.id === selectedPlayerId;

              return (
                <div
                  key={player.id}
                  onClick={(e) => handlePlayerClick(e, player.id)}
                  onDoubleClick={(e) => { e.stopPropagation(); onPlayerSelect(player); }}
                  className={`snap-start shrink-0 w-20 sm:w-24 cursor-pointer hover:-translate-y-2 sm:hover:-translate-y-3 transition-all duration-500 touch-none select-none relative group ${isSelected ? 'scale-110' : ''}`}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        layoutId="player-selection-glow"
                        className="absolute -inset-1.5 sm:-inset-2 bg-cyan-400/20 blur-xl rounded-xl sm:rounded-2xl z-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  <div className={`relative z-10 transition-all duration-300 ${isSelected ? 'shadow-[0_0_30px_rgba(34,211,238,0.4)]' : 'group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}>
                    <PlayerCard
                      player={player}
                      onClick={() => { }}
                      variant="compact"
                      teamLogo={team.logo}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] h-24 sm:h-32 border border-dashed border-white/5 rounded-xl sm:rounded-2xl">
              <Users size={24} className="mb-2 sm:mb-3 opacity-10 sm:size-[32px]" />
              <p>Elenco Totalmente Escalado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
