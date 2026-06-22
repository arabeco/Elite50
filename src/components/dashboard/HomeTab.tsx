import React from 'react';
import { useGame } from '../../store/GameContext';
import { useGameDispatch } from '../../store/GameContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMatchSimulation } from '../../hooks/useMatchSimulation';
import { useTransfers } from '../../hooks/useTransfers';
import { useTactics } from '../../hooks/useTactics';
import { useTraining } from '../../hooks/useTraining';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { TeamLogo } from '../TeamLogo';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { getCountdown, getLiveMatchSecond, getMatchDateTime, getNextMatch } from '../../utils/matchUtils';
import { calculateTeamPower, isJoinWindowOpen } from '../../engine/gameLogic';
import { MATCH_REAL_TIME_SECONDS, MIDSEASON_JOIN_MAX_ROUND, OFFSEASON_DAYS, SEASON_DAYS } from '../../constants/gameConstants';
import { resolveHomePhase } from '../../utils/homeFlow';
import { getNextGameMidnight, getNextRealMidnight } from '../../utils/worldSchedule';
import { Team, Player, Match, ClubOffer, LeagueState } from '../../types';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, History, Play, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Rocket, CheckCircle2, Circle, Mail, Check, XCircle, Copy } = LucideIcons;

interface HomeTabProps {
  onOpenDraft?: () => void;
  onOpenTeam?: () => void;
  onOpenLineup?: () => void;
  onOpenTactics?: () => void;
  onOpenLeague?: () => void;
}

export const HomeTab = ({ onOpenDraft, onOpenTeam, onOpenLineup, onOpenTactics, onOpenLeague }: HomeTabProps) => {
  const { state, setState, saveGame, isSyncing } = useGame();
  const { respondToClubOffer, addToast } = useGameDispatch();
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
  const { handleMakeProposal } = useTransfers(userTeam?.id || null, totalPoints, powerCap);
  const pendingDraftScore = React.useMemo(() => {
    if (!state.userManagerId) return 0;
    return (state.world.draftProposals || [])
      .filter(proposal => proposal.managerId === state.userManagerId)
      .reduce((sum, proposal) => sum + (state.players[proposal.playerId]?.totalRating || 0), 0);
  }, [state.players, state.userManagerId, state.world.draftProposals]);
  const occupiedScore = totalPoints + pendingDraftScore;
  const reservedScoreLeft = powerCap - occupiedScore;
  const occupiedScorePercent = powerCap > 0 ? Math.min(100, Math.max(0, (occupiedScore / powerCap) * 100)) : 0;
  const isUnemployed = !userTeam;
  const [actingOfferId, setActingOfferId] = React.useState<string | null>(null);
  const [dismissedNoticeKey, setDismissedNoticeKey] = React.useState<string | null>(null);

  const handleRevealMatch = async (matchId: string) => {
    const nextState = (() => {
      let revealedState: any = null;
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

        revealedState = newState;
        return newState;
      });
      return revealedState;
    })();

    if (nextState) {
      await saveGame(nextState);
      addToast('Relatorio revelado.', 'success');
    }
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
    const latestSeasonReport = state.world.history?.[0];
    if (state.world.phase === 'OFFSEASON' && latestSeasonReport) {
      return {
        type: 'news',
        title: `Season ${latestSeasonReport.season} arquivada`,
        message: 'A offseason esta viva: veja o season report, acompanhe a Copa dos Distritos e prepare a entrada na proxima temporada.',
        revealed: true
      };
    }

    if (lastMatch) {
      const isHome = lastMatch.homeId === userTeam?.id;
      const userScore = isHome ? lastMatch.homeScore : lastMatch.awayScore;
      const oppScore = isHome ? lastMatch.awayScore : lastMatch.homeScore;
      const opponentName = isHome ? lastMatch.away : lastMatch.home;

      const isWin = userScore > oppScore;
      const isDraw = userScore === oppScore;

      return {
        type: 'match',
        title: !isRevealed ? "Partida encerrada" : (isWin ? "Vitória espetacular!" : isDraw ? "Empate tático" : "Derrota Amarga"),
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

    (state.world.news || []).slice(0, 4).forEach(item => {
      feed.push({
        id: item.id,
        type: 'news',
        title: item.title,
        subtitle: item.content,
        score: item.type,
        date: item.date,
        importance: item.importance,
        action: item.action
      });
    });

    return feed
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [pastMatches, state.world.news, userTeam]);

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
    if (state.world.status === 'LOBBY' || state.world.currentDay < 3) return null;

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
    let ctaAction = onOpenTactics || onOpenLineup || onOpenTeam || onOpenLeague;
    let ctaIcon = Brain;

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
    state.world.currentDay,
    state.world.status,
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
  const isOffseason = state.world.phase === 'OFFSEASON';
  const isMatchDay = !isPreseason && nextMatchData?.phase === 'live';
  const isPostGame = !isPreseason && (
    (!!nextMatchData && nextMatchData.phase === 'after') ||
    (!!lastMatch && lastMatch.revealed === false)
  );
  const joinWindowOpen = isJoinWindowOpen(state);
  const userClubOffers = React.useMemo(
    () => ((state.world.clubOffers || []).filter(offer => offer.targetUserId === state.userId) as ClubOffer[])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.userId, state.world.clubOffers]
  );
  const spotlightOffer = userClubOffers.find(offer => offer.status === 'ACCEPTED')
    || userClubOffers.find(offer => offer.status === 'PENDING')
    || userClubOffers.find(offer => offer.status === 'WAITING_NEXT_SEASON')
    || null;
  const clubOpportunityCards = React.useMemo(() => {
    const leagues = Object.values(state.world.leagues || {}) as LeagueState[];
    const leagueByTeam = new Map<string, { name: string; position: number }>();
    leagues.forEach(league => {
      const sorted = [...(league.standings || [])].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goalsFor - a.goalsAgainst;
        const gdB = b.goalsFor - b.goalsAgainst;
        return gdB - gdA;
      });
      sorted.forEach((row, index) => leagueByTeam.set(row.teamId, { name: league.name, position: index + 1 }));
    });

    return (Object.values(state.teams) as Team[])
      .filter(team => team.id.startsWith('t_'))
      .filter(team => {
        const manager = team.managerId ? state.managers[team.managerId] : null;
        return !manager || manager.isNPC !== false;
      })
      .map(team => {
        const squad = (team.squad || []).map(id => state.players[id]).filter(Boolean);
        const squadScore = squad.reduce((sum, player) => sum + player.totalRating, 0);
        return {
          team,
          squadScore,
          league: leagueByTeam.get(team.id),
          existingOffer: userClubOffers.find(offer => offer.teamId === team.id)
        };
      })
      .sort((a, b) => {
        const posA = a.league?.position || 99;
        const posB = b.league?.position || 99;
        return posB - posA;
      })
      .slice(0, 3);
  }, [state.managers, state.players, state.teams, state.world.leagues, userClubOffers]);
  const offseasonDay = Math.max(1, daysPassed - (SEASON_DAYS - OFFSEASON_DAYS));

  const draftCount = state.world.draftProposals?.filter(p => p.managerId === state.userManagerId).length || 0;
  const squadSize = userTeam?.squad?.length || 0;
  const canAdvancePreseason = state.isCreator && state.world.currentDay === -1;
  const worldJoinCode = state.world.access?.joinCode || (state.worldId ? `ELITE-${state.worldId.slice(-6)}` : 'ELITE-LOCAL');
  const worldParticipants = state.participants || [];
  const humanParticipants = worldParticipants.filter(participant => participant.teamId);
  const observerParticipants = worldParticipants.filter(participant => !participant.teamId);
  const isKickoffScheduled = state.world.currentDay === -1 && !!state.world.startScheduledAt;
  const lineupCount = userTeam ? Object.values(userTeam.lineup || {}).filter(Boolean).length : 0;
  const isSquadComplete = squadSize >= 15;
  const isDraftResolved = !isPreseason || isSquadComplete || state.world.currentDay >= 2;
  const isLineupReady = lineupCount >= 11;
  const isTacticReady = !!userTeam?.tactics?.playStyle && !!userTeam?.tactics?.mentality;
  const playedUserMatches = userRelevantMatches.filter(match => match.played);
  const todayPhase = resolveHomePhase({
    isPreseason,
    isOffseason,
    isMatchDay,
    isPostGame,
  });
  const firstUserMatch = [...userRelevantMatches].sort((a, b) => {
    const dateDiff = getMatchDateTime(a).getTime() - getMatchDateTime(b).getTime();
    return dateDiff || (a.round || 0) - (b.round || 0);
  })[0];
  const isFirstMatchFlow = !!firstUserMatch && playedUserMatches.length <= 1 && nextMatchData?.match.id === firstUserMatch.id;
  const firstMatchStage = !isFirstMatchFlow
    ? null
    : nextMatchData?.phase === 'before'
      ? 'preview'
      : nextMatchData?.phase === 'live'
        ? 'live'
        : 'report';

  const handleStartSeason = async () => {
    if (!state.isCreator) {
      addToast('Apenas o criador pode iniciar a temporada.', 'warning');
      return;
    }
    if (isKickoffScheduled) {
      addToast(`Inicio ja esta agendado. Humanos confirmados: ${humanParticipants.length}.`, 'info');
      return;
    }

    const nextDay = getNextRealMidnight();
    const nextGameDay = getNextGameMidnight(state.world.currentDate);

    const startsTomorrow = state.world.currentDay === -1;
    const nextState = {
      ...state,
      world: {
        ...state.world,
        status: startsTomorrow ? 'LOBBY' as const : 'ACTIVE' as const,
        startScheduledAt: startsTomorrow ? nextDay.toISOString() : null,
        seasonStartReal: nextGameDay.toISOString()
      },
      notifications: [
        {
          id: `${startsTomorrow ? 'season_scheduled' : 'season_started'}_${state.world.currentSeason || 2050}_${Date.now()}`,
          date: state.world.currentDate,
          title: startsTomorrow ? 'Temporada agendada' : 'Temporada comecou',
          message: startsTomorrow
            ? `O GM agendou o inicio para o proximo 00:00. Humanos confirmados: ${humanParticipants.length}.`
            : 'O GM abriu a temporada. Calendario, treino, mercado e jogos agora seguem o relogio do mundo.',
          type: startsTomorrow ? 'info' as const : 'success' as const,
          read: false
        },
        ...(state.notifications || []),
      ].slice(0, 80)
    };

    setState(nextState);
    await saveGame(nextState);
    addToast('Inicio agendado para o proximo 00:00.', 'success');
  };

  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(worldJoinCode);
      addToast('Codigo do mundo copiado.', 'success');
    } catch {
      addToast(`Codigo do mundo: ${worldJoinCode}`, 'info');
    }
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
    },
    offseason: {
      eyebrow: 'OFFSEASON',
      title: 'O mundo nao para entre temporadas',
      message: joinWindowOpen
        ? `A janela curta esta aberta. Ainda da para entrar em clube ou preparar a base para a proxima temporada ate a rodada ${MIDSEASON_JOIN_MAX_ROUND}.`
        : 'A offseason esta correndo e a nova temporada entra sozinha quando a janela fechar.',
      status: `Dia ${Math.min(offseasonDay, OFFSEASON_DAYS)}/${OFFSEASON_DAYS} da offseason`,
      consequence: 'Conseq.: a proxima temporada comeca automaticamente.',
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

    if (todayPhase === 'offseason') {
      return [
        { label: 'Ver Calendario', icon: Calendar, onClick: onOpenLeague, primary: true, disabled: !onOpenLeague },
        { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
        { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
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

  const guidedTodayCopy = (() => {
    if (isUnemployed) {
      const spotlightTeam = spotlightOffer ? state.teams[spotlightOffer.teamId] : null;
      return {
        eyebrow: 'SEM CLUBE',
        title: spotlightOffer?.status === 'ACCEPTED' ? 'Contrato na mesa' : 'Escolha seu proximo destino',
        message: spotlightOffer?.status === 'ACCEPTED'
          ? `${spotlightTeam?.name || 'Um clube'} topou conversar. Assine no timing certo ou recuse e siga observando o mercado.`
          : joinWindowOpen
            ? 'Voce esta livre no mercado. Veja os clubes disponiveis, envie proposta e acompanhe as respostas no inbox.'
            : 'A janela atual fechou, mas voce ainda pode entrar na fila da proxima temporada e acompanhar o mundo enquanto espera.',
        status: spotlightOffer?.status === 'WAITING_NEXT_SEASON'
          ? 'Fila da proxima temporada'
          : spotlightOffer?.status === 'PENDING'
            ? 'Aguardando resposta'
            : spotlightOffer?.status === 'ACCEPTED'
              ? 'Assinatura disponivel'
              : joinWindowOpen ? 'Mercado aberto' : 'Janela fechada',
        consequence: spotlightOffer?.status === 'ACCEPTED'
          ? 'Depois disso: voce entra no clube e o mundo segue normalmente.'
          : 'Depois disso: o clube responde no timing da janela, nunca na hora.',
      };
    }

    if (todayPhase === 'preseason') {
      if (state.world.currentDay === -1) {
        return {
          eyebrow: 'PRE-TEMPORADA',
          title: isKickoffScheduled ? 'Inicio marcado para 00:00' : 'Mundo aberto, temporada parada',
          message: isKickoffScheduled
            ? 'O mundo ja esta agendado. Jogadores ainda podem entrar; o Draft so libera no 00:00 do proximo dia.'
            : 'Gente pode entrar agora, escolher clube e aparecer para o GM. A contagem so comeca quando o inicio for agendado.',
          status: isKickoffScheduled ? `${humanParticipants.length} humanos confirmados` : 'Aguardando agendar inicio',
          consequence: 'Regra: Dia 0 e Dia 1 recebem listas do Draft. Na virada para o Dia 2, a liga computa disputas e completa elencos.',
        };
      }

      if (!isSquadComplete) {
        return {
          eyebrow: 'DRAFT ABERTO',
          title: draftCount > 0 ? 'Continue o Draft' : 'Monte seu elenco inicial',
          message: `Seu time tem ${squadSize}/15 jogadores. Escolha atletas ate completar uma base jogavel dentro do Score Maximo.`,
          status: `${draftCount} na wishlist`,
          consequence: state.world.currentDay <= 0
            ? 'Dia 0: monte a lista. Na proxima virada as disputas comecam a ser computadas.'
            : 'Dia 1: ultimo dia de ajustes. Na virada para o Dia 2, a liga resolve e completa elencos.',
        };
      }

      if (!isLineupReady) {
        return {
          eyebrow: 'ELENCO FORMADO',
          title: 'Monte sua escalacao',
          message: `Seu elenco tem ${squadSize} jogadores. Falta escolher os 11 titulares antes da temporada.`,
          status: `${lineupCount}/11 titulares`,
          consequence: 'Depois disso: defina o plano de jogo.',
        };
      }

      if (!isTacticReady) {
        return {
          eyebrow: 'ESCALACAO PRONTA',
          title: 'Defina o plano de jogo',
          message: 'Escolha estilo e mentalidade para o time entrar em campo com identidade clara.',
          status: 'Tatica pendente',
          consequence: 'Depois disso: a temporada pode abrir.',
        };
      }

      return {
        eyebrow: 'PRONTO',
        title: 'Pronto para temporada',
        message: 'Elenco, escalacao e tatica estao prontos. O mundo pode sair da pre-temporada.',
        status: `${totalPoints}/${powerCap} Score Maximo`,
        consequence: 'Depois disso: calendario, mercado e jogos entram no loop real.',
      };
    }

    if (todayPhase === 'matchday') {
      return {
        eyebrow: 'DIA DE JOGO',
        title: 'EM JOGO AGORA',
        message: nextMatchData?.opponent
          ? `Acompanhe ${userTeam?.name} contra ${nextMatchData.opponent.name} em tempo real.`
          : 'A partida do dia esta disponivel para acompanhar.',
        status: 'Ao vivo',
        consequence: 'Depois disso: resultado e impacto no elenco.',
      };
    }

    if (todayPhase === 'postgame') {
      return {
        eyebrow: 'POS-JOGO',
        title: 'Veja o impacto da rodada',
        message: 'Existe um resultado recente para revelar. Veja o relatorio antes de seguir para o proximo dia.',
        status: 'Relatorio pendente',
        consequence: 'Depois disso: tabela, forma e proximo compromisso ficam claros.',
      };
    }

    if (todayPhase === 'offseason') {
      return {
        eyebrow: 'OFFSEASON VIVA',
        title: 'Transicao curta, mundo continuo',
        message: joinWindowOpen
          ? `A temporada acabou, mas o mundo segue. Ha ${OFFSEASON_DAYS} dias de janela para ajustes, leitura do season report e entrada em clubes ate a rodada ${MIDSEASON_JOIN_MAX_ROUND}.`
          : 'A janela principal ja passou e o mundo esta alinhando a virada automatica para a proxima temporada.',
        status: `Dia ${Math.min(offseasonDay, OFFSEASON_DAYS)}/${OFFSEASON_DAYS} da offseason`,
        consequence: 'Depois disso: a nova temporada entra automaticamente sem resetar os clubes.',
      };
    }

    return {
      eyebrow: 'TEMPORADA',
      title: nextMatchData?.opponent ? 'Prepare o proximo compromisso' : 'Gerencie a rotina do clube',
      message: nextMatchData?.opponent
        ? `${nextMatchData.eventTitle}. ${nextMatchData.phase === 'before' ? 'Organize elenco e tatica antes do horario marcado.' : 'O proximo evento do clube ja esta disponivel na central.'}`
        : 'Use mercado, treino e tatica enquanto o calendario avanca pelo relogio.',
      status: nextMatchData?.opponent ? `${nextMatchData.isHome ? 'Casa' : 'Fora'} - ${nextMatchData.dateLabel}` : 'Calendario em andamento',
      consequence: 'Depois disso: quando o relogio chegar, a rodada acontece.',
    };
  })();

  const guidedTodayActions = (() => {
    if (isUnemployed) {
      const canSignSpotlight = !!spotlightOffer
        && spotlightOffer.status === 'ACCEPTED'
        && joinWindowOpen
        && (state.world.currentDay || 0) >= spotlightOffer.availableOnDay;
      return [
        {
          label: canSignSpotlight ? 'Assinar contrato' : 'Ver clubes',
          icon: canSignSpotlight ? CheckCircle2 : Shield,
          onClick: canSignSpotlight
            ? async () => {
              setActingOfferId(spotlightOffer!.id);
              try {
                await respondToClubOffer(spotlightOffer!.id, true);
              } finally {
                setActingOfferId(null);
              }
            }
            : onOpenTeam,
          primary: true,
          disabled: canSignSpotlight ? actingOfferId === spotlightOffer?.id : !onOpenTeam
        },
        { label: 'Ver liga', icon: Calendar, onClick: onOpenLeague, disabled: !onOpenLeague },
        { label: 'Mercado de tecnicos', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
      ];
    }

    if (todayPhase === 'preseason') {
      if (state.world.currentDay === -1) {
        return [
          { label: state.isCreator ? (isKickoffScheduled ? 'Inicio 00:00' : 'Agendar inicio') : (isKickoffScheduled ? 'Inicio 00:00' : 'Aguardar GM'), icon: Play, onClick: state.isCreator ? handleStartSeason : undefined, primary: true, disabled: !state.isCreator || isKickoffScheduled },
          { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
          { label: 'Ver Liga', icon: Calendar, onClick: onOpenLeague, disabled: !onOpenLeague },
        ];
      }

      if (!isSquadComplete) {
        return [
          { label: draftCount > 0 ? 'Continuar Draft' : 'Abrir Draft', icon: Rocket, onClick: onOpenDraft, primary: true, disabled: !onOpenDraft },
          { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
          { label: 'Ver Liga', icon: Calendar, onClick: onOpenLeague, disabled: !onOpenLeague },
        ];
      }

      if (!isLineupReady) {
        return [
          { label: 'Montar Escalacao', icon: Shield, onClick: onOpenLineup, primary: true, disabled: !onOpenLineup },
          { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
          { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
        ];
      }

      if (!isTacticReady) {
        return [
          { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, primary: true, disabled: !onOpenTactics },
          { label: 'Escalacao', icon: Shield, onClick: onOpenLineup, disabled: !onOpenLineup },
          { label: 'Ver Elenco', icon: Users, onClick: onOpenTeam, disabled: !onOpenTeam },
        ];
      }

      return [
        { label: state.isCreator ? (isKickoffScheduled ? 'Inicio 00:00' : 'Abrir Temporada') : (isKickoffScheduled ? 'Inicio 00:00' : 'Aguardar GM'), icon: Play, onClick: state.isCreator ? handleStartSeason : undefined, primary: true, disabled: !state.isCreator || isKickoffScheduled },
        { label: 'Escalacao', icon: Shield, onClick: onOpenLineup, disabled: !onOpenLineup },
        { label: 'Ajustar Tatica', icon: Brain, onClick: onOpenTactics, disabled: !onOpenTactics },
      ];
    }

    return todayActions;
  })();

  const homeNotice = React.useMemo(() => {
    const worldEvent = (state.notifications || []).find(notification =>
      !notification.read && (
        notification.id.startsWith('participant_') ||
        notification.id.startsWith('season_scheduled_') ||
        notification.id.startsWith('season_started_')
      )
    );

    if (worldEvent) {
      return {
        key: worldEvent.id,
        tone: worldEvent.type === 'success' ? 'emerald' : 'cyan',
        title: worldEvent.title,
        message: worldEvent.message,
      };
    }

    if (isUnemployed) {
      if (spotlightOffer?.status === 'ACCEPTED') {
        return {
          key: `offer-${spotlightOffer.id}`,
          tone: 'emerald',
          title: 'Contrato aceito',
          message: `${state.teams[spotlightOffer.teamId]?.name || 'Um clube'} deixou uma proposta viva para voce.`,
        };
      }
      return null;
    }

    if (todayPhase === 'postgame') {
      return {
        key: 'postgame-report',
        tone: 'amber',
        title: 'Relatorio disponivel',
        message: 'Tem jogo recente para abrir e ver impacto no clube.',
      };
    }

    if (todayPhase === 'matchday') {
      return {
        key: `matchday-${nextMatchData?.match?.id || state.world.currentDay}`,
        tone: 'cyan',
        title: 'Dia de jogo',
        message: nextMatchData?.opponent ? `${userTeam?.name} x ${nextMatchData.opponent.name}` : 'Partida do dia disponivel.',
      };
    }

    if (isPreseason && !isSquadComplete) {
      return {
        key: 'draft-open',
        tone: 'cyan',
        title: 'Draft aberto',
        message: `${squadSize}/15 no elenco. A aba Elenco esta marcada.`,
      };
    }

    if (isPreseason && isSquadComplete && !isLineupReady) {
      return {
        key: 'lineup-open',
        tone: 'amber',
        title: 'Escalacao incompleta',
        message: `${lineupCount}/11 titulares definidos.`,
      };
    }

    return null;
  }, [
    isUnemployed,
    spotlightOffer,
    state.notifications,
    state.teams,
    state.world.currentDay,
    todayPhase,
    nextMatchData,
    userTeam,
    isPreseason,
    isSquadComplete,
    squadSize,
    isLineupReady,
    lineupCount,
  ]);

  React.useEffect(() => {
    setDismissedNoticeKey(null);
  }, [homeNotice?.key]);

  const handleDismissHomeNotice = async () => {
    if (!homeNotice) return;
    setDismissedNoticeKey(homeNotice.key);

    if (
      homeNotice.key.startsWith('participant_') ||
      homeNotice.key.startsWith('season_scheduled_') ||
      homeNotice.key.startsWith('season_started_')
    ) {
      const nextState = {
        ...state,
        notifications: (state.notifications || []).map(notification =>
          notification.id === homeNotice.key ? { ...notification, read: true } : notification
        )
      };
      setState(nextState);
      await saveGame(nextState);
    }
  };

  const nextStepCards = React.useMemo(() => {
    if (isUnemployed) {
      return [
        {
          title: '1. Ler o inbox',
          detail: spotlightOffer
            ? spotlightOffer.note || 'Existe uma movimentacao aberta envolvendo seu nome.'
            : 'Sem resposta ainda. Fique de olho nas noticias e nas ofertas.',
          icon: Mail,
          accent: 'cyan'
        },
        {
          title: '2. Escolher destino',
          detail: joinWindowOpen ? 'Voce pode mandar proposta agora para um clube livre.' : 'Hoje voce entra na fila da proxima temporada.',
          icon: Shield,
          accent: joinWindowOpen ? 'emerald' : 'fuchsia'
        },
        {
          title: '3. Continuar acompanhando',
          detail: 'Mesmo sem clube, tabela, noticias e relatorios continuam valendo para sua leitura do mundo.',
          icon: Globe,
          accent: 'amber'
        }
      ];
    }

    if (todayPhase === 'preseason') {
      return [
        {
          title: !isSquadComplete ? '1. Feche o elenco' : !isLineupReady ? '1. Monte a escalacao' : !isTacticReady ? '1. Defina a tatica' : '1. Confirme a base',
          detail: !isSquadComplete
            ? 'Use o Draft para completar 15 jogadores.'
            : !isLineupReady
              ? 'Escolha os 11 titulares para o primeiro ciclo.'
              : !isTacticReady
                ? 'Escolha estilo e mentalidade para render melhor.'
                : 'Seu time esta pronto para sair da pre-temporada.',
          icon: !isSquadComplete ? Rocket : !isLineupReady ? Shield : Brain,
          accent: 'cyan'
        },
        {
          title: '2. Entenda o limite',
          detail: pointsLeft < 0 ? 'Seu score passou do teto. Ajuste antes de seguir.' : `${pointsLeft} pontos ainda livres dentro do teto.`,
          icon: Target,
          accent: pointsLeft < 0 ? 'rose' : 'fuchsia'
        },
        {
          title: '3. Abra o mundo',
          detail: state.isCreator ? 'Quando tudo estiver certo, o mundo entra no ciclo automatico.' : 'Aguarde o criador abrir a temporada e acompanhe a estreia.',
          icon: Play,
          accent: 'amber'
        }
      ];
    }

    if (todayPhase === 'offseason') {
      return [
        {
          title: '1. Leia o fechamento',
          detail: 'Confira o season report e os campeoes antes da virada.',
          icon: Newspaper,
          accent: 'cyan'
        },
        {
          title: '2. Ajuste o clube',
          detail: 'Treino e tatica contam logo no comeco da nova season.',
          icon: Brain,
          accent: 'fuchsia'
        },
        {
          title: '3. Aproveite a janela',
          detail: joinWindowOpen ? `Ainda da para entrar em clube ate a rodada ${MIDSEASON_JOIN_MAX_ROUND}.` : 'A janela principal de entrada ja fechou.',
          icon: Shield,
          accent: joinWindowOpen ? 'emerald' : 'slate'
        }
      ];
    }

    return [
      {
        title: '1. Veja o proximo impacto',
        detail: nextMatchData?.opponent ? `${nextMatchData.opponent.name} e o proximo gatilho do seu ciclo.` : 'Use a Home para identificar o proximo compromisso.',
        icon: Calendar,
        accent: 'cyan'
      },
      {
        title: '2. Melhore o rendimento',
        detail: 'Tatica, treino e lineup sao onde a gestao ativa vira vantagem.',
        icon: Brain,
        accent: 'fuchsia'
      },
      {
        title: '3. Acompanhe o mundo',
        detail: 'Feed, tabela e radar mostram o que mudou sem precisar caçar telas.',
        icon: Globe,
        accent: 'amber'
      }
    ];
  }, [
    isLineupReady,
    isSquadComplete,
    isTacticReady,
    joinWindowOpen,
    nextMatchData?.opponent,
    pointsLeft,
    state.isCreator,
    todayPhase
  ]);

  const seasonActionCards = React.useMemo(() => {
    if (!userTeam) return [];

    const squadPlayers = userTeam.squad
      .map(playerId => state.players[playerId])
      .filter(Boolean) as Player[];

    const recentAverage = (player: Player) => {
      const ratings = player.history.lastMatchRatings || [];
      if (ratings.length === 0) return player.history.averageRating || player.currentPhase || 0;
      return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    };

    const roleLabel = (role: Player['role']) => role === 'ZAG' ? 'DEFENSOR' : role;

    const risingPlayers = [...squadPlayers]
      .filter(player =>
        (player.history.seasonRatingDelta || 0) >= 6 ||
        (recentAverage(player) >= 7.3 && player.potential - player.totalRating >= 35)
      )
      .sort((a, b) => {
        const aScore = (a.history.seasonRatingDelta || 0) + Math.max(0, a.potential - a.totalRating) / 25;
        const bScore = (b.history.seasonRatingDelta || 0) + Math.max(0, b.potential - b.totalRating) / 25;
        return bScore - aScore;
      });

    const fallingPlayers = [...squadPlayers]
      .filter(player =>
        (player.history.seasonRatingDelta || 0) <= -4 ||
        recentAverage(player) < 5.25
      )
      .sort((a, b) => {
        const aScore = (a.history.seasonRatingDelta || 0) + recentAverage(a);
        const bScore = (b.history.seasonRatingDelta || 0) + recentAverage(b);
        return aScore - bScore;
      });

    const unhappyPlayers = [...squadPlayers]
      .filter(player => player.satisfaction <= 55 || (player.history.benchGamesCount || 0) >= 3)
      .sort((a, b) => {
        if (a.satisfaction !== b.satisfaction) return a.satisfaction - b.satisfaction;
        return (b.history.benchGamesCount || 0) - (a.history.benchGamesCount || 0);
      });

    const tiredPlayers = [...squadPlayers]
      .filter(player => player.fatigue >= 60)
      .sort((a, b) => b.fatigue - a.fatigue);

    const marketBudget = Math.max(0, reservedScoreLeft);
    const marketOpportunities = Object.values(state.players)
      .filter(player =>
        !player.contract.teamId &&
        player.district !== 'EXILADO' &&
        player.totalRating <= marketBudget &&
        player.potential - player.totalRating >= 60
      )
      .sort((a, b) => {
        const aUpside = a.potential - a.totalRating;
        const bUpside = b.potential - b.totalRating;
        if (aUpside !== bUpside) return bUpside - aUpside;
        return b.totalRating - a.totalRating;
      });

    const roleCounts = squadPlayers.reduce<Record<Player['role'], number>>((acc, player) => {
      acc[player.role] += 1;
      return acc;
    }, { GOL: 0, ZAG: 0, MEI: 0, ATA: 0 });
    const recommendedRoles: Record<Player['role'], number> = { GOL: 1, ZAG: 4, MEI: 4, ATA: 3 };
    const weakRole = (Object.keys(recommendedRoles) as Player['role'][])
      .find(role => roleCounts[role] < recommendedRoles[role]);

    const stableLabel = nextMatchData?.opponent
      ? `Proximo gatilho: ${nextMatchData.opponent.name}`
      : 'Sem alerta forte antes do proximo ciclo.';

    return [
      {
        key: 'rising',
        symbol: '+',
        title: 'Valorizar',
        count: risingPlayers.length,
        detail: risingPlayers[0]
          ? `${risingPlayers[0].nickname} pode render mais se tiver minutos.`
          : 'Ninguem explodindo agora.',
        meta: risingPlayers[0] ? `${roleLabel(risingPlayers[0].role)} / +${Math.max(0, risingPlayers[0].potential - risingPlayers[0].totalRating)} teto` : stableLabel,
        icon: TrendingUp,
        accent: 'emerald',
        actionLabel: 'Ver elenco',
        onClick: onOpenTeam,
      },
      {
        key: 'falling',
        symbol: '-',
        title: 'Queda',
        count: fallingPlayers.length,
        detail: fallingPlayers[0]
          ? `${fallingPlayers[0].nickname} vem perdendo impacto.`
          : 'Sem queda critica no elenco.',
        meta: fallingPlayers[0] ? `Media recente ${recentAverage(fallingPlayers[0]).toFixed(1)}` : 'Linha estavel',
        icon: TrendingDown,
        accent: 'rose',
        actionLabel: 'Ajustar',
        onClick: onOpenLineup,
      },
      {
        key: 'unhappy',
        symbol: '!',
        title: 'Vestiario',
        count: unhappyPlayers.length,
        detail: unhappyPlayers[0]
          ? `${unhappyPlayers[0].nickname} quer sinal de plano.`
          : 'Satisfacao sob controle.',
        meta: unhappyPlayers[0] ? `${unhappyPlayers[0].satisfaction}% satisfacao` : 'Sem pedido urgente',
        icon: AlertTriangle,
        accent: 'amber',
        actionLabel: 'Escalar',
        onClick: onOpenLineup,
      },
      {
        key: 'fatigue',
        symbol: '~',
        title: 'Carga',
        count: tiredPlayers.length,
        detail: tiredPlayers[0]
          ? `${tiredPlayers[0].nickname} precisa de respiro.`
          : 'Fisico limpo para o ciclo.',
        meta: tiredPlayers[0] ? `${tiredPlayers[0].fatigue}% fadiga` : 'Sem sobrecarga',
        icon: Activity,
        accent: 'cyan',
        actionLabel: 'Rodar time',
        onClick: onOpenLineup,
      },
      {
        key: 'market',
        symbol: '*',
        title: 'Radar',
        count: marketOpportunities.length,
        detail: marketOpportunities[0]
          ? `${marketOpportunities[0].nickname} cabe no teto e tem upside.`
          : weakRole
            ? `Falta profundidade em ${roleLabel(weakRole)}.`
            : 'Sem alvo obvio dentro do teto.',
        meta: marketOpportunities[0]
          ? `${marketOpportunities[0].totalRating} -> ${marketOpportunities[0].potential}`
          : `${marketBudget} score livre`,
        icon: Search,
        accent: 'fuchsia',
        actionLabel: 'Abrir mundo',
        onClick: onOpenLeague,
      },
    ];
  }, [
    nextMatchData?.opponent,
    onOpenLeague,
    onOpenLineup,
    onOpenTeam,
    reservedScoreLeft,
    state.players,
    userTeam
  ]);

  const seasonPanelItems = React.useMemo(() => {
    const phaseLabel = isPreseason
      ? 'Genesis'
      : isOffseason
        ? `Offseason D${Math.min(offseasonDay, OFFSEASON_DAYS)}`
        : state.world.phase === 'ELITE_CUP'
          ? 'Copa Elite'
          : `Rodada ${Math.max(1, state.world.currentRound || 1)}`;

    const recommendation = isUnemployed
      ? (spotlightOffer?.status === 'ACCEPTED'
        ? 'Assinar ou recusar proposta'
        : joinWindowOpen
          ? 'Pedir contrato a um clube'
          : 'Entrar na fila da proxima temporada')
      : todayPhase === 'preseason'
      ? (!isSquadComplete ? 'Fechar elenco' : !isLineupReady ? 'Montar escalacao' : !isTacticReady ? 'Definir tatica' : 'Abrir temporada')
      : todayPhase === 'offseason'
        ? 'Ler season report e ajustar base'
        : nextMatchData?.phase === 'after'
          ? 'Ver pos-jogo'
          : nextMatchData?.phase === 'live'
            ? 'Acompanhar partida'
            : nextMatchData?.phase === 'before'
              ? 'Preparar proximo jogo'
              : 'Ajustar tatica e treino';

    return [
      { label: 'Fase', value: phaseLabel, tone: 'text-cyan-300', icon: Trophy },
      { label: 'Mercado', value: state.world.transferWindowOpen ? 'Aberto' : 'Fechado', tone: state.world.transferWindowOpen ? 'text-emerald-300' : 'text-slate-300', icon: ShoppingCart },
      { label: 'Entrada', value: isUnemployed ? (joinWindowOpen ? 'Negociando agora' : 'Fila da prox temporada') : (joinWindowOpen ? `Livre ate R${MIDSEASON_JOIN_MAX_ROUND}` : 'Janela fechada'), tone: joinWindowOpen ? 'text-amber-300' : 'text-rose-300', icon: Shield },
      { label: 'Agora', value: recommendation, tone: 'text-fuchsia-300', icon: Brain },
    ];
  }, [
    isUnemployed,
    isPreseason,
    isOffseason,
    offseasonDay,
    spotlightOffer?.status,
    todayPhase,
    isSquadComplete,
    isLineupReady,
    isTacticReady,
    nextMatchData?.phase,
    state.world.currentRound,
    state.world.phase,
    state.world.transferWindowOpen,
    joinWindowOpen
  ]);

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

      {homeNotice && dismissedNoticeKey !== homeNotice.key && (
        <div className={`flex items-start gap-3 rounded-2xl border p-3 shadow-[0_14px_35px_rgba(0,0,0,0.28)] ${
          homeNotice.tone === 'emerald'
            ? 'border-emerald-400/25 bg-emerald-500/10'
            : homeNotice.tone === 'amber'
              ? 'border-amber-400/25 bg-amber-500/10'
              : 'border-cyan-400/25 bg-cyan-500/10'
        }`}>
          <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            homeNotice.tone === 'emerald'
              ? 'bg-emerald-300'
              : homeNotice.tone === 'amber'
                ? 'bg-amber-300'
                : 'bg-cyan-300'
          }`} />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white">{homeNotice.title}</p>
            <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-300">{homeNotice.message}</p>
          </div>
          <button
            type="button"
            onClick={handleDismissHomeNotice}
            className="rounded-full border border-white/10 bg-black/20 p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar aviso"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* CENTRAL DO DIA: game-state driven actions */}
      <div
        data-onboarding="home-gps"
        className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] glass-card-neon border-cyan-500/25 p-5 sm:p-8 shadow-[0_0_45px_rgba(6,182,212,0.12)]"
      >
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-[80px]" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="space-y-3 lg:flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-cyan-300">
                {guidedTodayCopy.eyebrow}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                {guidedTodayCopy.status}
              </span>
              {worldParticipants.length > 0 && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-emerald-200">
                  {worldParticipants.length} players / {humanParticipants.length} clubes / {observerParticipants.length} obs
                </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter text-white">
                {guidedTodayCopy.title}
              </h2>
              <p className="mt-2 max-w-2xl text-[11px] sm:text-sm font-bold leading-relaxed text-slate-400">
                {guidedTodayCopy.message}
              </p>
            </div>
            {isLobby && state.isCreator && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-100/70">Codigo do mundo</p>
                    <p className="mt-1 font-mono text-base sm:text-lg font-black tracking-[0.18em] text-white">{worldJoinCode}</p>
                    <p className="mt-1 text-[7px] font-bold uppercase tracking-widest text-cyan-100/45">
                      Use esse codigo para alguem entrar antes da temporada comecar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="shrink-0 rounded-xl border border-cyan-400/25 bg-black/30 p-3 text-cyan-100 transition hover:bg-cyan-400 hover:text-black"
                    title="Copiar codigo do mundo"
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:min-w-[420px] lg:max-w-[460px]">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-400/25 bg-gradient-to-br from-cyan-500/12 via-black/30 to-fuchsia-500/10 p-4 sm:p-5">
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-[60px]" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">
                      <Target size={13} />
                      {isUnemployed ? 'Status do tecnico' : 'Score do Clube'}
                    </div>
                    <p className="mt-2 text-3xl font-black italic tracking-tighter text-white">
                      {isUnemployed ? `${userClubOffers.length}` : `${occupiedScore.toLocaleString()} / ${powerCap.toLocaleString()}`}
                    </p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                      {isUnemployed
                        ? `${userClubOffers.filter(offer => ['PENDING', 'ACCEPTED', 'WAITING_NEXT_SEASON'].includes(offer.status)).length} negociacoes vivas`
                        : `${totalPoints.toLocaleString()} no elenco${pendingDraftScore > 0 ? ` + ${pendingDraftScore.toLocaleString()} reservado no draft` : ' / nada reservado'}`}
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-3 py-2 text-right ${
                    reservedScoreLeft >= 0
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                      : 'border-rose-400/25 bg-rose-500/10 text-rose-200'
                  }`}>
                    <p className="text-[7px] font-black uppercase tracking-[0.18em] opacity-70">{isUnemployed ? 'Janela' : 'Livre'}</p>
                    <p className="text-xl font-black italic">{isUnemployed ? (joinWindowOpen ? 'ABERTA' : 'FECHADA') : `${reservedScoreLeft >= 0 ? '+' : ''}${reservedScoreLeft.toLocaleString()}`}</p>
                  </div>
                </div>
                {isUnemployed ? (
                  <p className="mt-4 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                    Sem clube voce acompanha o mundo, le o inbox e escolhe o melhor timing para entrar.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 h-3 overflow-hidden rounded-full border border-white/10 bg-black/45">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${reservedScoreLeft >= 0 ? 'bg-cyan-400' : 'bg-rose-500'}`}
                        style={{ width: `${occupiedScorePercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                      Proposta pendente segura score ate aceitar ou recusar.
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">
                    <Clock size={13} />
                    Próximo Evento
                  </div>
                  {isUnemployed ? (
                    <>
                      <div className="mt-3 text-lg sm:text-xl font-black uppercase italic tracking-tight text-white">
                        {spotlightOffer?.status === 'ACCEPTED'
                          ? `${state.teams[spotlightOffer.teamId]?.name || 'Um clube'} quer fechar`
                          : joinWindowOpen
                            ? 'Mercado de tecnicos aberto'
                            : 'Fila da proxima temporada'}
                      </div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {spotlightOffer?.note || (joinWindowOpen ? 'Use a aba de clubes para enviar proposta' : 'Voce pode escolher destinos e esperar a proxima virada')}
                      </div>
                      <div className="mt-2 text-sm sm:text-base font-black text-cyan-300">
                        {joinWindowOpen ? 'Resposta nunca sai na hora' : 'Pedidos novos ficam enfileirados'}
                      </div>
                    </>
                  ) : nextMatchData?.opponent ? (
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
                        {firstUserMatch ? 'Calendario pronto' : 'Nenhum evento carregado'}
                      </div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {firstUserMatch
                          ? 'A tabela ja existe. A contagem comeca quando o GM abrir a temporada.'
                          : 'O calendario real sera exibido aqui assim que houver partida'}
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

          </div>
        </div>
      </div>

      {isUnemployed && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.9rem] border border-cyan-400/20 bg-black/30 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-cyan-300" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">Inbox de propostas</h3>
            </div>
            <div className="mt-4 space-y-3">
              {userClubOffers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Nenhuma proposta no momento.</p>
                </div>
              ) : (
                userClubOffers.slice(0, 3).map((offer) => {
                  const team = state.teams[offer.teamId];
                  if (!team) return null;
                  const canSign = offer.status === 'ACCEPTED' && joinWindowOpen && (state.world.currentDay || 0) >= offer.availableOnDay;
                  return (
                    <div key={offer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.24em] text-cyan-200">{team.district}</p>
                          <h4 className="mt-1 text-lg font-black uppercase italic tracking-tight text-white">{team.name}</h4>
                          <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-white/35">{offer.note || 'Sem detalhe adicional.'}</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[7px] font-black uppercase tracking-[0.22em] text-white/60">
                          {offer.status === 'ACCEPTED' ? 'Aceita' : offer.status === 'PENDING' ? 'Pendente' : offer.status === 'WAITING_NEXT_SEASON' ? 'Fila' : offer.status}
                        </div>
                      </div>
                      {(offer.status === 'ACCEPTED' || offer.status === 'PENDING' || offer.status === 'WAITING_NEXT_SEASON') && (
                        <div className="mt-3 flex gap-2">
                          {offer.status === 'ACCEPTED' && (
                            <button
                              type="button"
                              onClick={async () => {
                                setActingOfferId(offer.id);
                                try {
                                  await respondToClubOffer(offer.id, true);
                                } finally {
                                  setActingOfferId(null);
                                }
                              }}
                              disabled={!canSign || actingOfferId === offer.id}
                              className={`flex-1 rounded-xl px-3 py-3 text-[8px] font-black uppercase tracking-[0.24em] transition ${
                                canSign
                                  ? 'border border-emerald-400/35 bg-emerald-400 text-black hover:bg-emerald-300'
                                  : 'cursor-not-allowed border border-white/10 bg-white/[0.04] text-white/30'
                              }`}
                            >
                              <Check size={13} className="mx-auto mb-1" />
                              {canSign ? 'Assinar' : 'No timing certo'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={async () => {
                              setActingOfferId(offer.id);
                              try {
                                await respondToClubOffer(offer.id, false);
                              } finally {
                                setActingOfferId(null);
                              }
                            }}
                            disabled={actingOfferId === offer.id}
                            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[8px] font-black uppercase tracking-[0.24em] text-white/60 transition hover:bg-white/[0.07]"
                          >
                            <XCircle size={13} className="mx-auto mb-1" />
                            Recusar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-white/10 bg-black/25 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">Clubes em destaque</h3>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/30">atalho para escolher melhor o proximo destino</p>
              </div>
              <button
                type="button"
                onClick={onOpenTeam}
                disabled={!onOpenTeam}
                className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-[0.22em] text-cyan-100 transition hover:bg-cyan-500/18 disabled:opacity-35"
              >
                Ver todos
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {clubOpportunityCards.map(({ team, squadScore, league, existingOffer }) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={onOpenTeam}
                  disabled={!onOpenTeam}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:bg-white/[0.05] disabled:opacity-35"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <TeamLogo
                        primaryColor={team.logo?.primary || team.colors.primary || '#fff'}
                        secondaryColor={team.logo?.secondary || team.colors.secondary || '#111'}
                        accentColor={team.logo?.accent}
                        shapeId={team.logo?.shapeId}
                        patternId={(team.logo?.patternId || 'none') as any}
                        symbolId={team.logo?.symbolId || 'Shield'}
                        size={38}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-[0.22em] text-cyan-200">
                        {team.district} {league ? `- ${league.position}o ${league.name}` : ''}
                      </p>
                      <h4 className="mt-1 truncate text-lg font-black uppercase italic tracking-tight text-white">{team.name}</h4>
                      <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-white/35">
                        score atual {squadScore} {existingOffer ? `- ${existingOffer.status.toLowerCase()}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {isFirstMatchFlow && nextMatchData?.opponent && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-white/[0.035] to-cyan-500/10 p-5 shadow-[0_0_35px_rgba(245,158,11,0.10)]">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-12 -translate-y-12 rounded-full bg-amber-400/10 blur-[70px]" />
          <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[8px] font-black uppercase tracking-[0.26em] text-amber-200">
                  Primeira partida
                </span>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/45">
                  {firstMatchStage === 'preview' ? 'Pre-jogo' : firstMatchStage === 'live' ? 'Ao vivo' : 'Relatorio'}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl">
                  {firstMatchStage === 'preview'
                    ? 'Seu primeiro teste real'
                    : firstMatchStage === 'live'
                      ? 'O jogo comecou'
                      : 'Entenda o que aconteceu'}
                </h3>
                <p className="mt-2 max-w-2xl text-xs font-bold leading-relaxed text-slate-400 sm:text-sm">
                  {firstMatchStage === 'preview'
                    ? `Antes de enfrentar o ${nextMatchData.opponent.name}, confira escalação e tática. Depois do apito final, o relatório mostra placar, melhores em campo e impacto nos atletas.`
                    : firstMatchStage === 'live'
                      ? `Acompanhe ${userTeam?.name} contra ${nextMatchData.opponent.name}. O relatório ao vivo mostra eventos, posse, finalizações e gols conforme a partida avança.`
                      : `Abra o pós-jogo contra ${nextMatchData.opponent.name}. Esse é o primeiro retorno real de elenco, tática e ratings da sua temporada.`}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Seu score</p>
                  <p className="mt-1 text-2xl font-black italic text-cyan-300">{nextMatchData.userPower}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Adversario</p>
                  <p className="mt-1 text-2xl font-black italic text-amber-300">{nextMatchData.opponentPower}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Local</p>
                  <p className="mt-1 text-sm font-black uppercase italic text-white">{nextMatchData.isHome ? 'Casa' : 'Fora'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-black/30 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.24em] text-white/35">Contra</p>
                  <p className="truncate text-xl font-black uppercase italic tracking-tight text-white">{nextMatchData.opponent.name}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-200">{nextMatchData.dateLabel}</p>
                </div>
                {nextMatchData.opponent.logo && (
                  <TeamLogo
                    primaryColor={nextMatchData.opponent.logo.primary}
                    secondaryColor={nextMatchData.opponent.logo.secondary}
                    accentColor={nextMatchData.opponent.logo.accent}
                    shapeId={nextMatchData.opponent.logo.shapeId}
                    patternId={nextMatchData.opponent.logo.patternId as any}
                    symbolId={nextMatchData.opponent.logo.symbolId}
                    secondarySymbolId={nextMatchData.opponent.logo.secondarySymbolId}
                    size={56}
                  />
                )}
              </div>
              <button
                type="button"
                data-onboarding="today-primary-action"
                onClick={nextMatchData.ctaAction || (() => setSelectedMatchReport(nextMatchData.match))}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-black shadow-[0_0_24px_rgba(245,158,11,0.22)] transition hover:bg-amber-300 active:scale-95"
              >
                <nextMatchData.ctaIcon size={15} />
                {firstMatchStage === 'preview' ? 'Preparar estreia' : firstMatchStage === 'live' ? 'Acompanhar jogo' : 'Ver pos-jogo'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {firstUserMatch ? 'Calendario pronto' : 'Calendario em preparacao'}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    {firstUserMatch
                      ? 'Partidas planejadas. A temporada aguarda o inicio do GM.'
                      : 'Termine a fase atual para gerar o proximo compromisso'}
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





