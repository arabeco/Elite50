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
import { PlayerAvatar } from '../PlayerAvatar';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { getMatchStatus } from '../../utils/matchUtils';
import { PlayStyle, Mentality, TacticalCard } from '../../types';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Plus } = LucideIcons;


export const TacticsTab = (props: any) => {
  const { state, setState, saveGame, addToast } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const { handleMockReport, setSelectedMatchReport } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const [isPlayStyleModalOpen, setIsPlayStyleModalOpen] = useState(false);
  const [isMentalityModalOpen, setIsMentalityModalOpen] = useState(false);
  const [selectedCardSlot, setSelectedCardSlot] = useState<number | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!userTeam) return null;
  const { tactics: rawTactics, inventory } = userTeam;

  const handleSaveTactic = async () => {
    setIsSaving(true);
    try {
      if (saveGame) await saveGame();
      if (addToast) addToast('Tática salva com sucesso!', 'success');
    } catch (e) {
      if (addToast) addToast('Erro ao salvar tática.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const playStyles: PlayStyle[] = ['Blitzkrieg', 'Tiki-Taka', 'Retranca Armada', 'Motor Lento', 'Equilibrado', 'Gegenpressing', 'Catenaccio', 'Vertical'];
  const mentalities: Mentality[] = ['Calculista', 'Emocional', 'Predadora'];
  const tactics = {
    mentality: 'Calculista' as Mentality,
    linePosition: 50,
    aggressiveness: 50,
    intensity: 50,
    width: 50,
    passing: 50,
    slots: [null, null, null] as (TacticalCard | null)[],
    ...rawTactics
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-20 px-2 sm:px-0 max-w-5xl mx-auto">
      {/* Estilo de Jogo & Mentalidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {/* Play Style Card */}
        <div className="glass-card-neon white-gradient-sheen relative group overflow-hidden rounded-2xl sm:rounded-[2rem] border-cyan-500/30 p-3 sm:p-6 transition-all duration-500 hover:border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Zap size={window.innerWidth < 640 ? 32 : 48} className="text-cyan-400" />
          </div>

          <div className="relative z-10 space-y-3">
            <h3 className="text-[10px] sm:text-xs font-black text-cyan-400 uppercase tracking-[0.2em] italic">ESTILO DE JOGO</h3>

            {!isPlayStyleModalOpen ? (
              <button
                onClick={() => setIsPlayStyleModalOpen(true)}
                className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm sm:text-lg font-black text-white uppercase italic">{tactics.playStyle}</span>
                <ChevronDown size={16} className="text-cyan-400" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in zoom-in-95 duration-200">
                {playStyles.map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      handleUpdateTactics({ playStyle: style as any });
                      setIsPlayStyleModalOpen(false);
                    }}
                    className={`py-2 px-2 rounded-lg border text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${tactics.playStyle === style
                      ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {style}
                  </button>
                ))}
                <button
                  onClick={() => setIsPlayStyleModalOpen(false)}
                  className="col-span-2 py-1.5 text-[8px] font-black text-white/20 uppercase tracking-widest hover:text-white/40"
                >
                  FECHAR
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mentality Card */}
        <div className="glass-card-neon white-gradient-sheen relative group overflow-hidden rounded-2xl sm:rounded-[2rem] border-purple-500/30 p-3 sm:p-6 transition-all duration-500 hover:border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Brain size={window.innerWidth < 640 ? 32 : 48} className="text-purple-400" />
          </div>

          <div className="relative z-10 space-y-3">
            <h3 className="text-[10px] sm:text-xs font-black text-purple-400 uppercase tracking-[0.2em] italic">MENTALIDADE</h3>

            {!isMentalityModalOpen ? (
              <button
                onClick={() => setIsMentalityModalOpen(true)}
                className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <span className="text-sm sm:text-lg font-black text-white uppercase italic">{tactics.mentality}</span>
                <ChevronDown size={16} className="text-purple-400" />
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 animate-in fade-in zoom-in-95 duration-200">
                {mentalities.map((mentality) => (
                  <button
                    key={mentality}
                    onClick={() => {
                      handleUpdateTactics({ mentality: mentality as any });
                      setIsMentalityModalOpen(false);
                    }}
                    className={`py-2 px-1 rounded-lg border text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${tactics.mentality === mentality
                      ? 'bg-purple-500 border-purple-400 text-black shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {mentality}
                  </button>
                ))}
                <button
                  onClick={() => setIsMentalityModalOpen(false)}
                  className="col-span-3 py-1.5 text-[8px] font-black text-white/20 uppercase tracking-widest hover:text-white/40"
                >
                  FECHAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sliders Táticos */}
      <div className="glass-card-neon white-gradient-sheen grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
        <div className="space-y-4 sm:space-y-6">
          {/* Posicionamento */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest italic">Posicionamento • <span className="text-white">{tactics.linePosition}</span></span>
              <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Linha {tactics.linePosition <= 30 ? 'Recuada' : tactics.linePosition >= 70 ? 'Alta' : 'Média'}</span>
            </div>
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-0 h-1 bg-white/5 rounded-full border border-white/5" />
              <input
                type="range"
                min="0"
                max="100"
                value={tactics.linePosition}
                onChange={(e) => handleUpdateTactics({ linePosition: parseInt(e.target.value) })}
                className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-purple-500 relative z-10"
              />
              <div
                className="absolute h-1 bg-gradient-to-r from-purple-600 to-purple-400 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all pointer-events-none"
                style={{ width: `${tactics.linePosition}%` }}
              />
            </div>
          </div>

          {/* Intensidade */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest italic">Intensidade • <span className="text-white">{tactics.intensity}</span></span>
              <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Pressão {tactics.intensity <= 30 ? 'Baixa' : tactics.intensity >= 70 ? 'Sufocante' : 'Moderada'}</span>
            </div>
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-0 h-1 bg-white/5 rounded-full border border-white/5" />
              <input
                type="range"
                min="0"
                max="100"
                value={tactics.intensity}
                onChange={(e) => handleUpdateTactics({ intensity: parseInt(e.target.value) })}
                className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-cyan-500 relative z-10"
              />
              <div
                className="absolute h-1 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all pointer-events-none"
                style={{ width: `${tactics.intensity}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Largura */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest italic">Amplitude • <span className="text-white">{tactics.width}</span></span>
              <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{tactics.width <= 30 ? 'Estreito' : tactics.width >= 70 ? 'Explorar Pontas' : 'Equilibrado'}</span>
            </div>
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-0 h-1 bg-white/5 rounded-full border border-white/5" />
              <input
                type="range"
                min="0"
                max="100"
                value={tactics.width}
                onChange={(e) => handleUpdateTactics({ width: parseInt(e.target.value) })}
                className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-emerald-500 relative z-10"
              />
              <div
                className="absolute h-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all pointer-events-none"
                style={{ width: `${tactics.width}%` }}
              />
            </div>
          </div>

          {/* Passe */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest italic">Distribuição • <span className="text-white">{tactics.passing}</span></span>
              <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">{tactics.passing <= 30 ? 'Curto/Tiki-Taka' : tactics.passing >= 70 ? 'Longo/Direto' : 'Misto'}</span>
            </div>
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-0 h-1 bg-white/5 rounded-full border border-white/5" />
              <input
                type="range"
                min="0"
                max="100"
                value={tactics.passing}
                onChange={(e) => handleUpdateTactics({ passing: parseInt(e.target.value) })}
                className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-amber-500 relative z-10"
              />
              <div
                className="absolute h-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all pointer-events-none"
                style={{ width: `${tactics.passing}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Game Changers (Breve Visão) */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-1 sm:px-2">
          <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Flame size={window.innerWidth < 640 ? 14 : 16} className="text-orange-500" />
            Peças Chave
          </h3>
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Game Changers</span>
        </div>

        <div className="flex gap-3 sm:gap-6 px-1 sm:px-2 pb-4 sm:pb-6">
          {userTeam.squad?.slice(0, 3).map(playerId => {
            const player = state.players[playerId];
            if (!player) return null;
            return (
              <div key={playerId} className="flex flex-col items-center gap-2 group">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5 group-hover:border-cyan-500/40 transition-all shadow-lg">
                  <PlayerAvatar player={player} size="md" mode="head" className="w-full h-full" />
                  <div className="absolute bottom-0 right-0 bg-black/80 text-white text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-tl-lg border-t border-l border-white/10">
                    {player.totalRating}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[80px]">{player.nickname}</div>
                  <div className="text-[7px] sm:text-[8px] font-bold text-white/30 uppercase tracking-widest">{player.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slots Táticos */}
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between px-1 sm:px-2">
          <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
            <Shield size={window.innerWidth < 640 ? 14 : 16} className="text-amber-400" />
            Cartões Táticos
          </h3>
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Modificadores de Partida</span>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 px-1 sm:px-2 pb-4">
          {[0, 1, 2].map(idx => {
            const card = (tactics.slots && tactics.slots[idx]) || null;
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedCardSlot(idx);
                  setIsCardModalOpen(true);
                }}
                className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-[2rem] border transition-all h-20 sm:h-32 group ${card
                  ? 'glass-card-neon border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-400 cursor-pointer'
                  : 'bg-white/5 border-white/10 hover:border-white/30 border-dashed cursor-pointer'
                  }`}
              >
                {card ? (
                  <div className="flex flex-col items-center text-center gap-1 sm:gap-2">
                    <Zap size={window.innerWidth < 640 ? 12 : 24} className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                    <span className="text-[8px] sm:text-xs font-black text-white uppercase tracking-tight line-clamp-2">{card.name}</span>
                    <span className="text-[6px] sm:text-[9px] font-bold text-amber-400/80 uppercase tracking-widest">{card.effect}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 sm:gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 sm:w-12 sm:h-12 rounded-full border border-white/20 flex items-center justify-center">
                      <Plus size={window.innerWidth < 640 ? 12 : 16} className="text-white" />
                    </div>
                    <span className="text-[6px] sm:text-[9px] font-black text-white uppercase tracking-widest text-center mt-1">Slot Vazio</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Button Floating */}
      <div className="fixed bottom-24 sm:bottom-12 right-4 sm:right-12 z-40">
        <button
          onClick={handleSaveTactic}
          disabled={isSaving}
          className={`flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] italic transition-all group shadow-[0_0_30px_rgba(6,182,212,0.4)] ${isSaving ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:scale-105 active:scale-95'}`}
        >
          <Save size={window.innerWidth < 640 ? 16 : 20} className={isSaving ? "animate-pulse" : ""} />
          <span className="text-[9px] sm:text-xs">{isSaving ? 'Salvando...' : 'Salvar Tática'}</span>
        </button>
      </div>

      {/* Modal de Cartões Táticos */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCardModalOpen(false)} />
          <div className="relative glass-card-neon border-amber-500/30 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px]" />
            <header className="relative z-10 p-6 border-b border-white/5 bg-white/5 text-center flex justify-between items-center">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] neon-text-amber">Inventário</span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Equipar Cartão</h3>
              </div>
              <button onClick={() => setIsCardModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors">
                <X size={20} />
              </button>
            </header>

            <div className="relative z-10 p-4 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
              <button
                onClick={() => {
                  const newSlots = [...(tactics.slots || [null, null, null])];
                  newSlots[selectedCardSlot!] = null;
                  handleUpdateTactics({ slots: newSlots });
                  setIsCardModalOpen(false);
                }}
                className="w-full group relative overflow-hidden glass-card border-white/5 hover:border-red-500/50 rounded-2xl p-4 transition-all text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-[10px] font-black text-red-400/60 group-hover:text-red-400 uppercase tracking-widest">Remover Cartão Atual</span>
              </button>

              {inventory && inventory.length > 0 ? (
                inventory.map((card: TacticalCard) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      const newSlots = [...(tactics.slots || [null, null, null])];
                      newSlots[selectedCardSlot!] = card;
                      handleUpdateTactics({ slots: newSlots });
                      setIsCardModalOpen(false);
                    }}
                    className="w-full group relative overflow-hidden glass-card border-amber-500/20 hover:border-amber-500/50 rounded-2xl p-4 transition-all text-left bg-amber-500/5"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-black text-white uppercase italic tracking-tighter">{card.name}</span>
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">{card.rarity || 'Comum'}</span>
                      </div>
                      <p className="text-[10px] text-white/50">{card.description}</p>
                      <span className="text-[9px] font-black text-amber-400 mt-1 uppercase">Efeito: {card.effect}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-white/30 text-xs font-black uppercase tracking-widest italic">
                  Nenhum cartão no inventário. Pesquise no Laboratório.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
