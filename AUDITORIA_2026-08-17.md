# Auditoria Geral — Elite 2050

Data: 2026-08-17
Escopo: egress Supabase, segurança, código morto, incoerências, UI, checagens de backend.

---

## 0. Sumário executivo

O estouro de egress **não é um problema de volume de jogadores**. É consequência de três
decisões de arquitetura que se multiplicam entre si:

1. **A linha de save é monolítica e gigante** (~1,5 MB por mundo, medido).
2. **Toda leitura é `select('*')`** — nunca se lê só o que a tela precisa.
3. **Cada save do criador dispara um evento realtime que faz *todos* os participantes
   rebaixarem o mundo inteiro.**

Somando isso a uma policy de RLS aberta (`USING (true)`), qualquer conta autenticada pode
baixar o banco inteiro. Isso é, ao mesmo tempo, o maior risco de egress e um furo de privacidade.

Além do egress, a auditoria encontrou **dois bugs funcionais silenciosos** (um deles pode estar
impedindo 100% dos saves agora) e 38 erros de compilação de tipos que hoje passam batido porque
o build do Vite não roda `tsc`.

**Prioridade sugerida:** §4 (bloqueadores) → §2 (RLS) → §1 (egress) → §5–7 (dívida técnica/UI).

---

## 1. Egress — causa raiz

### 1.1 Tamanho real da linha (medido, não estimado)

Gerei um mundo novo com `generateInitialState()` e serializei cada coluna:

| Coluna | Tamanho | Observação |
|---|---|---|
| `players_data` | **1.483,0 KB** | 1000 jogadores — 95% do peso |
| `teams_data` | 46,0 KB | 36 times |
| `world_state` | 19,7 KB | cresce durante a temporada (notícias, resultados, histórico) |
| `managers_data` | 16,2 KB | 40 managers |
| **Total por linha** | **~1.565 KB** | mundo recém-criado, só cresce |

O `world_state` de 19,7 KB é quase todo `world.leagues` (19,1 KB) e **cresce ao longo da
temporada** conforme partidas ganham resultado, eventos e notícias.

### 1.2 Os quatro vazamentos

#### (A) `loadGameState` baixa o mundo inteiro, de todo mundo — o pior deles

[src/lib/supabase.ts:310](src/lib/supabase.ts:310)

```ts
const { data: allWorldRecords } = await supabase
  .from('games')
  .select('*')                    // <-- todas as colunas
  .eq('world_id', worldId)        // <-- de TODAS as linhas do mundo
  .order('updated_at', { ascending: true });
```

Isso baixa a linha do criador (~1,5 MB) **mais a linha de cada participante**. E cada linha de
participante carrega uma **cópia integral do `world_state`** do mestre — veja
[src/lib/supabase.ts:127-138](src/lib/supabase.ts:127), onde o participante lê o `world_state` do
criador só para regravá-lo idêntico na própria linha. Um mundo com 4 pessoas ≈ **1,6 MB por
chamada**.

`loadGameState` é chamada em:
- carga inicial do mundo;
- **todo evento realtime `WORLD_UPDATED`** ([GameContext.tsx:994](src/store/GameContext.tsx:994));
- falha de claim de tick ([GameContext.tsx:1072](src/store/GameContext.tsx:1072));
- depois de `claimTeam` e `resignFromTeam`.

#### (B) A amplificação realtime — o multiplicador

Este é o mecanismo que transforma um problema linear em exponencial:

```
Criador altera estado (treino, tática, transferência, virada de dia)
   └─> autosave (debounce 5s)  →  UPDATE em public.games
         └─> trigger emit_world_event_after_game_change
               └─> INSERT em world_events  (WORLD_UPDATED)
                     └─> N participantes recebem via realtime
                           └─> CADA UM chama loadGameState()  →  N × 1,6 MB
```

O trigger ([20260710001000_world_events.sql](supabase/migrations/20260710001000_world_events.sql))
só emite `WORLD_UPDATED` quando `world_state`/`teams_data`/`players_data` realmente mudam — então
o mundo ocioso não gera tráfego. Mas **durante jogo ativo, praticamente toda ação muda
`players_data`**, e cada uma custa `N × 1,6 MB`.

**Modelo estimado** (criador ativo + 3 participantes online, ~20 ações significativas por hora):

```
20 eventos/h × 3 participantes × 1,6 MB = 96 MB/hora, por mundo
```

Três horas de sessão multiplayer ≈ **288 MB**. A cota Free é 5 GB/mês. **Cerca de 17 horas de
jogo multiplayer esgotam o mês inteiro** — e isso com um único mundo ativo.

#### (C) `listUserWorlds` / `listPublicWorlds` — baixam JSONB para renderizar um card

[src/lib/supabase.ts:601](src/lib/supabase.ts:601), [:613](src/lib/supabase.ts:613),
[:668](src/lib/supabase.ts:668)

```ts
.select('world_id, updated_at, world_state, user_id, is_public, is_creator')
```

As três consultas puxam o `world_state` **inteiro** e usam apenas 6 escalares dele:
`name`, `status`, `phase`, `currentDay`, `currentSeason`, `startScheduledAt`.

Pior: `listUserWorlds` faz isso **duas vezes** — uma para as linhas do usuário, outra para as
linhas mestre (`.in('world_id', worldIds)`). Com 5 mundos são ~10 blobs baixados só para
desenhar a tela de seleção. `listPublicWorlds` puxa mais 10.

`refreshWorlds` roda em todo `onAuthStateChange` — que inclui `TOKEN_REFRESHED` (~1×/hora) e
re-foco de aba.

**Correção:** `world_state` é `jsonb`; o PostgREST aceita seletores de campo. Trocar por:

```ts
.select('world_id, updated_at, user_id, is_public, is_creator, ' +
        'world_state->>name, world_state->>status, world_state->>phase, ' +
        'world_state->>currentDay, world_state->>currentSeason, world_state->>startScheduledAt')
```

Isso reduz essas três chamadas de ~centenas de KB para **poucos KB**. É a correção de melhor
custo-benefício de todo o relatório: baixo risco, ganho imediato.

#### (D) Saves redundantes

[src/store/GameContext.tsx:905-942](src/store/GameContext.tsx:905) — há **dois** mecanismos de
save simultâneos:

- debounce de 5s disparado por mudança de estado;
- `setInterval` de 60s que salva "enquanto joga", mesmo sem nada ter mudado.

O timer de 60s regrava ~1,5 MB de `players_data` mesmo quando nada mudou. Não gera egress
(escritas usam `Prefer: return=minimal` — confirmei em `postgrest-js`, nenhum
`return=representation` é enviado), mas consome CPU, I/O e cota de escrita, e mantém
`updated_at` girando à toa.

Além disso, ambos os efeitos listam `saveGame` nas dependências, e `saveGame` é recriado a cada
mudança de `state` — então o `setInterval` é destruído e recriado constantemente. Se o estado
mudar mais rápido que 60s, **o save periódico nunca dispara**. O mecanismo não faz o que o
comentário diz que faz.

### 1.3 Correções recomendadas, em ordem de retorno

| # | Ação | Esforço | Impacto |
|---|---|---|---|
| 1 | Seletores `world_state->>campo` em `listUserWorlds`/`listPublicWorlds` | baixo | alto |
| 2 | `loadGameState`: separar em `loadWorldCore` (mestre) + `loadMyRow` (só a linha do usuário) | médio | **muito alto** |
| 3 | Parar de duplicar `world_state` na linha do participante | médio | alto |
| 4 | Remover o `setInterval` de 60s; manter só o debounce | baixo | médio |
| 5 | Realtime: usar o payload do evento (já traz `world_day`, `phase`) para decidir se vale recarregar, e recarregar **só o delta** | alto | muito alto |
| 6 | Mover `players_data` para tabela própria com paginação, ou salvar só os jogadores que mudaram | alto | muito alto |

O item 6 é a solução estrutural: enquanto 1000 jogadores viajarem juntos em um único JSONB, todo
o resto é paliativo.

---

## 2. Segurança — RLS aberta em `public.games` 🔴

[supabase/migrations/20260225_enable_multiplayer.sql](supabase/migrations/20260225_enable_multiplayer.sql):

```sql
CREATE POLICY "Leitura pública de jogos"
ON games
FOR SELECT
TO authenticated
USING (true);
```

Verifiquei todas as 26 migrations: **nenhuma migration posterior restringe isso.**

Consequências:

- Qualquer usuário autenticado pode `select *` em **todas as linhas de `games`**, de todos os
  usuários. Saves alheios, mundos privados, tudo.
- A `anon key` está no bundle do cliente (por design). Basta um cadastro por e-mail para um
  script fazer `select * from games` em loop e **drenar a cota de egress de propósito ou por
  acidente**.
- É plausível que parte do consumo anômalo tenha vindo daqui, e não do jogo em si.

**Correção sugerida** (mantém o multiplayer funcionando — leitura liberada só para membros do
mundo, ou linhas mestre marcadas como públicas):

```sql
drop policy if exists "Leitura pública de jogos" on public.games;

create policy "games_select_world_members"
on public.games
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.games mine
    where mine.world_id = games.world_id
      and mine.user_id = auth.uid()
  )
  or (games.is_public is true and games.is_creator is true)
);
```

⚠️ **Teste em staging antes.** A terceira cláusula é o que mantém `listPublicWorlds` funcionando;
sem ela a vitrine de mundos públicos fica vazia. E `join_world_by_code` é `security definer`,
então continua funcionando independentemente da policy.

---

## 3. Estado atual do bloqueio (contexto)

Segundo [PENDENCIAS_EGRESS_SUPABASE.md](PENDENCIAS_EGRESS_SUPABASE.md), o projeto está em
`exceed_egress_quota`, Edge Functions retornando `402`, ciclo 24 Jun – 24 Jul.

Vale registrar que o `cron.job_run_details` marca o job como `succeeded` porque o `pg_cron` só
verifica se o `net.http_post` foi despachado — não o status HTTP da resposta. O sucesso é falso
positivo; a verdade está em `net._http_response` (SQL em §8).

---

## 4. Bloqueadores críticos

### 4.1 🔴 Os saves podem estar falhando 100% das vezes

[src/lib/supabase.ts:179-180](src/lib/supabase.ts:179) grava duas colunas:

```ts
transfer_proposals: state.transferProposals || [],
trade_offers: state.tradeOffers || [],
```

Essas colunas são criadas pela migration
[20260713001000_persist_market_requests.sql](supabase/migrations/20260713001000_persist_market_requests.sql)
— que, segundo o próprio `PENDENCIAS_EGRESS_SUPABASE.md`, **ainda não foi aplicada** ("Antes do
deploy da funcao, aplicar tambem…"). Ela também está **untracked no git**.

Se as colunas não existem, o PostgREST devolve `PGRST204` e **o upsert inteiro falha** — não é
uma falha parcial, o save não acontece. O erro é apenas logado
([supabase.ts:188](src/lib/supabase.ts:188)) e a função retorna `null`; o app mostra "Erro ao
salvar progresso" e segue.

O `world-clock-runner` também lê `record.transfer_proposals`
([index.ts:100](supabase/functions/world-clock-runner/index.ts:100)) — mesma dependência.

**Ação:** rodar a checagem 8.1 e aplicar a migration antes de qualquer outra coisa.

### 4.2 🔴 O relatório cego de partida está morto na Home

Funcionalidade quebrada em silêncio, sem erro em lugar nenhum.

O motor marca partidas do usuário como não reveladas — é o gancho de engajamento do jogo:

```ts
// src/engine/gameLogic.ts:1565 e :1721
match.revealed = false; // Blind report
```

Mas [src/hooks/useDashboardData.ts:69-85](src/hooks/useDashboardData.ts:69) monta um view-model
que **não copia o campo `revealed`**:

```ts
return {
  id: m.id, round: m.round, date: matchDate, time: matchTime,
  home: ..., away: ..., homeId: ..., awayId: ...,
  homeScore: m.homeScore, awayScore: m.awayScore,
  played: m.played, result: m.result, type: 'League'
  // revealed  <-- ausente
};
```

Todo consumidor de `pastMatches`/`userTeamMatches` lê `revealed === undefined`:

| Local | Código | Efeito |
|---|---|---|
| [HomeTab.tsx:139](src/components/dashboard/HomeTab.tsx:139) | `lastMatch?.revealed !== false` | sempre `true` → **placar revelado na hora, spoiler** |
| [HomeTab.tsx:335](src/components/dashboard/HomeTab.tsx:335) | `revealed === false` | nunca → CTA some |
| [HomeTab.tsx:464](src/components/dashboard/HomeTab.tsx:464), [:513](src/components/dashboard/HomeTab.tsx:513), [:875](src/components/dashboard/HomeTab.tsx:875) | idem | "Revelar relatorio" nunca aparece |
| [Dashboard.tsx:127](src/components/Dashboard.tsx:127) | `calendarNeedsAttention` | sempre `false` → **badge do calendário nunca acende** |
| [Dashboard.tsx:146](src/components/Dashboard.tsx:146) | `latestPlayed?.revealed === false` | nunca dispara |

A incoerência fica evidente ao comparar com o `CompetitionTab`, que tem **seu próprio mapper** e
copia o campo corretamente ([CompetitionTab.tsx:101](src/components/dashboard/CompetitionTab.tsx:101)
`revealed: match.revealed`). Ou seja: existem dois mappers para a mesma entidade, um correto e um
com perda — e o quebrado é o que alimenta a tela principal.

**Correção mínima:** adicionar `revealed: m.revealed` no retorno do `useDashboardData`. Uma linha
restaura o loop de engajamento inteiro.

---

## 5. Código morto e pontas soltas

### 5.1 Escrita em tabela inexistente

[src/hooks/useTransfers.ts:224](src/hooks/useTransfers.ts:224):

```ts
await supabase.from('notifications').insert({ ... });
```

**Não existe `public.notifications`** em nenhuma das 26 migrations (só a *coluna* `notifications`
em `games`). O retorno não é checado, então cada dispensa de jogador faz um POST que sempre
falha, em silêncio. Remover ou criar a tabela.

### 5.2 Arquivos nunca importados

| Arquivo | Situação |
|---|---|
| `src/components/Skeleton.tsx` | nunca importado |
| `src/engine/grip_analysis.ts` | nunca importado |
| `src/engine/migrationLogic.ts` | nunca importado |
| `src/testSeason.ts` | nunca importado |
| `src/components/Match2DViewer.tsx` | nunca importado **e** untracked no git |

### 5.3 Caminhos inalcançáveis

- **`worldTick.ts` inteiro é inatingível em produção.**
  [GameContext.tsx:1134](src/store/GameContext.tsx:1134):

  ```ts
  if (isAuthenticated) {
    return () => { /* cleanup */ };   // sai antes de criar o setInterval
  }
  const interval = setInterval(() => { processDueClockTick(); }, 1000);
  ```

  Para usuário autenticado — ou seja, todo usuário real — o `return` acontece antes do
  `setInterval`. `processDueClockTick` nunca roda, e com ela morrem `claimWorldTick`,
  `commitWorldTickState`, `completeWorldDayTick`, `buildWorldDayTickKey`, a tabela
  `world_tick_locks` e as migrations `20260601001000` / `20260619002000`.

  Isso pode até estar **correto** (o relógio virou responsabilidade do `world-clock-runner`), mas
  então é código legado que deve ser removido — hoje ele confunde qualquer leitura do fluxo e
  ninguém sabe que está morto.

- **`worldRepository.ts` / modo `dual_write`**: [supabase.ts:193](src/lib/supabase.ts:193) só
  sincroniza as tabelas normalizadas se `VITE_WORLD_BACKEND_MODE` for `dual_write`/`parallel`.
  O `.env` está em `legacy`. Logo, `worldRepository.ts` (281 linhas) e a migration
  `20260421003000_world_normalization.sql` (496 linhas) estão inertes.

- **`case 'draft'` no Dashboard**: [Dashboard.tsx:524](src/components/Dashboard.tsx:524) trata um
  valor que não existe no tipo `Tab` (`'home' | 'team' | 'calendar' | 'world' | 'career'`).
  É alcançável em runtime via [WorldTab.tsx:1708](src/components/dashboard/WorldTab.tsx:1708)
  (`onTabChange?.('draft')`, tipado como `any`) — e quando alcançado, a navegação inferior fica
  **sem nenhuma aba destacada**, porque `'draft'` não está na lista. Ou entra no tipo `Tab` e
  ganha item de nav, ou o caso sai.

- **`Match2DPreview` vai para o bundle de produção.**
  [App.tsx:17](src/App.tsx:17) importa estaticamente uma ferramenta de dev, exposta em
  `/match2d-preview` via checagem de `window.location.pathname`. Ela e todo o
  `match2DPlayEngine` viajam no bundle de todo usuário.

### 5.4 Higiene de repositório

- **4 migrations untracked** — incluindo `20260710001000_world_events.sql`, que já está aplicada
  em produção. O schema de produção não está versionado. Comitar isso é urgente.
- 15 diretórios `.tmp-*` e `.tmp-world-engine.mjs` (218 KB) soltos na raiz.
- `dist/` (20 MB) presente no diretório de trabalho.
- 25 `console.log` fora de testes, vários em caminho quente
  ([supabase.ts:723](src/lib/supabase.ts:723) loga **todo evento realtime**;
  [GameContext.tsx:390](src/store/GameContext.tsx:390) loga e ainda faz um `reduce` sobre todas as
  ligas só para montar a mensagem — trabalho jogado fora em produção).

---

## 6. Incoerências de tipo

`npm run lint` (= `tsc --noEmit`) devolve **38 erros**. Como o build do Vite não roda `tsc`, nada
disso trava o deploy — a checagem existe mas não protege ninguém.

| Arquivo | Erros |
|---|---|
| `src/components/dashboard/HomeTab.tsx` | 10 |
| `src/components/Dashboard.tsx` | 6 |
| `src/components/dashboard/CareerTab.tsx` | 4 |
| `src/components/LineupBuilder.tsx` | 4 |
| `src/test/balanceQA.test.ts` | 3 |
| `src/dev/Match2DPreview.tsx` | 3 |
| `src/components/dashboard/CompetitionTab.tsx` | 3 |
| `src/components/dashboard/WorldTab.tsx` | 2 |
| `SquadTab.tsx`, `PlayerModal.tsx`, `PlayerCard.tsx` | 1 cada |

**A causa raiz da maioria é uma só:** a entidade partida tem dois nomes para o mesmo campo.

- `types.ts` define `Match` com `homeTeamId` / `awayTeamId` (97 usos).
- `useDashboardData` produz um objeto anônimo com `homeId` / `awayId` (32 usos).
- Componentes recebem esse objeto mas anotam o parâmetro como `Match`.

Foi exatamente essa fenda que engoliu o `revealed` (§4.2). **Consertar o modelo elimina os 38
erros e previne a próxima perda silenciosa de campo.** Recomendo criar um tipo explícito
(`MatchViewModel`) exportado pelo hook, em vez de objeto anônimo.

Outros dois, independentes:

- [PlayerCard.tsx:265](src/components/PlayerCard.tsx:265) — comparação com `'DEF'` onde o tipo só
  admite `'ZAG' | 'MEI' | 'ATA'`. A condição é **sempre falsa**: mais um trecho de UI morto.
- [PlayerModal.tsx:416](src/components/PlayerModal.tsx:416) — chamada sem o argumento obrigatório.

### Testes

`npx vitest run` → **72 passam, 1 falha**:

```
FAIL src/test/seasonFlow.test.ts > runs draft, short league, Elite Cup, ...
Error: Test timed out in 5000ms.
```

É estouro de timeout, não erro de lógica — o teste leva ~5,5s contra um limite padrão de 5s.
Basta `it(..., { timeout: 30000 })`. Como está, a suíte é vermelha por configuração, o que
treina o time a ignorar falha de teste.

---

## 7. UI / UX

### 7.1 Bugs visuais concretos

- [Dashboard.tsx:555](src/components/Dashboard.tsx:555) — `h-[30]` é valor arbitrário **inválido**
  no Tailwind (sem unidade). A classe não é gerada e o glow superior fica com altura zero. O
  irmão na linha seguinte usa `h-[30%]` corretamente. Provável typo.
- [Dashboard.tsx:798](src/components/Dashboard.tsx:798) —
  `` className={`... sm:size-[${activeTab === tab.id ? 26 : 24}px] ...`} `` — o Tailwind faz
  varredura **estática** do fonte; classes montadas em template string em runtime nunca entram no
  CSS. Esse trecho não faz nada. Usar duas classes completas alternadas.

### 7.2 Mobile (o app é Capacitor/Android)

Apenas **um** arquivo em todo o projeto trata safe area (`ToastContainer.tsx:36`). O header é
`fixed top-2` e a navegação inferior é fixa — em aparelhos com notch ou barra de gestos, ambos
correm risco de corte. Recomendo `env(safe-area-inset-top/bottom)` no header e na nav.

### 7.3 Acessibilidade

**261 `<button>` para 10 `aria-label`.** Boa parte da navegação é de ícone puro (Lucide) sem
texto acessível — leitor de tela anuncia "botão" e nada mais. As 39 `<img>` têm todas `alt` (bom).

### 7.4 Performance de render

- **Zero code splitting** — nenhum `React.lazy` no projeto. O bundle é um único
  `index-*.js` de **2,5 MB**. Na web isso é tela branca em 3G; no APK, memória. Candidatos
  óbvios a `lazy()`: `Match2DPreview`, `MatchBroadcastViewer`, `CareerTab`, `WorldTab`.
- **`WorldTab.tsx`: 2.316 linhas e nenhum `useMemo`/`React.memo`.** É o maior componente do
  projeto e re-renderiza inteiro a cada mudança de contexto.
- [HomeTab.tsx:126](src/components/dashboard/HomeTab.tsx:126) roda um `setInterval` de 1s que
  chama `setCurrentRealMs` — re-render de um componente de 2.115 linhas **uma vez por segundo**,
  o tempo todo, só para mover um relógio. Isolar o relógio em um subcomponente próprio resolve.

### 7.5 Diagnóstico ao usuário

O app trata `402` do Supabase como erro genérico: "Erro ao salvar progresso". Durante a restrição
de egress, o jogador não tem como saber que o problema é do servidor e que o progresso local está
preservado. Vale distinguir falha de rede/quota de falha de dados, com mensagem específica.

---

## 8. SQL de checagem

Rodar no SQL Editor do Supabase, em ordem.

### 8.1 🔴 As colunas do mercado existem? (bloqueador do §4.1)

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'games'
  and column_name in ('transfer_proposals', 'trade_offers');
```

Zero linhas ⇒ **todos os saves estão falhando**. Aplique
`20260713001000_persist_market_requests.sql` imediatamente.

### 8.2 🔴 A RLS está aberta? (§2)

```sql
select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'games';
```

Se aparecer `qual = true` para `SELECT`, a base inteira está legível por qualquer conta.

### 8.3 Onde o peso está, por mundo

```sql
select
  world_id,
  count(*)                                              as linhas,
  pg_size_pretty(sum(pg_column_size(players_data)))     as players_data,
  pg_size_pretty(sum(pg_column_size(world_state)))      as world_state,
  pg_size_pretty(sum(pg_column_size(teams_data)))       as teams_data,
  pg_size_pretty(sum(
    pg_column_size(world_state) + pg_column_size(teams_data) +
    pg_column_size(players_data) + pg_column_size(managers_data)
  ))                                                    as total,
  max(updated_at)                                       as ultimo_save
from public.games
group by world_id
order by sum(
  pg_column_size(world_state) + pg_column_size(teams_data) +
  pg_column_size(players_data) + pg_column_size(managers_data)
) desc
limit 20;
```

### 8.4 Quanto se gasta duplicando `world_state` nos participantes

```sql
select
  pg_size_pretty(sum(pg_column_size(world_state))) as world_state_duplicado,
  count(*)                                         as linhas_participante
from public.games
where is_creator is not true;
```

Tudo o que aparecer aqui é desperdício puro — o participante regrava uma cópia idêntica à do
mestre (§1.2-A).

### 8.5 A Edge Function voltou? (falso positivo do cron)

```sql
select id, status_code, created, left(content, 200) as content
from net._http_response
order by id desc
limit 10;
```

`402` ⇒ ainda restrito. `200` ⇒ liberado.

### 8.6 Ritmo de eventos realtime — mede a amplificação do §1.2-B

```sql
select
  world_id,
  date_trunc('hour', created_at) as hora,
  event_type,
  count(*)                       as eventos
from public.world_events
where created_at > now() - interval '48 hours'
group by 1, 2, 3
order by eventos desc
limit 30;
```

Cada `WORLD_UPDATED` aqui equivale a `(nº de participantes online) × ~1,6 MB` de egress.
Multiplique a coluna `eventos` para dimensionar o estrago real.

### 8.7 Mundos com muitos participantes = maior multiplicador

```sql
select
  world_id,
  count(*) filter (where is_creator is true)     as criadores,
  count(*) filter (where is_creator is not true) as participantes,
  count(*) filter (where user_team_id is null)   as observadores,
  max(updated_at)                                as ultimo_save
from public.games
group by world_id
having count(*) > 1
order by count(*) desc;
```

### 8.8 Linhas órfãs / mundos abandonados (candidatos a limpeza)

```sql
select world_id,
       count(*) as linhas,
       max(updated_at) as ultimo_save,
       pg_size_pretty(sum(pg_column_size(players_data))) as peso
from public.games
group by world_id
having max(updated_at) < now() - interval '60 days'
order by sum(pg_column_size(players_data)) desc;
```

### 8.9 Confirmar que `games` não está na publicação realtime

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
```

Deve listar `world_events` e **não** `games`. (Segundo o `PENDENCIAS`, isso já foi corrigido —
vale reconfirmar após o desbloqueio.)

### 8.10 Estado do mundo Nois

```sql
select
  world_id, is_creator,
  world_state->>'name'                  as nome,
  world_state->>'status'                as status,
  world_state->>'phase'                 as fase,
  world_state->>'currentDay'            as dia,
  world_state->>'currentDate'           as data_jogo,
  world_state->>'serverClockLastTickAt' as ultimo_tick,
  updated_at
from public.games
where world_id = '1781875123484'
order by is_creator desc;
```

---

## 9. Plano de ação sugerido

**Agora (antes do reset da cota em 24/07)**

1. Rodar 8.1 e aplicar `20260713001000` se faltar — sem isso nada salva (§4.1).
2. Rodar 8.2 e fechar a RLS (§2) — impede que a cota nova seja drenada de novo.
3. Comitar as 4 migrations untracked (§5.4).

**Antes de reabrir o multiplayer**

4. Seletores `->>` em `listUserWorlds`/`listPublicWorlds` (§1.2-C) — 30 minutos, ganho grande.
5. Quebrar `loadGameState` em núcleo + linha do usuário (§1.2-A).
6. Remover o `setInterval` de 60s (§1.2-D).
7. Adicionar `revealed` ao `useDashboardData` (§4.2) — uma linha, restaura o loop de engajamento.

**Dívida técnica**

8. Tipar `MatchViewModel` e zerar os 38 erros de `tsc` (§6); colocar `tsc --noEmit` no CI.
9. Corrigir o timeout do `seasonFlow.test.ts` para a suíte voltar a ficar verde (§6).
10. Remover código morto: `worldTick`, `worldRepository`, arquivos órfãos, `notifications` (§5).
11. `React.lazy` nas rotas pesadas e isolar o relógio do `HomeTab` (§7.4).

**Estrutural (a decisão de fundo)**

12. Tirar `players_data` do JSONB monolítico. Enquanto 1000 jogadores viajarem juntos em uma
    coluna, todo o resto deste relatório é paliativo.
