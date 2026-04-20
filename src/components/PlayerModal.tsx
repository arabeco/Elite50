import React from 'react';
import { Player, District, Match } from '../types';
import { X, TrendingUp, Zap, Lock, Activity, Shield, Trophy, Clock, BarChart3, Coins, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { TeamLogo } from './TeamLogo';
import { PlayerAvatar } from './PlayerAvatar';
import { TeamModal } from './TeamModal';
import { useGame } from '../store/GameContext';
import { calculateTeamPower } from '../engine/gameLogic';
import { useTransfers } from '../hooks/useTransfers';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { TRAIT_DESCRIPTIONS } from '../constants/traitDescriptions';

interface PlayerModalProps {
  player: Player;
  onClose: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ player, onClose }) => {
  const { state, addToast } = useGame();

  const getTheme = (district: District) => {
    switch (district) {
      case 'NORTE': return {
        main: 'text-cyan-400',
        border: 'border-cyan-400',
        bg: 'bg-cyan-950/30',
        glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        gradient: 'from-cyan-900/50 to-slate-900'
      };
      case 'SUL': return {
        main: 'text-orange-500',
        border: 'border-orange-500',
        bg: 'bg-orange-950/30',
        glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]',
        gradient: 'from-orange-900/50 to-stone-900'
      };
      case 'LESTE': return {
        main: 'text-emerald-500',
        border: 'border-emerald-500',
        bg: 'bg-emerald-950/30',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
        gradient: 'from-emerald-900/50 to-slate-900'
      };
      case 'OESTE': return {
        main: 'text-purple-500',
        border: 'border-purple-500',
        bg: 'bg-purple-950/30',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]',
        gradient: 'from-purple-900/50 to-slate-900'
      };
      default: return {
        main: 'text-cyan-400',
        border: 'border-cyan-400',
        bg: 'bg-cyan-950/30',
        glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]',
        gradient: 'from-cyan-900/50 to-slate-900'
      };
    }
  };

  const theme = getTheme(player.district);

  const lastRatings = player.history.lastMatchRatings || [];
  const currentForm = lastRatings.length > 0
    ? (lastRatings.reduce((a, b) => a + b, 0) / lastRatings.length).toFixed(1)
    : 'N/A';

  const graphWidth = 200;
  const graphHeight = 60;
  const graphPoints = lastRatings.map((rating, index) => {
    const x = (index / (lastRatings.length - 1 || 1)) * graphWidth;
    const y = graphHeight - ((rating / 10) * graphHeight);
    return `${x},${y}`;
  }).join(' ');

  const radarData = [
    { stat: 'FOR', value: player.pentagon.FOR },
    { stat: 'AGI', value: player.pentagon.AGI },
    { stat: 'INT', value: player.pentagon.INT },
    { stat: 'TAT', value: player.pentagon.TAT },
    { stat: 'TEC', value: player.pentagon.TEC },
  ];

  // Buy Logic
  const { setState, saveGame } = useGame();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const userManager = state.userManagerId ? state.managers[state.userManagerId] : null;
  const userTeam = userManager?.career.currentTeamId ? state.teams[userManager.career.currentTeamId] : null;
  const isMyPlayer = userTeam?.squad.includes(player.id);
  const isFreeAgent = !player.contract.teamId;
  const isOpponentPlayer = !isMyPlayer && !isFreeAgent;
  const playerTeam = player.contract.teamId ? state.teams[player.contract.teamId] : null;
  const allMatches: Match[] = [
    ...Object.values(state.world.leagues || {}).flatMap(league => league.matches || []),
    ...(state.world.eliteCup?.bracket?.round1 || []),
    ...(state.world.eliteCup?.bracket?.quarters || []),
    ...(state.world.eliteCup?.bracket?.semis || []),
    ...(state.world.eliteCup?.bracket?.final ? [state.world.eliteCup.bracket.final] : []),
    ...(state.world.districtCup?.matches || []),
    ...(state.world.districtCup?.final ? [state.world.districtCup.final] : []),
  ];
  const recentPlayerMatches = allMatches
    .filter(match => match.played && match.result?.ratings?.[player.id] !== undefined)
    .sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateDiff || (b.round || 0) - (a.round || 0);
    })
    .slice(0, 5)
    .map(match => {
      const teamId = player.contract.teamId || match.result?.homeTeamId || match.homeTeamId;
      const isHome = match.homeTeamId === teamId;
      const ownTeam = state.teams[isHome ? match.homeTeamId : match.awayTeamId];
      const opponent = state.teams[isHome ? match.awayTeamId : match.homeTeamId];
      const ownScore = isHome ? match.homeScore ?? match.result?.homeScore ?? 0 : match.awayScore ?? match.result?.awayScore ?? 0;
      const opponentScore = isHome ? match.awayScore ?? match.result?.awayScore ?? 0 : match.homeScore ?? match.result?.homeScore ?? 0;
      const rawRating = match.result?.ratings?.[player.id] || 0;
      return {
        match,
        ownTeam,
        opponent,
        score: `${ownScore}-${opponentScore}`,
        result: ownScore > opponentScore ? 'V' : ownScore < opponentScore ? 'D' : 'E',
        rating: rawRating > 10 ? rawRating / 10 : rawRating,
      };
    });
  const playerAchievements = player.achievements || [];
  const playerTitleCount = playerAchievements.filter(achievement => achievement.type === 'Clube' || achievement.type === 'Distrito').length;
  const playerIndividualCount = playerAchievements.filter(achievement => achievement.type === 'Individual').length;
  const seasonDelta = player.history.seasonRatingDelta || 0;
  const seasonStartValue = Math.max(0, player.totalRating - seasonDelta);
  const valueProgress = Math.min(100, Math.max(0, (player.totalRating / Math.max(player.potential, 1)) * 100));
  const teamPower = playerTeam ? calculateTeamPower(playerTeam, state.players) : 0;
  const teamScoreMax = playerTeam?.powerCap || 0;
  const scoreMaxUsagePercent = teamScoreMax > 0 ? Math.min(100, Math.round((player.totalRating / teamScoreMax) * 100)) : 0;
  const ratingTrajectory = [
    { label: 'Inicio', value: seasonStartValue },
    { label: 'Atual', value: player.totalRating },
    { label: 'Pot', value: player.potential },
  ];

  const { handleSendTradeOffer, handleMakeProposal, handleCancelDraftProposal } = useTransfers(userTeam?.id || null, userTeam ? calculateTeamPower(userTeam, state.players) : 0, userTeam?.powerCap || 0);
  const isDraftDay = state.world.status === 'LOBBY' && state.world.currentDay < 3;
  const isDraftPending = state.world.draftProposals?.some(p => p.playerId === player.id && p.managerId === state.userManagerId);

  const [tradeMode, setTradeMode] = React.useState(false);
  const [selectedOfferId, setSelectedOfferId] = React.useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [activePlayerTab, setActivePlayerTab] = React.useState<'profile' | 'stats' | 'economy'>('profile');

  const handleProposal = async () => {
    if (!userTeam || isMyPlayer || player.satisfaction >= 80) return;

    const currentPower = calculateTeamPower(userTeam, state.players);
    const powerCap = userTeam.powerCap ?? 10000;
    const pointsLeft = powerCap - currentPower;

    if (pointsLeft < player.totalRating) return;

    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const newState = { ...state };
    newState.teams[userTeam.id] = {
      ...newState.teams[userTeam.id],
      squad: [...newState.teams[userTeam.id].squad, player.id]
    };

    if (player.contract.teamId) {
      const oldTeamId = player.contract.teamId;
      newState.teams[oldTeamId] = {
        ...newState.teams[oldTeamId],
        squad: newState.teams[oldTeamId].squad.filter(id => id !== player.id)
      };
    }

    newState.players[player.id] = {
      ...newState.players[player.id],
      contract: { ...newState.players[player.id].contract, teamId: userTeam.id }
    };

    const newNotif = {
      id: `transf_${Date.now()}`,
      type: 'transfer' as const,
      title: 'Transferência Concluída',
      message: `${player.nickname} assinou com o ${userTeam.name}!`,
      date: new Date().toISOString(),
      read: false
    };
    newState.notifications = [newNotif, ...newState.notifications];

    setState(newState);
    await saveGame(newState);
    setShowSuccess(true);
    setIsProcessing(false);
    setTimeout(() => onClose(), 1500);
  };

  const [holdProgress, setHoldProgress] = React.useState(0);
  const holdIntervalRef = React.useRef<NodeJS.Timeout>();

  const startHold = () => {
    if (isProcessing || !userTeam || !isMyPlayer) return;
    if (userTeam.squad.length <= 15) {
      alert('Você precisa de no mínimo 15 jogadores no elenco!');
      return;
    }
    setHoldProgress(0);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(holdIntervalRef.current);
          handleSellPlayer();
          return 100;
        }
        return prev + 5;
      });
    }, 50);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    if (!isProcessing) setHoldProgress(0);
  };

  const handleSellPlayer = async () => {
    if (!userTeam || !isMyPlayer) return;
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const newState = { ...state };
    newState.teams[userTeam.id].squad = newState.teams[userTeam.id].squad.filter(id => id !== player.id);
    newState.players[player.id].contract.teamId = null;
    newState.notifications.unshift({
      id: `sell_${Date.now()}`,
      type: 'transfer',
      title: 'Atleta Dispensado',
      message: `${player.nickname} deixou o ${userTeam.name}.`,
      date: new Date().toISOString(),
      read: false
    });
    setState(newState);
    await saveGame(newState);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <motion.div
        layoutId={`player-card-${player.id}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md max-h-[90vh] bg-slate-950/70 backdrop-blur-2xl rounded-xl border ${theme.border} shadow-[0_0_30px_rgba(0,0,0,0.6)] flex flex-col overflow-y-auto overflow-x-hidden slim-scrollbar`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-20 p-1.5 bg-black/60 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
          <X size={16} />
        </button>

        <div className={`relative h-48 sm:h-56 shrink-0 bg-gradient-to-b ${theme.gradient} flex items-end p-3 sm:p-4 overflow-hidden rounded-t-xl`}>
          <div className="absolute inset-0 opacity-20" style={{ filter: 'blur(2px)' }}>
            <PlayerAvatar player={player} size="xl" mode="full" cropBottomPercent={8} className="w-full h-full scale-[1.22] translate-y-10" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="relative z-10 flex items-end gap-3 sm:gap-4 w-full">
            <div className={`w-28 h-36 sm:w-36 sm:h-44 rounded-2xl sm:rounded-[1.75rem] border ${theme.border} bg-black/60 shadow-2xl overflow-hidden flex-shrink-0 group relative`}>
              <PlayerAvatar player={player} size="xl" mode="full" cropBottomPercent={0} className="w-full h-full scale-[1.42] translate-y-9 sm:translate-y-12 group-hover:scale-[1.5] transition-transform duration-500" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-black via-black/55 to-transparent" />
            </div>
            <div className="flex-1 mb-1">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <span className={`text-[8px] sm:text-[10px] font-semibold tracking-[0.2em] uppercase ${theme.main}`}>{player.district} CLAN</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black italic text-white leading-none uppercase tracking-tighter drop-shadow-lg flex items-center gap-2 sm:gap-3">
                {player.nickname}
                <span className="text-[8px] sm:text-[10px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-900/50 px-1.5 sm:px-2 py-0.5 rounded-lg border border-cyan-500/50">{player.role}</span>
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide">{player.name}</p>
                {playerTeam && (
                  <button
                    type="button"
                    onClick={() => setSelectedTeamId(playerTeam.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border ${theme.border} bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${theme.main} transition-colors hover:bg-white/10`}
                  >
                    {playerTeam.logo && (
                      <TeamLogo
                        primaryColor={playerTeam.logo.primary}
                        secondaryColor={playerTeam.logo.secondary}
                        accentColor={playerTeam.logo.accent}
                        shapeId={playerTeam.logo.shapeId}
                        patternId={playerTeam.logo.patternId as any}
                        symbolId={playerTeam.logo.symbolId}
                        secondarySymbolId={playerTeam.logo.secondarySymbolId}
                        size={14}
                      />
                    )}
                    <span className="max-w-[120px] truncate">{playerTeam.name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 sm:p-3 relative overflow-hidden">
              <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-[0.25em] font-semibold mb-1">Rating Atual</p>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className={`text-3xl sm:text-4xl font-black italic tracking-tighter ${theme.main}`}>{player.totalRating}</span>
              </div>
            </div>
            <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 sm:p-3 relative overflow-hidden">
              <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-[0.25em] font-semibold mb-1">Potencial</p>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-200 opacity-80">{player.potential}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
            {[
              { id: 'profile', label: 'Perfil', icon: Zap },
              { id: 'stats', label: 'Stats', icon: BarChart3 },
              { id: 'economy', label: 'Rating', icon: Coins },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePlayerTab(tab.id as typeof activePlayerTab)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[8px] font-black uppercase tracking-widest transition ${
                  activePlayerTab === tab.id
                    ? `${theme.bg} ${theme.main} border border-current/40`
                    : 'text-white/35 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>

          {activePlayerTab === 'stats' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/50 p-2.5">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Jogos</p>
                  <p className="mt-1 text-xl font-black italic text-white">{player.history.gamesPlayed || 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-2.5">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Gols</p>
                  <p className="mt-1 text-xl font-black italic text-white">{player.history.goals || 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-2.5">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Assists</p>
                  <p className="mt-1 text-xl font-black italic text-white">{player.history.assists || 0}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-2.5">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Forma</p>
                  <p className={`mt-1 text-xl font-black italic ${theme.main}`}>{currentForm}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className={theme.main} />
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Ultimos jogos</p>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/25">0-10</span>
                </div>
                {recentPlayerMatches.length > 0 ? (
                  <div className="space-y-2">
                    {recentPlayerMatches.map(({ match, opponent, score, result, rating }) => (
                      <div key={match.id} className="rounded-xl border border-white/5 bg-white/[0.035] p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-black ${
                              result === 'V'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : result === 'D'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {result}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[9px] font-black uppercase tracking-wider text-white">
                                vs {opponent?.name || 'Adversario'}
                              </p>
                              <p className="text-[7px] font-bold uppercase tracking-widest text-white/25">
                                Rodada {match.round} - {score}
                              </p>
                            </div>
                          </div>
                          <span className={`text-sm font-black italic ${
                            rating >= 7 ? 'text-emerald-300' : rating >= 5.5 ? 'text-amber-300' : 'text-rose-300'
                          }`}>
                            {rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full ${rating >= 7 ? 'bg-emerald-400' : rating >= 5.5 ? 'bg-amber-400' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, rating * 10))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : lastRatings.length > 0 ? (
                  <div className="space-y-2">
                    {lastRatings.map((rating, index) => (
                      <div key={`${rating}-${index}`} className="grid grid-cols-[54px_1fr_34px] items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/35">J-{index + 1}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full ${rating >= 7 ? 'bg-emerald-400' : rating >= 5.5 ? 'bg-amber-400' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, rating * 10))}%` }}
                          />
                        </div>
                        <span className="text-right text-[9px] font-black text-white">{rating.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-[9px] font-bold uppercase tracking-widest text-white/25">Sem partidas registradas ainda.</p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                    <PolarAngleAxis dataKey="stat" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 800 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="rgb(34,211,238)" fill="rgba(34,211,238,0.22)" strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activePlayerTab === 'economy' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-emerald-200">Rating atual</p>
                    <p className="mt-1 text-3xl font-black italic tracking-tighter text-white">{player.totalRating}</p>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-right ${seasonDelta >= 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                    <p className="text-[7px] font-black uppercase tracking-widest opacity-70">Season</p>
                    <p className="text-lg font-black italic">{seasonDelta >= 0 ? '+' : ''}{seasonDelta}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[8px] font-black uppercase tracking-widest text-white/35">
                    <span>Inicio {seasonStartValue}</span>
                    <span>Potencial {player.potential}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/55">
                    <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${valueProgress}%` }} />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className={theme.main} />
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Evolucao de rating</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${seasonDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {seasonDelta >= 0 ? '+' : ''}{seasonDelta} season
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ratingTrajectory.map(item => (
                    <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.035] p-2">
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/30">{item.label}</p>
                      <p className="mt-1 text-lg font-black italic text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300"
                    style={{ width: `${valueProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-white/30">
                  Mostra o caminho entre inicio da season, rating atual e teto potencial do atleta.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Contrato</p>
                  <div className="mt-1 flex items-center gap-2">
                    {playerTeam?.logo && (
                      <TeamLogo
                        primaryColor={playerTeam.logo.primary}
                        secondaryColor={playerTeam.logo.secondary}
                        accentColor={playerTeam.logo.accent}
                        shapeId={playerTeam.logo.shapeId}
                        patternId={playerTeam.logo.patternId as any}
                        symbolId={playerTeam.logo.symbolId}
                        secondarySymbolId={playerTeam.logo.secondarySymbolId}
                        size={22}
                      />
                    )}
                    <p className="min-w-0 truncate text-sm font-black uppercase italic text-white">{playerTeam?.name || 'Livre'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Score max.</p>
                  <p className="mt-1 text-sm font-black uppercase italic text-white">{teamScoreMax ? `${scoreMaxUsagePercent}%` : '--'}</p>
                </div>
              </div>

              {playerTeam && (
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Target size={14} className={theme.main} />
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Impacto no Score Maximo</p>
                  </div>
                  <div className="mb-1 flex justify-between text-[8px] font-black uppercase tracking-widest text-white/35">
                    <span>{player.totalRating} pts do atleta</span>
                    <span>{teamPower}/{teamScoreMax || 'sem limite'}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full ${teamScoreMax && teamPower > teamScoreMax ? 'bg-rose-500' : 'bg-cyan-400'}`}
                      style={{ width: `${teamScoreMax ? Math.min(100, (teamPower / teamScoreMax) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-white/30">
                    No Elite 2050, rating tambem e economia de elenco: ele ocupa parte do Score Maximo do clube.
                  </p>
                </div>
              )}
            </div>
          )}

          {activePlayerTab === 'profile' && (
            <>
          <div className="bg-black/50 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-cyan-400" />
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-semibold">DNA Elite 2050</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: 'Slot 1: Base', trait: player.badges.slot1, rarity: player.badges.slot1?.includes('Prata') ? 'Prata' : 'Bronze' },
                { label: 'Slot 2: Elite', trait: player.badges.slot2, rarity: player.badges.slot2?.includes('Ouro') ? 'Ouro' : 'Prata' },
                { label: 'Slot 3: Potencial', trait: player.badges.slot3, rarity: (player.badges.slot3 === 'Máquina' || player.badges.slot3 === 'Catalisador') ? 'Épico' : (player.badges.slot3?.includes('Lendária') || player.badges.slot3 === 'Gênio') ? 'Lendário' : 'Ouro', isPotential: true },
                { label: 'Slot 4: Legado', trait: player.badges.slot4, rarity: 'Fardo' }
              ].map((slot, idx) => {
                const isHidden = slot.isPotential && player.totalRating < 800;
                const getRarityStyle = (rarity: string) => {
                  if (isHidden) return 'border-slate-800 text-slate-600 bg-slate-950/40';
                  if (rarity === 'Bronze') return 'border-orange-900/50 text-orange-400 bg-orange-950/20';
                  if (rarity === 'Prata') return 'border-slate-400/50 text-slate-300 bg-slate-800/40';
                  if (rarity === 'Ouro') return 'border-amber-500/50 text-amber-400 bg-amber-950/30';
                  if (rarity === 'Épico') return 'border-purple-500/50 text-purple-400 bg-purple-950/40';
                  if (rarity === 'Lendário') return 'border-cyan-400/50 text-cyan-400 bg-cyan-950/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]';
                  if (rarity === 'Fardo') return 'border-red-900/50 text-red-500 bg-red-950/30';
                  return 'border-white/5 text-slate-500 bg-white/5';
                };
                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className="text-[7px] text-slate-500 uppercase font-bold tracking-widest">{slot.label}</span>
                    <div className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${getRarityStyle(slot.rarity)}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-tight">{isHidden ? '???' : (slot.trait || (idx === 3 ? 'Vazio' : 'Nenhum'))}</span>
                        {isHidden && <Lock size={8} />}
                      </div>
                      <p className="text-[7px] leading-tight opacity-60 font-medium">
                        {isHidden ? 'Desbloqueia no Rating 800+' : (slot.trait ? TRAIT_DESCRIPTIONS[slot.trait] : 'Espaço disponível.')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} className="text-amber-400" />
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.25em] font-semibold">Palmarés</p>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2">
                <p className="text-[7px] font-black uppercase tracking-widest text-amber-200">Titulos</p>
                <p className="mt-0.5 text-xl font-black italic text-white">{playerTitleCount}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-2">
                <p className="text-[7px] font-black uppercase tracking-widest text-cyan-200">Individuais</p>
                <p className="mt-0.5 text-xl font-black italic text-white">{playerIndividualCount}</p>
              </div>
            </div>
            {playerAchievements.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic text-center py-2">Nenhum título conquistado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {playerAchievements.map((ach, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-lg">
                    <Trophy size={12} className={ach.type === 'Individual' ? 'text-cyan-400' : 'text-amber-400'} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-200">{ach.title}</span>
                      <span className="text-[8px] text-slate-500 uppercase tracking-widest">S{ach.season} • {ach.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 sm:p-3">
              <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-[0.25em] font-semibold mb-1">Satisfação</p>
              <div className="h-1.5 mt-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
                <div className={`h-full transition-all duration-500 ${player.satisfaction > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${player.satisfaction}%` }} />
              </div>
              <span className="text-[10px] text-white mt-1 block font-bold">{player.satisfaction}%</span>
            </div>
          </div>
            </>
          )}

          {isDraftDay && !isMyPlayer && (
            <button
              onClick={() => {
                if (isDraftPending) {
                  handleCancelDraftProposal(player.id);
                } else {
                  handleMakeProposal(player);
                }
                onClose();
              }}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.3em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl ${isDraftPending
                ? 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white'
                : 'bg-amber-500 text-black hover:scale-[1.02]'
                }`}
            >
              {isDraftPending ? (
                <>
                  <Clock size={16} className="animate-pulse" />
                  CANCELAR WISHLIST
                </>
              ) : (
                'ADICIONAR À WISHLIST'
              )}
            </button>
          )}

          {isOpponentPlayer && !tradeMode && !isDraftDay && (
            <button onClick={() => setTradeMode(true)} className="w-full py-3 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] bg-purple-600 text-white shadow-lg">FAZER PROPOSTA DE TROCA</button>
          )}

          {isMyPlayer && (
            <div className="flex flex-col gap-2">
              <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2">
                <Shield size={14} className="text-cyan-400" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Atleta do seu Elenco</span>
              </div>
              <button onPointerDown={startHold} onPointerUp={stopHold} onPointerLeave={stopHold} disabled={isProcessing} className="relative w-full py-3 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/40">
                {holdProgress > 0 ? 'SEGURE PARA DISPENSAR...' : 'DISPENSAR ATLETA'}
                {holdProgress > 0 && <div className="absolute left-0 top-0 bottom-0 bg-red-600/80" style={{ width: `${holdProgress}%` }} />}
              </button>
            </div>
          )}

          <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 100% { transform: translateX(100%); } }` }} />
        </div>
      </motion.div>
      {selectedTeamId && state.teams[selectedTeamId] && (
        <TeamModal
          team={state.teams[selectedTeamId]}
          players={state.players}
          onClose={() => setSelectedTeamId(null)}
          onPlayerClick={() => setSelectedTeamId(null)}
          onTeamClick={setSelectedTeamId}
        />
      )}
    </div>
  );
};
