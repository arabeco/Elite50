import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, renderHook, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecruitmentPanel } from '../components/dashboard/RecruitmentPanel';
import { getRecruitmentBudget, getRecruitmentBlock } from '../utils/recruitment';
import { useTransfers } from '../hooks/useTransfers';
import { resolveDraftConflict } from '../engine/gameLogic';
import { generatePlayer } from '../engine/generator';

const ctx = vi.hoisted(() => ({ state: null as any, setState: vi.fn(), saveGame: vi.fn(async () => undefined), addToast: vi.fn(), requestConfirm: vi.fn(async () => true), isOnline: false, worldId: null }));
vi.mock('../store/GameContext', () => ({ useGame: () => ctx, useGameDispatch: () => ctx }));
vi.mock('../lib/supabase', () => ({ supabase: {}, submitDraftProposalInWorld: vi.fn(), cancelDraftProposalInWorld: vi.fn() }));
vi.mock('../engine/gameLogic', async importOriginal => ({ ...(await importOriginal<any>()), getDraftInterestReport: () => ({chance: 80, label: 'Bom interesse', reasons: ['Mesmo distrito'], tone: 'safe'}) }));
vi.mock('../components/PlayerAvatar', () => ({ PlayerAvatar: () => <span aria-hidden="true"/> }));
vi.mock('../components/PlayerModal', () => ({ PlayerModal: () => <div>Detalhes</div> }));

beforeEach(() => {
  cleanup(); vi.clearAllMocks(); ctx.requestConfirm.mockResolvedValue(true);
  const candidate = generatePlayer('candidate', 'NORTE', 600, 'GOL'); candidate.nickname='Alex';candidate.totalRating=600;candidate.satisfaction=50;candidate.contract.teamId=null;
  const expensive = {...candidate, id:'expensive',nickname:'Caro',totalRating:2000};
  const mine = {...candidate,id:'mine',nickname:'Meu atleta',totalRating:500,contract:{...candidate.contract,teamId:'mineTeam'}};
  ctx.state={players:{candidate,expensive,mine},teams:{mineTeam:{id:'mineTeam',name:'Meu clube',squad:['mine'],powerCap:1500,district:'NORTE',managerId:'manager',lineup:{}}},managers:{manager:{id:'manager',isNPC:false,career:{currentTeamId:'mineTeam'}}},world:{status:'LOBBY',currentDay:0,draftProposals:[],transferWindowOpen:true},userManagerId:'manager',userTeamId:'mineTeam',participants:[],transferProposals:[],tradeOffers:[]};
  ctx.setState.mockImplementation(next => {ctx.state=typeof next==='function'?next(ctx.state):next;});
});

describe('Recruitment budgets', () => {
  it('reserves points and slots for waiting-window proposals, without duplicates', () => {
    ctx.state.transferProposals=[{playerId:'candidate',toTeamId:'mineTeam',status:'WAITING_WINDOW'}];
    ctx.state.world.draftProposals=[{playerId:'candidate',teamId:'mineTeam',managerId:'manager'},{playerId:'mine',teamId:'mineTeam',managerId:'manager'}];
    expect(getRecruitmentBudget(ctx.state,'mineTeam')).toMatchObject({used:500,pending:600,remaining:400,slots:13});
    expect(getRecruitmentBlock(ctx.state,'mineTeam',ctx.state.players.candidate,false)).toBe('Proposta enviada');
  });
  it('counts pending choices toward the 15-player limit', () => {
    ctx.state.world.draftProposals=Array.from({length:14},(_,n)=>({playerId:'reserved'+n,teamId:'mineTeam',managerId:'manager'}));
    expect(getRecruitmentBlock(ctx.state,'mineTeam',ctx.state.players.candidate,true)).toBe('Elenco e reservas completos');
  });
  it('excludes participant clubs even when their manager metadata is missing', () => {
    ctx.state.teams.other={id:'other',squad:[]};ctx.state.participants=[{teamId:'other'}];ctx.state.players.candidate.contract.teamId='other';
    expect(getRecruitmentBlock(ctx.state,'mineTeam',ctx.state.players.candidate,true)).toBe('Disponível apenas por troca');
  });
});

describe('Guided recruitment clicks', () => {
  it('adds and removes a draft choice without a final confirmation step', async () => {
    const user=userEvent.setup();render(<RecruitmentPanel draft/>);
    expect(screen.queryByRole('button',{name:'Enviar proposta para Caro'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Enviar proposta para Alex'}));
    await waitFor(()=>expect(ctx.state.world.draftProposals).toHaveLength(1));
    expect(ctx.requestConfirm).not.toHaveBeenCalled();expect(ctx.saveGame).toHaveBeenCalled();
    expect(screen.getByText('Proposta enviada para Alex')).toBeInTheDocument();
    expect(screen.getByText(/Resposta no dia 1 do jogo/)).toBeInTheDocument();
    expect(ctx.state.players.candidate.contract.teamId).toBeNull();
    expect(screen.queryByRole('button',{name:/Confirmar Draft/i})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Acompanhar resposta →'}));
    await user.click(screen.getByRole('button',{name:'Cancelar proposta'}));
    await waitFor(()=>expect(ctx.state.world.draftProposals).toHaveLength(0));
  });
  it('shows unavailable players only when requested and explains the shortfall', async () => {
    const user=userEvent.setup();render(<RecruitmentPanel draft/>);
    await user.click(screen.getByLabelText('Só quem cabe no meu elenco'));
    expect(screen.getByRole('button',{name:'Enviar proposta para Caro'})).toBeDisabled();
    expect(screen.getByText('Faltam 1000 pontos de espaço')).toBeInTheDocument();
  });
  it('keeps transfer review and records the proposal, not an instant signing', async () => {
    ctx.state.world.status='ACTIVE';const user=userEvent.setup();render(<RecruitmentPanel/>);
    await user.click(screen.getByRole('button',{name:'Enviar proposta para Alex'}));
    await waitFor(()=>expect(ctx.state.transferProposals).toHaveLength(1));
    expect(ctx.requestConfirm).toHaveBeenCalledWith(expect.objectContaining({confirmLabel:'Enviar proposta'}));
    expect(ctx.state.players.candidate.contract.teamId).toBeNull();
    await user.click(screen.getByRole('button',{name:/^Respostas/}));
    expect(screen.getByText('Aguardando resposta')).toBeInTheDocument();
  });
  it('does not send a trade when the review is cancelled', async () => {
    ctx.state.world.status='ACTIVE';ctx.state.teams.other={id:'other',name:'Outro',squad:['candidate']};ctx.state.players.candidate.contract.teamId='other';ctx.requestConfirm.mockResolvedValue(false);
    const {result}=renderHook(()=>useTransfers('mineTeam',500,1500));
    await act(async()=>{expect(await result.current.handleSendTradeOffer('candidate','mine')).toBe(false);});
    expect(ctx.state.tradeOffers).toHaveLength(0);
  });
  it('blocks submissions when the transfer window is closed', async () => {
    ctx.state.world.status='ACTIVE';ctx.state.world.transferWindowOpen=false;
    const {result}=renderHook(()=>useTransfers('mineTeam',500,1500));
    await act(async()=>{await result.current.handleMakeProposal(ctx.state.players.candidate);});
    expect(ctx.requestConfirm).not.toHaveBeenCalled();expect(ctx.state.transferProposals).toHaveLength(0);
  });
  it('sends a trade from the short sheet and opens its status', async () => {
    ctx.state.world.status='ACTIVE';ctx.state.teams.other={id:'other',name:'Outro',squad:['candidate']};ctx.state.players.candidate.contract.teamId='other';
    const user=userEvent.setup();render(<RecruitmentPanel/>);
    await user.click(screen.getByRole('button',{name:'Trocar'}));
    await user.click(screen.getByRole('button',{name:'Trocar por Alex'}));
    await user.selectOptions(screen.getByLabelText('Atleta para oferecer'),'mine');
    await user.click(screen.getByRole('button',{name:'Revisar e enviar troca'}));
    await waitFor(()=>expect(ctx.state.tradeOffers).toHaveLength(1));
    expect(screen.queryByRole('dialog',{name:'Montar troca'})).not.toBeInTheDocument();
    expect(screen.getByText(/Enviada · Aguardando resposta/)).toBeInTheDocument();
  });

});


describe('Draft response history', () => {
  it('retains unsuccessful results after proposals are cleared and across another resolution', () => {
    ctx.state.world.currentDay=3;
    ctx.state.world.draftProposals=[{playerId:'expensive',teamId:'mineTeam',managerId:'manager',priority:1}];
    resolveDraftConflict(ctx.state);
    expect(ctx.state.world.draftProposals).toEqual([]);
    expect(ctx.state.world.draftResults).toEqual([{playerId:'expensive',teamId:'mineTeam',managerId:'manager',day:3,status:'DECLINED'}]);
    resolveDraftConflict(ctx.state);
    expect(ctx.state.world.draftResults).toHaveLength(1);
    expect(getRecruitmentBudget(ctx.state,'mineTeam').pending).toBe(0);
  });
  it('shows unsuccessful draft results after the draft has ended', async () => {
    ctx.state.world.status='ACTIVE';ctx.state.world.currentDay=3;
    ctx.state.world.draftResults=[{playerId:'candidate',teamId:'mineTeam',managerId:'manager',day:3,status:'DECLINED'}];
    render(<RecruitmentPanel/>);
    await userEvent.setup().click(screen.getByRole('button',{name:/^Respostas/}));
    expect(screen.getByText('Dia 3 · Não contratado · pontos liberados')).toBeInTheDocument();
  });
  it('names day 3 for proposals made on day 1', () => {
    ctx.state.world.currentDay=1;render(<RecruitmentPanel draft/>);
    expect(screen.getByText(/Envie agora · Respostas no dia 3/)).toBeInTheDocument();
  });
});
