import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Globe,
  ChevronRight,
  AlertCircle,
  Zap,
  Search,
  CheckCircle2,
  Trash2,
  Users,
  Trophy,
  Activity,
  ArrowRight,
  Palette,
  Layout
} from 'lucide-react';
import { useGame } from '../store/GameContext';
import { TeamLogo } from './TeamLogo';
import { Player, Team, PlayerRole, District, LeagueColor, GameState } from '../types';
import { PlayerCard } from './PlayerCard';
import { refillTeamRoster } from '../engine/generator';

type Step = 'path-selection' | 'heir-choice' | 'founder-identity';

export const NewGameFlow: React.FC = () => {
  const { state, setState, saveGame, isSyncing, userId } = useGame();
  const [step, setStep] = useState<Step>('path-selection');
  const [selectedHeirTeamId, setSelectedHeirTeamId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [managerName, setManagerName] = useState('');

  // Founder Data
  const [founderData, setFounderData] = useState({
    name: '',
    prefix: '',
    primaryColor: '#22d3ee', // Cyan
    secondaryColor: '#0f172a', // Slate 900
    replacedTeamId: '',
    district: 'NORTE' as District
  });

  // Draft Filtering
  const [draftSearch, setDraftSearch] = useState('');
  const [draftRoleFilter, setDraftRoleFilter] = useState<PlayerRole | 'ALL'>('ALL');
  const [draftDistrictFilter, setDraftDistrictFilter] = useState<District | 'ALL'>('ALL');

  const players = useMemo(() => Object.values(state.players), [state.players]);
  const teams = useMemo(() => Object.values(state.teams), [state.teams]);

  const availableHeirTeams = useMemo(() => {
    // Return teams that don't have a manager assigned
    return Object.values(state.teams).filter(t => !t.managerId && t.id.startsWith('t_'));
  }, [state.teams]);

  const filteredDraftPlayers = useMemo(() => {
    return players.filter(p => {
      // Rule: Only allow players from NPC teams or free agents
      const playerTeam = p.contract.teamId ? state.teams[p.contract.teamId] : null;
      const fromNpcTeam = !playerTeam || !playerTeam.managerId;
      if (!fromNpcTeam) return false;

      const matchesSearch = p.nickname.toLowerCase().includes(draftSearch.toLowerCase()) ||
        p.name.toLowerCase().includes(draftSearch.toLowerCase());
      const matchesRole = draftRoleFilter === 'ALL' || p.role === draftRoleFilter;
      const matchesDistrict = draftDistrictFilter === 'ALL' || p.district === draftDistrictFilter;
      const notSelected = !selectedPlayerIds.includes(p.id);
      return matchesSearch && matchesRole && matchesDistrict && notSelected;
    }).sort((a, b) => b.totalRating - a.totalRating);
  }, [players, draftSearch, draftRoleFilter, draftDistrictFilter, selectedPlayerIds, state.teams]);

  const selectedPlayers = useMemo(() => {
    return selectedPlayerIds.map(id => state.players[id]).filter(Boolean);
  }, [selectedPlayerIds, state.players]);

  const togglePlayerSelection = (player: Player) => {
    if (selectedPlayerIds.includes(player.id)) {
      setSelectedPlayerIds(prev => prev.filter(id => id !== player.id));
    } else {
      if (selectedPlayerIds.length >= 15) return;
      setSelectedPlayerIds(prev => [...prev, player.id]);
    }
  };

  // Logic for Path B: Founder Draft
  const draftScoreLimit = 10000; // Increased to allow more flexibility for 15 players
  const currentScore = useMemo(() => {
    return selectedPlayerIds.reduce((sum, id) => sum + (state.players[id]?.totalRating || 0), 0);
  }, [selectedPlayerIds, state.players]);

  const selectedPlayersByRole = useMemo(() => {
    const roles: Record<PlayerRole, number> = { GOL: 0, ZAG: 0, MEI: 0, ATA: 0 };
    selectedPlayerIds.forEach(id => {
      const role = state.players[id]?.role;
      if (role) roles[role as PlayerRole]++;
    });
    return roles;
  }, [selectedPlayerIds, state.players]);

  const eliteCount = useMemo(() => {
    return selectedPlayerIds.filter(id => (state.players[id]?.totalRating || 0) >= 900).length;
  }, [selectedPlayerIds, state.players]);

  const isDraftValid =
    selectedPlayerIds.length === 15 &&
    currentScore <= draftScoreLimit &&
    eliteCount <= 3 &&
    selectedPlayersByRole.GOL >= 1 &&
    selectedPlayersByRole.ZAG >= 4 &&
    selectedPlayersByRole.MEI >= 3 &&
    selectedPlayersByRole.ATA >= 2;

  const handleFinishHeir = () => {
    const team = state.teams[selectedHeirTeamId];
    if (!team) return;

    const managerId = userId || 'm_user';
    const userManager = {
      id: managerId,
      name: managerName || 'Manager User',
      district: team.district,
      reputation: 50,
      attributes: {
        evolution: 50,
        negotiation: 50,
        scout: 50
      },
      career: {
        titlesWon: 0,
        totalLeagueTitles: 0,
        totalCupTitles: 0,
        hallOfFameEntries: 0,
        consecutiveTitles: 0,
        currentTeamId: selectedHeirTeamId,
        historyTeamIds: []
      },
      achievements: []
    };

    // Auto-generate initial lineup
    const newLineup: Record<string, string> = {};
    const formationSlots = [
      { id: 'GOL', role: 'GOL' },
      { id: 'ZAG1', role: 'ZAG' },
      { id: 'ZAG2', role: 'ZAG' },
      { id: 'ZAG3', role: 'ZAG' },
      { id: 'ZAG4', role: 'ZAG' },
      { id: 'MEI1', role: 'MEI' },
      { id: 'MEI2', role: 'MEI' },
      { id: 'MEI3', role: 'MEI' },
      { id: 'ATA1', role: 'ATA' },
      { id: 'ATA2', role: 'ATA' },
      { id: 'ATA3', role: 'ATA' }
    ];

    const availablePlayers = [...team.squad];

    formationSlots.forEach(slot => {
      if (availablePlayers.length === 0) return;

      // Sort available players by adjusted rating for this slot
      availablePlayers.sort((a, b) => {
        const playerA = state.players[a];
        const playerB = state.players[b];
        const ratingA = (playerA?.totalRating || 0) * (playerA?.role === slot.role ? 1.0 : 0.6);
        const ratingB = (playerB?.totalRating || 0) * (playerB?.role === slot.role ? 1.0 : 0.6);
        return ratingB - ratingA;
      });

      const bestPlayerId = availablePlayers.shift();
      if (bestPlayerId) {
        newLineup[slot.id] = bestPlayerId;
      }
    });

    const newState = {
      ...state,
      isCreator: true,
      teams: {
        ...state.teams,
        [selectedHeirTeamId]: {
          ...team,
          managerId: managerId,
          lineup: newLineup
        }
      },
      managers: {
        ...state.managers,
        [managerId]: userManager
      },
      world: {
        ...state.world,
        status: 'LOBBY' as const,
        currentDay: 0 // Start at Day 0 (Genesis Day 0)
      },
      userTeamId: selectedHeirTeamId,
      userManagerId: managerId
    };

    setState(newState);
    saveGame(newState);
  };

  const handleFinishFounder = () => {
    const newTeamId = `t_founder_${Date.now()}`;
    const managerId = userId || 'm_user';

    const newTeam: Team = {
      id: newTeamId,
      name: `${founderData.name} ${founderData.prefix}`,
      city: 'Nova Capital',
      district: founderData.district,
      league: state.teams[founderData.replacedTeamId].league,
      colors: {
        primary: founderData.primaryColor,
        secondary: founderData.secondaryColor
      },
      tactics: {
        playStyle: 'Vertical',
        preferredFormation: '4-3-3'
      },
      managerId: managerId,
      squad: [],
      lineup: {}
    };

    // 2. Clear old team squad and set them to Free Agents
    const updatedPlayers = { ...state.players };
    const updatedTeams = { ...state.teams };

    const oldTeam = updatedTeams[founderData.replacedTeamId];
    if (oldTeam && oldTeam.squad) {
      oldTeam.squad.forEach(pid => {
        if (updatedPlayers[pid]) {
          updatedPlayers[pid] = {
            ...updatedPlayers[pid],
            contract: { ...updatedPlayers[pid].contract, teamId: null }
          };
        }
      });
    }

    // Add new team
    updatedTeams[newTeamId] = newTeam;

    // 4. Update world state to replace the team in leagues
    const updatedLeagues = { ...state.world.leagues };
    Object.keys(updatedLeagues).forEach(key => {
      const league = updatedLeagues[key as keyof typeof updatedLeagues];
      league.standings = league.standings.map(s =>
        s.teamId === founderData.replacedTeamId ? { ...s, teamId: newTeamId } : s
      );
      league.matches = league.matches.map(m => ({
        ...m,
        homeTeamId: m.homeTeamId === founderData.replacedTeamId ? newTeamId : m.homeTeamId,
        awayTeamId: m.awayTeamId === founderData.replacedTeamId ? newTeamId : m.awayTeamId
      }));
    });

    // Remove the replaced team from teams record
    delete updatedTeams[founderData.replacedTeamId];

    const userManager = {
      id: managerId,
      name: managerName || 'Manager User',
      district: founderData.district,
      reputation: 50,
      attributes: {
        evolution: 50,
        negotiation: 50,
        scout: 50
      },
      career: {
        titlesWon: 0,
        totalLeagueTitles: 0,
        totalCupTitles: 0,
        hallOfFameEntries: 0,
        consecutiveTitles: 0,
        currentTeamId: newTeamId,
        historyTeamIds: []
      },
      achievements: []
    };

    const newState: GameState = {
      ...state,
      isCreator: true,
      teams: updatedTeams,
      players: updatedPlayers,
      managers: {
        ...state.managers,
        [managerId]: userManager
      },
      world: {
        ...state.world,
        leagues: updatedLeagues,
        currentDay: -1 // Start at Day -1 (Lobby Phase)
      },
      userTeamId: newTeamId,
      userManagerId: managerId
    };

    setState(newState);
    saveGame(newState);
  };

  const renderPathSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#02040a] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-amber-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]" />
      </div>

      <div className="text-center mb-12 space-y-4 relative z-10">
        <div className="inline-block px-4 py-1 bg-white/5 border border-white/10 rounded-full mb-2 backdrop-blur-md">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Protocolo Onboarding v2.0.50</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-2xl">
          ELITE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400">2050</span>
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-700" />
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">
            Carreira & Origem
          </p>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl relative z-10 px-4">
        {/* Path A: Heir */}
        <button
          onClick={() => setStep('heir-choice')}
          className="group relative min-h-[280px] sm:min-h-[320px] md:h-[380px] xl:h-[420px] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 xl:p-10 text-left transition-all duration-500 hover:border-cyan-500/40 hover:bg-cyan-500/[0.02] overflow-hidden shadow-2xl"
        >
          {/* Animated Background Icon */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12">
            <Briefcase size={200} className="text-cyan-400 sm:size-[280px]" />
          </div>

          {/* Glow Effect on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-cyan-500/0 group-hover:from-cyan-500/[0.05] transition-all duration-700" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 bg-black/40 border border-cyan-500/30 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 xl:mb-8 group-hover:scale-110 group-hover:border-cyan-400 transition-all duration-500 shadow-lg shadow-cyan-500/10">
              <Briefcase size={24} className="text-cyan-400 sm:size-7 xl:size-8" />
            </div>

            <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 xl:mb-6">
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white uppercase tracking-tighter italic">O HERDEIRO</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <p className="text-cyan-400 text-[8px] sm:text-[9px] xl:text-[10px] font-black uppercase tracking-[0.25em]">GESTÃO DE LEGADO</p>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] sm:text-xs xl:text-sm leading-relaxed font-medium mb-auto">
              Assuma o comando de uma equipe que já está pronta. Você entrará num clube fechado e jogará com o elenco atual dele, sem precisar recrutar ou montar o time.
            </p>

            <div className="pt-4 sm:pt-6 xl:pt-8 border-t border-white/5 mt-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 sm:gap-3 text-cyan-400 font-black text-[9px] sm:text-[10px] xl:text-[11px] uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                  Escolher Time Pronto
                  <ArrowRight size={14} className="sm:size-4" />
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-cyan-500/20" />)}
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Path B: Founder */}
        <button
          onClick={() => setStep('founder-identity')}
          className="group relative min-h-[280px] sm:min-h-[320px] md:h-[380px] xl:h-[420px] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 xl:p-10 text-left transition-all duration-500 hover:border-amber-500/40 hover:bg-amber-500/[0.02] overflow-hidden shadow-2xl"
        >
          {/* Animated Background Icon */}
          <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:rotate-12">
            <Globe size={200} className="text-amber-400 sm:size-[280px]" />
          </div>

          {/* Glow Effect on Hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/[0.05] transition-all duration-700" />

          <div className="relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 sm:w-14 sm:h-14 xl:w-16 xl:h-16 bg-black/40 border border-amber-500/30 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 xl:mb-8 group-hover:scale-110 group-hover:border-amber-400 transition-all duration-500 shadow-lg shadow-amber-500/10">
              <Globe size={24} className="text-amber-400 sm:size-7 xl:size-8" />
            </div>

            <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4 xl:mb-6">
              <h2 className="text-xl sm:text-2xl xl:text-3xl font-black text-white uppercase tracking-tighter italic">O FUNDADOR</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <p className="text-amber-400 text-[8px] sm:text-[9px] xl:text-[10px] font-black uppercase tracking-[0.25em]">CRIAR TIME E DRAFTAR</p>
              </div>
            </div>

            <p className="text-slate-400 text-[11px] sm:text-xs xl:text-sm leading-relaxed font-medium mb-auto">
              Crie uma potência do zero e roube o lugar de um time da liga. Você começará de mãos vazias e montará seu elenco escolhendo atletas no Draft inicial.
            </p>

            <div className="pt-4 sm:pt-6 xl:pt-8 border-t border-white/5 mt-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 sm:gap-3 text-amber-400 font-black text-[9px] sm:text-[10px] xl:text-[11px] uppercase tracking-[0.2em] group-hover:gap-5 transition-all">
                  Iniciar Registro
                  <ArrowRight size={14} className="sm:size-4" />
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-amber-500/20" />)}
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Technical Info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-20 hover:opacity-50 transition-opacity">
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-white uppercase tracking-widest">Database</span>
          <span className="text-[9px] font-mono text-cyan-400">SUPABASE_CONNECTED</span>
        </div>
        <div className="w-[1px] h-4 bg-white/20" />
        <div className="flex flex-col items-center">
          <span className="text-[7px] font-black text-white uppercase tracking-widest">Engine</span>
          <span className="text-[9px] font-mono text-amber-400">GEN_PLAYER_v4.2</span>
        </div>
      </div>
    </div>
  );

  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('all');

  const filteredTeams = useMemo(() => {
    return availableHeirTeams.filter(t => {
      if (selectedLeagueFilter !== 'all' && t.league !== selectedLeagueFilter) return false;
      return true;
    });
  }, [availableHeirTeams, selectedLeagueFilter]);

  const renderHeirChoice = () => (
    <div className="min-h-screen bg-[#02040a] p-4 xl:p-8 flex flex-col h-screen overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-cyan-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.03)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-6 xl:mb-10 shrink-0">
          <div className="space-y-4">
            <button
              onClick={() => setStep('path-selection')}
              className="group flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10">
                <ChevronRight size={16} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
              </div>
              <span className="font-black text-[9px] xl:text-[10px] uppercase tracking-[0.3em]">Retornar</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-3xl xl:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
                MERCADO DE <span className="text-cyan-400">VAGAS</span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-8 bg-cyan-500/30" />
                <p className="text-slate-500 text-[8px] xl:text-[9px] font-black uppercase tracking-[0.4em]">Protocolo de Sucessão Ativo</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
              {['all', 'norte', 'sul', 'leste', 'oeste'].map((league) => (
                <button
                  key={league}
                  onClick={() => setSelectedLeagueFilter(league)}
                  className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selectedLeagueFilter === league
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {league === 'all' ? 'Todas' : league}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-8">
              {filteredTeams.map(team => {
                const teamRating = team.squad.reduce((sum, pid) => sum + (state.players[pid]?.totalRating || 0), 0);
                const isSelected = selectedHeirTeamId === team.id;

                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedHeirTeamId(team.id)}
                    className={`group relative p-4 sm:p-6 xl:p-8 rounded-[1.25rem] sm:rounded-[2rem] xl:rounded-[2.5rem] border transition-all duration-500 text-left overflow-hidden min-h-[160px] sm:min-h-[280px] xl:min-h-[320px] flex flex-col justify-between ${isSelected
                      ? 'bg-cyan-500/[0.07] border-cyan-500/50 shadow-[0_0_40px_rgba(34,211,238,0.15)] scale-[1.02]'
                      : 'bg-white/[0.02] border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04]'
                      }`}
                  >
                    {/* Background Effects */}
                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-700 ${isSelected ? 'bg-cyan-500/20 opacity-100' : 'bg-cyan-500/10 opacity-0 group-hover:opacity-100'
                      }`} />
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-transparent to-cyan-500/0 group-hover:from-cyan-500/[0.02] transition-all duration-700" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-2 sm:mb-4 xl:mb-6">
                        <div className="relative">
                          <div className={`w-9 h-9 sm:w-12 sm:h-12 xl:w-16 xl:h-16 rounded-lg sm:rounded-2xl flex items-center justify-center border transition-all duration-500 ${isSelected ? 'border-cyan-400 bg-black/40 shadow-lg shadow-cyan-500/20' : 'border-white/10 bg-black/20 group-hover:border-white/30'
                            }`} style={{ backgroundColor: isSelected ? undefined : team.colors.primary + '15' }}>
                            <div className="flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                              {team.logo ? (
                                <TeamLogo
                                  primaryColor={team.logo.primary}
                                  secondaryColor={team.logo.secondary}
                                  patternId={team.logo.patternId as any}
                                  symbolId={team.logo.symbolId}
                                  size={isSelected ? (window.innerWidth < 640 ? 24 : 32) : (window.innerWidth < 640 ? 20 : 28)}
                                />
                              ) : (
                                <TeamLogo
                                  primaryColor={isSelected ? '#22d3ee' : team.colors.primary}
                                  secondaryColor={team.colors.secondary}
                                  patternId="none"
                                  symbolId="Shield"
                                  size={isSelected ? (window.innerWidth < 640 ? 18 : 24) : (window.innerWidth < 640 ? 16 : 20)}
                                />
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-[#02040a] shadow-lg animate-bounce">
                              <CheckCircle2 size={10} className="text-black sm:size-[12px]" />
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[6px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Status</p>
                          <span className={`text-[7px] sm:text-[9px] font-black uppercase px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border ${isSelected ? 'bg-cyan-500 text-black border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                            Disponível
                          </span>
                        </div>
                      </div>

                      <div className="space-y-0.5 sm:space-y-2 mb-4 sm:mb-8">
                        <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tighter italic group-hover:text-cyan-400 transition-colors truncate">{team.name}</h3>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-1 h-1 rounded-full bg-cyan-500/50" />
                          <p className="text-[7px] sm:text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] truncate">{team.city} • {team.district}</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-8">
                      <div className="bg-black/40 rounded-lg sm:rounded-2xl p-2 sm:p-4 border border-white/5 group-hover:border-cyan-500/20 transition-all">
                        <p className="text-[5px] sm:text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1 sm:mb-1.5">Rating Geral</p>
                        <div className="flex items-baseline gap-1">
                          <p className="text-sm sm:text-xl font-black text-white tabular-nums tracking-tighter">{teamRating.toLocaleString('pt-BR')}</p>
                          <span className="text-[6px] sm:text-[8px] font-black text-cyan-500/50 uppercase">PTS</span>
                        </div>
                        <div className="mt-1.5 sm:mt-2 w-full h-0.5 sm:h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, (teamRating / 11000) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="bg-black/40 rounded-lg sm:rounded-2xl p-2 sm:p-4 border border-white/5 group-hover:border-cyan-500/20 transition-all">
                        <p className="text-[5px] sm:text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1 sm:mb-1.5">Divisão</p>
                        <p className="text-[8px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-tight truncate">{team.league}</p>
                        <div className="mt-1.5 sm:mt-2 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-0.5 sm:w-1 h-0.5 sm:h-1 rounded-full ${i <= 3 ? 'bg-cyan-500/50' : 'bg-white/5'}`} />)}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 pt-3 sm:pt-6 border-t border-white/5 flex items-center justify-between group-hover:border-cyan-500/20 transition-colors">
                      <div className="flex items-center gap-2 xl:gap-3">
                        <div className="flex -space-x-1.5 sm:-space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border border-[#02040a] bg-slate-800 flex items-center justify-center overflow-hidden">
                              <Users size={8} className="text-slate-500 sm:size-[10px]" />
                            </div>
                          ))}
                        </div>
                        <span className="text-[6px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">{team.squad.length} Atletas</span>
                      </div>
                      <div className={`flex items-center gap-1.5 sm:gap-2 transition-all duration-500 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                        <span className="text-[7px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest">Selecionar</span>
                        <ArrowRight size={12} className="text-cyan-400 sm:size-[14px]" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-6 relative">
              <div className="w-20 h-20 xl:w-24 xl:h-24 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                <AlertCircle size={32} className="text-slate-700 group-hover:text-red-500 xl:size-10 transition-colors" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg xl:text-xl font-black text-white uppercase tracking-widest italic">Nenhuma vaga detectada</h3>
                <p className="text-slate-500 text-[9px] xl:text-[10px] uppercase font-black tracking-[0.3em]">O mercado de treinadores está estagnado no momento.</p>
              </div>
              <button
                onClick={() => setStep('path-selection')}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
              >
                Voltar ao Início
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="mt-auto pt-4 xl:pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
            {/* Manager Name Input */}
            <div className="w-full sm:w-64 space-y-2">
              <label className="flex items-center justify-between px-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Seu Nome de Treinador</span>
                <span className="text-[7px] font-mono text-cyan-500/30">ID_MANAGER</span>
              </label>
              <input
                type="text"
                placeholder="NOME DO MANAGER..."
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white font-bold focus:border-cyan-500/50 focus:bg-cyan-500/5 outline-none transition-all placeholder:text-slate-700 uppercase"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full animate-pulse transition-colors duration-500 ${selectedHeirTeamId ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
              <div className="space-y-0.5">
                <p className="text-slate-500 text-[8px] xl:text-[9px] font-black uppercase tracking-[0.2em]">
                  {selectedHeirTeamId ? 'Unidade de Destino Confirmada' : 'Aguardando Seleção de Destino'}
                </p>
                {selectedHeirTeamId && (
                  <p className="text-cyan-400 text-[7px] xl:text-[8px] font-mono uppercase tracking-widest">
                    READY_FOR_DEPLOYMENT: {state.teams[selectedHeirTeamId]?.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            disabled={!selectedHeirTeamId || !managerName}
            onClick={handleFinishHeir}
            className={`relative group px-10 xl:px-14 py-3 xl:py-4 rounded-xl xl:rounded-2xl font-black text-[10px] xl:text-[11px] uppercase tracking-[0.3em] transition-all duration-500 ${selectedHeirTeamId
              ? 'bg-cyan-500 text-black shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:scale-105 hover:shadow-cyan-500/50'
              : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
              }`}
          >
            <span className="relative z-10 flex items-center gap-3">
              Finalizar Protocolo
              <Zap size={16} className={selectedHeirTeamId ? 'animate-pulse' : ''} />
            </span>
            {selectedHeirTeamId && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderFounderIdentity = () => (
    <div className="min-h-screen bg-[#02040a] p-4 xl:p-8 flex flex-col h-screen overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.03)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-6 xl:mb-10 shrink-0">
          <div className="space-y-4">
            <button
              onClick={() => setStep('path-selection')}
              className="group flex items-center gap-2 text-slate-500 hover:text-amber-400 transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-500/10">
                <ChevronRight size={16} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
              </div>
              <span className="font-black text-[9px] xl:text-[10px] uppercase tracking-[0.3em]">Retornar</span>
            </button>

            <div className="space-y-1">
              <h2 className="text-3xl xl:text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
                REGISTRO DE <span className="text-amber-400">FUNDAÇÃO</span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-[1px] w-8 bg-amber-500/30" />
                <p className="text-slate-500 text-[8px] xl:text-[9px] font-black uppercase tracking-[0.4em]">Protocolo de Expansão Ativo</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-right">
            <div className="space-y-1">
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Status do Registro</p>
              <p className="text-amber-400 font-mono text-[10px]">PENDING_VALIDATION</p>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div className="space-y-1">
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest">Orçamento Inicial</p>
              <p className="text-white font-mono text-xl xl:text-2xl font-black">50.0M</p>
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 min-h-0">
          {/* Form Side */}
          <div className="space-y-4 sm:space-y-6 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar pb-10">
            {/* Identity Section */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 space-y-4 sm:space-y-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-1 h-5 sm:w-1.5 sm:h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-[0.3em]">Identidade Corporativa</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 relative z-10">
                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center justify-between px-1">
                    <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Seu Nome de Treinador</span>
                    <span className="text-[6px] sm:text-[7px] font-mono text-amber-500/30">ID_MANAGER</span>
                  </label>
                  <input
                    type="text"
                    placeholder="EX: ALEX FERGUSON"
                    value={managerName}
                    onChange={e => setManagerName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] text-white font-bold focus:border-amber-500/50 focus:bg-amber-500/5 outline-none transition-all placeholder:text-slate-700 uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between px-1">
                    <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Nome do Clube</span>
                    <span className="text-[6px] sm:text-[7px] font-mono text-amber-500/30">ID_PRIMARY</span>
                  </label>
                  <input
                    type="text"
                    placeholder="EX: NOVA"
                    value={founderData.name}
                    onChange={e => setFounderData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] text-white font-bold focus:border-amber-500/50 focus:bg-amber-500/5 outline-none transition-all placeholder:text-slate-700 uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between px-1">
                    <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Sufixo / Sigla</span>
                    <span className="text-[6px] sm:text-[7px] font-mono text-amber-500/30">TAG_SUFFIX</span>
                  </label>
                  <input
                    type="text"
                    placeholder="EX: UNITED, FC"
                    value={founderData.prefix}
                    onChange={e => setFounderData(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3.5 text-[10px] sm:text-[11px] text-white font-bold focus:border-amber-500/50 focus:bg-amber-500/5 outline-none transition-all placeholder:text-slate-700 uppercase"
                  />
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 relative z-10">
                <label className="flex items-center justify-between px-1">
                  <span className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase tracking-widest">Cromatismo Técnico</span>
                  <span className="text-[6px] sm:text-[7px] font-mono text-amber-500/30">HEX_SYNERGY</span>
                </label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-black/40 border border-white/10 rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:border-amber-500/30">
                    <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-lg">
                      <input
                        type="color"
                        value={founderData.primaryColor}
                        onChange={e => setFounderData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer bg-transparent border-none"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Primária</p>
                      <p className="text-[8px] sm:text-[10px] font-mono text-white uppercase truncate">{founderData.primaryColor}</p>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/10 rounded-lg sm:rounded-xl p-2.5 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:border-amber-500/30">
                    <div className="relative w-8 h-8 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-lg">
                      <input
                        type="color"
                        value={founderData.secondaryColor}
                        onChange={e => setFounderData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer bg-transparent border-none"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">Secundária</p>
                      <p className="text-[8px] sm:text-[10px] font-mono text-white uppercase truncate">{founderData.secondaryColor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Substitution Section */}
            <div className="bg-white/[0.02] border border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 space-y-4 sm:space-y-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="flex items-center gap-3 relative z-10">
                <div className="w-1 h-5 sm:w-1.5 sm:h-6 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-[0.3em]">Alvo de Desativação</h3>
              </div>

              <div className="space-y-3 sm:space-y-4 relative z-10">
                <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase tracking-widest leading-relaxed italic opacity-60">
                  Toda nova franquia deve ocupar a vaga de uma instituição obsoleta.
                </p>

                <div className="relative group">
                  <select
                    value={founderData.replacedTeamId}
                    onChange={e => {
                      const team = state.teams[e.target.value];
                      if (team) {
                        setFounderData(prev => ({
                          ...prev,
                          replacedTeamId: e.target.value,
                          district: team.district
                        }));
                      }
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-[9px] sm:text-[11px] text-white font-bold focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer uppercase tracking-tight"
                  >
                    <option value="" className="bg-[#02040a]">SELECIONE UNIDADE OBSOLETA...</option>
                    {teams.filter(t => t.id.startsWith('t_') && !t.managerId).map(t => (
                      <option key={t.id} value={t.id} className="bg-[#02040a]">
                        {t.name} • {t.league} • {t.district}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-red-400 transition-colors">
                    <Layout size={14} className="sm:size-4" />
                  </div>
                </div>

                {founderData.replacedTeamId && (
                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-red-500/5 border border-red-500/10 rounded-lg sm:rounded-xl animate-in fade-in slide-in-from-top-2 duration-500">
                    <AlertCircle size={14} className="text-red-500 shrink-0 sm:size-4" />
                    <p className="text-[7px] sm:text-[8px] text-red-400 font-black uppercase tracking-widest leading-tight">
                      AVISO: {state.teams[founderData.replacedTeamId]?.name} será permanentemente removido do sistema.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className="hidden lg:flex flex-col items-center justify-center space-y-8 bg-white/[0.01] border border-white/5 rounded-[3.5rem] p-10 relative overflow-hidden group min-h-0">
            {/* Technical Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(245,158,11,0.5)_50%,transparent_100%)] h-[20%] w-full animate-scan" />
              <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
                {Array.from({ length: 144 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-white/10" />
                ))}
              </div>
            </div>

            {/* Dynamic Glow */}
            <div
              className="absolute w-[90%] h-[90%] opacity-10 blur-[150px] transition-colors duration-1000"
              style={{ backgroundColor: founderData.primaryColor }}
            />

            {/* Crest Preview */}
            <div className="relative group/crest scale-90 xl:scale-100 transition-transform duration-700">
              <div
                className="w-56 h-56 xl:w-64 xl:h-64 rounded-[3.5rem] xl:rounded-[4rem] flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10 border border-white/10 overflow-hidden transition-all duration-700 group-hover/crest:scale-105 group-hover/crest:border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${founderData.primaryColor}15, ${founderData.secondaryColor}30)`,
                }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_70%)]" />
                <TeamLogo
                  primaryColor={founderData.primaryColor}
                  secondaryColor={founderData.secondaryColor}
                  patternId="none"
                  symbolId="Shield"
                  size={110}
                  className="relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] xl:size-[130px] transition-transform duration-700 group-hover/crest:scale-110"
                />
              </div>

              {/* Decorative Tech Rings */}
              <div className="absolute inset-0 -m-6 border border-amber-500/10 rounded-[4.5rem] animate-spin-slow pointer-events-none" />
              <div className="absolute inset-0 -m-12 border border-white/5 rounded-[5.5rem] animate-reverse-spin-slow pointer-events-none opacity-50" />
            </div>

            <div className="text-center space-y-4 relative z-10">
              <div className="space-y-2">
                <h3 className="text-3xl xl:text-5xl font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-2xl">
                  {founderData.name || 'NOME'} <span style={{ color: founderData.primaryColor }}>{founderData.prefix || 'CLUBE'}</span>
                </h3>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-[1px] w-8 bg-white/10" />
                  <p className="text-slate-500 text-[9px] xl:text-[10px] font-black uppercase tracking-[0.5em]">
                    {founderData.replacedTeamId ? `SETOR: ${state.teams[founderData.replacedTeamId]?.city}` : 'COORDENADAS_AUSENTES'}
                  </p>
                  <div className="h-[1px] w-8 bg-white/10" />
                </div>
              </div>

              {founderData.replacedTeamId && (
                <div className="inline-flex items-center gap-3 px-5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  <Zap size={14} className="text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Protocolo de Expansão Ativo</span>
                </div>
              )}
            </div>

            {/* Technical Data Readouts */}
            <div className="grid grid-cols-3 gap-8 w-full max-w-sm pt-8 border-t border-white/5 relative z-10">
              <div className="text-center space-y-1">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Distrito</p>
                <p className="text-[10px] xl:text-[11px] font-black text-white uppercase tracking-tight">{founderData.district || '---'}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Liga</p>
                <p className="text-[10px] xl:text-[11px] font-black text-amber-500 uppercase tracking-tight">
                  {founderData.replacedTeamId ? state.teams[founderData.replacedTeamId]?.league : '---'}
                </p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Estádio</p>
                <p className="text-[10px] xl:text-[11px] font-black text-white uppercase tracking-tight">LVL 01</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-auto pt-6 xl:pt-8 border-t border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full animate-pulse transition-all duration-500 ${founderData.name && founderData.replacedTeamId ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-slate-700'}`} />
            <div className="space-y-0.5">
              <p className="text-slate-500 text-[8px] xl:text-[9px] font-black uppercase tracking-[0.2em]">
                {founderData.name && founderData.replacedTeamId ? 'Dados de Identidade Sincronizados' : 'Aguardando Validação de Registro'}
              </p>
              {founderData.name && founderData.replacedTeamId && (
                <p className="text-amber-400 text-[7px] xl:text-[8px] font-mono uppercase tracking-widest">
                  NEXT_PHASE: STRATEGIC_DRAFT_INIT
                </p>
              )}
            </div>
          </div>

          <button
            disabled={!founderData.name || !founderData.prefix || !founderData.replacedTeamId || !managerName}
            onClick={handleFinishFounder}
            className={`relative group px-12 xl:px-16 py-4 xl:py-5 rounded-2xl font-black text-[10px] xl:text-[11px] uppercase tracking-[0.4em] transition-all duration-500 ${founderData.name && founderData.replacedTeamId && managerName
              ? 'bg-amber-500 text-black shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:scale-105 hover:shadow-amber-500/60'
              : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
              }`}
          >
            <span className="relative z-10 flex items-center gap-3">
              Entrar na Gênese
              <CheckCircle2 size={18} className="transition-transform group-hover:scale-110" />
            </span>
            {founderData.name && founderData.replacedTeamId && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#050814]">
      {isSyncing && (
        <div className="absolute inset-0 z-[110] bg-[#050814]/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            <Globe size={40} className="absolute inset-0 m-auto text-cyan-400 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Sincronizando Universo</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Enviando liga para o Cloud Supabase...</p>
          </div>
        </div>
      )}
      {step === 'path-selection' && renderPathSelection()}
      {step === 'heir-choice' && renderHeirChoice()}
      {step === 'founder-identity' && renderFounderIdentity()}
    </div>
  );
};
