import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Check, Search, X } from 'lucide-react';
import { useGame } from '../../store/GameContext';
import { useTransfers } from '../../hooks/useTransfers';
import { getDraftInterestReport } from '../../engine/gameLogic';
import { GENESIS_DRAFT_LAST_DAY, GENESIS_DRAFT_AUTOFILL_DAY } from '../../constants/gameConstants';
import { Player, PlayerRole } from '../../types';
import { getRecruitmentBlock, getRecruitmentBudget, isHumanClub } from '../../utils/recruitment';
import { PlayerCard } from '../PlayerCard';
import { PlayerRosterRow } from '../PlayerRosterRow';
import { PlayerModal } from '../PlayerModal';

const roles: Record<PlayerRole, string> = { GOL: 'Goleiro', ZAG: 'Defesa', MEI: 'Meio', ATA: 'Ataque' };
const target: Record<PlayerRole, number> = { GOL: 1, ZAG: 4, MEI: 3, ATA: 3 };
const statusCopy: Record<string, string> = { PENDING: 'Aguardando resposta', WAITING_WINDOW: 'Aguardando abrir a janela', ACCEPTED: 'Aceita', DECLINED: 'Recusada' };

export function RecruitmentPanel({ draft = false }: { draft?: boolean }) {
  const { state, addToast } = useGame();
  const team = state.userTeamId ? state.teams[state.userTeamId] : null;
  const [tab, setTab] = useState<'choose' | 'pending' | 'trade'>('choose');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [role, setRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [onlyFits, setOnlyFits] = useState(true);
  const [limit, setLimit] = useState(16);
  const [details, setDetails] = useState<Player | null>(null);
  const [tradeTarget, setTradeTarget] = useState<Player | null>(null);
  const [offeredId, setOfferedId] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const showResponses = () => { setReceipt(null); setTab('pending'); responseRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); };
  useEffect(() => { setReceipt(null); }, [state.world.currentDay, state.userTeamId]);
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    if (!tradeTarget) return;
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus();
  }, [tradeTarget]);
  const budget = getRecruitmentBudget(state, team?.id || '');
  const { handleMakeProposal, handleCancelDraftProposal, handleSendTradeOffer } = useTransfers(team?.id || null, budget.used, budget.cap);
  const act = async (id: string, action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(id);
    try { await action(); } catch { addToast('Não foi possível enviar. Tente novamente.', 'error'); } finally { lock.current = false; setBusy(null); }
  };
  if (!team) return <section className="recruit-panel"><h1>Escolha um clube primeiro</h1><p>Você precisa de um elenco para contratar jogadores.</p></section>;
  const draftOpen = state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY;
  const responseDay = state.world.currentDay < 1 ? 1 : GENESIS_DRAFT_AUTOFILL_DAY;
  const draftResults = (state.world.draftResults || []).filter(r => r.managerId === state.userManagerId && r.teamId === team.id).slice().reverse();
  const draftPending = (state.world.draftProposals || []).filter(p => p.managerId === state.userManagerId);
  const ownPlayers = team.squad.map(id => state.players[id]).filter(Boolean);
  const planned = [...new Map([...ownPlayers, ...draftPending.map(p => state.players[p.playerId]).filter(Boolean)].map(p => [p.id, p])).values()];
  const pendingIds = new Set(draftPending.map(p => p.playerId));
  const transfers = (state.transferProposals || []).filter(p => p.toTeamId === team.id);
  const trades = (state.tradeOffers || []).filter(p => p.fromTeamId === team.id || p.toTeamId === team.id);
  const pendingCount = draft ? draftPending.length : transfers.filter(p => ['PENDING', 'WAITING_WINDOW'].includes(p.status)).length + trades.filter(p => p.status === 'PENDING').length;
  const counts = (Object.keys(roles) as PlayerRole[]).map(r => ({ role: r, count: planned.filter(p => p.role === r).length }));
  const neededRole = counts.find(c => c.count < target[c.role])?.role;
  const candidates = Object.values(state.players).filter(p => p.contract.teamId !== team.id && !budget.reserved.has(p.id))
    .filter(p => !draft || !isHumanClub(state, p.contract.teamId))
    .filter(p => tab !== 'trade' || !!p.contract.teamId)
    .filter(p => role === 'ALL' || p.role === role)
    .filter(p => (p.name + ' ' + p.nickname).toLowerCase().includes(search.toLowerCase()))
    .map(player => {
      const interest = draft ? getDraftInterestReport(state, team.id, player.id) : null;
      const block = tab === 'trade'
        ? (!ownPlayers.length ? 'Você precisa de um atleta para oferecer' : trades.some(t => t.fromTeamId === team.id && t.requestedPlayerId === player.id && t.status === 'PENDING') ? 'Troca já enviada' : (player.satisfaction ?? 70) >= 85 ? 'Não quer sair do clube' : null)
        : getRecruitmentBlock(state, team.id, player, draft) || (interest && interest.chance <= 0 ? interest.label : null);
      return { player, interest, block };
    })
    .filter(c => !onlyFits || !c.block)
    .sort((a, b) => Number(!!a.block) - Number(!!b.block) || (draft && role === 'ALL' ? Number(b.player.role === neededRole) - Number(a.player.role === neededRole) : 0) || (b.interest?.chance || 0) - (a.interest?.chance || 0) || b.player.totalRating - a.player.totalRating);
  const shown = candidates.slice(0, limit);
  const openTrade = (player: Player) => { setOfferedId(''); setTradeTarget(player); };
  const playerInfo = (player: Player) => {
    const satisfaction = Number.isFinite(player.satisfaction) ? Math.round(Math.max(0, Math.min(100, player.satisfaction))) : null;
    return <div className="recruit-player-profile">
      {view === 'cards' && tab !== 'pending' ? <div className="recruit-portrait" role="button" tabIndex={0} aria-label={'Ver detalhes de ' + player.nickname} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();setDetails(player);} }}>
        <PlayerCard player={player} onClick={setDetails} variant="compact" />
      </div> : <PlayerRosterRow player={player} onClick={setDetails} clubName={player.contract.teamId ? state.teams[player.contract.teamId]?.name || 'Clube' : 'Sem clube'} />}
      <div className="recruit-satisfaction">
        <span>Satisfação <strong>{satisfaction === null ? 'Sem informação' : satisfaction + '%'}</strong></span>
        {satisfaction !== null && <span className="recruit-satisfaction-track" role="meter" aria-label={'Satisfação de ' + player.nickname} aria-valuemin={0} aria-valuemax={100} aria-valuenow={satisfaction}><span style={{ width: satisfaction + '%' }} /></span>}
      </div>
    </div>;
  };
  return <div className="recruit-flow">
    <section className="recruit-panel">
      <span className="recruit-eyebrow">{draft ? 'Monte seu primeiro elenco' : 'Reforce seu time'}</span>
      <h1>{draft ? 'Draft Genesis' : 'Transferências'}</h1>
      <p>{draft ? 'Envie propostas para montar seu time. O atleta só entra se a contratação for aceita.' : 'Escolha quem entra. Para oferecer um atleta do seu elenco, use Trocar.'}</p>
      <div className="recruit-budget" aria-live="polite">
        <div><small>Espaço disponível</small><strong>{budget.remaining.toLocaleString('pt-BR')} <span>pontos</span></strong></div>
        <div><small>{draft ? 'Elenco + escolhas' : 'Vagas livres'}</small><strong>{draft ? planned.length + '/15' : budget.slots}</strong></div>
      </div>
      <p className="recruit-note">{budget.pending > 0 ? budget.pending.toLocaleString('pt-BR') + ' pontos reservados em propostas.' : null}</p>
      {draft && <div className="recruit-guide">
        <strong>{ownPlayers.length >= 11 ? 'Você já tem 11 ou mais atletas no elenco.' : planned.length >= 11 ? 'Você tem escolhas para 11 atletas. Agora aguarde as respostas.' : 'Escolha mais ' + (11 - planned.length) + ' para planejar os primeiros 11.'}</strong>

        <div className="recruit-roles">{counts.map(c => <button key={c.role} onClick={() => { setRole(c.role); setTab('choose'); }} aria-pressed={role === c.role}>{roles[c.role]} <b>{c.count}/{target[c.role]}</b></button>)}</div>

      </div>}
      <details className="recruit-help"><summary>Como funciona</summary><p>Cada atleta ocupa pontos do limite do elenco. Uma proposta reserva esse espaço até a resposta. A contratação não é garantida.</p>{draft ? <p>Enviar proposta reserva pontos. Você pode cancelar antes da resolução em Respostas. As posições acima são uma sugestão para começar; você pode usar outra formação.</p> : <p>Você revisa a proposta antes de enviá-la. A resposta aparece na aba Respostas após a virada do dia.</p>}</details>
      {draft && !draftOpen && <p role="status" className="recruit-alert">{state.world.currentDay < 0 ? 'O draft abre no dia 0. Aguarde o início do mundo.' : 'O draft está fechado. As escolhas não podem ser alteradas aqui.'}</p>}
      {!draft && !state.world.transferWindowOpen && <p role="status" className="recruit-alert">Janela fechada. Consulte os atletas agora e envie propostas quando ela abrir.</p>}
    </section>
    <div ref={responseRef} className="recruit-tabs" role="group" aria-label="Etapas de contratação">
      <button aria-pressed={tab === 'choose'} onClick={() => setTab('choose')}>{draft ? 'Escolher atletas' : 'Contratar'}</button>
      {!draft && <button aria-pressed={tab === 'trade'} onClick={() => setTab('trade')}>Trocar</button>}
      <button aria-pressed={tab === 'pending'} onClick={showResponses}>Respostas ({pendingCount} aguardando)</button>
    </div>
    {receipt && <div className="recruit-receipt" role="status"><Check size={18}/><div><strong>Proposta enviada para {receipt}</strong><p>{draft ? `Resposta no dia ${responseDay} do jogo.` : 'Resposta na próxima virada do dia do jogo.'} O atleta ainda não está contratado.</p><button onClick={showResponses}>Acompanhar resposta →</button></div></div>}
    {tab !== 'pending' ? <>
      <p className="recruit-timing">{draft ? `Envie agora · Respostas no dia ${responseDay} do jogo` : 'Envie uma proposta · Resposta na próxima virada do jogo'}<button onClick={showResponses}>Ver respostas{pendingCount > 0 ? ` · ${pendingCount} aguardando` : ''} →</button></p>
      <section className="recruit-panel recruit-filters">
        <label><Search size={16} /><input aria-label="Buscar atleta" placeholder="Nome do atleta" value={search} onChange={e => {setSearch(e.target.value);setLimit(16);}} /></label>
        <select aria-label="Posição" value={role} onChange={e => {setRole(e.target.value as PlayerRole | 'ALL');setLimit(16);}}><option value="ALL">Todas as posições</option>{Object.entries(roles).map(([r, label]) => <option value={r} key={r}>{label}</option>)}</select>
        <label className="recruit-checkbox"><input type="checkbox" checked={onlyFits} onChange={e => setOnlyFits(e.target.checked)} />{tab === 'trade' ? 'Só quem pode negociar' : 'Só quem cabe no meu elenco'}</label>
      </section>
      <p className="recruit-note">{draft && neededRole && role === 'ALL' ? 'Primeiro: ' + roles[neededRole].toLowerCase() + ' para completar sua formação. ' : ''}{candidates.length} atletas encontrados. Toque no nome para ver os detalhes.</p>
      <div className="recruit-view-switch" role="group" aria-label="Visualização dos atletas"><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Cards</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>Lista</button></div>
      <div className={'recruit-list recruit-view-' + view}>{shown.map(({player, interest, block}) => <article key={player.id} className="recruit-player">
        {playerInfo(player)}
        <div className="recruit-player-action">
          <small>{block || (tab === 'trade' ? state.teams[player.contract.teamId!]?.name : 'Sobram ' + (budget.remaining - player.totalRating) + ' pontos')}</small>
          <button disabled={!!busy || !!block || (draft ? !draftOpen : !state.world.transferWindowOpen)} aria-label={(tab === 'trade' ? 'Trocar por ' : 'Enviar proposta para ') + player.nickname} onClick={() => tab === 'trade' ? openTrade(player) : act(player.id, async () => { const sent = await handleMakeProposal(player, {quickDraft: draft}); if (sent) setReceipt(player.nickname); })}>{busy === player.id ? 'Enviando…' : tab === 'trade' ? 'Escolher troca' : 'Enviar proposta'}</button>
        </div>
        {interest && <p className="recruit-player-note">Chance estimada: {interest.chance}%. {interest.label}.</p>}
        {!draft && tab === 'choose' && <p className="recruit-player-note">{player.contract.teamId ? state.teams[player.contract.teamId]?.name : 'Sem clube'} · {isHumanClub(state, player.contract.teamId) ? <button onClick={() => {setTab('trade');openTrade(player);}}>Negociar uma troca</button> : 'Resposta na virada do dia'}</p>}
      </article>)}</div>
      {!shown.length && <section className="recruit-panel"><h2>Nenhum atleta neste filtro</h2><p>{budget.slots === 0 ? 'Todas as vagas estão ocupadas ou reservadas. Revise suas escolhas ou negocie uma troca.' : 'Tente outra posição ou desmarque o filtro de disponibilidade.'}</p><button className="recruit-secondary" onClick={() => {setRole('ALL');setSearch('');setOnlyFits(false);}}>Ver todos os atletas</button></section>}
      {candidates.length > limit && <button className="recruit-secondary" onClick={() => setLimit(n => n + 16)}>Mostrar mais atletas</button>}
    </> : <section className="recruit-panel">
      <h2>{draft ? 'Respostas do draft' : 'Respostas das propostas'}</h2>
      <p>{draft ? `As propostas pendentes serão resolvidas no dia ${responseDay} do jogo. Contratado = já entrou no elenco. Não contratado = proposta encerrada e pontos liberados.` : 'O resultado aparece aqui após o processamento. Aceita, recusada ou aguardando: sem precisar procurar na ficha do jogador.'}</p>
      {draft ? planned.map(player => <article className="recruit-player" key={player.id}>{playerInfo(player)}<div className="recruit-player-action"><small>{pendingIds.has(player.id) ? `Aguardando · dia ${responseDay}` : 'Contratado · no elenco'}</small>{pendingIds.has(player.id) ? <button disabled={!!busy || !draftOpen} className="recruit-secondary" onClick={() => act(player.id, () => handleCancelDraftProposal(player.id))}>Cancelar proposta</button> : <Check size={18} />}</div></article>) : <>
        {transfers.slice().sort((a, b) => b.date.localeCompare(a.date)).map(proposal => {const player=state.players[proposal.playerId];return player && <article className="recruit-player" key={proposal.id}>{playerInfo(player)}<span className="recruit-status">{statusCopy[proposal.status]}</span></article>;})}
        {trades.slice().sort((a, b) => b.date.localeCompare(a.date)).map(offer => <article className="recruit-result" key={offer.id}><ArrowLeftRight size={17}/><div><strong>{state.players[offer.offeredPlayerId]?.nickname} ↔ {state.players[offer.requestedPlayerId]?.nickname}</strong><p>{offer.toTeamId === team.id ? 'Recebida' : 'Enviada'} · {statusCopy[offer.status]}</p></div></article>)}
      </>}
      {draftResults.map((result, index) => { const player = state.players[result.playerId]; return player && <article className="recruit-result" key={`${result.day}-${result.playerId}-${index}`}><div><strong>{player.nickname}</strong><p>Dia {result.day} · {result.status === 'ACCEPTED' ? 'Contratado' : 'Não contratado · pontos liberados'}</p></div></article>; })}
      {(draft ? !planned.length && !draftResults.length : !transfers.length && !trades.length && !draftResults.length) && <p className="recruit-empty">Nenhuma proposta ainda. Escolha um atleta para começar.</p>}
    </section>}
    {details && <PlayerModal player={details} onClose={() => setDetails(null)} />}
    {tradeTarget && createPortal(<div className="recruit-overlay"><section className="recruit-trade" onKeyDown={event => {
      if (event.key === 'Escape' && !busy) { event.stopPropagation(); setTradeTarget(null); }
      if (event.key === 'Tab') {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)'));
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();}
      }
    }} role="dialog" aria-modal="true" aria-label="Montar troca">
      <button className="recruit-close" aria-label="Fechar troca" disabled={!!busy} onClick={() => setTradeTarget(null)}><X size={22}/></button>
      <h2>Quem sai por {tradeTarget.nickname}?</h2><p>Você recebe {tradeTarget.nickname} ({tradeTarget.totalRating} pontos). Escolha um atleta para oferecer.</p>
      <label>Atleta do seu elenco<select autoFocus aria-label="Atleta para oferecer" value={offeredId} onChange={e => setOfferedId(e.target.value)}><option value="">Escolha um atleta</option>{ownPlayers.map(p => <option key={p.id} value={p.id}>{p.nickname} · {roles[p.role]} · {p.totalRating} pontos</option>)}</select></label>
      {offeredId && <p>Após a troca: {budget.used - state.players[offeredId].totalRating + tradeTarget.totalRating} / {budget.cap} pontos no elenco.</p>}
      <p className="recruit-note">Enviar a proposta não conclui a troca. A resposta aparece em Respostas após o processamento.</p>
      <button className="recruit-primary" disabled={!offeredId || !!busy || budget.used - (state.players[offeredId]?.totalRating || 0) + tradeTarget.totalRating > budget.cap} onClick={() => act(tradeTarget.id, async () => {const sent = await handleSendTradeOffer(tradeTarget.id, offeredId); if (sent) {setTradeTarget(null);setTab('pending');}})}>{busy ? 'Enviando…' : 'Revisar e enviar troca'}</button>
    </section></div>, document.body)}
  </div>;
}
