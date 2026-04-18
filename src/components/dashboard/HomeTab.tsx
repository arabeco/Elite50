import React from 'react';
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
import { getCountdown, getLiveMatchSecond, getMatchDateTime, getNextMatch } from '../../utils/matchUtils';
import { calculateTeamPower } from '../../engine/gameLogic';
import { MATCH_REAL_TIME_SECONDS } from '../../constants/gameConstants';
import { Team, Player, Match } from '../../types';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, History, Play, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Rocket } = LucideIcons;

interface HomeTabProps {
  onOpenDraft?: () => void;
  onOpenTeam?: () => void;
  onOpenLineup?: () => void;
  onOpenTactics?: () => void;
  onOpenLeague?: () => void;
}

type TodayPhase = 'preseason' | 'season' | 'matchday' | 'postgame';

export const HomeTab = ({ onOpenDraft, onOpenTeam, onOpenLineup, onOpenTactics, onOpenLeague }: HomeTabProps) => {
  const { state, setState, isSyncing } = useGame();
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches, pastMatches, totalPoints, powerCap, pointsLeft } = dashData;
  const daysPassed = React.useMemo(() => {
    const start = state.world.seasonStartReal ? new Date(state.world.seasonStartReal) : new Date('2050-01-01T08:00:00Z');
    const current = new Date(state.world.currentDate);
    return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [state.world.currentDate, state.world.seasonStartReal]);
  const {
    handleStartReport,
    handleMockReport,
    selectedMatchReport,
    setSelectedMatchReport,
    isWatchingReport,
    setIsWatchingReport,
    reportSecond,
    setReportSecond
  } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleAdvanceDay } = useGameDay();
  const { handleMakeProposal } = useTransfers(userTeam?.id || null, totalPoints, powerCap);

  const handleRevealMatch = (matchId: string) => {
    setState(prev => {
      const newState = { ...prev };
      // Search in all leagues
      Object.keys(newState.world.leagues).forEach(key => {
        const league = newState.world.leagues[key as any];
        const match = league.matches.find(m => m.id === matchId);
        if (match) match.revealed = true;
      });
      // Search in cups
      const ecMatch = [
        ...(newState.world.eliteCup.bracket.round1 || []),
        ...(newState.world.eliteCup.bracket.quarters || []),
        ...(newState.world.eliteCup.bracket.semis || []),
        newState.world.eliteCup.bracket.final
      ].find(m => m?.id === matchId);
      if (ecMatch) ecMatch.revealed = true;

      const dcMatch = newState.world.districtCup.matches.find(m => m.id === matchId);
      if (dcMatch) dcMatch.revealed = true;
      if (newState.world.districtCup.final?.id === matchId) newState.world.districtCup.final.revealed = true;

      return newState;
    });
  };

  const [clockAnchor, setClockAnchor] = React.useState(() => ({
    worldMs: new Date(state.world.currentDate).getTime(),
    realMs: Date.now(),
  }));
  const [currentRealMs, setCurrentRealMs] = React.useState(Date.now());

  React.useEffect(() => {
    setClockAnchor({
      worldMs: new Date(state.world.currentDate).getTime(),
      realMs: Date.now(),
    });
  }, [state.world.currentDate]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRealMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const liveWorldNow = React.useMemo(() => {
    return new Date(clockAnchor.worldMs + (currentRealMs - clockAnchor.realMs));
  }, [clockAnchor, currentRealMs]);

  // Determine Headline based on last match
  const lastMatch = pastMatches?.[0];
  const isRevealed = lastMatch?.revealed !== false;

  const headlineData = React.useMemo(() => {
    if (lastMatch) {
      const isHome = lastMatch.homeId === userTeam?.id;
      const userScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
      const oppScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
      const opponentName = isHome ? lastMatch.away : lastMatch.home;

      const isWin = userScore > oppScore;
      const isDraw = userScore === oppScore;

      return {
        type: 'match',
        title: !isRevealed ? "Partida Encerrada" : (isWin ? "Vitória Espetacular!" : isDraw ? "Empate Tático" : "Derrota Amarga"),
        message: !isRevealed
          ? `O relato da partida contra o ${opponentName} já está disponível na mesa do treinador.`
          : `O ${userTeam?.name} ${isWin ? 'dominou' : isDraw ? 'empatou com' : 'tropeçou contra'} o ${opponentName} no placar de ${lastMatch.homeScore}-${lastMatch.awayScore}.`,
        match: lastMatch,
        revealed: isRevealed
      };
    }
    return {
      type: 'news',
      title: state.lastHeadline?.title || "Mercado Aquecido",
      message: state.lastHeadline?.message || "Novas promessas surgem nos distritos periféricos de Neo-City.",
      revealed: true
    };
  }, [lastMatch, state.lastHeadline, userTeam, isRevealed]);

  // Calendar events for news feed
  const newsFeed = React.useMemo(() => {
    const feed: any[] = [];

    if (pastMatches) {
      pastMatches.slice(0, 5).forEach(m => {
        const isWin = (m.homeId === userTeam?.id && m.homeScore > m.awayScore) ||
          (m.awayId === userTeam?.id && m.awayScore > m.homeScore);
        const isDraw = m.homeScore === m.awayScore;
        const opponent = m.homeId === userTeam?.id ? m.away : m.home;

        let subtitle = '';
        if (isWin) {
          subtitle = `O ${userTeam?.name} deu um show de bola e bateu o ${opponent}.`;
        } else if (isDraw) {
          subtitle = `Jogo duro! ${userTeam?.name} e ${opponent} ficaram no empate.`;
        } else {
          subtitle = `Dia difícil para o ${userTeam?.name}, que acabou superado pelo ${opponent}.`;
        }

        const isRevealed = m.revealed !== false;

        feed.push({
          id: `match_${m.id}`,
          type: 'match',
          title: isWin ? 'Vitória' : isDraw ? 'Empate' : 'Derrota',
          subtitle: !isRevealed ? `Relato disponível contra o ${opponent}.` : subtitle,
          score: !isRevealed ? '??-??' : `${m.homeScore}-${m.awayScore}`,
          match: m,
          date: m.date
        });
      });
    }

    return feed;
  }, [pastMatches, userTeam]);

  const userRelevantMatches = React.useMemo(() => {
    if (!userTeam) return [];

    const leagueMatches = Object.values(state.world.leagues).flatMap(league => league.matches || []);
    const eliteMatches = [
      ...(state.world.eliteCup.bracket.round1 || []),
      ...(state.world.eliteCup.bracket.quarters || []),
      ...(state.world.eliteCup.bracket.semis || []),
      ...(state.world.eliteCup.bracket.final ? [state.world.eliteCup.bracket.final] : []),
    ];

    return [...leagueMatches, ...eliteMatches].filter(match =>
      match && (match.homeTeamId === userTeam.id || match.awayTeamId === userTeam.id)
    );
  }, [state.world.leagues, state.world.eliteCup.bracket, userTeam]);

  const nextMatchData = React.useMemo(() => {
    if (!userTeam) return null;

    const nextEvent = getNextMatch(userRelevantMatches, liveWorldNow.toISOString());
    if (!nextEvent) return null;

    const opponentId = nextEvent.match.homeTeamId === userTeam.id ? nextEvent.match.awayTeamId : nextEvent.match.homeTeamId;
    const opponent = state.teams[opponentId];
    const opponentPower = opponent ? calculateTeamPower(opponent, state.players) : 0;
    const userPower = calculateTeamPower(userTeam, state.players);
    const startDate = nextEvent.startDateTime;
    const now = liveWorldNow;
    const isToday = startDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = startDate.toDateString() === tomorrow.toDateString();
    const datePrefix = isToday
      ? 'Hoje'
      : isTomorrow
        ? 'Amanha'
        : startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const dateLabel = `${datePrefix} • ${nextEvent.match.time || '16:00'}`;

    let eventTitle = `Próximo jogo vs ${opponent?.name || 'Adversário'}`;
    let eventBadge = nextEvent.status === 'LOCKED' ? 'Partida próxima' : 'Próximo evento';
    let countdownLabel = `Começa em ${getCountdown(nextEvent.msUntilStart)}`;
    let ctaLabel = nextEvent.msUntilStart <= 3 * 60 * 60 * 1000 ? 'Revisar Escalação' : 'Preparar Time';
    let ctaAction = nextEvent.msUntilStart <= 3 * 60 * 60 * 1000
      ? (onOpenLineup || onOpenTactics || onOpenTeam || onOpenLeague)
      : (onOpenTeam || onOpenTactics || onOpenLeague);
    let ctaIcon = nextEvent.msUntilStart <= 3 * 60 * 60 * 1000 ? Shield : Users;

    if (nextEvent.phase === 'live') {
      eventTitle = 'EM JOGO AGORA';
      eventBadge = 'Ao vivo';
      countdownLabel = `${userTeam.name} x ${opponent?.name || 'Adversário'}`;
      ctaLabel = 'Acompanhar';
      ctaAction = () => setSelectedMatchReport(nextEvent.match);
      ctaIcon = Play;
    } else if (nextEvent.phase === 'after') {
      eventTitle = 'Resultado disponível';
      eventBadge = 'Pós-jogo';
      countdownLabel = `Relatório liberado há ${getCountdown(nextEvent.msSinceEnd)}`;
      ctaLabel = 'Ver Resultado';
      ctaAction = () => setSelectedMatchReport(nextEvent.match);
      ctaIcon = Trophy;
    }

    return {
      ...nextEvent,
      opponent,
      opponentPower,
      userPower,
      isHome: nextEvent.match.homeTeamId === userTeam.id,
      status: nextEvent.status,
      dateLabel,
      eventTitle,
      eventBadge,
      countdownLabel,
      ctaLabel,
      ctaAction,
      ctaIcon,
      countdown: nextEvent.phase === 'before' ? getCountdown(nextEvent.msUntilStart) : null,
    };
  }, [
    liveWorldNow,
    onOpenLeague,
    onOpenLineup,
    onOpenTactics,
    onOpenTeam,
    setSelectedMatchReport,
    state.players,
    state.teams,
    userRelevantMatches,
    userTeam
  ]);

  // Remove lastHeadline usage since we now use headlineData
  // const lastHeadline = state.lastHeadline || ...

  // Remote redundant mock logic and duplicate state calls
  const isLobby = state.world.status === 'LOBBY';
  const isPreseason = state.world.status === 'LOBBY' || state.world.currentDay < 3;
  const isMatchDay = !isPreseason && nextMatchData?.phase === 'live';
  const isPostGame = !isPreseason && (
    (!!nextMatchData && nextMatchData.phase === 'after') ||
    (!!lastMatch && lastMatch.revealed === false)
  );

  const todayPhase: TodayPhase = isPreseason
    ? 'preseason'
    : isMatchDay
      ? 'matchday'
      : isPostGame
        ? 'postgame'
        : 'season';

  const draftCount = state.world.draftProposals?.filter(p => p.managerId === state.userManagerId).length || 0;
  const squadSize = userTeam?.squad?.length || 0;
  const canAdvancePreseason = state.isCreator && state.world.currentDay === -1;

  const handleStartSeason = () => {
    if (!state.isCreator) {
      alert('Apenas o criador pode iniciar a temporada!');
      return;
    }

    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    setState(prev => ({
      ...prev,
      world: {
        ...prev.world,
        status: 'ACTIVE',
        seasonStartReal: nextDay.toISOString(),
        currentDate: new Date().toISOString()
      }
    }));
  };

  const todayCopy = {
    preseason: {
      eyebrow: 'PRE-TEMPORADA',
      title: 'Monte seu elenco inicial',
      message: draftCount > 0
        ? `Voce tem ${draftCount} atleta${draftCount === 1 ? '' : 's'} na lista do Draft. Confirme suas escolhas antes de abrir a temporada.`
        : 'O Draft esta ativo antes da temporada. Escolha atletas suficientes para montar a base do seu time.',
      status: `${squadSize} no elenco - ${draftCount} na lista`,
      consequence: 'Conseq.: elenco formado e temporada liberada.',
    },
    season: {
      eyebrow: 'TEMPORADA',
      title: 'Prepare o proximo compromisso',
      message: nextMatchData?.opponent
        ? `${nextMatchData.eventTitle}. ${nextMatchData.phase === 'before' ? 'Organize elenco e tática antes do horário marcado.' : 'O próximo evento do clube já está disponível na central.'}`
        : 'A temporada roda em tempo real. Use mercado, treino e tatica enquanto o calendario avanca pelo relogio.',
      status: nextMatchData?.opponent ? `${nextMatchData.isHome ? 'Casa' : 'Fora'} - ${nextMatchData.dateLabel}` : 'Calendario em andamento',
      consequence: 'Conseq.: quando o relogio chegar, a rodada acontece.',
    },
    matchday: {
      eyebrow: 'DIA DE JOGO',
      title: 'EM JOGO AGORA',
      message: nextMatchData?.opponent
        ? `Acompanhe ${userTeam?.name} contra ${nextMatchData.opponent.name} em tempo real.`
        : 'A partida do dia esta disponivel para acompanhar.',
      status: 'Ao vivo',
      consequence: 'Conseq.: resultado e impacto no elenco.',
    },
    postgame: {
      eyebrow: 'POS-JOGO',
      title: 'Veja o impacto da rodada',
      message: 'Existe um resultado recente para revelar. Veja o relatorio antes de seguir para o proximo dia.',
      status: 'Relatorio pendente',
      consequence: 'Conseq.: placar revelado e proximo dia liberado.',
    }
  }[todayPhase];

  const todayActions = (() => {
    if (todayPhase === 'preseason') {
      return [
        { label: 'Abrir Draft', icon: Rocket, onClick: onOpenDraft, primary: true, disabled: !onOpenDraft },
        { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
        ...(canAdvancePreseason ? [{ label: 'Abrir Mundo', icon: Play, onClick: handleStartSeason, disabled: false }] : [])
      ];
    }

    if (todayPhase === 'matchday' && nextMatchData?.match) {
      return [
        { label: nextMatchData.ctaLabel, icon: nextMatchData.ctaIcon, onClick: nextMatchData.ctaAction, primary: true, disabled: !nextMatchData.ctaAction },
        { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
        { label: 'Escalacao', icon: Shield, onClick: onOpenLineup, disabled: !onOpenLineup },
      ];
    }

    if (todayPhase === 'postgame' && nextMatchData?.match) {
      return [
        { label: nextMatchData.ctaLabel, icon: nextMatchData.ctaIcon, onClick: nextMatchData.ctaAction, primary: true, disabled: !nextMatchData.ctaAction },
        { label: 'Liga', icon: Calendar, onClick: onOpenLeague, disabled: !onOpenLeague },
        { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
      ];
    }

    if (nextMatchData) {
      return [
        { label: nextMatchData.ctaLabel, icon: nextMatchData.ctaIcon, onClick: nextMatchData.ctaAction, primary: true, disabled: !nextMatchData.ctaAction },
        { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
        { label: 'Escalacao', icon: Shield, onClick: onOpenLineup, disabled: !onOpenLineup },
      ];
    }

    return [
      { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, primary: true, disabled: !onOpenTactics },
      { label: 'Escalacao', icon: Shield, onClick: onOpenLineup, disabled: !onOpenLineup },
      { label: 'Ver Liga', icon: Calendar, onClick: onOpenLeague, disabled: !onOpenLeague },
    ];
  })();

  if (selectedMatchReport) {
    const homeTeam = state.teams[selectedMatchReport.homeTeamId];
    const awayTeam = state.teams[selectedMatchReport.awayTeamId];

    if (homeTeam && awayTeam) {
      const matchStatus = selectedMatchReport.status;

      if (matchStatus === 'PLAYING' || isWatchingReport) {
        return (
          <div className="max-w-2xl mx-auto py-8">
            <LiveReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              currentSecond={isWatchingReport ? reportSecond : getLiveMatchSecond(selectedMatchReport, state.world.currentDate)}
            />
            <div className="flex gap-4 mt-6">
              {isWatchingReport && (
                <button
                  onClick={() => setReportSecond(0)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <History size={14} /> REINICIAR RELATÓRIO
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedMatchReport(null);
                  setIsWatchingReport(false);
                  setReportSecond(0);
                }}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
              >
                VOLTAR AO DASHBOARD
              </button>
            </div>
          </div>
        );
      } else if (matchStatus === 'FINISHED' || (selectedMatchReport.played && !isWatchingReport)) {
        return (
          <div className="max-w-2xl mx-auto py-8 animate-in zoom-in-95 duration-500">
            <PostGameReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              onClose={() => {
                setSelectedMatchReport(null);
                setReportSecond(0);
              }}
            />
            <button
              onClick={handleStartReport}
              className="mt-6 w-full py-4 bg-cyan-500 rounded-2xl text-[10px] font-black text-black uppercase tracking-[0.3em] hover:bg-cyan-400 transition-all flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(6,182,212,0.3)]"
            >
              <Play size={16} fill="black" /> REVER RELATÓRIO COMPLETO
            </button>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-8 px-2 sm:px-0">

      {/* SYNC INDICATOR */}
      {isSyncing && (
        <div className="fixed top-16 right-4 sm:top-24 sm:right-8 z-50 flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-in fade-in zoom-in slide-in-from-right-4 duration-500">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em]">Salvando no Supabase...</span>
        </div>
      )}

      {/* CENTRAL DO DIA: game-state driven actions */}
      <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] glass-card-neon border-cyan-500/25 p-5 sm:p-8 shadow-[0_0_45px_rgba(6,182,212,0.12)]">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="space-y-3 lg:flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">
                {todayCopy.eyebrow}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                {todayCopy.status}
              </span>
            </div>
            <div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter text-white">
                {todayCopy.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[11px] sm:text-sm font-bold leading-relaxed text-slate-400">
                {todayCopy.message}
              </p>
              <p className="mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300/80">
                {todayCopy.consequence}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[420px] lg:max-w-[460px]">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">
                    <Clock size={13} />
                    Próximo Evento
                  </div>
                  {nextMatchData?.opponent ? (
                    <>
                      <div className="mt-3 text-lg sm:text-xl font-black uppercase italic tracking-tight text-white">
                        {nextMatchData.eventTitle}
                      </div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {nextMatchData.dateLabel}
                      </div>
                      <div className="mt-2 text-sm sm:text-base font-black text-cyan-300">
                        {nextMatchData.phase === 'before'
                          ? `Começa em ${nextMatchData.countdown}`
                          : nextMatchData.countdownLabel}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-3 text-lg sm:text-xl font-black uppercase italic tracking-tight text-white">
                        Nenhum evento carregado
                      </div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        O calendário real será exibido aqui assim que houver partida
                      </div>
                    </>
                  )}
                </div>
                {nextMatchData?.opponent?.logo && (
                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                    <TeamLogo
                      primaryColor={nextMatchData.opponent.logo.primary}
                      secondaryColor={nextMatchData.opponent.logo.secondary}
                      accentColor={nextMatchData.opponent.logo.accent}
                      shapeId={nextMatchData.opponent.logo.shapeId}
                      patternId={nextMatchData.opponent.logo.patternId as any}
                      symbolId={nextMatchData.opponent.logo.symbolId}
                      secondarySymbolId={nextMatchData.opponent.logo.secondarySymbolId}
                      size={52}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {todayActions.slice(0, 3).map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${action.primary
                    ? 'bg-cyan-500 text-black shadow-[0_0_28px_rgba(6,182,212,0.35)] hover:bg-cyan-400'
                    : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-500/40 hover:text-white'
                    }`}
                >
                  <action.icon size={15} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY CONTEXT: one glance, no command noise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <button
          type="button"
          onClick={nextMatchData?.ctaAction || onOpenLeague}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition-all hover:border-cyan-500/40 hover:bg-white/[0.055]"
        >
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-cyan-500/10 blur-[60px]" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">
                <Calendar size={13} />
                Proximo Jogo
              </div>
              {nextMatchData?.opponent ? (
                <>
                  <div className="truncate text-lg font-black uppercase italic tracking-tight text-white">
                    {nextMatchData.eventTitle}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {nextMatchData.dateLabel}
                  </div>
                  <div className="mt-2 text-xs font-black text-cyan-300">
                    {nextMatchData.phase === 'before'
                      ? `Começa em ${nextMatchData.countdown}`
                      : nextMatchData.countdownLabel}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-black uppercase italic tracking-tight text-white">
                    Calendario em preparacao
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Termine a fase atual para gerar o proximo compromisso
                  </div>
                </>
              )}
            </div>
            <ChevronRight size={18} className="shrink-0 text-cyan-300 transition-transform group-hover:translate-x-1" />
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenTeam}
          className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition-all hover:border-fuchsia-500/40 hover:bg-white/[0.055]"
        >
          <div className="absolute right-0 bottom-0 h-32 w-32 translate-x-12 translate-y-12 rounded-full bg-fuchsia-500/10 blur-[60px]" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-fuchsia-300">
                <Target size={13} />
                Elenco
              </div>
              <div className="text-lg font-black uppercase italic tracking-tight text-white">
                {totalPoints}<span className="text-sm text-slate-500"> / {powerCap}</span>
              </div>
              <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${pointsLeft < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {pointsLeft < 0 ? 'Score acima do teto' : `${pointsLeft} pontos livres`}
              </div>
            </div>
            <ChevronRight size={18} className="shrink-0 text-fuchsia-300 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      {state.isCreator && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-amber-300">
              <FastForward size={12} />
              GM / Teste
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              O mundo roda em tempo real. Use isto so para testar mecanicas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdvanceDay}
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-amber-200 transition-all hover:bg-amber-400/20"
          >
            Avancar Dia
          </button>
        </div>
      )}

      {false && (<>
      {/* TOP ROW: Premium Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* CARD 1: PRÓXIMO CONFRONTO - FUTURISTIC REDESIGN */}
        <div className="relative group overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] glass-card-neon neon-border-cyan white-gradient-sheen p-4 sm:p-8 transition-all duration-700 min-h-[160px] sm:min-h-[220px] flex flex-col justify-center">
          {/* Neon Glow Effects */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/20 blur-[80px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-fuchsia-500/20 blur-[80px] translate-x-1/2 translate-y-1/2" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-400 italic">
                    PRÓXIMO JOGO
                  </span>
                  {nextMatchData?.status === 'PLAYING' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">AO VIVO</span>
                    </div>
                  )}
                </div>

                <div className="text-4xl sm:text-6xl font-black text-white tracking-tighter italic">
                  {isLobby ? (
                    <span className="text-white/20 text-2xl sm:text-4xl">—</span>
                  ) : nextMatchData?.status === 'PLAYING' ? (
                    <div className="flex items-center gap-4">
                      <span>{nextMatchData.match.homeScore}</span>
                      <span className="text-white/20">-</span>
                      <span>{nextMatchData.match.awayScore}</span>
                    </div>
                  ) : nextMatchData?.status === 'FINISHED' && nextMatchData.match.revealed === false ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/20">??</span>
                      <span className="text-white/10">-</span>
                      <span className="text-white/20">??</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRevealMatch(nextMatchData.match.id); }}
                        className="ml-4 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black uppercase text-white hover:bg-white/20 border border-white/10"
                      >
                        REVELAR
                      </button>
                    </div>
                  ) : nextMatchData?.status === 'FINISHED' ? (
                    <div className="flex items-center gap-4">
                      <span>{nextMatchData.match.homeScore}</span>
                      <span className="text-white/20">-</span>
                      <span>{nextMatchData.match.awayScore}</span>
                    </div>
                  ) : (
                    nextMatchData?.countdown || 'Aguardando...'
                  )}
                </div>
              </div>

              {nextMatchData ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-white/80 font-black text-xs sm:text-base uppercase tracking-tight italic">
                    <span className={nextMatchData.isHome ? 'text-cyan-400' : ''}>{userTeam?.name}</span>
                    <span className="text-white/20">VS</span>
                    <span className={!nextMatchData.isHome ? 'text-cyan-400' : ''}>{nextMatchData.opponent?.name}</span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                    {isLobby ? '--/--' : getMatchDateTime(nextMatchData.match).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()} • {isLobby ? '--:--' : nextMatchData.match.time}
                  </p>
                </div>
              ) : (
                <div className="text-[10px] text-white/20 italic font-black uppercase tracking-widest">
                  Aguardando Calendário...
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group/team-1">
                <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full opacity-0 group-hover/team-1:opacity-100 transition-opacity" />
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:border-cyan-500/40 transition-all">
                  {userTeam?.logo && (
                    <TeamLogo
                      primaryColor={userTeam.logo.primary}
                      secondaryColor={userTeam.logo.secondary}
                      accentColor={userTeam.logo.accent}
                      shapeId={userTeam.logo.shapeId}
                      patternId={userTeam.logo.patternId as any}
                      symbolId={userTeam.logo.symbolId}
                      size={window.innerWidth < 640 ? 32 : 40}
                    />
                  )}
                </div>
              </div>
              <div className="relative group/team-2">
                <div className="absolute inset-0 bg-purple-500/10 blur-xl rounded-full opacity-0 group-hover/team-2:opacity-100 transition-opacity" />
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:border-purple-500/40 transition-all">
                  {nextMatchData?.opponent?.logo && (
                    <TeamLogo
                      primaryColor={nextMatchData.opponent.logo.primary}
                      secondaryColor={nextMatchData.opponent.logo.secondary}
                      accentColor={nextMatchData.opponent.logo.accent}
                      shapeId={nextMatchData.opponent.logo.shapeId}
                      patternId={nextMatchData.opponent.logo.patternId as any}
                      symbolId={nextMatchData.opponent.logo.symbolId}
                      size={window.innerWidth < 640 ? 32 : 40}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: SCORE BALANCE / TETO DE PODER */}
        <div className="relative group overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] glass-card-neon neon-border-magenta white-gradient-sheen p-4 sm:p-8 transition-all hover:scale-[1.02] duration-500 min-h-[160px] sm:min-h-[220px] flex flex-col justify-between">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-500/20 blur-[100px] group-hover:bg-fuchsia-500/30 transition-all duration-700" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 blur-[100px] group-hover:bg-cyan-500/30 transition-all duration-700" />

          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400 neon-text-magenta">
                  BALANÇO DE SCORE
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${pointsLeft < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                    {pointsLeft < 0 ? 'LIMITE EXCEDIDO' : 'DENTRO DO TETO'}
                  </span>
                </div>
              </div>
              <div className="p-2 glass-card rounded-xl border-white/10 bg-white/5 shadow-inner">
                <Target size={16} className="text-fuchsia-400" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 sm:gap-2">
                <div className="text-2xl sm:text-4xl font-black text-white tracking-tighter italic neon-text-white">
                  {totalPoints}<span className="text-lg sm:text-xl opacity-40 ml-1">/ {powerCap}</span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Score Total do Elenco
                </span>
              </div>

              <div className="flex-1 max-w-[120px]">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-inner p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${pointsLeft < 0 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' :
                      pointsLeft < 500 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]' :
                        'bg-gradient-to-r from-cyan-500 to-fuchsia-500 shadow-[0_0_15px_rgba(34,211,238,0.6)]'
                      }`}
                    style={{ width: `${Math.min((totalPoints / powerCap) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* News & History Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Left: Main Headline */}
        <div className="lg:col-span-2">
          <div
            onClick={() => headlineData.type === 'match' && headlineData.match ? setSelectedMatchReport(headlineData.match) : null}
            className={`relative group overflow-hidden rounded-[2rem] glass-card-neon white-gradient-sheen border border-magenta-500/20 p-4 sm:p-6 transition-all hover:border-magenta-500/50 shadow-[0_0_30px_rgba(217,70,239,0.15)] ${headlineData.type === 'match' ? 'cursor-pointer' : ''}`}
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-magenta-500/10 blur-[80px] -mr-24 -mt-24 group-hover:bg-magenta-500/20 transition-all" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="px-2 py-0.5 rounded-full bg-magenta-500/20 border border-magenta-500/30">
                  <span className="text-[8px] font-black text-magenta-400 uppercase tracking-widest">
                    {headlineData.type === 'match' ? 'Último Resultado' : 'Feed Global'}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                  {headlineData.type === 'match' ? <Trophy size={14} className="text-purple-400" /> : <Newspaper size="14" className="text-purple-400" />}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-0.5 h-4 bg-magenta-500" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                    {headlineData.type === 'match' ? 'Resumo da Rodada' : 'Urgente'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter italic leading-none group-hover:text-magenta-400 transition-colors">
                  {headlineData.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-medium leading-tight">
                  {headlineData.message}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isRevealed ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRevealMatch(lastMatch!.id); }}
                      className="flex items-center gap-2 px-4 py-1.5 bg-magenta-500 rounded-full text-[10px] font-black text-black uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)]"
                    >
                      <Eye size={12} /> Revelar Placar
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-white">
                            {String.fromCharCode(64 + i)}
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Clique para ver Relatório
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight size={18} className="text-magenta-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent History / VOD Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.1em] flex items-center gap-1.5">
              <History size={12} className="text-magenta-400" />
              Histórico
            </h3>
            <button className="text-[9px] font-bold text-slate-500 uppercase hover:text-white transition-colors">Ver Todos</button>
          </div>

          <div className="space-y-2">
            {newsFeed.length > 0 ? newsFeed.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedMatchReport(item.match)}
                className="group relative overflow-hidden rounded-lg glass-card border-white/5 p-2.5 cursor-pointer hover:border-magenta-500/30 hover:bg-white/5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.title === 'Vitória' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : item.title === 'Empate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                      {item.title === 'Vitória' ? <Trophy size={14} /> : item.title === 'Empate' ? <Zap size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[10px] font-black text-white uppercase truncate leading-tight">{item.title} <span className="text-slate-500 ml-1">{item.score}</span></h4>
                      <p className="text-[9px] text-slate-500 font-bold truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-magenta-500/20 transition-all">
                      <Play size={10} className="text-white group-hover:text-magenta-400" />
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-white/10 p-6 flex flex-col items-center justify-center text-center gap-2 opacity-50">
                <Calendar size={20} className="text-slate-600" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Nenhuma partida<br />disputada ainda</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Agenda and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
        {/* Agenda de Jogos */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-3 h-[1px] bg-cyan-500/50" />
              Calendário
            </h3>
            <button className="text-[8px] text-white/30 hover:text-cyan-400 font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 group">
              Histórico <ChevronRight size={8} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {upcomingMatches.slice(0, 4).map((m, i) => {
              const homeTeam = state.teams[m.homeTeamId];
              const awayTeam = state.teams[m.awayTeamId];
              return (
                <div key={i} className="group relative glass-card-neon white-gradient-sheen border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all cursor-pointer overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 bg-cyan-500/10 blur-xl group-hover:bg-cyan-500/20 transition-all" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[7px] text-cyan-400 font-black uppercase tracking-widest italic">{isLobby ? '--/--' : m.date.split('-').reverse().slice(0, 2).join('/')}</span>
                      <span className="text-[7px] text-white font-black tabular-nums">{isLobby ? '--:--' : m.time}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {homeTeam?.logo && (
                            <div className="shrink-0">
                              <TeamLogo
                                primaryColor={homeTeam.logo.primary}
                                secondaryColor={homeTeam.logo.secondary}
                                accentColor={homeTeam.logo.accent}
                                shapeId={homeTeam.logo.shapeId}
                                patternId={homeTeam.logo.patternId as any}
                                symbolId={homeTeam.logo.symbolId}
                                size={10}
                              />
                            </div>
                          )}
                          <span className="text-[9px] text-white/60 font-black truncate uppercase tracking-tighter">{m.home}</span>
                        </div>
                        <span className="text-[9px] text-white font-black tabular-nums">0</span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {awayTeam?.logo && (
                            <div className="shrink-0">
                              <TeamLogo
                                primaryColor={awayTeam.logo.primary}
                                secondaryColor={awayTeam.logo.secondary}
                                accentColor={awayTeam.logo.accent}
                                shapeId={awayTeam.logo.shapeId}
                                patternId={awayTeam.logo.patternId as any}
                                symbolId={awayTeam.logo.symbolId}
                                size={10}
                              />
                            </div>
                          )}
                          <span className="text-[9px] text-white/60 font-black truncate uppercase tracking-tighter">{m.away}</span>
                        </div>
                        <span className="text-[9px] text-white font-black tabular-nums">0</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logs de Sistema / Atividades */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 px-1">
            <div className="w-3 h-[1px] bg-purple-500/50" />
            Sistema
          </h3>
          <div className="glass-card-neon white-gradient-sheen border-purple-500/20 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="divide-y divide-white/5">
              {[
                { label: 'Otimização Tática', time: 'AGORA', status: 'cyan', icon: Zap },
                { label: 'Mercado Aberto', time: '12m', status: 'emerald', icon: ShoppingCart },
                { label: 'Scout Norte', time: '45m', status: 'purple', icon: Search },
                { label: 'Sincronização', time: '2h', status: 'slate', icon: Database },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] transition-all cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1 rounded-lg glass-card border-white/5 bg-white/5 group-hover:neon-border-${n.status}`}>
                      <n.icon size={10} className={`text-${n.status}-500 group-hover:scale-110 transition-transform`} />
                    </div>
                    <span className="text-[9px] text-white/40 group-hover:text-white transition-colors font-black uppercase tracking-tight">{n.label}</span>
                  </div>
                  <span className="text-[7px] text-white/20 font-black tabular-nums group-hover:text-white/40 transition-colors">{n.time}</span>
                </div>
              ))}
            </div>
            <div className="p-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-center">
              <button className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">Ver Console</button>
            </div>
          </div>
        </div>
      </div>
      </>)}
      {/* Match Report Modal */}
      {selectedMatchReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl">
            <button
              onClick={() => setSelectedMatchReport(null)}
              className="absolute -top-12 right-0 z-50 p-2 bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors backdrop-blur-md border border-white/10"
            >
              <X size={24} />
            </button>
            <PostGameReport
              match={selectedMatchReport}
              homeTeam={state.teams[selectedMatchReport.homeTeamId || selectedMatchReport.homeId]}
              awayTeam={state.teams[selectedMatchReport.awayTeamId || selectedMatchReport.awayId]}
              players={state.players}
              onClose={() => setSelectedMatchReport(null)}
              onReveal={handleRevealMatch}
            />
          </div>
        </div>
      )}

      {/* Match Report Overlay */}
      {isWatchingReport && selectedMatchReport && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-in zoom-in duration-500">
          <div className="w-full max-w-4xl h-full max-h-[80vh] relative p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-sm font-black text-cyan-400 uppercase tracking-[0.4em] italic">Narração da Partida</h2>
            </div>
            <button
              onClick={() => {
                setIsWatchingReport(false);
                setReportSecond(0);
              }}
              className="absolute -top-12 right-4 z-[70] p-2 bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors border border-white/10"
            >
              <X size={24} />
            </button>

            <LiveReport
              match={selectedMatchReport}
              homeTeam={state.teams[selectedMatchReport.homeTeamId || selectedMatchReport.homeId]}
              awayTeam={state.teams[selectedMatchReport.awayTeamId || selectedMatchReport.awayId]}
              players={state.players}
              currentSecond={reportSecond}
            />

            {/* Report Controls */}
            <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 sm:gap-6 px-4 sm:px-8 py-2 sm:py-4 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl">
              <button className="text-white/40 hover:text-white transition-colors">
                <FastForward size={window.innerWidth < 640 ? 18 : 24} className="rotate-180" />
              </button>
              <button
                onClick={() => setReportSecond(prev => Math.max(0, prev - 10))}
                className="text-white/60 hover:text-white transition-colors flex flex-col items-center gap-1"
              >
                <Clock size={window.innerWidth < 640 ? 16 : 20} />
                <span className="text-[7px] sm:text-[8px] font-black">-10s</span>
              </button>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-cyan-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <Play size={window.innerWidth < 640 ? 20 : 24} fill="currentColor" />
              </div>

              <button
                onClick={() => setReportSecond(prev => Math.min(MATCH_REAL_TIME_SECONDS, prev + 10))}
                className="text-white/60 hover:text-white transition-colors flex flex-col items-center gap-1"
              >
                <Clock size={window.innerWidth < 640 ? 16 : 20} />
                <span className="text-[7px] sm:text-[8px] font-black">+10s</span>
              </button>
              <button className="text-white/40 hover:text-white transition-colors">
                <FastForward size={window.innerWidth < 640 ? 18 : 24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
