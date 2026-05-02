# Plano de Agente: Normalizacao dos Mundos no Supabase

## Objetivo

Transformar o backend do Elite 2050 de um modelo baseado em snapshots JSONB gigantes na tabela `games` para um modelo server-authoritative por mundo, onde cada mundo tem seus proprios jogadores, times, calendario, tabelas, partidas e participantes.

O principio central e simples:

> Jogadores nao sao globais vivos. Cada mundo tem sua propria instancia dos jogadores, ratings, contratos, forma, historico e evolucao.

O backend atual salva o mundo inteiro dentro de `games.world_state`, `games.teams_data`, `games.players_data` e `games.managers_data`. Isso funciona para teste, mas nao escala bem para varios mundos, multiplayer, auditoria, rankings e simulacao consistente.

## Estado Atual

Arquivos principais:

- `src/engine/generator.ts`: gera universo inicial, times, jogadores, managers, ligas, standings e calendario.
- `src/engine/gameLogic.ts`: simula partidas, avanca dia, atualiza standings, evolui jogadores e gera noticias.
- `src/lib/supabase.ts`: salva/carrega mundos na tabela `games`.
- `supabase/complete_schema.sql`: contem schema antigo com `games`, `players` e outras tabelas parcialmente historicas.
- `supabase/migrations/*`: contem migrations antigas e novas de loja/premium.

Modelo atual:

- `games.world_state`: relogio, fase, temporada, ligas, standings, matches, copas, noticias e historico.
- `games.teams_data`: times do mundo como JSONB.
- `games.players_data`: jogadores do mundo como JSONB.
- `games.managers_data`: tecnicos do mundo como JSONB.
- Participantes humanos tambem ficam em linhas de `games`, uma linha por usuario/mundo.

Problema:

- Nao existe fonte relacional por mundo.
- Ranking, filtros, query de jogadores livres, standings e calendario dependem de JSONB.
- Varios mundos futuros ficam pesados e dificeis de auditar.
- Updates simultaneos podem sobrescrever blocos grandes.

## Arquitetura Alvo

Criar tabelas normalizadas por mundo:

```txt
worlds
world_participants
world_managers
world_teams
world_players
world_matches
world_standings
world_news
world_snapshots
```

Manter `games` por enquanto como compatibilidade e backup. Nao apagar a tabela no primeiro passo.

## Tabelas Propostas

### `worlds`

Representa um mundo/linha temporal.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `legacy_world_id text unique`
- `creator_user_id uuid references auth.users(id)`
- `name text`
- `status text`
- `phase text`
- `current_season integer`
- `current_day integer`
- `current_round integer`
- `current_date timestamptz`
- `season_start_at timestamptz`
- `is_public boolean`
- `join_code text unique`
- `rules jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Notas:

- `legacy_world_id` permite migrar dados atuais de `games.world_id`.
- `rules` guarda coisas como `seasonRounds`, `eliteCupRounds`, `offseasonDays`, `midSeasonJoinMaxRound`.

### `world_participants`

Representa usuarios dentro de mundos.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `world_id uuid references worlds(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete cascade`
- `team_id text null`
- `manager_id text null`
- `role text`
- `is_creator boolean`
- `is_observer boolean`
- `joined_at timestamptz`
- `updated_at timestamptz`

Constraints:

- `unique(world_id, user_id)`
- `unique(world_id, team_id)` where `team_id is not null`

### `world_managers`

Managers NPC e humanos por mundo.

Campos:

- `world_id uuid`
- `manager_id text`
- `user_id uuid null`
- `name text`
- `district text`
- `reputation integer`
- `is_npc boolean`
- `attributes jsonb`
- `career jsonb`
- `achievements jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(world_id, manager_id)`

### `world_teams`

Times por mundo.

Campos:

- `world_id uuid`
- `team_id text`
- `name text`
- `city text`
- `district text`
- `league text`
- `manager_id text null`
- `colors jsonb`
- `logo jsonb`
- `tactics jsonb`
- `lineup jsonb`
- `chemistry integer`
- `power_cap integer`
- `inventory jsonb`
- `titles jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(world_id, team_id)`

Indices:

- `(world_id, district)`
- `(world_id, league)`
- `(world_id, manager_id)`

### `world_players`

Jogadores por mundo. Esta e a tabela mais importante.

Campos:

- `world_id uuid`
- `player_id text`
- `name text`
- `nickname text`
- `district text`
- `position text`
- `role text`
- `total_rating integer`
- `potential integer`
- `current_phase numeric`
- `contract_team_id text null`
- `appearance jsonb`
- `pentagon jsonb`
- `fusion jsonb`
- `badges jsonb`
- `history jsonb`
- `satisfaction integer`
- `training_progress integer`
- `fatigue integer`
- `achievements jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(world_id, player_id)`

Indices:

- `(world_id, total_rating desc)`
- `(world_id, role)`
- `(world_id, district)`
- `(world_id, contract_team_id)`
- `(world_id, contract_team_id, total_rating desc)`

Notas:

- `player_id` pode continuar sendo string (`p_123`) para compatibilidade com o app.
- Nao usar `uuid` aqui no primeiro passo para evitar reescrever todo o engine.

### `world_matches`

Partidas por mundo.

Campos:

- `world_id uuid`
- `match_id text`
- `season integer`
- `competition text`
- `league_id text null`
- `round integer`
- `home_team_id text`
- `away_team_id text`
- `scheduled_at timestamptz`
- `status text`
- `played boolean`
- `home_score integer null`
- `away_score integer null`
- `result jsonb`
- `events jsonb`
- `created_at timestamptz`
- `updated_at timestamptz`

Primary key:

- `(world_id, match_id)`

Indices:

- `(world_id, season, competition)`
- `(world_id, scheduled_at)`
- `(world_id, status)`
- `(world_id, home_team_id)`
- `(world_id, away_team_id)`

### `world_standings`

Classificacao por liga/competicao.

Campos:

- `world_id uuid`
- `season integer`
- `league_id text`
- `team_id text`
- `points integer`
- `played integer`
- `won integer`
- `drawn integer`
- `lost integer`
- `goals_for integer`
- `goals_against integer`
- `updated_at timestamptz`

Primary key:

- `(world_id, season, league_id, team_id)`

### `world_news`

Noticias e reports por mundo.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `world_id uuid`
- `season integer`
- `day integer`
- `type text`
- `title text`
- `message text`
- `payload jsonb`
- `created_at timestamptz`

Indices:

- `(world_id, created_at desc)`
- `(world_id, season, day)`

### `world_snapshots`

Backup/debug. Mantem snapshots ocasionais do `GameState` completo.

Campos:

- `id uuid primary key default gen_random_uuid()`
- `world_id uuid`
- `reason text`
- `state jsonb`
- `created_at timestamptz`

Uso:

- Criar snapshot antes/depois de migrar.
- Criar snapshot no fim de temporada.
- Facilitar rollback em teste.

## Ordem de Trabalho Recomendada

### Fase 1: Migration SQL segura

Criar migration:

```txt
supabase/migrations/YYYYMMDDHHMMSS_world_normalization.sql
```

Ela deve:

- Criar tabelas `worlds`, `world_participants`, `world_managers`, `world_teams`, `world_players`, `world_matches`, `world_standings`, `world_news`, `world_snapshots`.
- Ativar RLS.
- Criar policies de leitura/escrita por participante.
- Criar indices.
- Nao apagar `games`.
- Nao migrar dados automaticamente ainda.

Acceptance:

- SQL roda no Supabase sem erro.
- Auditoria mostra todas as tabelas `OK`.
- Nenhum comportamento do app muda ainda.

### Fase 2: Adapter de escrita paralela

Criar modulo:

```txt
src/lib/worldRepository.ts
```

Funcoes:

- `createNormalizedWorldFromState(state, legacyWorldId)`
- `syncNormalizedWorldFromState(worldUuid, state)`
- `loadNormalizedWorld(worldUuid)`
- `saveWorldSnapshot(worldUuid, state, reason)`

Nesta fase o app ainda carrega de `games`, mas quando salva o criador tambem escreve nas tabelas `world_*`.

Acceptance:

- Criar mundo continua funcionando.
- `games` continua preenchida.
- `world_players`, `world_teams`, `world_matches`, `world_standings` tambem ficam preenchidas.
- UI nao muda.

### Fase 3: Auditoria visual e SQL

Criar arquivo:

```txt
supabase/world_normalization_audit.sql
```

Auditar:

- Quantidade de mundos.
- Quantidade de jogadores por mundo.
- Quantidade de times por mundo.
- Quantidade de matches por mundo.
- Quantidade de standings por liga.
- Top 50 jogadores por mundo.
- Jogadores livres por mundo.
- Duplicidade de time assumido por mundo.

Acceptance:

- Query mostra 1 mundo com aproximadamente 1000 jogadores.
- 32 clubes e 4 selecoes por mundo.
- 4 ligas com 8 clubes.
- 7 rodadas por liga se a temporada atual continuar de turno unico.

### Fase 4: Leitura backend-first opcional

Adicionar feature flag:

```env
VITE_WORLD_BACKEND_MODE=jsonb
```

Valores:

- `jsonb`: comportamento atual.
- `parallel`: salva JSONB e normalizado, carrega JSONB.
- `normalized`: carrega das tabelas `world_*`.

Implementar `normalized` somente depois que `parallel` estiver estavel.

Acceptance:

- Trocar a flag localmente carrega o mesmo mundo.
- Dashboard, Mundo, Ranking, Draft e Elenco continuam iguais.

### Fase 5: Migrar filtros pesados para SQL

Quando `world_players` estiver confiavel, trocar alguns filtros para query:

- Ranking mundial por rating.
- Jogadores livres.
- Busca por liga/distrito/rating/posicao.
- Top evolucoes.
- Elenco por time.

Acceptance:

- Ranking nao depende mais de carregar 1000 jogadores na memoria para tudo.
- Mundo global fica mais rapido.

## SQL Base da Migration

O agente deve gerar SQL idempotente usando:

```sql
create table if not exists ...
create index if not exists ...
alter table ... enable row level security;
drop policy if exists ...
create policy ...
```

Nao usar `drop table` sem confirmacao humana.

Nao apagar `games` nesta etapa.

## RLS Recomendada

Leitura:

- Participante do mundo pode ler `worlds`, `world_teams`, `world_players`, `world_matches`, `world_standings`, `world_news`.
- Mundo publico pode aparecer em listagem publica limitada.

Escrita:

- Criador pode atualizar relogio, matches, standings, news e snapshots.
- Participante pode atualizar apenas seu proprio `world_participants`.
- Participante com time pode atualizar apenas seu proprio `world_teams` em campos permitidos depois, idealmente via RPC.

Para o primeiro passo, preferir RPCs `security definer` para mutacoes importantes.

## RPCs Futuras

Criar depois das tabelas:

- `create_world_from_snapshot(p_legacy_world_id text, p_state jsonb)`
- `sync_world_from_snapshot(p_world_id uuid, p_state jsonb)`
- `claim_world_team(p_world_id uuid, p_team_id text, p_manager_name text)`
- `resign_world_team(p_world_id uuid)`
- `record_match_result(p_world_id uuid, p_match_id text, p_result jsonb)`
- `advance_world_day(p_world_id uuid)`

No MVP tecnico, `sync_world_from_snapshot` ja resolve muita coisa.

## Risco Principal

A maior armadilha e tentar trocar tudo de uma vez.

Nao fazer:

- Criar tabelas novas.
- Apagar `games`.
- Mudar `loadGameState`.
- Mudar `saveGameState`.
- Mudar engine.

Tudo no mesmo patch.

Fazer:

1. Criar tabelas.
2. Auditar.
3. Escrever em paralelo.
4. Auditar dados reais.
5. Ler normalizado atras de feature flag.
6. So depois aposentar JSONB.

## Checklist para o Agente

- Ler `src/types.ts` antes de mapear campos.
- Ler `src/engine/generator.ts` para entender shape inicial.
- Ler `src/lib/supabase.ts` para manter compatibilidade.
- Criar migration SQL idempotente.
- Criar audit SQL.
- Nao usar service role/secret em comando.
- Nao alterar `.env`.
- Nao remover tabela `games`.
- Rodar `npm run lint`.
- Rodar testes de fluxo de temporada depois de mexer no adapter.

## Decisao de Produto

Manter `player_id`, `team_id`, `manager_id` como `text` nas tabelas `world_*` por enquanto.

Motivo:

- O app inteiro ja usa IDs como `p_*`, `t_*`, `m_*`.
- Migrar para UUID agora aumenta risco sem beneficio imediato.
- O isolamento por mundo vem do par `(world_id, player_id)`, nao do ID sozinho.

## Resultado Esperado

Ao fim da migracao incremental, cada mundo deve ser independente:

- Mundo A tem `p_1` rating 812 no Neon NFC.
- Mundo B pode ter `p_1` rating 774 livre ou em outro clube.
- Ranking, mercado, calendario e tabela sempre filtram por `world_id`.
- O backend consegue auditar e consultar tudo sem abrir JSON gigante.

