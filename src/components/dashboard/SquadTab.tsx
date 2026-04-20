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
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, LayoutGrid, Rows3 } = LucideIcons;


export const SquadTab = (props: { showLineup?: boolean; lineupOnly?: boolean }) => {
  const { state, setState, addToast } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const { handleMockReport, setSelectedMatchReport } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [rosterViewMode, setRosterViewMode] = useState<'cards' | 'list'>('cards');

  const isLocked = React.useMemo(() => {
    if (!upcomingMatches || upcomingMatches.length === 0) return false;
    const nextMatch = upcomingMatches[0];
    const status = getMatchStatus(nextMatch, state.world.currentDate);
    return status === 'LOCKED' || status === 'PLAYING';
  }, [upcomingMatches, state.world.currentDate]);

  const handlePlayerClick = (player: Player) => {
    if (isLocked) {
      addToast('Escalação travada: O jogo começará em breve!', 'error');
      return;
    }
    setSelectedPlayer(player);
  };

  if (!userTeam) {
    return (
      <div className="text-center py-20 text-slate-500 font-medium bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-xl">
        Você ainda não assumiu um clube.
      </div>
    );
  }

  const playersByPosition: Record<string, Player[]> = {
    'GOL': [],
    'ZAG': [],
    'MEI': [],
    'ATA': []
  };

  if (userTeam.squad) {
    userTeam.squad.forEach(playerId => {
      const player = state.players[playerId];
      if (player) {
        // Fallback for old 'DEF' roles if they still exist in state
        const role = (player.role as string) === 'DEF' ? 'ZAG' : player.role;
        playersByPosition[role]?.push(player);
      }
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10 px-2 sm:px-0">
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="bg-amber-500/20 p-1.5 sm:p-2 rounded-lg">
            <Lock className="text-amber-500" size={window.innerWidth < 640 ? 18 : 24} />
          </div>
          <div>
            <h3 className="text-amber-500 font-bold uppercase tracking-wider text-[10px] sm:text-sm">Escalação Travada</h3>
            <p className="text-amber-500/70 text-[9px] sm:text-xs">
              As alterações estão bloqueadas durante a preparação para o jogo.
            </p>
          </div>
        </div>
      )}

      {/* Team Power Dashboard */}
      <div
        data-onboarding="squad-power"
        className="bg-black/40 border border-white/10 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-md relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2 shadow-inner">
              <Zap className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" size={24} />
            </div>
            <div>
              <h2 className="text-white font-black uppercase tracking-widest text-xs sm:text-sm">Poder do Elenco</h2>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200">
                  {dashData.totalPoints.toLocaleString()}
                </span>
                <span className="text-white/40 font-bold text-[10px] sm:text-xs">/ {dashData.powerCap.toLocaleString()} Score Max.</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] sm:text-xs font-bold text-white/50 uppercase tracking-widest">Espaço na Folha</span>
              <span className={`text-[10px] sm:text-xs font-black p-1 px-2 rounded-lg ${dashData.pointsLeft < 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                {dashData.pointsLeft > 0 ? '+' : ''}{dashData.pointsLeft.toLocaleString()}
              </span>
            </div>
            <div className="h-2 sm:h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${dashData.totalPoints > dashData.powerCap
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                  : dashData.totalPoints > dashData.powerCap * 0.9
                    ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                    : 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                  }`}
                style={{ width: `${Math.min(100, (dashData.totalPoints / dashData.powerCap) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {!props.lineupOnly && (
        <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
          <div>
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.25em] text-white/30">Visualização</p>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/50">Troque entre cards e lista</p>
          </div>
          <div className="flex rounded-2xl border border-white/10 bg-black/40 p-1">
            {[
              { id: 'cards', label: 'Cards', icon: LayoutGrid },
              { id: 'list', label: 'Lista', icon: Rows3 },
            ].map(mode => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setRosterViewMode(mode.id as 'cards' | 'list')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${
                  rosterViewMode === mode.id
                    ? 'bg-cyan-500 text-black'
                    : 'text-white/45 hover:text-white'
                }`}
              >
                <mode.icon size={12} />
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ESCALAÇÃO - LineupBuilder (shown when lineupOnly or showLineup prop) */}
      {(props.lineupOnly || props.showLineup) && (
        <div className="space-y-3 sm:space-y-4">
          <LineupBuilder
            team={userTeam}
            allPlayers={state.players}
            onPlayerSelect={(player) => setSelectedPlayer(player)}
          />
        </div>
      )}

      {props.lineupOnly && selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
      {props.lineupOnly && selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {props.lineupOnly ? null : rosterViewMode === 'list' ? (
        <div className="space-y-4">
          {(Object.keys(playersByPosition) as (keyof typeof playersByPosition)[]).map(pos => {
            const players = playersByPosition[pos];
            if (players.length === 0) return null;

            return (
              <div key={pos} className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                <div className="border-b border-white/5 bg-white/[0.03] px-4 py-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                    {pos === 'GOL' ? 'Goleiros' : pos === 'ZAG' ? 'Zagueiros' : pos === 'MEI' ? 'Meio-Campistas' : 'Atacantes'}
                  </h3>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {players.map(player => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handlePlayerClick(player)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{player.nickname}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/35">{player.role} • {player.district}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-black italic text-cyan-300">{player.totalRating}</p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">
                          {player.contract.teamId ? state.teams[player.contract.teamId]?.name || 'Clube' : 'Sem clube'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (Object.keys(playersByPosition) as (keyof typeof playersByPosition)[]).map(pos => {
        const players = playersByPosition[pos];
        if (players.length === 0) return null;

        return (
          <div key={pos} className="space-y-3 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4 px-1 sm:px-2">
              <div className={`w-1 sm:w-1.5 h-4 sm:h-6 rounded-full shadow-[0_0_10px_rgba(var(--color-glow),0.5)] ${pos === 'GOL' ? 'bg-amber-500 shadow-amber-500/50' :
                pos === 'ZAG' ? 'bg-cyan-500 shadow-cyan-500/50' :
                  pos === 'MEI' ? 'bg-fuchsia-500 shadow-fuchsia-500/50' : 'bg-red-500 shadow-red-500/50'
                }`} />
              <div className="flex flex-col">
                <h3 className="text-[9px] sm:text-xs font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] neon-text-white">{
                  pos === 'GOL' ? 'Goleiros' :
                    pos === 'ZAG' ? 'Zagueiros' :
                      pos === 'MEI' ? 'Meio-Campistas' : 'Atacantes'
                }</h3>
                <span className="text-[7px] sm:text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                  {players.length} Atletas Disponíveis
                </span>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-4 sm:gap-6 px-1 sm:px-2 pb-6 sm:pb-8 snap-x snap-mandatory scroll-smooth items-center">
              {players.map(player => (
                <div key={player.id} className="w-[132px] sm:w-[170px] shrink-0 snap-start">
                  <PlayerCard
                    player={player}
                    onClick={() => handlePlayerClick(player)}
                    variant="full"
                    teamLogo={userTeam.logo}
                    onTeamClick={setSelectedTeamId}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!props.lineupOnly && selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {!props.lineupOnly && selectedTeamId && state.teams[selectedTeamId] && (
        <TeamModal
          team={state.teams[selectedTeamId]}
          players={state.players}
          onClose={() => setSelectedTeamId(null)}
          onPlayerClick={(player) => {
            setSelectedPlayer(player);
            setSelectedTeamId(null);
          }}
          onTeamClick={setSelectedTeamId}
        />
      )}
    </div>
  );
}
