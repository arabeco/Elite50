# Pendencias - Supabase Egress / Mundo Nois

Data: 2026-07-10

## Estado atual

- O projeto Supabase esta restrito por excesso de egress.
- A resposta real das chamadas da Edge Function esta retornando `402`.
- Mensagem observada:

```txt
Service for this project is restricted due to the following violations: exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

## Impacto

- O cron `elite2050-world-clock-runner` aparece como `succeeded` no `cron.job_run_details`, mas isso e falso positivo.
- O `pg_cron` apenas consegue disparar `net.http_post`.
- A Edge Function `world-clock-runner` nao executa de verdade enquanto recebe `402`.
- O mundo `Nois` nao vai continuar avancando sozinho ate o Supabase ser liberado.
- App, login, leitura, escrita, realtime e imagens podem falhar ou ficar instaveis enquanto a restricao estiver ativa.

## Evidencias

Consulta em `net._http_response` mostrou varias respostas:

```txt
status_code: 402
content: exceed_egress_quota
```

O mundo `Nois` estava assim:

```txt
world_id: 1781875123484
name: Nois
status: ACTIVE
phase: ELITE_CUP
day: 18
game_date: 2050-07-08T08:00:00.000Z
serverClockLastTickAt: 2026-07-08T03:00:00.000Z
```

Como hoje e 2026-07-10, o runner deveria ter dias pendentes para processar, mas nao consegue por causa do bloqueio `402`.

## O que ja foi corrigido no app

- O app nao escuta mais realtime na tabela pesada `public.games`.
- Foi criada a tabela leve `public.world_events`.
- O trigger `emit_world_event_after_game_change` esta ativo em `public.games`.
- A publicacao realtime esta ligada somente em `public.world_events`.
- `public.games` nao esta na publicacao `supabase_realtime`.
- O `world-clock-runner` nao faz mais `select('*')` em todos os mundos a cada minuto.
- A RPC leve `get_due_legacy_world_ids` devolve somente os mundos que realmente precisam de kickoff ou virada civil.
- O JSON completo de `games` so e carregado quando aquele mundo precisa avancar.
- O AAB novo foi gerado com:

```txt
versionCode 25
versionName 1.24
VITE_ENABLE_WORLD_EVENTS_REALTIME=true
```

Arquivo gerado:

```txt
android/app/build/outputs/bundle/release/app-release.aab
```

## O que falta para voltar ao normal

Escolher uma opcao no Supabase:

1. Fazer upgrade para Pro.
2. Remover/desativar Spend Cap se estiver em plano pago.
3. Esperar o proximo ciclo de billing resetar o egress.

Pelo painel mostrado, o ciclo atual era:

```txt
24 Jun 2026 - 24 Jul 2026
```

Entao, sem upgrade/liberacao, a expectativa e voltar no reset do ciclo em 2026-07-24.

## Depois de liberar o Supabase

Antes do deploy da funcao, aplicar tambem:

```txt
supabase/migrations/20260713001000_persist_market_requests.sql
supabase/migrations/20260721001000_due_world_clock_probe.sql
```

Depois publicar novamente `world-clock-runner`.

Rodar:

```sql
select
  id,
  status_code,
  created,
  content
from net._http_response
order by id desc
limit 10;
```

Esperado:

```txt
status_code = 200
```

Depois confirmar o mundo:

```sql
select
  world_id,
  is_creator,
  world_state->>'name' as name,
  world_state->>'status' as status,
  world_state->>'phase' as phase,
  world_state->>'currentDay' as day,
  world_state->>'currentDate' as game_date,
  world_state->'eliteCup'->>'winnerId' as elite_winner,
  world_state->>'serverClockLastTickAt' as server_clock_last_tick,
  updated_at
from public.games
where world_id = '1781875123484'
order by is_creator desc;
```

Se a Edge Function voltar a responder `200`, o runner deve processar os dias pendentes.

## Cuidado

Nao simular a Copa Elite manualmente por SQL sem necessidade.

O correto e liberar a Edge Function e deixar o `world-clock-runner` processar, porque ele atualiza calendario, campeao, noticias, times e estado do mundo juntos.
