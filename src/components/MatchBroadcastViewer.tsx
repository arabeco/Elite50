import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleDot, Clock, Pause, Play, Radio, Shield, Target, Volume2, VolumeX, Zap } from 'lucide-react';
import { Match, Player, Team } from '../types';
import { getMatch2DTeamColor } from '../utils/match2D';
import { buildNativeMatch2DPlays } from '../engine/match2DPlayEngine';
import { COMMENTARY_LIBRARY, commentaryChoice, getPassCommentary } from '../engine/matchCommentary';
import { TeamLogo } from './TeamLogo';
import { getFallbackTeamLogoAssetPath } from '../utils/teamIdentity';

type Props = {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  players: Record<string, Player>;
  onPlayerClick?: (player: Player) => void;
  onTeamClick?: (teamId: string) => void;
};

type Beat = { text: string; keywords: string[]; pressure: number; danger: number; outcome?: boolean; possessionTeamId?: string; looseBall?: boolean };
type BroadcastPlay = { id: string; minute: number; type: string; teamId: string; scorerId?: string; homeScore: number; awayScore: number; beats: Beat[] };

const hash = (value: string) => [...value].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 7) >>> 0;
const choose = <T,>(seed: string, values: T[]) => values[hash(seed) % values.length];
const nameOf = (player?: Player) => player?.nickname || player?.name || 'um jogador';
const teamColor = (team: Team, fallback: string) => getMatch2DTeamColor(team, fallback);

let crowdAudioContext: AudioContext | null = null;

const getCrowdAudioContext = () => {
  if (crowdAudioContext) return crowdAudioContext;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  crowdAudioContext = AudioContextClass ? new AudioContextClass() : null;
  return crowdAudioContext;
};

const unlockCrowdAudio = () => {
  const context = getCrowdAudioContext();
  if (context?.state === 'suspended') void context.resume();
};

const playCrowdRoar = () => {
  const context = getCrowdAudioContext();
  if (!context || context.state !== 'running') return;
  const duration = 2.8;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * duration), context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    const time = index / context.sampleRate;
    const envelope = Math.min(1, time * 5) * Math.max(0, 1 - Math.max(0, time - 1.7) / 1.1);
    channel[index] = (Math.random() * 2 - 1) * envelope;
  }
  const source = context.createBufferSource();
  const band = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  band.type = 'bandpass';
  band.frequency.value = 720;
  band.Q.value = 0.55;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.18);
  gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + duration);
  source.connect(band).connect(gain).connect(context.destination);
  source.start();
  source.stop(context.currentTime + duration);
};

const logoProps = (team: Team) => ({
  primaryColor: team.logo?.primary || team.colors?.primary || '#22d3ee',
  secondaryColor: team.logo?.secondary || team.colors?.secondary || '#0f172a',
  accentColor: team.logo?.accent || '#f8fafc',
  shapeId: team.logo?.shapeId,
  patternId: (team.logo?.patternId || 'solid') as any,
  assetPath: team.logo?.assetPath || getFallbackTeamLogoAssetPath(team),
  symbolId: team.logo?.symbolId?.startsWith('asset:') ? team.logo.symbolId : `asset:${team.logo?.assetPath || getFallbackTeamLogoAssetPath(team)}`,
  secondarySymbolId: team.logo?.secondarySymbolId,
});

const buildBroadcast = (match: Match, home: Team, away: Team, players: Record<string, Player>): BroadcastPlay[] => {
  const highlights = buildNativeMatch2DPlays(match, home, away, players);
  return highlights.map(highlight => {
    const attacking = highlight.teamId === home.id ? home : away;
    const defending = attacking.id === home.id ? away : home;
    const direction = attacking.id === home.id ? 1 : -1;
    const scorer = players[highlight.event.playerId || ''];
    const creator = players[highlight.event.assistantId || ''] || scorer;
    const defenders = (defending.squad || []).map(id => players[id]).filter(Boolean);
    const marker = defenders[hash(`${highlight.id}:marker`) % Math.max(1, defenders.length)];
    const passCopy = getPassCommentary(highlight.id, attacking.tactics?.playStyle || 'Equilibrado', false);
    const dribble = commentaryChoice(`${highlight.id}:dribble`, COMMENTARY_LIBRARY.dribble);
    const foot = choose(`${highlight.id}:foot`, ['de direita', 'de esquerda']);
    const shot = choose(`${highlight.id}:shot`, ['forte', 'colocado', 'de primeira', 'cruzado']);
    const corner = choose(`${highlight.id}:corner`, ['canto esquerdo', 'canto direito', 'centro alto']);
    const height = choose(`${highlight.id}:height`, ['rasteiro', 'a meia altura', 'no alto']);
    const style = attacking.tactics?.playStyle || 'Equilibrado';
    const startPosition = 50 + direction * choose(`${highlight.id}:start`, [4, 7, 10, 13]);
    const firstAdvance = 50 + direction * choose(`${highlight.id}:advance`, [12, 16, 20]);
    const recyclePosition = 50 + direction * choose(`${highlight.id}:recycle`, [5, 8, 11]);
    const finalThird = 50 + direction * choose(`${highlight.id}:third`, [27, 31, 35]);
    const shotPosition = 50 + direction * choose(`${highlight.id}:shot-position`, [40, 43, 46]);
    const shouldRecycle = ['Tiki-Taka', 'Motor Lento', 'Catenaccio', 'Retranca Armada'].includes(style) || hash(`${highlight.id}:recycle-roll`) % 3 === 0;

    if (highlight.type === 'MISTAKE') {
      return {
        id: highlight.id, minute: highlight.minute, type: highlight.type, teamId: highlight.teamId,
        homeScore: highlight.homeScore, awayScore: highlight.awayScore,
        beats: [
          { text: `${attacking.name} tenta sair jogando.`, keywords: ['CONSTRUCAO', style], pressure: startPosition, danger: 10, possessionTeamId: attacking.id },
          { text: `${nameOf(creator)} erra o passe sob pressao.`, keywords: ['PASSE ERRADO', 'PERDA'], pressure: firstAdvance, danger: 24, looseBall: true },
          { text: `${defending.name} antecipa e recupera a posse.`, keywords: ['INTERCEPTACAO', 'TROCA DE POSSE'], pressure: firstAdvance, danger: 34, outcome: true, possessionTeamId: defending.id },
        ],
      };
    }

    if (highlight.type === 'FOUL' || highlight.type === 'CARD_YELLOW' || highlight.type === 'CARD_RED') {
      const cardKeyword = highlight.type === 'CARD_RED' ? 'VERMELHO' : highlight.type === 'CARD_YELLOW' ? 'AMARELO' : 'FALTA';
      return {
        id: highlight.id, minute: highlight.minute, type: highlight.type, teamId: highlight.teamId,
        homeScore: highlight.homeScore, awayScore: highlight.awayScore,
        beats: [
          { text: `${nameOf(scorer)} progride com a bola.`, keywords: ['CONDUCAO'], pressure: firstAdvance, danger: 25, possessionTeamId: attacking.id },
          { text: `${nameOf(creator)} chega atrasado e derruba ${nameOf(scorer)}.`, keywords: ['FALTA', 'JOGO PARADO'], pressure: firstAdvance, danger: 18, looseBall: true },
          { text: highlight.type === 'FOUL' ? `${attacking.name} prepara a cobranca.` : `O arbitro mostra o cartao para ${nameOf(creator)}.`, keywords: [cardKeyword], pressure: firstAdvance, danger: 22, outcome: true, possessionTeamId: attacking.id },
        ],
      };
    }

    if (highlight.type === 'OFFSIDE') {
      return {
        id: highlight.id, minute: highlight.minute, type: highlight.type, teamId: highlight.teamId,
        homeScore: highlight.homeScore, awayScore: highlight.awayScore,
        beats: [
          { text: `${nameOf(creator)} procura a corrida de ${nameOf(scorer)}.`, keywords: ['BOLA EM PROFUNDIDADE'], pressure: finalThird, danger: 52, possessionTeamId: attacking.id },
          { text: `${nameOf(scorer)} parte antes da linha defensiva.`, keywords: ['IMPEDIMENTO'], pressure: shotPosition, danger: 0, looseBall: true },
          { text: `${defending.name} fica com a cobranca.`, keywords: ['TROCA DE POSSE'], pressure: shotPosition, danger: 0, outcome: true, possessionTeamId: defending.id },
        ],
      };
    }

    if (highlight.type === 'COUNTER') {
      const counterPass = getPassCommentary(`${highlight.id}:counter`, 'Vertical', false);
      return {
        id: highlight.id, minute: highlight.minute, type: highlight.type, teamId: highlight.teamId,
        homeScore: highlight.homeScore, awayScore: highlight.awayScore,
        beats: [
          { text: `${attacking.name} recupera e encontra campo aberto.`, keywords: ['CONTRA-ATAQUE', 'RECUPERACAO'], pressure: startPosition, danger: 24, possessionTeamId: attacking.id },
          { text: `${nameOf(creator)} aciona ${nameOf(scorer)} ${counterPass.phrase}.`, keywords: counterPass.keywords, pressure: finalThird, danger: 57, possessionTeamId: attacking.id },
          { text: `${defending.name} recompõe e fecha o caminho do gol.`, keywords: ['RECOMPOSICAO'], pressure: finalThird, danger: 26, outcome: true, possessionTeamId: attacking.id },
        ],
      };
    }

    const beats: Beat[] = [
      { text: `${attacking.name} recupera a bola no setor central.`, keywords: ['POSSE', style], pressure: startPosition, danger: 12, possessionTeamId: attacking.id },
      { text: `${nameOf(creator)} conduz, procura opcao e espera o bloco aproximar.`, keywords: ['CONDUCAO', 'APOIO'], pressure: startPosition, danger: 15, possessionTeamId: attacking.id },
    ];

    if (shouldRecycle) {
      beats.push(
        { text: `${nameOf(creator)} nao encontra espaco e devolve a bola para tras.`, keywords: ['RECUO', 'SEM ESPACO'], pressure: recyclePosition, danger: 5, possessionTeamId: attacking.id },
        { text: `${attacking.name} circula a posse no mesmo setor.`, keywords: ['CIRCULACAO', style], pressure: recyclePosition, danger: 7, possessionTeamId: attacking.id },
      );
    }

    beats.push(
      { text: `${nameOf(creator)} encontra ${nameOf(scorer)} ${passCopy.phrase}.`, keywords: ['PASSE', ...passCopy.keywords], pressure: firstAdvance, danger: 28, possessionTeamId: attacking.id },
      { text: `${nameOf(scorer)} ${dribble} diante de ${nameOf(marker)} e ganha espaco.`, keywords: ['DRIBLE', 'ULTIMO TERCO'], pressure: finalThird, danger: 58, possessionTeamId: attacking.id },
      { text: `${nameOf(scorer)} finaliza ${foot}: chute ${shot}, ${height}, buscando o ${corner}.`, keywords: ['FINALIZACAO', shot.toUpperCase(), corner.toUpperCase()], pressure: shotPosition, danger: 92, looseBall: true },
    );

    if (highlight.type === 'GOAL') beats.push({ text: `A bola entra no ${corner}, ${height}. Gol de ${nameOf(scorer)}!`, keywords: ['GOL', nameOf(scorer).toUpperCase()], pressure: 50 + direction * 49, danger: 100, outcome: true, looseBall: true });
    else if (highlight.type === 'WOODWORK') beats.push({ text: `A bola acerta a trave e volta para a entrada da area.`, keywords: ['NA TRAVE', 'REBOTE'], pressure: 50 + direction * 31, danger: 76, outcome: true, looseBall: true });
    else if (highlight.type === 'BLOCKED') beats.push({ text: `${nameOf(marker)} se joga na frente, bloqueia e afasta a bola.`, keywords: ['BLOQUEIO', nameOf(marker).toUpperCase()], pressure: 50 + direction * 13, danger: 18, outcome: true, possessionTeamId: defending.id });
    else if (hash(`${highlight.id}:chance-outcome`) % 2 === 0) {
      beats.push(
        { text: `O chute passa pelo ${corner} e sai pela linha de fundo.`, keywords: ['PARA FORA', corner.toUpperCase()], pressure: 50 + direction * 49, danger: 82, looseBall: true },
        { text: `${defending.name} fica com a bola para cobrar o tiro de meta.`, keywords: ['TIRO DE META', 'POSSE'], pressure: 50 + direction * 43, danger: 0, outcome: true, possessionTeamId: defending.id },
      );
    } else beats.push({ text: `O goleiro fecha o ${corner}, segura e encerra o ataque.`, keywords: ['DEFESA', corner.toUpperCase()], pressure: 50 - direction * 7, danger: 0, outcome: true, possessionTeamId: defending.id });

    return { id: highlight.id, minute: highlight.minute, type: highlight.type, teamId: highlight.teamId, scorerId: highlight.event.playerId, homeScore: highlight.homeScore, awayScore: highlight.awayScore, beats };
  });
};

const eventIcon = (type: string) => type === 'GOAL' ? <CircleDot size={17} /> : type === 'BLOCKED' ? <Shield size={17} /> : type === 'WOODWORK' ? <Zap size={17} /> : <Target size={17} />;

export const MatchBroadcastViewer: React.FC<Props> = ({ match, homeTeam, awayTeam, players, onPlayerClick, onTeamClick }) => {
  const plays = useMemo(() => buildBroadcast(match, homeTeam, awayTeam, players), [match, homeTeam, awayTeam, players]);
  const [playIndex, setPlayIndex] = useState(0);
  const [beatIndex, setBeatIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [interlude, setInterlude] = useState(false);
  const [clockSeconds, setClockSeconds] = useState((plays[0]?.minute || 0) * 60);
  const playedGoalSoundRef = useRef<string | null>(null);
  const play = plays[playIndex];
  const beat = play?.beats[Math.min(beatIndex, (play?.beats.length || 1) - 1)];
  const isGoal = play?.type === 'GOAL' && beat?.outcome;
  const beforeGoal = play?.type === 'GOAL' && !isGoal;
  const homeScore = (play?.homeScore || 0) - (beforeGoal && play.teamId === homeTeam.id ? 1 : 0);
  const awayScore = (play?.awayScore || 0) - (beforeGoal && play.teamId === awayTeam.id ? 1 : 0);
  const homeColor = teamColor(homeTeam, '#22d3ee');
  const awayColor = teamColor(awayTeam, '#a3e635');
  const possessionColor = beat?.looseBall ? '#ffffff' : beat?.possessionTeamId === homeTeam.id ? homeColor : beat?.possessionTeamId === awayTeam.id ? awayColor : '#ffffff';
  const dangerLabel = beat?.danger >= 75 ? 'Perigo maximo' : beat?.danger >= 45 ? 'Ataque perigoso' : beat?.danger >= 20 ? 'Progressao' : 'Controle';

  const liveStats = useMemo(() => {
    let homeControl = 24;
    let awayControl = 24;
    let homeShots = 0;
    let awayShots = 0;
    plays.forEach((item, index) => {
      if (index > playIndex) return;
      const visibleBeats = index < playIndex ? item.beats : item.beats.slice(0, beatIndex + 1);
      visibleBeats.forEach(itemBeat => {
        const weight = 1 + itemBeat.danger / 35;
        if (itemBeat.possessionTeamId === homeTeam.id || (!itemBeat.looseBall && item.teamId === homeTeam.id)) homeControl += weight;
        if (itemBeat.possessionTeamId === awayTeam.id || (!itemBeat.looseBall && item.teamId === awayTeam.id)) awayControl += weight;
      });
      const shotVisible = index < playIndex || visibleBeats.some(itemBeat => itemBeat.keywords.includes('FINALIZACAO'));
      if (shotVisible) {
        if (item.teamId === homeTeam.id) homeShots += 1;
        else awayShots += 1;
      }
    });
    const homePossession = Math.round(100 * homeControl / Math.max(1, homeControl + awayControl));
    return { homePossession, awayPossession: 100 - homePossession, homeShots, awayShots };
  }, [awayTeam.id, beatIndex, homeTeam.id, playIndex, plays]);

  useEffect(() => {
    setBeatIndex(0);
    setClockSeconds((plays[playIndex]?.minute || 0) * 60);
  }, [playIndex, plays]);
  useEffect(() => {
    if (!interlude && play) setClockSeconds(play.minute * 60 + beatIndex * 7);
  }, [beatIndex, interlude, play]);
  useEffect(() => {
    if (!isGoal || !soundEnabled || playedGoalSoundRef.current === play?.id) return;
    playedGoalSoundRef.current = play.id;
    playCrowdRoar();
  }, [isGoal, play?.id, soundEnabled]);
  useEffect(() => {
    if (!playing || !play || !beat) return;
    if (interlude) {
      const nextPlay = plays[playIndex + 1];
      if (!nextPlay) {
        setPlaying(false);
        setInterlude(false);
        return;
      }
      const start = clockSeconds;
      const end = nextPlay.minute * 60;
      let tick = 0;
      const totalTicks = 24;
      const timer = window.setInterval(() => {
        tick += 1;
        setClockSeconds(Math.round(start + (end - start) * (tick / totalTicks)));
        if (tick >= totalTicks) {
          window.clearInterval(timer);
          setInterlude(false);
          setPlayIndex(value => value + 1);
        }
      }, 90);
      return () => window.clearInterval(timer);
    }
    const timer = window.setTimeout(() => {
      if (beatIndex < play.beats.length - 1) setBeatIndex(value => value + 1);
      else if (playIndex < plays.length - 1) setInterlude(true);
      else setPlaying(false);
    }, beat.outcome ? (isGoal ? 3000 : 2200) : 1900);
    return () => window.clearTimeout(timer);
  }, [beat, beatIndex, interlude, isGoal, play, playIndex, playing, plays]);

  if (!play || !beat) return <div className="grid h-full place-items-center bg-slate-950 text-xs font-black uppercase text-white/35">Sem lances</div>;
  const attackingTeam = play.teamId === homeTeam.id ? homeTeam : awayTeam;
  const defendingTeam = attackingTeam.id === homeTeam.id ? awayTeam : homeTeam;
  const scoringPlayer = players[play.scorerId || ''];
  const celebrationPrimary = teamColor(attackingTeam, '#22d3ee');
  const celebrationSecondary = attackingTeam.logo?.secondary || attackingTeam.colors?.secondary || '#f8fafc';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#060912] text-white">
      <div className="border-b border-white/10 bg-black/35 p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => onTeamClick?.(homeTeam.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><TeamLogo {...logoProps(homeTeam)} size={34} /><span className="truncate text-[10px] font-black uppercase">{homeTeam.name}</span></button>
          <div className={`rounded-xl border px-5 py-2 text-2xl font-black tabular-nums ${isGoal ? 'goal-score-impact border-white bg-white text-black' : 'border-white/10 bg-white/5'}`}>{homeScore} <span className="opacity-30">-</span> {awayScore}</div>
          <button type="button" onClick={() => onTeamClick?.(awayTeam.id)} className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right"><span className="truncate text-[10px] font-black uppercase">{awayTeam.name}</span><TeamLogo {...logoProps(awayTeam)} size={34} /></button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-wider text-white/45">
          <span>Posse {liveStats.homePossession}% - {liveStats.awayPossession}%</span>
          <span className="h-3 w-px bg-white/10" />
          <span>Finalizacoes {liveStats.homeShots} - {liveStats.awayShots}</span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-5 py-8 sm:px-10">
        {isGoal && (
          <div
            className="goal-celebration-overlay"
            style={{ '--goal-primary': celebrationPrimary, '--goal-secondary': celebrationSecondary } as React.CSSProperties}
          >
            <div className="goal-color-pulse" />
            {Array.from({ length: 22 }, (_, index) => (
              <span
                key={index}
                className={`goal-particle ${index % 3 === 0 ? 'goal-particle-diamond' : ''}`}
                style={{
                  '--particle-left': `${4 + (hash(`${play.id}:particle:${index}`) % 92)}%`,
                  '--particle-delay': `${(index % 8) * 0.08}s`,
                  '--particle-duration': `${1.4 + (index % 5) * 0.18}s`,
                  '--particle-color': index % 2 === 0 ? celebrationPrimary : celebrationSecondary,
                } as React.CSSProperties}
              />
            ))}
            <div className="goal-emblem">
              <TeamLogo {...logoProps(attackingTeam)} size={82} />
              <span className="goal-kicker">{attackingTeam.name}</span>
              <strong>GOL</strong>
              <span>{nameOf(scoringPlayer)}</span>
            </div>
          </div>
        )}
        <div className="mb-8 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
          <span className="flex items-center gap-2 text-cyan-200"><Radio size={15} className="animate-pulse" /> Ao vivo</span>
          <span className="rounded-full border border-white/10 px-3 py-2 tabular-nums text-white/65">{Math.floor(clockSeconds / 60)}'{String(clockSeconds % 60).padStart(2, '0')}"</span>
        </div>

        {interlude ? (
          <div className="flex min-h-[260px] flex-1 items-center justify-center">
            <div className="flex items-center gap-3 text-5xl font-black tabular-nums text-white/80"><Clock size={30} className="text-cyan-300" />{Math.floor(clockSeconds / 60)}:{String(clockSeconds % 60).padStart(2, '0')}</div>
          </div>
        ) : <>
        <div className="relative mb-10 h-5 overflow-visible rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-1/2 opacity-70" style={{ background: `linear-gradient(90deg, ${homeColor}, transparent)` }} />
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-70" style={{ background: `linear-gradient(270deg, ${awayColor}, transparent)` }} />
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-white/40" />
          <div className="absolute top-1/2 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-all duration-700" style={{ left: `${beat.pressure}%`, width: `${18 + beat.danger * 0.55}%`, maxWidth: '52%', backgroundColor: possessionColor, opacity: 0.08 + beat.danger / 250 }} />
          <div className="absolute top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-slate-950 text-slate-950 transition-all duration-1000" style={{ left: `${beat.pressure}%`, backgroundColor: possessionColor, boxShadow: `0 0 18px ${possessionColor}` }}><CircleDot size={15} /></div>
        </div>
        <div className="-mt-7 mb-9 grid grid-cols-3 text-[8px] font-black uppercase tracking-wider text-white/35"><span>{homeTeam.name}</span><span className="text-center">{dangerLabel} · {beat.danger}</span><span className="text-right">{awayTeam.name}</span></div>

        <div className={`border-l-2 pl-5 transition ${isGoal ? 'border-emerald-300' : 'border-white/15'}`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {beat.keywords.map(keyword => <span key={keyword} className={`rounded px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isGoal ? 'bg-emerald-300 text-black' : 'bg-white/10 text-white/65'}`}>{keyword}</span>)}
          </div>
          <p className={`max-w-3xl text-xl font-black leading-snug sm:text-3xl ${isGoal ? 'text-emerald-200' : 'text-white'}`}>{beat.text}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider" style={{ color: beat.possessionTeamId === homeTeam.id ? homeColor : beat.possessionTeamId === awayTeam.id ? awayColor : '#ffffff' }}>{eventIcon(play.type)} {beat.looseBall ? 'Bola em movimento' : beat.possessionTeamId === defendingTeam.id ? defendingTeam.name : attackingTeam.name}</div>
        </div>
        </>}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 p-3">
        <button type="button" aria-label="Lance anterior" onClick={() => { setInterlude(false); setPlayIndex(value => Math.max(0, value - 1)); setPlaying(false); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/5"><ChevronLeft size={18} /></button>
        <div className="flex items-center gap-2">
          <button type="button" aria-label={soundEnabled ? 'Desligar som' : 'Ligar som'} onClick={() => { unlockCrowdAudio(); setSoundEnabled(value => !value); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70">{soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
          <button type="button" onClick={() => { unlockCrowdAudio(); setPlaying(value => !value); }} className="flex h-10 min-w-28 items-center justify-center gap-2 rounded-full bg-cyan-300 px-4 text-[10px] font-black uppercase text-black">{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pausar' : 'Play'}</button>
        </div>
        <button type="button" aria-label="Proximo lance" onClick={() => { setInterlude(false); setPlayIndex(value => Math.min(plays.length - 1, value + 1)); setPlaying(false); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/5"><ChevronRight size={18} /></button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-3 scrollbar-hide">
        {plays.map((item, index) => <button key={item.id} type="button" onClick={() => { setInterlude(false); setPlayIndex(index); setPlaying(false); }} className={`min-w-[82px] rounded-full border px-3 py-2 text-[9px] font-black uppercase ${index === playIndex ? 'border-cyan-300 bg-cyan-300 text-black' : 'border-white/10 bg-white/5 text-white/45'}`}>{item.minute}' {item.type.replace('WOODWORK', 'TRAVE')}</button>)}
      </div>
    </div>
  );
};
