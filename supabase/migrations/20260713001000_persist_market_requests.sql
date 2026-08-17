alter table public.games
  add column if not exists transfer_proposals jsonb not null default '[]'::jsonb,
  add column if not exists trade_offers jsonb not null default '[]'::jsonb;

comment on column public.games.transfer_proposals is
  'Fila de propostas de contratacao pertencente ao manager desta linha.';

comment on column public.games.trade_offers is
  'Fila de propostas de troca enviadas ou recebidas pelo manager desta linha.';
