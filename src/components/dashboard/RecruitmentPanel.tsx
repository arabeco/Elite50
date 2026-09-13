import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Check, Clock, Search, X } from 'lucide-react';
import { useGame } from '../../store/GameContext';
import { useTransfers } from '../../hooks/useTransfers';
import { getDraftInterestReport } from '../../engine/gameLogic';
import { GENESIS_DRAFT_LAST_DAY } from '../../constants/gameConstants';
import { Player, PlayerRole } from '../../types';
import { getRecruitmentBlock, getRecruitmentBudget, isHumanClub } from '../../utils/recruitment';
import { PlayerAvatar } from '../PlayerAvatar';
import { PlayerModal } from '../PlayerModal';

const roles: Record<PlayerRole, string> = { GOL: 'Goleiro', ZAG: 'Defesa', MEI: 'Meio', ATA: 'Ataque' };
const target: Record<PlayerRole, number> = { GOL: 1, ZAG: 4, MEI: 3, ATA: 3 };
const statusCopy: Record<string, string> = { PENDING: 'Aguardando resposta', WAITING_WINDOW: 'Aguardando abrir a janela', ACCEPTED: 'Aceita', DECLINED: 'Recusada' };

export function RecruitmentPanel({ draft = false }: { draft?: boolean }) {
  const { state } = useGame();
  const team = state.userTeamId ? state.teams[state.userTeamId] : null;
  const [tab, setTab] = useState<'choose' | 'pending' | 'trade'>('choose');
  const [role, setRole] = useState<PlayerRole | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [onlyFits, setOnlyFits] = useState(true);
  const [limit, setLimit] = useState(16);
  const [details, setDetails] = useState<Player | null>(null);
  const [tradeTarget, setTradeTarget] = useState<Player | null>(null);
  const [offeredId, setOfferedId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const lock = useRef(false);
  const budget = getRecruitmentBudget(state, team?.id || '');
  const { handleMakeProposal, handleCancelDraftProposal, handleSendTradeOffer } = useTransfers(team?.id || null, budget.used, budget.cap);
  const act = async (id: string, action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true; setBusy(id);
    try { await action(); } finally { lock.current = false; setBusy(null); }
  };
  if (!team) return <section className="recruit-panel"><h1>Escolha um clube primeiro</h1><p>Você precisa de um elenco para contratar jogadores.</p></section>;
  const draftOpen = state.world.status === 'LOBBY' && state.world.currentDay >= 0 && state.world.currentDay <= GENESIS_DRAFT_LAST_DAY;
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
        ? ((player.satisfaction ?? 70) >= 85 ? 'Não quer sair do clube' : null)
        : getRecruitmentBlock(state, team.id, player, draft) || (interest && interest.chance <= 0 ? interest.label : null);
      return { player, interest, block };
    })
    .filter(c => !onlyFits || !c.block)
    .sort((a, b) => Number(!!a.block) - Number(!!b.block) || (draft && role === 'ALL' ? Number(b.player.role === neededRole) - Number(a.player.role === neededRole) : 0) || (b.interest?.chance || 0) - (a.interest?.chance || 0) || b.player.totalRating - a.player.totalRating);
  const shown = candidates.slice(0, limit);
  const openTrade = (player: Player) => { setOfferedId(''); setTradeTarget(player); };
  const playerInfo = (player: Player) => <button className="recruit-player-info" onClick={() => setDetails(player)} aria-label={'Ver detalhes de ' + player.nickname}>
    <PlayerAvatar player={player} size="sm" mode="head" />
    <span><strong>{player.nickname}</strong><small>{roles[player.role]} · {player.totalRating} pontos</small></span>
  </button>;
  return <div className="recruit-flow">
    <section className="recruit-panel">
      <span className="recruit-eyebrow">{draft ? 'Monte seu primeiro elenco' : 'Reforce seu time'}</span>
      <h1>{draft ? 'Draft Genesis' : 'Transferências'}</h1>
      <p>{draft ? 'Toque em Adicionar. Sua proposta é enviada na hora e você pode removê-la antes da virada do dia.' : 'Escolha um atleta e envie uma proposta. Para oferecer alguém do seu elenco, use Trocar.'}</p>
      <div className="recruit-budget" aria-live="polite">
        <div><small>Espaço disponível</small><strong>{budget.remaining.toLocaleString('pt-BR')} <span>pontos</span></strong></div>
        <div><small>{draft ? 'Elenco + escolhas' : 'Vagas livres'}</small><strong>{draft ? planned.length + '/15' : budget.slots}</strong></div>
      </div>
      <p className="recruit-note">Cada atleta ocupa pontos do limite do elenco. {budget.pending > 0 ? budget.pending.toLocaleString('pt-BR') + ' pontos estão reservados em propostas.' : 'O espaço é reservado quando você envia a proposta.'}</p>
      {draft && <div className="recruit-guide">
        <strong>{ownPlayers.length >= 11 ? 'Você já tem 11 ou mais atletas no elenco.' : planned.length >= 11 ? 'Você tem escolhas para 11 atletas. Agora aguarde as respostas.' : 'Escolha mais ' + (11 - planned.length) + ' para planejar os primeiros 11.'}</strong>
        <p>Adicionar não garante a contratação: as disputas são resolvidas na virada do dia. Não há outro botão para enviar.</p>
        <div className="recruit-roles">{counts.map(c => <button key={c.role} onClick={() => { setRole(c.role); setTab('choose'); }} aria-pressed={role === c.role}>{roles[c.role]} <b>{c.count}/{target[c.role]}</b></button>)}</div>
        <small>Distribuição sugerida para começar. Você pode escolher outra formação.</small>
      </div>}
      {draft && !draftOpen && <p role="status" className="recruit-alert">{state.world.currentDay < 0 ? 'O draft abre no dia 0. Aguarde o início do mundo.' : 'O draft está fechado. As escolhas não podem ser alteradas aqui.'}</p>}
      {!draft && !state.world.transferWindowOpen && <p role="status" className="recruit-alert">Janela fechada: as propostas aguardam a reabertura para serem resolvidas.</p>}
    </section>
    <div className="recruit-tabs" role="group" aria-label="Etapas de contratação">
      <button aria-pressed={tab === 'choose'} onClick={() => setTab('choose')}>{draft ? 'Escolher atletas' : 'Contratar'}</button>
      {!draft && <button aria-pressed={tab === 'trade'} onClick={() => setTab('trade')}>Trocar</button>}
      <button aria-pressed={tab === 'pending'} onClick={() => setTab('pending')}>{draft ? 'Minhas escolhas' : 'Propostas'} ({pendingCount})</button>
    </div>
    {tab !== 'pending' ? <>
      <section className="recruit-panel recruit-filters">
        <label><Search size={16} /><input aria-label="Buscar atleta" placeholder="Nome do atleta" value={search} onChange={e => {setSearch(e.target.value);setLimit(16);}} /></label>
        <select aria-label="Posição" value={role} onChange={e => {setRole(e.target.value as PlayerRole | 'ALL');setLimit(16);}}><option value="ALL">Todas as posições</option>{Object.entries(roles).map(([r, label]) => <option value={r} key={r}>{label}</option>)}</select>
        <label className="recruit-checkbox"><input type="checkbox" checked={onlyFits} onChange={e => setOnlyFits(e.target.checked)} />{tab === 'trade' ? 'Só quem pode negociar' : 'Só quem cabe no meu elenco'}</label>
      </section>
      <p className="recruit-note">{draft && neededRole && role === 'ALL' ? 'Primeiro: ' + roles[neededRole].toLowerCase() + ' para completar sua formação. ' : ''}{candidates.length} atletas encontrados. Toque no nome para ver os detalhes.</p>
      <div className="recruit-list">{shown.map(({player, interest, block}) => <article key={player.id} className="recruit-player">
        {playerInfo(player)}
        <div className="recruit-player-action">
          <small>{block || (tab === 'trade' ? state.teams[player.contract.teamId!]?.name : 'Sobram ' + (budget.remaining - player.totalRating) + ' pontos')}</small>
          <button disabled={!!busy || !!block || (draft && !draftOpen)} aria-label={(tab === 'trade' ? 'Trocar por ' : draft ? 'Adicionar ' : 'Contratar ') + player.nickname} onClick={() => tab === 'trade' ? openTrade(player) : act(player.id, () => handleMakeProposal(player, {quickDraft: draft}))}>{busy === player.id ? 'Enviando…' : tab === 'trade' ? 'Escolher troca' : draft ? 'Adicionar' : 'Contratar'}</button>
        </div>
        {interest && <p className="recruit-player-note">Chance estimada: {interest.chance}%. {interest.label}.</p>}
        {!draft && tab === 'choose' && <p className="recruit-player-note">{player.contract.teamId ? state.teams[player.contract.teamId]?.name : 'Sem clube'} · {isHumanClub(state, player.contract.teamId) ? <button onClick={() => {setTab('trade');openTrade(player);}}>Negociar uma troca</button> : 'Resposta na virada do dia'}</p>}
      </article>)}</div>
      {!shown.length && <section className="recruit-panel"><h2>Nenhum atleta neste filtro</h2><p>{budget.slots === 0 ? 'Todas as vagas estão ocupadas ou reservadas. Revise suas escolhas ou negocie uma troca.' : 'Tente outra posição ou desmarque o filtro de disponibilidade.'}</p><button className="recruit-secondary" onClick={() => {setRole('ALL');setSearch('');setOnlyFits(false);}}>Ver todos os atletas</button></section>}
      {candidates.length > limit && <button className="recruit-secondary" onClick={() => setLimit(n => n + 16)}>Mostrar mais atletas</button>}
    </> : <section className="recruit-panel">
      <h2>{draft ? 'Seu elenco e suas escolhas' : 'Acompanhe as respostas'}</h2>
      <p>{draft ? 'Aguardando = proposta enviada. No elenco = contratação concluída.' : 'O resultado aparece aqui após o processamento. Aceita, recusada ou aguardando: sem precisar procurar na ficha do jogador.'}</p>
      {draft ? planned.map(player => <article className="recruit-player" key={player.id}>{playerInfo(player)}<div className="recruit-player-action"><small>{pendingIds.has(player.id) ? 'Aguardando a virada' : 'No elenco'}</small>{pendingIds.has(player.id) ? <button disabled={!!busy || !draftOpen} className="recruit-secondary" onClick={() => act(player.id, () => handleCancelDraftProposal(player.id))}>Remover</button> : <Check size={18} />}</div></article>) : <>
        {transfers.slice().reverse().map(proposal => {const player=state.players[proposal.playerId];return player && <article className="recruit-player" key={proposal.id}>{playerInfo(player)}<span className="recruit-status">{statusCopy[proposal.status]}</span></article>;})}
        {trades.slice().reverse().map(offer => <article className="recruit-result" key={offer.id}><ArrowLeftRight size={17}/><div><strong>{state.players[offer.offeredPlayerId]?.nickname} ↔ {state.players[offer.requestedPlayerId]?.nickname}</strong><p>{offer.toTeamId === team.id ? 'Recebida' : 'Enviada'} · {statusCopy[offer.status]}</p></div></article>)}
      </>}
      {(draft ? !planned.length : !transfers.length && !trades.length) && <p className="recruit-empty">Nenhuma proposta ainda. Escolha um atleta para começar.</p>}
    </section>}
    {details && <PlayerModal player={details} onClose={() => setDetails(null)} />}
    {tradeTarget && createPortal(<div className="recruit-overlay"><section className="recruit-trade" role="dialog" aria-modal="true" aria-label="Montar troca">
      <button className="recruit-close" aria-label="Fechar troca" disabled={!!busy} onClick={() => setTradeTarget(null)}><X size={22}/></button>
      <h2>Quem sai por {tradeTarget.nickname}?</h2><p>Você recebe {tradeTarget.nickname} ({tradeTarget.totalRating} pontos). Escolha um atleta para oferecer.</p>
      <label>Atleta do seu elenco<select aria-label="Atleta para oferecer" value={offeredId} onChange={e => setOfferedId(e.target.value)}><option value="">Escolha um atleta</option>{ownPlayers.map(p => <option key={p.id} value={p.id}>{p.nickname} · {roles[p.role]} · {p.totalRating} pontos</option>)}</select></label>
      {offeredId && <p>Após a troca: {budget.used - state.players[offeredId].totalRating + tradeTarget.totalRating} / {budget.cap} pontos no elenco.</p>}
      <p className="recruit-note">Enviar a proposta não conclui a troca. A resposta aparece em Propostas após o processamento.</p>
      <button className="recruit-primary" disabled={!offeredId || !!busy || budget.used - (state.players[offeredId]?.totalRating || 0) + tradeTarget.totalRating > budget.cap} onClick={() => act(tradeTarget.id, async () => {const sent = await handleSendTradeOffer(tradeTarget.id, offeredId); if (sent) {setTradeTarget(null);setTab('pending');}})}>{busy ? 'Enviando…' : 'Revisar e enviar troca'}</button>
    </section></div>, document.body)}
  </div>;
}
