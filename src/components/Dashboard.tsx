import React, { useState, useEffect } from 'react';
import { useGame } from '../store/GameContext';
import { HomeTab } from './dashboard/HomeTab';
import { SquadTab } from './dashboard/SquadTab';
import { TacticsTab } from './dashboard/TacticsTab';
import { TrainingTab } from './dashboard/TrainingTab';
import { CompetitionTab } from './dashboard/CompetitionTab';
import { WorldTab } from './dashboard/WorldTab';
import { DatabaseTab } from './dashboard/DatabaseTab';
import { CareerTab } from './dashboard/CareerTab';
import { NewGameFlow } from './NewGameFlow';
import { Users, Brain, Target, Home, Trophy, History, Shield, Clock, TrendingUp, Save, Rocket, PlayCircle, LogOut, Calendar, Briefcase, Globe, FastForward, X } from 'lucide-react';
import { useGameDispatch, useGameState } from '../store/GameContext';
import { motion, AnimatePresence } from 'framer-motion';
import { DraftPanel } from './dashboard/DraftPanel';
import { LiveReport, PostGameReport } from './MatchReports';
import { LeagueState, Match, Player, Team, Manager } from '../types';
import { GENESIS_DRAFT_LAST_DAY, MATCH_REAL_TIME_SECONDS, SEASON_DAYS } from '../constants/gameConstants';
import { ManagerModal } from './ManagerModal';
import { startNewSeason } from '../engine/gameLogic';
import { TeamModal } from './TeamModal';
import { PlayerModal } from './PlayerModal';
import { TeamLogo } from './TeamLogo';
import { ObserverClaimPanel } from './ObserverClaimPanel';
import { OnboardingActionHint, OnboardingArea, OnboardingHint } from './OnboardingHint';
import { addNews } from '../engine/newsService';
import { FeedbackReportModal } from './FeedbackReportModal';
import { SeasonReportModal } from './SeasonReportModal';
import { runInteractionFeedback } from '../utils/uiFeedback';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMatchNotifications } from '../hooks/useMatchNotifications';
import { claimWorldTick, completeWorldDayTick } from '../lib/worldTick';
import { getNextGameMidnight, getNextRealMidnight } from '../utils/worldSchedule';

type Tab = 'home' | 'team' | 'calendar' | 'world' | 'career';
type TeamSubTab = 'squad' | 'lineup' | 'tactics' | 'training' | 'draft';

export const Dashboard: React.FC = () => {
  const { state, isPaused, worldId } = useGameState();
  const { setState, saveGame, togglePause, logout, leaveWorld, addToast, resignFromTeam, requestConfirm } = useGameDispatch();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [activeTeamTab, setActiveTeamTab] = useState<TeamSubTab>(
    (state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY) ? 'draft' : 'squad'
  );
  const isDraftOpen = state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY;

  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [liveMatchSecond, setLiveMatchSecond] = useState(0);
  const [watchedMatches, setWatchedMatches] = useState<Set<string>>(new Set());
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSeasonEndDismissed, setIsSeasonEndDismissed] = useState(false);
  const [selectedTeamView, setSelectedTeamView] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [selectedSeasonReport, setSelectedSeasonReport] = useState<number | null>(null);
  const [autoOpenedSeasonReport, setAutoOpenedSeasonReport] = useState<number | null>(null);
  const isObserver = !state.userTeamId && (!!state.userManagerId || !state.isCreator);
  const userTeam = state.userTeamId ? state.teams[state.userTeamId] : null;
  const squadNeedsAttention = !!userTeam && !isObserver && isDraftOpen && (userTeam.squad?.length || 0) < 15;
  const lineupNeedsAttention = !!userTeam && !isObserver && Object.values(userTeam.lineup || {}).filter(Boolean).length < 11;
  const tacticsNeedsAttention = !!userTeam && !isObserver && (!userTeam.tactics?.playStyle || !userTeam.tactics?.mentality);
  const trainingNeedsAttention = !!userTeam && !isObserver && (
    (state.training?.cardLaboratory?.slots || []).some(slot => !slot.cardId)
    || !state.training?.individualFocus?.evolutionSlot
    || !state.training?.individualFocus?.stabilizationSlot
  );
  const teamNeedsAttention = squadNeedsAttention || lineupNeedsAttention || tacticsNeedsAttention || trainingNeedsAttention;
  const onboardingArea: OnboardingArea = isObserver
    ? 'observer'
    : activeTab === 'team'
      ? `team-${activeTeamTab}` as OnboardingArea
      : activeTab;

  useEffect(() => {
    if (!isDraftOpen && activeTeamTab === 'draft') {
      setActiveTeamTab('squad');
    }
  }, [activeTeamTab, isDraftOpen]);

  useEffect(() => {
    if (isObserver && activeTab === 'home' && state.worldId) {
      setActiveTab('team');
    }
  }, [activeTab, isObserver, state.worldId]);

  useEffect(() => {
    if (typeof window === 'undefined' || selectedPlayer) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('openPlayerModal') !== '1') return;

    const firstTeamPlayer = Object.values(state.players)
      .find(player => player.contract.teamId === state.userTeamId);
    if (firstTeamPlayer) {
      setSelectedPlayer(firstTeamPlayer);
    }
  }, [selectedPlayer, state.players, state.userTeamId]);

  const headerReferenceDate = React.useMemo(() => {
    const rawDate = new Date(
      state.world.status === 'LOBBY' && state.world.startScheduledAt
        ? state.world.startScheduledAt
        : state.world.currentDate
    );
    const now = new Date();
    return new Date(
      now.getFullYear(),
      rawDate.getMonth(),
      rawDate.getDate(),
      rawDate.getHours(),
      rawDate.getMinutes(),
      0,
      0
    );
  }, [state.world.currentDate, state.world.startScheduledAt, state.world.status]);

  const headerClock = `${headerReferenceDate.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  }).replace('.', '')}`;
  const headerTime = headerReferenceDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const headerSeasonDay = state.world.currentDay < 0 ? 0 : (state.world.currentDay || 0) + 1;

  const { daysPassed, userTeamMatches, upcomingMatches, totalPoints, powerCap } = useDashboardData();
  useMatchNotifications(state, userTeam, upcomingMatches);
  const marketNeedsAttention = !!userTeam && !isObserver && state.world.transferWindowOpen === true && (powerCap - totalPoints) >= 120;
  const calendarNeedsAttention = !!userTeam && userTeamMatches.some(match => match.played && match.revealed === false);
  const isSeasonEnded = state.world.status !== 'LOBBY' && daysPassed > SEASON_DAYS;
  const actionOnboardingHint = React.useMemo<OnboardingActionHint | null>(() => {
    if (isObserver || activeTab !== 'home') return null;

    const userTeamId = state.userTeamId || (state.userManagerId ? state.managers[state.userManagerId]?.career.currentTeamId : null);
    const userTeam = userTeamId ? state.teams[userTeamId] : null;
    if (!userTeam) return null;

    const squadSize = userTeam.squad?.length || 0;
    const lineupCount = Object.values(userTeam.lineup || {}).filter(Boolean).length;
    const tacticReady = !!userTeam.tactics?.playStyle && !!userTeam.tactics?.mentality;
    const isPreseason = state.world.status === 'LOBBY' || state.world.currentDay < 3;
    const draftResolved = state.world.currentDay < 0 || !isPreseason || squadSize >= 15 || state.world.currentDay >= 2;
    const latestPlayed = [...userTeamMatches].filter(match => match.played).sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return dateDiff || (b.round || 0) - (a.round || 0);
    })[0];

    if (latestPlayed?.revealed === false) {
      return {
        key: 'action-postgame-report',
        eyebrow: 'Proximo clique',
        title: 'Abra o pos-jogo',
        body: 'Existe um resultado fechado sem leitura. Veja o relatorio para entender placar, melhores em campo e impacto no elenco.',
        next: 'Clique no CTA principal da Central do Dia para revelar o pos-jogo.',
        target: 'today-primary-action'
      };
    }

    if (isPreseason && !draftResolved) {
      return {
        key: 'action-open-draft',
        eyebrow: 'Proximo clique',
        title: 'Entre no Draft',
        body: `Seu clube ainda tem ${squadSize}/15 jogadores. O Draft e o caminho para montar a base antes da temporada.`,
        next: 'Clique no CTA principal e escolha atletas para completar o elenco.',
        target: 'today-primary-action'
      };
    }

    if (isPreseason && squadSize >= 15 && lineupCount < 11) {
      return {
        key: 'action-open-lineup',
        eyebrow: 'Proximo clique',
        title: 'Monte a escalacao',
        body: `O elenco ja tem jogadores suficientes, mas so ${lineupCount}/11 titulares estao definidos.`,
        next: 'Clique no CTA principal para escolher os titulares.',
        target: 'today-primary-action'
      };
    }

    if (isPreseason && lineupCount >= 11 && !tacticReady) {
      return {
        key: 'action-open-tactics',
        eyebrow: 'Proximo clique',
        title: 'Defina a tatica',
        body: 'O time ja tem base e titulares. Falta definir estilo e mentalidade antes de abrir a temporada.',
        next: 'Clique no CTA principal e escolha o plano de jogo.',
        target: 'today-primary-action'
      };
    }

    const nextPlayable = [...userTeamMatches]
      .filter(match => !match.played)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    if (!isPreseason && nextPlayable) {
      return {
        key: 'action-prepare-match',
        eyebrow: 'Proximo clique',
        title: 'Prepare o proximo jogo',
        body: 'A temporada esta rodando em tempo real. A Central mostra o proximo compromisso e o melhor ajuste antes da partida.',
        next: 'Use o CTA principal para revisar elenco, escalacao ou acompanhar a partida.',
        target: 'today-primary-action'
      };
    }

    if (state.world.phase === 'OFFSEASON') {
      return {
        key: 'action-offseason',
        eyebrow: 'Proximo clique',
        title: 'Resolva a offseason',
        body: 'A temporada acabou. Veja campeoes, quedas e decisoes antes de iniciar o proximo ciclo.',
        next: 'Use o painel de fim de temporada para continuar.',
        target: 'home-gps'
      };
    }

    return null;
  }, [
    activeTab,
    isObserver,
    state.managers,
    state.teams,
    state.userManagerId,
    state.userTeamId,
    state.world.currentDay,
    state.world.phase,
    state.world.status,
    userTeamMatches
  ]);
  const seasonEndSummary = React.useMemo(() => {
    const leagues = Object.values(state.world.leagues || {}) as LeagueState[];
    const sortRows = (rows: any[]) => [...rows].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      return gdB - gdA;
    });

    const champions = leagues
      .map(league => {
        const sorted = sortRows(league.standings || []);
        const row = sorted[0];
        return row ? { league: league.name, team: state.teams[row.teamId], row } : null;
      })
      .filter(Boolean) as Array<{ league: string; team: Team; row: any }>;

    const bottomTeams = leagues.flatMap(league => {
      const sorted = sortRows(league.standings || []);
      return sorted.slice(-2).map(row => ({ league: league.name, team: state.teams[row.teamId], row }));
    }).filter(item => item.team);

    const userTeamId = state.userTeamId || (state.userManagerId ? state.managers[state.userManagerId]?.career.currentTeamId : null);
    const userBottom = bottomTeams.some(item => item.team.id === userTeamId);
    const userStanding = leagues
      .map(league => {
        const sorted = sortRows(league.standings || []);
        const index = sorted.findIndex(row => row.teamId === userTeamId);
        return index >= 0 ? { league: league.name, row: sorted[index], position: index + 1 } : null;
      })
      .find(Boolean);
    const eliteWinner = state.world.eliteCup?.winnerId ? state.teams[state.world.eliteCup.winnerId] : null;
    const districtWinner = state.world.districtCup?.winnerId ? state.teams[state.world.districtCup.winnerId] : null;

    return { champions, bottomTeams, userBottom, userStanding, eliteWinner, districtWinner };
  }, [state.world.leagues, state.world.eliteCup?.winnerId, state.world.districtCup?.winnerId, state.teams, state.userTeamId, state.userManagerId, state.managers]);

  const handleOffseasonDecision = async (choice: 'STAY' | 'SEEK_CLUB') => {
    const newState = {
      ...state,
      world: {
        ...state.world,
        offseasonDecision: {
          season: state.world.currentSeason || 2050,
          choice,
          date: state.world.currentDate
        }
      }
    };
    addNews(
      newState,
      choice === 'STAY' ? 'MANAGER CONFIRMA PERMANENCIA' : 'MANAGER AVALIA NOVO CLUBE',
      choice === 'STAY'
        ? 'O comando decidiu permanecer no projeto apos o fim da temporada.'
        : 'O comando registrou interesse em procurar um novo clube para a proxima temporada.',
      'SYSTEM',
      2
    );

    setState(newState);
    await saveGame(newState);
    addToast(choice === 'STAY' ? 'Decisao registrada: permanecer.' : 'Decisao registrada: procurar novo clube.', 'info');
  };

  const handleSeasonEndContinue = async () => {
    if (!state.isCreator) {
      setIsSeasonEndDismissed(true);
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Preparar nova temporada',
      message: 'A proxima temporada sera agendada para amanha as 00:00.',
      confirmLabel: 'Preparar',
    });
    if (!confirmed) return;
    const season = state.world.currentSeason || 2050;
    const tickClaim = await claimWorldTick(
      worldId,
      `season-${season}:prepare-next-season`,
      state.world.currentDate
    );
    if (!tickClaim.ok) {
      addToast('A proxima temporada ja esta sendo preparada.', 'warning');
      return;
    }

    try {
      const nextStart = getNextRealMidnight();
      const nextGameStart = getNextGameMidnight(state.world.currentDate);

      const newState = startNewSeason(state);
      newState.world.status = 'LOBBY';
      newState.world.currentDay = -1;
      newState.world.startScheduledAt = nextStart.toISOString();
      newState.world.seasonStartReal = nextGameStart.toISOString();
      setState(newState);
      await saveGame(newState);
      await completeWorldDayTick(worldId, tickClaim.tickKey, true);
      setIsSeasonEndDismissed(true);
      addToast('Nova temporada preparada e agendada para amanha 00:00.', 'success');
    } catch (error: any) {
      await completeWorldDayTick(worldId, tickClaim.tickKey, false, error?.message || String(error));
      console.error('Erro ao preparar nova temporada:', error);
      addToast('Erro ao preparar nova temporada', 'error');
    }
  };

  const handleResignFromClub = async () => {
    const confirmed = await requestConfirm({
      title: 'Demitir do clube',
      message: 'Voce acompanhara o mundo sem clube e podera assumir outro clube elegivel depois.',
      confirmLabel: 'Demitir',
      tone: 'danger',
    });
    if (!confirmed) return;

    setIsManagerModalOpen(false);
    await resignFromTeam();
    setActiveTab('home');
  };

  const bgImages = {
    home: '/home.jpg',
    team: '/elenco.jpg',
    calendar: '/calendar.jpg',
    world: '/mundo.jpg',
    career: '/carreira.jpg',
  };
  const bgImage = bgImages[activeTab] || "/home.jpg";

  // Patch state if training is missing (compatibility with old saves)
  useEffect(() => {
    if (state && (!state.training || !state.training.cardLaboratory || !state.training.individualFocus)) {
      console.log('Dashboard: Training state incomplete or missing, patching...');
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          training: {
            chemistryBoostLastUsed: prev.training?.chemistryBoostLastUsed,
            playstyleTraining: prev.training?.playstyleTraining || {
              currentStyle: null,
              understanding: {
                'Blitzkrieg': 0,
                'Tiki-Taka': 0,
                'Retranca Armada': 0,
                'Motor Lento': 0,
                'Equilibrado': 20,
                'Gegenpressing': 0,
                'Catenaccio': 0,
                'Vertical': 0
              }
            },
            cardLaboratory: prev.training?.cardLaboratory || {
              slots: [
                { cardId: null, finishTime: null },
                { cardId: null, finishTime: null }
              ]
            },
            individualFocus: prev.training?.individualFocus || {
              evolutionSlot: null,
              stabilizationSlot: null
            }
          }
        };
      });
    }
  }, [state, setState]);

  // Detect newly played matches to show Live Replay
  useEffect(() => {
    if (!userTeamMatches || !state.userTeamId || liveMatch) return;

    const playedMatches = userTeamMatches.filter(m => m.played).sort((a, b) => b.round - a.round);
    const latest = playedMatches[0];

    if (latest && !watchedMatches.has(latest.id)) {
      const matchDate = new Date(latest.date);
      const gameDate = new Date(state.world.currentDate);
      const diffDays = (gameDate.getTime() - matchDate.getTime()) / (1000 * 3600 * 24);

      // Only pop up matches that happened within the last 2 in-game days
      if (diffDays >= 0 && diffDays < 2) {
        setLiveMatch(latest);
        setLiveMatchSecond(0);

        // Auto-pause if creator
        if (state.isCreator && !isPaused) {
          togglePause();
        }
      }
      setWatchedMatches(prev => new Set(prev).add(latest.id));
    }
  }, [userTeamMatches, state.world.currentDate, state.userTeamId, watchedMatches, liveMatch]);

  useEffect(() => {
    const latestSeasonReport = state.world.history?.[0];
    if (!latestSeasonReport) return;
    if (state.world.phase !== 'OFFSEASON') return;
    if (autoOpenedSeasonReport === latestSeasonReport.season) return;

    setSelectedSeasonReport(latestSeasonReport.season);
    setAutoOpenedSeasonReport(latestSeasonReport.season);
  }, [state.world.history, state.world.phase, autoOpenedSeasonReport]);

  // Live Match Timer
  useEffect(() => {
    if (!liveMatch) return;

    const timer = setInterval(() => {
      setLiveMatchSecond(prev => {
        if (prev >= MATCH_REAL_TIME_SECONDS) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [liveMatch]);

  const renderCurrentTab = () => {
    if (isObserver && activeTab === 'team') {
      return <ObserverClaimPanel />;
    }

    switch (activeTab) {
      case 'home': return (
        <HomeTab
          onOpenDraft={() => {
            setActiveTab('team');
            setActiveTeamTab(isDraftOpen ? 'draft' : 'squad');
          }}
          onOpenTeam={() => {
            setActiveTab('team');
            setActiveTeamTab('squad');
          }}
          onOpenLineup={() => {
            setActiveTab('team');
            setActiveTeamTab('lineup');
          }}
          onOpenTactics={() => {
            setActiveTab('team');
            setActiveTeamTab('tactics');
          }}
          onOpenLeague={() => setActiveTab('calendar')}
        />
      );
      case 'team':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div
              data-onboarding="team-mode-tabs"
              className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/5 shadow-lg overflow-x-auto scrollbar-hide"
            >
              {[
                ...(isDraftOpen ? [{ id: 'draft', label: 'Draft', icon: Rocket, attention: squadNeedsAttention }] : []),
                { id: 'squad', label: 'Elenco', icon: Users, attention: squadNeedsAttention },
                { id: 'lineup', label: 'Escalação', icon: Shield, attention: lineupNeedsAttention },
                { id: 'tactics', label: 'Tática', icon: Brain, attention: tacticsNeedsAttention },
                { id: 'training', label: 'Treino', icon: Target, attention: trainingNeedsAttention },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    runInteractionFeedback();
                    setActiveTeamTab(tab.id as TeamSubTab);
                  }}
                  className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-bold transition-all whitespace-nowrap text-[9px] sm:text-[10px] uppercase tracking-widest active:scale-90
                    ${activeTeamTab === tab.id
                      ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : tab.attention
                        ? 'text-cyan-100 bg-cyan-400/10 shadow-[0_0_18px_rgba(34,211,238,0.12)] hover:text-white hover:bg-cyan-400/15'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {tab.attention && activeTeamTab !== tab.id && (
                    <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.95)]" />
                  )}
                  <tab.icon size={14} className={activeTeamTab === tab.id ? 'animate-pulse' : ''} />
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTeamTab === 'draft' && isDraftOpen && <DraftPanel />}
            {activeTeamTab === 'squad' && <SquadTab showLineup={false} />}
            {activeTeamTab === 'lineup' && <SquadTab showLineup={true} lineupOnly />}
            {activeTeamTab === 'tactics' && <TacticsTab />}
            {activeTeamTab === 'training' && <TrainingTab />}
          </div>
        );
      case 'calendar': return <CompetitionTab />;
      case 'world': return <WorldTab onTabChange={(tab: any) => setActiveTab(tab)} />;
      case 'draft': return <DraftPanel />;
      case 'career': return <CareerTab onOpenFeedback={() => setIsFeedbackOpen(true)} />;
      default: return <HomeTab />;
    }
  };

  const requiresEntryCreation = !state.userTeamId && state.world.status === 'LOBBY' && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY;

  if (requiresEntryCreation) {
    return <NewGameFlow />;
  }

  const headerTeamId = state.userTeamId || (state.userManagerId ? state.managers[state.userManagerId]?.career.currentTeamId : null);
  const headerTeam = headerTeamId ? state.teams[headerTeamId] : null;
  const headerLeagueName = headerTeam?.league
    ? (Object.values(state.world.leagues || {}) as LeagueState[]).find(league => league.id === headerTeam.league)?.name
    : null;
  const handleGlobalInteractionFeedback = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const interactive = target?.closest('button, a, [role="button"]');
    if (!interactive) return;
    if ((interactive as HTMLButtonElement).disabled) return;
    runInteractionFeedback();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden text-white font-sans selection:bg-cyan-500/30 stadium-bg"
      onPointerDownCapture={handleGlobalInteractionFeedback}
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(14, 15, 17, 0.38), rgba(14, 15, 17, 0.9)), url(${bgImage})` }}>

      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[50%] h-[30] bg-[var(--district-norte)]/10 blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[50%] h-[30%] bg-[var(--district-oeste)]/10 blur-[150px] pointer-events-none animate-pulse" />

      {/* Boxed Floating Glass Header */}
      <header className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 max-w-7xl w-[96%] sm:w-[92%] glass-card-neon neon-border-cyan white-gradient-sheen z-50 flex items-center px-3 sm:px-8 h-14 sm:h-20 rounded-xl sm:rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.7)] group">
        <div className="flex items-center gap-2 sm:gap-6 relative z-10 w-full justify-between">
          <div
            className="flex items-center gap-2 sm:gap-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              runInteractionFeedback();
              setIsManagerModalOpen(true);
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-500/50 bg-black/40 p-1 shadow-2xl sm:h-14 sm:w-14 sm:rounded-2xl">
              {headerTeam?.logo ? (
                <TeamLogo
                  primaryColor={headerTeam.logo.primary}
                  secondaryColor={headerTeam.logo.secondary}
                  accentColor={headerTeam.logo.accent}
                  shapeId={headerTeam.logo.shapeId}
                  patternId={headerTeam.logo.patternId as any}
                  symbolId={headerTeam.logo.symbolId}
                  size={window.innerWidth < 640 ? 34 : 48}
                />
              ) : (
                <img
                  src="/logo.png"
                  alt="Elite 2050"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-[9px] sm:text-[14px] font-black italic tracking-tighter uppercase text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] leading-none truncate max-w-[80px] sm:max-w-none">
                {isObserver ? 'Observador Elite' : (headerTeam?.name || 'Sem Clube')}
              </h1>
              <p className="text-[6px] sm:text-[9px] font-bold text-cyan-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-0.5 sm:mt-1">
                {isObserver ? 'Escolha um clube' : (headerLeagueName || headerTeam?.district || 'Temporada')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end flex-1 sm:flex-none">
            <div className="text-[8px] sm:text-[11px] font-black italic tabular-nums text-white leading-tight drop-shadow-md uppercase tracking-widest">
              S{state.world.currentSeason || 1} • Dia {headerSeasonDay} • {headerClock} • {headerTime}
            </div>
            <div className="mt-1 flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1">
              <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.24em] text-cyan-200">Score</span>
              <span className="text-[10px] sm:text-sm font-black italic tabular-nums text-white">
                {totalPoints.toLocaleString()}
              </span>
              <span className="hidden sm:inline text-[7px] font-black uppercase tracking-widest text-white/30">/ {powerCap.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={async () => {
                runInteractionFeedback();
                const confirmed = await requestConfirm({
                  title: 'Sair do mundo',
                  message: 'Voce voltara para a selecao de mundos.',
                  confirmLabel: 'Sair',
                });
                if (confirmed) leaveWorld();
              }}
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black/40 hover:bg-black/60 flex items-center justify-center transition-all border border-cyan-500/30 shadow-inner group active:scale-90"
              title="Sair do Mundo"
            >
              <LogOut size={12} className="text-red-400 group-hover:scale-110 transition-transform sm:size-[16px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="h-full overflow-y-auto pt-4 sm:pt-6 pb-32 sm:pb-40 slim-scrollbar">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12 w-full">
          {isObserver && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 sm:mb-4 rounded-[1.5rem] border border-cyan-500/30 bg-cyan-500/10 p-4 text-center text-[9px] font-black uppercase tracking-[0.25em] text-cyan-100 shadow-[0_0_35px_rgba(6,182,212,0.12)] sm:p-5"
            >
              Voce entrou como observador. Pode acompanhar o mundo ou assumir um clube de IA.
            </motion.div>
          )}

          {/* LOBBY STATUS BANNER - Robust check for Genesis and creator status */}
          {(state.world.status === 'LOBBY' || state.world.currentDay < 3) && (
            <motion.div
              layoutId="lobby-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-2 sm:mb-4 p-4 sm:p-6 xl:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] glass-card-neon white-gradient-sheen border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden group"
            >
              <div className="absolute -right-10 -bottom-10 opacity-5 group-hover:opacity-10 transition-all duration-700 group-hover:scale-110 group-hover:-rotate-12">
                <Rocket size={120} className="text-amber-400 sm:size-[200px]" />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative z-10">
                <div className="space-y-1 sm:space-y-3 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3">
                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,1)]" />
                    <h2 className="text-sm sm:text-xl xl:text-3xl font-black text-white uppercase tracking-tighter italic">
                      {state.world.currentDay === -1 && state.world.startScheduledAt ? 'INICIO' : 'MODO'} <span className="text-amber-400">{state.world.currentDay === -1 && state.world.startScheduledAt ? 'AGENDADO' : 'PRE-SEASON'}</span>
                    </h2>
                  </div>
                  <p className="text-[7px] sm:text-[10px] xl:text-xs text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-relaxed max-w-xl">
                    {state.world.currentDay === -1
                      ? state.world.startScheduledAt
                        ? "Comeca no proximo 00:00. O Draft Genesis abre no Dia 0 e fica ajustavel ate o Dia 2."
                        : "Aguardando participantes. O Draft Genesis so abre depois que o GM agendar o inicio."
                      : state.world.currentDay === 2
                        ? "Draft Dia 2: janela final. Na proxima virada a liga computa propostas e completa elencos vazios."
                        : state.world.currentDay === 1
                          ? "Draft Dia 1: continue ajustando sua lista. O Dia 2 ainda fica aberto para propostas."
                          : "Draft Dia 0: escolha seus atletas preferidos. As disputas comecam a ser computadas nas viradas."}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['00:00', 'Draft libera'],
                      ['Dia 0', 'Monte lista'],
                      ['Dia 1', 'Ajustes'],
                      ['Dia 2', 'Janela final'],
                    ].map(([label, detail]) => (
                      <div key={label} className="rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-200">{label}</div>
                        <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/40">{detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {state.world.status === 'LOBBY' ? (
                  state.isCreator ? (
                    <button
                      onClick={async () => {
                        runInteractionFeedback();
                        const isPreDay = state.world.currentDay === -1;
                        if (isPreDay && state.world.startScheduledAt) {
                          addToast('Inicio ja esta agendado para o proximo 00:00.', 'info');
                          return;
                        }
                        const nextDay = getNextRealMidnight();
                        const nextGameDay = getNextGameMidnight(state.world.currentDate);
                        const humanCount = (state.participants || []).filter(participant => participant.teamId).length;
                        const newState = {
                          ...state,
                          world: {
                            ...state.world,
                            currentDay: isPreDay ? -1 : state.world.currentDay,
                            status: isPreDay ? 'LOBBY' as const : 'ACTIVE' as const,
                            startScheduledAt: isPreDay ? nextDay.toISOString() : null,
                            seasonStartReal: nextGameDay.toISOString()
                          },
                          notifications: [
                            {
                              id: `${isPreDay ? 'season_scheduled' : 'season_started'}_${state.world.currentSeason || 2050}_${Date.now()}`,
                              date: state.world.currentDate,
                              title: isPreDay ? 'Inicio agendado' : 'Temporada comecou',
                              message: isPreDay
                                ? `O GM agendou o inicio para o proximo 00:00. Humanos confirmados: ${humanCount}.`
                                : 'O GM abriu a temporada. Calendario, treino, mercado e jogos agora seguem o relogio do mundo.',
                              type: isPreDay ? 'info' as const : 'success' as const,
                              read: false
                            },
                            ...(state.notifications || []),
                          ].slice(0, 80)
                        };
                        setState(newState);
                        await saveGame(newState);
                        addToast(isPreDay ? 'Inicio agendado para o proximo 00:00.' : 'Temporada aberta.', 'success');
                      }}
                      disabled={state.world.currentDay === -1 && !!state.world.startScheduledAt}
                      className="group relative w-full md:w-auto px-6 xl:px-14 py-3 xl:py-5 rounded-xl bg-amber-500 text-black font-black text-[9px] sm:text-xs xl:text-sm uppercase tracking-[0.3em] transition-all duration-500 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-amber-300/40 disabled:text-black/55 disabled:shadow-none shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-4">
                        {state.world.currentDay === -1 && state.world.startScheduledAt ? 'COMECA 00:00' : state.world.currentDay === -1 ? 'AGENDAR INICIO' : 'ATIVAR TEMPORADA'}
                        <PlayCircle size={14} className="group-hover:translate-x-1 transition-transform sm:size-[20px]" />
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-bold text-[7px] sm:text-[10px] uppercase tracking-widest italic">
                      <Clock size={12} className="text-amber-500 animate-pulse sm:size-[16px]" />
                      {state.world.startScheduledAt ? 'Inicio no proximo 00:00' : 'Aguardando GM...'}
                    </div>
                  )
                ) : null}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              data-onboarding={`screen-${onboardingArea}`}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {renderCurrentTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Universal Bottom Navigation */}
      <nav className="fixed bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 max-w-3xl w-[96%] sm:w-[92%] glass-card rounded-[1.5rem] sm:rounded-[3rem] p-1 sm:p-2.5 flex justify-between items-center z-50 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'team', label: isObserver ? 'Entrar' : 'Elenco', icon: Users, attention: teamNeedsAttention },
          { id: 'calendar', label: 'Calendario', icon: Calendar, attention: calendarNeedsAttention },
          { id: 'world', label: 'Mundo', icon: Trophy, attention: marketNeedsAttention },
          ...(isObserver ? [] : [{ id: 'career', label: 'Carreira', icon: Briefcase }]),
        ].map(tab => (
          <button
            key={tab.id}
            data-testid={`main-tab-${tab.id}`}
            onClick={() => {
              if (activeTab !== tab.id) {
                runInteractionFeedback();
                setActiveTab(tab.id as Tab);
                // Force Draft sub-tab if going to team during Genesis
                if (tab.id === 'team' && isDraftOpen) {
                  setActiveTeamTab('draft');
                }
              }
            }}
            className={`flex-1 flex flex-col items-center gap-1 sm:gap-2 py-2 sm:py-4 rounded-[1.2rem] sm:rounded-[2.5rem] transition-all relative group active:scale-90 ${activeTab === tab.id ? 'text-cyan-400' : 'text-white/20 hover:text-white/50'} ${tab.attention && activeTab !== tab.id ? 'text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.16)]' : ''}`}
          >
            {tab.attention && activeTab !== tab.id && (
              <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.95)]" />
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="nav-glow"
                className="absolute inset-0 bg-gradient-to-t from-cyan-500/30 to-transparent rounded-[1.2rem] sm:rounded-[2.5rem] z-0"
              />
            )}
            <tab.icon
              size={activeTab === tab.id ? 20 : 18}
              className={`relative z-10 transition-all duration-300 sm:size-[${activeTab === tab.id ? 26 : 24}px] ${activeTab === tab.id ? 'drop-shadow-[0_0_12px_rgba(34,211,238,1)] scale-110' : 'group-hover:scale-110'}`}
            />
            <span className={`text-[6px] sm:text-[9px] font-black tracking-[0.1em] sm:tracking-[0.2em] uppercase relative z-10 transition-all duration-300 ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {isSeasonEnded && !isSeasonEndDismissed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/90 p-3 backdrop-blur-xl sm:p-4"
          >
            <motion.div
              initial={{ y: 30, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
              className="relative my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-500/40 bg-slate-950/95 shadow-[0_0_70px_rgba(6,182,212,0.22)] slim-scrollbar"
            >
              <button
                type="button"
                onClick={() => setIsSeasonEndDismissed(true)}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="border-b border-white/10 bg-gradient-to-br from-cyan-950/50 via-slate-950 to-fuchsia-950/40 p-6 sm:p-8">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.35em] text-cyan-300">
                  Fim de ciclo
                </p>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white sm:text-5xl">
                  Temporada Encerrada
                </h2>
                <p className="mt-3 max-w-2xl text-xs font-bold uppercase tracking-widest text-slate-400">
                  O mundo parou para registrar campeoes, quedas e decisoes de carreira.
                </p>
              </div>

              <div className="max-h-[62vh] overflow-y-auto p-5 slim-scrollbar sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-300">
                    <Trophy size={15} /> Campeoes
                  </div>
                  <div className="space-y-2">
                    {seasonEndSummary.champions.map(item => (
                      <div key={item.league} className="flex items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => item.team && setSelectedTeamView(item.team.id)}
                          className="truncate text-left text-[10px] font-black uppercase tracking-wider text-white transition hover:text-cyan-300"
                        >
                          {item.team?.name || '---'}
                        </button>
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-slate-500">{item.league}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-300">
                    <TrendingUp size={15} className="rotate-180" /> Zona de queda
                  </div>
                  <div className="space-y-2">
                    {seasonEndSummary.bottomTeams.slice(0, 8).map(item => (
                      <div key={`${item.league}-${item.team.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-black/35 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTeamView(item.team.id)}
                          className="truncate text-left text-[10px] font-black uppercase tracking-wider text-white transition hover:text-cyan-300"
                        >
                          {item.team.name}
                        </button>
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-slate-500">{item.league}</span>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </div>

              <div className="mx-5 mb-5 grid gap-3 sm:mx-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-cyan-200">Seu clube</p>
                  <p className="mt-2 text-xl font-black uppercase italic text-white">
                    {seasonEndSummary.userStanding ? `${seasonEndSummary.userStanding.position}o` : '--'}
                  </p>
                  <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {seasonEndSummary.userStanding?.league || 'sem liga'}
                  </p>
                </div>
                <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-fuchsia-200">Copa Elite</p>
                  <button
                    type="button"
                    onClick={() => seasonEndSummary.eliteWinner && setSelectedTeamView(seasonEndSummary.eliteWinner.id)}
                    className="mt-2 block max-w-full truncate text-left text-sm font-black uppercase italic text-white transition hover:text-cyan-300"
                  >
                    {seasonEndSummary.eliteWinner?.name || 'a definir'}
                  </button>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-200">Copa Distritos</p>
                  <button
                    type="button"
                    onClick={() => seasonEndSummary.districtWinner && setSelectedTeamView(seasonEndSummary.districtWinner.id)}
                    className="mt-2 block max-w-full truncate text-left text-sm font-black uppercase italic text-white transition hover:text-cyan-300"
                  >
                    {seasonEndSummary.districtWinner?.name || 'a definir'}
                  </button>
                </div>
              </div>

              {seasonEndSummary.userBottom && (
                <div className="mx-5 mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:mx-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                    Seu time caiu de zona. Registrar decisao:
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleOffseasonDecision('STAY')}
                      className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10"
                    >
                      Permanecer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOffseasonDecision('SEEK_CLUB')}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/25"
                    >
                      Procurar novo clube
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  onClick={() => setIsSeasonEndDismissed(true)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
                >
                  Continuar vendo
                </button>
                <button
                  type="button"
                  onClick={handleSeasonEndContinue}
                  className="rounded-xl border border-cyan-400/40 bg-cyan-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_24px_rgba(34,211,238,0.28)] transition hover:bg-cyan-300"
                >
                  {state.isCreator ? 'Acelerar offseason' : 'Continuar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Match Overlay Modal */}
      <AnimatePresence>
        {liveMatch && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          >
            <div className="relative w-full max-w-2xl h-[85vh] flex flex-col">
              <div className="absolute -top-12 right-0 flex gap-4">
                <button
                  onClick={() => setLiveMatchSecond(MATCH_REAL_TIME_SECONDS)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] uppercase font-black tracking-widest transition-colors backdrop-blur-md flex items-center gap-2"
                >
                  <FastForward size={14} /> Pular p/ Fim
                </button>
                <button
                  onClick={() => setLiveMatch(null)}
                  className="p-2 bg-red-500/20 hover:bg-red-500 flex items-center justify-center text-white rounded-full transition-colors backdrop-blur-md"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
                {(() => {
                  const hTeam = state.teams[liveMatch.homeTeamId || liveMatch.homeId];
                  const aTeam = state.teams[liveMatch.awayTeamId || liveMatch.awayId];

                  if (!hTeam || !aTeam) return (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 uppercase font-black text-xs tracking-widest gap-4">
                      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-cyan-500 animate-spin" />
                      Carregando Dados da Partida...
                    </div>
                  );

                  return (
                    <LiveReport
                      match={liveMatch}
                      homeTeam={hTeam}
                      awayTeam={aTeam}
                      players={state.players}
                      currentSecond={liveMatchSecond}
                      onTeamClick={(teamId) => {
                        setSelectedTeamView(teamId);
                        setLiveMatch(null);
                      }}
                      onPlayerClick={(player) => {
                        setSelectedPlayer(player);
                        setLiveMatch(null);
                      }}
                    />
                  );
                })()}
              </div>

              {liveMatchSecond >= MATCH_REAL_TIME_SECONDS && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setLiveMatch(null)}
                    className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full text-xs uppercase font-black tracking-[0.3em] transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                  >
                    Voltar ao Dashboard
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <OnboardingHint area={onboardingArea} actionHint={actionOnboardingHint} />

      <AnimatePresence>
        {isManagerModalOpen && state.managers[state.userManagerId] && (
          <ManagerModal
            manager={state.managers[state.userManagerId]}
            onClose={() => setIsManagerModalOpen(false)}
            onResign={handleResignFromClub}
          />
        )}

        {selectedManager && (
          <ManagerModal
            manager={selectedManager}
            onClose={() => setSelectedManager(null)}
          />
        )}

        {isFeedbackOpen && (
          <FeedbackReportModal
            currentTab={activeTab === 'team' ? `team:${activeTeamTab}` : activeTab}
            onClose={() => setIsFeedbackOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSeasonReport !== null && state.world.history?.find(report => report.season === selectedSeasonReport) && (
          <SeasonReportModal
            report={state.world.history.find(report => report.season === selectedSeasonReport)!}
            teams={state.teams}
            players={state.players}
            managers={state.managers}
            userTeamId={state.userTeamId}
            onClose={() => setSelectedSeasonReport(null)}
            onTeamClick={(teamId) => {
              setSelectedSeasonReport(null);
              setSelectedTeamView(teamId);
            }}
            onPlayerClick={(player) => {
              setSelectedSeasonReport(null);
              setSelectedPlayer(player);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTeamView && state.teams[selectedTeamView] && (
          <TeamModal
            team={state.teams[selectedTeamView]}
            players={state.players}
            onClose={() => setSelectedTeamView(null)}
            onPlayerClick={(player) => {
              setSelectedPlayer(player);
              setSelectedTeamView(null);
            }}
            onTeamClick={setSelectedTeamView}
            onManagerClick={(manager) => {
              setSelectedTeamView(null);
              setSelectedManager(manager);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlayer && (
          <PlayerModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
