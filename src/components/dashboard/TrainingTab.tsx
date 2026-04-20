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
import * as LucideIcons from 'lucide-react';
import { PlayStyle } from '../../types';

const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, BookOpen } = LucideIcons;

const PLAYSTYLES: PlayStyle[] = ['Blitzkrieg', 'Tiki-Taka', 'Retranca Armada', 'Motor Lento', 'Equilibrado', 'Gegenpressing', 'Catenaccio', 'Vertical'];
const LEARNABLE_LEGACY_TRAITS = ['Clutch', 'Protagonista', 'Catalisador', 'Passe Ouro', 'Finaliz Ouro', 'Defesa Ouro'];


export const TrainingTab = (props: any) => {
  const { state, setState } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const { handleMockReport, setSelectedMatchReport } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleSetPlaystyleTraining, handleStartLegacyTraining } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();

  // Modal and Interaction States
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isStabilizationModalOpen, setIsStabilizationModalOpen] = useState(false);
  const [isCardLabModalOpen, setIsCardLabModalOpen] = useState(false);
  const [isPlaystyleModalOpen, setIsPlaystyleModalOpen] = useState(false);
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false);
  const [selectedLegacyTrait, setSelectedLegacyTrait] = useState(LEARNABLE_LEGACY_TRAITS[0]);
  const [selectedLabSlot, setSelectedLabSlot] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSetFocusWithClose = (type: 'evolution' | 'stabilization', playerId: string | null) => {
    handleSetFocus(type, playerId);
    setIsEvolutionModalOpen(false);
    setIsStabilizationModalOpen(false);
  };

  const handleStartCardLabWithClose = (cardId: string, slotIdx: number) => {
    handleStartCardLab(cardId, slotIdx);
    setIsCardLabModalOpen(false);
  };

  const handleSetPlaystyleTrainingWithClose = (style: PlayStyle | null) => {
    handleSetPlaystyleTraining(style);
    setIsPlaystyleModalOpen(false);
  };

  if (!state.training || !state.training.individualFocus || !state.training.cardLaboratory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <TrendingUp className="w-10 h-10 text-cyan-400 mx-auto animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          <p className="text-white font-black uppercase tracking-widest text-[10px] italic">Sincronizando Módulos...</p>
        </div>
      </div>
    );
  }

  const evoPlayer = state.training.individualFocus.evolutionSlot ? state.players[state.training.individualFocus.evolutionSlot] : null;
  const stabPlayer = state.training.individualFocus.stabilizationSlot ? state.players[state.training.individualFocus.stabilizationSlot] : null;
  const squadPlayers = userTeam ? userTeam.squad.map(id => state.players[id]).filter(p => !!p) : [];
  const legacyTrainingPlayers = squadPlayers.filter(player => player.badges.slot4 || !player.badges.trainingSlot4);
  const activeLegacyTraining = squadPlayers.find(player => player.badges.trainingSlot4);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-md mx-auto pb-20 px-2 sm:px-0">
      <header className="mb-4 sm:mb-8 flex items-center justify-between px-1 sm:px-2">
        <div className="flex flex-col">
          <span className="text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] neon-text-cyan">Centro de Performance</span>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2 sm:gap-3">
            Treinamento
          </h2>
        </div>
      </header>

      {/* Treino de Estilo */}
      <section className="relative group overflow-hidden rounded-[1.2rem] sm:rounded-[2rem] glass-card-neon p-4 sm:p-6 transition-all hover:scale-[1.01] sm:hover:scale-[1.02] duration-500 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[100px] group-hover:bg-cyan-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-cyan-400 neon-text-cyan flex items-center gap-2">
                <BookOpen size={window.innerWidth < 640 ? 10 : 12} /> Estilo de Jogo
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest">Evolução do Estilo Coletivo</span>
            </div>
          </div>

          <button
            onClick={() => setIsPlaystyleModalOpen(true)}
            className="w-full relative overflow-hidden glass-card border-white/10 hover:border-cyan-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all group/btn active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />

            <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-5">
              <div className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tighter group-hover/btn:scale-105 transition-transform duration-500">
                {state.training.playstyleTraining?.currentStyle || 'Definir Estilo'}
              </div>

              {state.training.playstyleTraining?.currentStyle ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="w-full flex flex-col gap-1.5 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex justify-between w-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40">
                      <span>Progresso Nível 1</span>
                      <span className="text-cyan-400">
                        {Math.min(10, Math.floor((state.training.playstyleTraining.understanding[state.training.playstyleTraining.currentStyle] || 0) / 10))}/10 DIAS
                      </span>
                    </div>
                    <div className="w-full flex gap-1 h-3 sm:h-4">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const currentDays = Math.min(10, Math.floor((state.training.playstyleTraining.understanding[state.training.playstyleTraining!.currentStyle] || 0) / 10));
                        const isFilled = i < currentDays;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm sm:rounded transition-all duration-500 ${isFilled ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white/10'}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full flex flex-col gap-1.5">
                    <div className="flex justify-between w-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/40">
                      <span>Entendimento Total</span>
                      <span className="text-emerald-400">{state.training.playstyleTraining.understanding[state.training.playstyleTraining.currentStyle] || 0}%</span>
                    </div>
                    <div className="w-full h-1 sm:h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000"
                        style={{ width: `${state.training.playstyleTraining.understanding[state.training.playstyleTraining.currentStyle] || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[8px] sm:text-[9px] text-cyan-400/60 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] animate-pulse py-4">
                  Toque para Selecionar um Estilo
                </div>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Foco Individual */}
      <section className="relative group overflow-hidden rounded-[1.2rem] sm:rounded-[2rem] glass-card-neon p-4 sm:p-6 transition-all hover:scale-[1.01] sm:hover:scale-[1.02] duration-500 shadow-2xl">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-fuchsia-500/10 blur-[100px] group-hover:bg-fuchsia-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-fuchsia-400 neon-text-magenta flex items-center gap-2">
                <Target size={window.innerWidth < 640 ? 10 : 12} /> Bio-Otimização
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest">Aceleração Individual</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {/* Evolution Slot */}
            <button
              onClick={() => setIsEvolutionModalOpen(true)}
              className="relative overflow-hidden glass-card border-white/10 hover:border-emerald-500/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all group/slot text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover/slot:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="text-[7px] sm:text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 sm:mb-3">Evolução 1.5x</div>
                {evoPlayer ? (
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="text-[10px] sm:text-sm font-black text-white uppercase italic tracking-tighter truncate">{evoPlayer.nickname}</div>
                    <div className="text-[8px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">{evoPlayer.totalRating} pts</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 py-1 sm:py-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/5 flex items-center justify-center text-white/10 group-hover/slot:text-emerald-400 transition-colors">
                      <Users size={window.innerWidth < 640 ? 10 : 14} />
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-white/10 font-black uppercase tracking-widest">Vazio</span>
                  </div>
                )}
              </div>
            </button>

            {/* Stabilization Slot */}
            <button
              onClick={() => setIsStabilizationModalOpen(true)}
              className="relative overflow-hidden glass-card border-white/10 hover:border-amber-500/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all group/slot text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover/slot:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="text-[7px] sm:text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1.5 sm:mb-3">Estabilização</div>
                {stabPlayer ? (
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="text-[10px] sm:text-sm font-black text-white uppercase italic tracking-tighter truncate">{stabPlayer.nickname}</div>
                    <div className="text-[8px] sm:text-[10px] font-bold text-white/20 uppercase tracking-widest">{stabPlayer.totalRating} pts</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 py-1 sm:py-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/5 flex items-center justify-center text-white/10 group-hover/slot:text-amber-400 transition-colors">
                      <Users size={window.innerWidth < 640 ? 10 : 14} />
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-white/10 font-black uppercase tracking-widest">Vazio</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Laboratório de Cartas */}
      <section className="relative group overflow-hidden rounded-[1.2rem] sm:rounded-[2rem] glass-card-neon p-4 sm:p-6 transition-all hover:scale-[1.01] sm:hover:scale-[1.02] duration-500 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 blur-[100px] group-hover:bg-purple-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-purple-400 flex items-center gap-2">
                <Star size={window.innerWidth < 640 ? 10 : 12} /> DNA Legado
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest">Curar fardos ou aprender trait</span>
            </div>
          </div>

          <button
            onClick={() => setIsLegacyModalOpen(true)}
            className="w-full relative overflow-hidden glass-card border-white/10 hover:border-purple-500/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all group/btn active:scale-95"
          >
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="text-left min-w-0">
                <div className="text-[9px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Projeto ativo</div>
                <div className="mt-1 text-sm sm:text-lg font-black text-white uppercase italic tracking-tight truncate">
                  {activeLegacyTraining
                    ? `${activeLegacyTraining.nickname}: ${activeLegacyTraining.badges.trainingSlot4?.type === 'CURE' ? 'Cura' : activeLegacyTraining.badges.trainingSlot4?.trait}`
                    : 'Selecionar atleta'}
                </div>
              </div>
              <div className="shrink-0 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-purple-200">
                {activeLegacyTraining ? `${activeLegacyTraining.badges.trainingSlot4?.daysLeft}d` : 'Abrir'}
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className="relative group overflow-hidden rounded-[1.2rem] sm:rounded-[2rem] glass-card-neon p-4 sm:p-6 transition-all hover:scale-[1.01] sm:hover:scale-[1.02] duration-500 shadow-2xl">
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px] group-hover:bg-amber-500/20 transition-all duration-700" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3 sm:mb-6">
            <div className="flex flex-col gap-0.5 sm:gap-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-amber-400 neon-text-amber flex items-center gap-2">
                <Zap size={window.innerWidth < 640 ? 10 : 12} /> Lab de Pesquisa
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-white/30 uppercase tracking-widest">Desenvolvimento de Atributos</span>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {state.training.cardLaboratory.slots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => !slot.cardId && (setSelectedLabSlot(idx), setIsCardLabModalOpen(true))}
                disabled={!!slot.cardId}
                className={`w-full relative overflow-hidden glass-card border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all group/lab ${!slot.cardId ? 'hover:border-amber-500/50 cursor-pointer' : 'cursor-default'}`}
              >
                {slot.cardId ? (
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex flex-col items-start gap-0.5 sm:gap-1">
                      <div className="text-[9px] sm:text-[10px] font-black text-white uppercase italic tracking-tighter">{slot.cardId}</div>
                      <div className="text-[7px] sm:text-[8px] font-bold text-amber-400 uppercase tracking-widest">Conclui em: {new Date(slot.finishTime!).toLocaleDateString()}</div>
                    </div>
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse">
                      <Clock size={window.innerWidth < 640 ? 12 : 16} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 sm:gap-3 py-1 relative z-10">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10 group-hover/lab:text-amber-400 group-hover/lab:border-amber-500/30 transition-all">
                      <Star size={window.innerWidth < 640 ? 10 : 14} />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-white/20 group-hover/lab:text-white transition-colors uppercase tracking-[0.1em] sm:tracking-[0.2em]">Nova Pesquisa</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-hover/lab:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Selection Modals */}
      {(isEvolutionModalOpen || isStabilizationModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/90 sm:bg-black/80 backdrop-blur-xl sm:backdrop-blur-sm" onClick={() => { setIsEvolutionModalOpen(false); setIsStabilizationModalOpen(false); }} />
          <div className="relative glass-card-neon border-fuchsia-500/30 rounded-[1.5rem] sm:rounded-[2rem] w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500/10 blur-[100px]" />

            <header className="relative z-10 p-4 sm:p-6 border-b border-white/5 bg-white/5">
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <span className="text-[8px] sm:text-[10px] font-black text-fuchsia-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] neon-text-magenta">Bio-Otimização</span>
                <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter">Selecionar Atleta</h3>
              </div>
            </header>

            <div className="relative z-10 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[60vh] custom-scrollbar">
              <button
                onClick={() => handleSetFocusWithClose(isEvolutionModalOpen ? 'evolution' : 'stabilization', null)}
                className="w-full group relative overflow-hidden glass-card border-white/5 hover:border-red-500/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-[9px] sm:text-[10px] font-black text-red-400/60 group-hover:text-red-400 uppercase tracking-widest transition-colors">Remover Foco Atual</span>
              </button>

              {squadPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSetFocusWithClose(isEvolutionModalOpen ? 'evolution' : 'stabilization', p.id)}
                  className="w-full group relative overflow-hidden glass-card border-white/5 hover:border-fuchsia-500/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all text-left flex items-center justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-black text-[10px] sm:text-xs">
                      {p.totalRating}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-black text-white uppercase italic tracking-tighter">{p.nickname}</span>
                      <span className="text-[7px] sm:text-[8px] font-bold text-white/20 uppercase tracking-widest">{p.role}</span>
                    </div>
                  </div>
                  <ChevronRight size={window.innerWidth < 640 ? 14 : 16} className="relative z-10 text-white/10 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isLegacyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsLegacyModalOpen(false)} />
          <div className="relative glass-card-neon border-purple-500/30 rounded-[2rem] w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <header className="relative z-10 p-6 border-b border-white/5 bg-white/5 text-center">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">DNA Legado</span>
              <h3 className="mt-1 text-xl font-black text-white uppercase italic tracking-tighter">Treinar Trait</h3>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/30">Fardo cura em 5 dias. Trait novo aprende em 7.</p>
            </header>

            <div className="p-4 border-b border-white/5">
              <label className="mb-2 block text-[8px] font-black uppercase tracking-widest text-white/40">Trait para aprender</label>
              <select
                value={selectedLegacyTrait}
                onChange={(event) => setSelectedLegacyTrait(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-purple-500/50"
              >
                {LEARNABLE_LEGACY_TRAITS.map(trait => (
                  <option key={trait} value={trait} className="bg-slate-950">{trait}</option>
                ))}
              </select>
            </div>

            <div className="relative z-10 max-h-[52vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {legacyTrainingPlayers.map(player => {
                const hasFardo = !!player.badges.slot4;
                const isTraining = !!player.badges.trainingSlot4;
                return (
                  <div key={player.id} className="glass-card border-white/5 rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white uppercase italic tracking-tight truncate">{player.nickname}</div>
                        <div className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/30">
                          {isTraining
                            ? `${player.badges.trainingSlot4?.type === 'CURE' ? 'Curando' : 'Aprendendo'} - ${player.badges.trainingSlot4?.daysLeft} dias`
                            : hasFardo
                              ? `Fardo: ${player.badges.slot4}`
                              : 'Slot legado livre'}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {hasFardo && !isTraining && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStartLegacyTraining(player.id, 'CURE');
                              setIsLegacyModalOpen(false);
                            }}
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-emerald-200"
                          >
                            Curar
                          </button>
                        )}
                        {!hasFardo && !isTraining && (
                          <button
                            type="button"
                            onClick={() => {
                              handleStartLegacyTraining(player.id, 'LEARN', selectedLegacyTrait);
                              setIsLegacyModalOpen(false);
                            }}
                            className="rounded-xl border border-purple-500/30 bg-purple-500/15 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-purple-200"
                          >
                            Aprender
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isCardLabModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCardLabModalOpen(false)} />
          <div className="relative glass-card-neon border-amber-500/30 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 blur-[100px]" />

            <header className="relative z-10 p-6 border-b border-white/5 bg-white/5 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] neon-text-amber">Lab de Pesquisa</span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Nova Pesquisa</h3>
              </div>
            </header>

            <div className="relative z-10 p-6 space-y-3">
              {[
                { id: 'ataque', name: 'Ataque Total', desc: 'Foco ofensivo (3 dias)', color: 'from-red-500/20' },
                { id: 'defesa', name: 'Muralha', desc: 'Foco defensivo (3 dias)', color: 'from-blue-500/20' },
                { id: 'meio', name: 'Meio Criativo', desc: 'Controle de jogo (3 dias)', color: 'from-emerald-500/20' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (selectedLabSlot !== null) {
                      handleStartCardLabWithClose(c.id, selectedLabSlot);
                    }
                  }}
                  className="w-full group relative overflow-hidden glass-card border-white/5 hover:border-amber-500/50 rounded-2xl p-5 transition-all text-left"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${c.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative z-10">
                    <div className="text-sm font-black text-white uppercase italic tracking-tighter group-hover:text-amber-400 transition-colors">{c.name}</div>
                    <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isPlaystyleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsPlaystyleModalOpen(false)} />
          <div className="relative glass-card-neon border-cyan-500/30 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 blur-[100px]" />

            <header className="relative z-10 p-6 border-b border-white/5 bg-white/5 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] neon-text-cyan">Estilo de Jogo</span>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Selecionar Estilo</h3>
                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest mt-1">O entendimento sobe 1-3% por dia</p>
              </div>
            </header>

            <div className="relative z-10 p-4 max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
              <button
                onClick={() => handleSetPlaystyleTrainingWithClose(null)}
                className="w-full group relative overflow-hidden glass-card border-white/5 hover:border-red-500/50 rounded-2xl p-4 transition-all text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-[10px] font-black text-red-400/60 group-hover:text-red-400 uppercase tracking-widest">Interromper Treino</span>
              </button>

              {PLAYSTYLES.map(style => {
                const understanding = state.training.playstyleTraining?.understanding[style] || 0;
                const isActive = state.training.playstyleTraining?.currentStyle === style;

                return (
                  <button
                    key={style}
                    onClick={() => handleSetPlaystyleTrainingWithClose(style)}
                    className={`w-full group relative overflow-hidden glass-card transition-all text-left p-4 rounded-2xl border ${isActive ? 'border-cyan-500/50 bg-cyan-500/10' : 'border-white/5 hover:border-cyan-500/50'
                      }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`text-sm font-black uppercase italic tracking-tighter transition-colors ${isActive ? 'text-cyan-400' : 'text-white'}`}>
                          {style}
                        </span>
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Nível de Entendimento</span>
                      </div>
                      <div className={`text-xs font-black italic ${isActive ? 'text-cyan-400' : 'text-white/40'}`}>
                        {understanding}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
