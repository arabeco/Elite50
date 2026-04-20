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


export const DatabaseTab = (props: any) => {
  const { state, setState } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const { handleMockReport, setSelectedMatchReport } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const players = Object.values(state.players);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const sortedPlayers = [...players].sort((a, b) => b.totalRating - a.totalRating);
  const limboPlayer = sortedPlayers[sortedPlayers.length - 1];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-12 px-2 sm:px-0 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-red-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-[0_0_20px_rgba(239,68,68,0.1)] hover:border-red-400/50 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl" />
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <AlertCircle size={window.innerWidth < 640 ? 16 : 20} className="text-red-400" />
            <h3 className="text-[11px] sm:text-lg font-black text-white uppercase tracking-tight italic">O Limbo (Rank #1000)</h3>
          </div>
          {limboPlayer && (
            <div className="flex items-center gap-3 sm:gap-4 bg-black/40 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-red-500/20 backdrop-blur-md">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-red-950/50 flex items-center justify-center font-black text-red-500 text-lg sm:text-2xl border border-red-900/50 italic">
                {limboPlayer.totalRating}
              </div>
              <div className="min-w-0">
                <div className="font-black text-white text-[11px] sm:text-base truncate uppercase tracking-tight italic">{limboPlayer.name}</div>
                <div className="text-[8px] sm:text-[10px] text-red-400 uppercase tracking-widest font-black mt-0.5">Risco de exclusão</div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-amber-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:border-amber-400/50 transition-colors">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Star size={window.innerWidth < 640 ? 16 : 20} className="text-amber-400" />
            <h3 className="text-[11px] sm:text-lg font-black text-white uppercase tracking-tight italic">Hall da Fama (Rank S)</h3>
          </div>
          <div className="flex gap-3 sm:gap-6 overflow-x-auto pb-2 hide-scrollbar">
            {sortedPlayers.filter(p => p.totalRating >= 850).slice(0, 5).map(p => (
              <div key={p.id} className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform" onClick={() => setSelectedPlayer(p)}>
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 p-0.5 mb-1.5 sm:mb-3 mx-auto shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <img src={`https://picsum.photos/seed/${p.id}/100/100`} alt={p.name} className="w-full h-full rounded-full object-cover border-2 border-slate-900" referrerPolicy="no-referrer" />
                </div>
                <div className="text-center text-[8px] sm:text-[11px] font-black text-white uppercase tracking-tighter truncate w-14 sm:w-20 italic">{p.nickname}</div>
                <div className="text-center text-[10px] sm:text-[12px] text-amber-400 font-black italic">{p.totalRating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="p-3 sm:p-6 border-b border-white/10 bg-black/40">
          <h3 className="text-[10px] sm:text-base font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em] italic">Top 1000 Global</h3>
        </div>
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left text-[10px] sm:text-sm whitespace-nowrap">
            <thead className="bg-black/60 text-[8px] sm:text-[11px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white/30 font-black italic">
              <tr>
                <th className="px-4 sm:px-8 py-4 sm:py-6">Rank</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6">Jogador</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-center">Pos</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-center">Rating</th>
                <th className="px-4 sm:px-8 py-4 sm:py-6 text-right">Clube</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20">
              {sortedPlayers.slice(0, 50).map((player, idx) => (
                <tr key={player.id} onClick={() => setSelectedPlayer(player)} className="hover:bg-white/5 cursor-pointer transition-all duration-300 group">
                  <td className="px-4 sm:px-8 py-3 sm:py-5 font-black text-cyan-400/50 group-hover:text-cyan-400 italic">#{idx + 1}</td>
                  <td className="px-4 sm:px-8 py-3 sm:py-5 font-black text-white">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        <img src={`https://picsum.photos/seed/${player.id}/40/40`} className="w-7 h-7 sm:w-10 sm:h-10 rounded-full object-cover bg-slate-800 border border-white/10 relative z-10" referrerPolicy="no-referrer" />
                      </div>
                      <span className="truncate max-w-[100px] sm:max-w-none group-hover:text-cyan-400 transition-colors uppercase tracking-tight italic">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-5 text-center">
                    <span className="text-[8px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:text-white transition-colors">
                      {player.role}
                    </span>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-5 text-center">
                    <span className="font-black text-amber-400 sm:text-lg italic drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">{player.totalRating}</span>
                  </td>
                  <td className="px-4 sm:px-8 py-3 sm:py-5 text-right text-slate-500 font-black text-[9px] sm:text-[12px] uppercase italic">
                    {player.contract.teamId ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTeamId(player.contract.teamId!);
                        }}
                        className="group-hover:text-white transition-colors hover:text-cyan-400"
                      >
                        {state.teams[player.contract.teamId]?.name}
                      </button>
                    ) : (
                      <span className="text-red-500/50">Free Agent</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}

      {selectedTeamId && state.teams[selectedTeamId] && (
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
