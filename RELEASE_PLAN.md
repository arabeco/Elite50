# Elite 2050 - Plano de Lancamento 1.0

## O que eu posso acelerar do meu lado

- Consolidar o escopo do `1.0` em checklist objetivo.
- Auditar o projeto e apontar bloqueadores reais de release.
- Corrigir bugs e regressões diretamente no codigo.
- Rodar `lint`, `test` e `build` a cada etapa importante.
- Preparar smoke tests manuais com passos claros.
- Revisar fluxos criticos: login, mundo, draft, save/load, multiplayer, feedback.
- Organizar docs tecnicas de release para nao depender de contexto espalhado.
- Ajudar a limpar o worktree e separar o que entra agora do que fica para `1.1`.
- Revisar Supabase do lado do app e das migracoes que existirem no repo.
- Montar plano de hardening para beta fechada e launch publico.

## Escopo alvo do 1.0

O `1.0` fica considerado pronto se estes fluxos estiverem funcionando de ponta a ponta:

- Login e signup com Supabase
- Criar ou entrar em um mundo
- Assumir um clube
- Draft Genesis funcional
- Home com proximo passo claro
- Elenco com visualizacao `Cards/Lista`
- Mundo com mercado, ranking e modal de time
- Carreira utilizavel
- Save/load funcionando ao recarregar
- Feedback report salvando no banco
- Multiplayer basico: participante entrar em mundo existente e assumir clube NPC

## Status atual resumido

- `npm run lint` passa
- `npm run test` passa
- `npm run build` passa
- Existe cobertura automatizada para fluxo de dashboard, temporada, multiplayer e equilibrio
- O projeto parece apto para `beta fechada`
- Ainda precisa validacao real de ambiente antes de `launch publico`

## Bloqueia launch

### 1. Fechar o snapshot oficial do release

- Decidir o que entra no `1.0`
- Revisar o `git status` atual
- Identificar arquivos experimentais, sobras e assets antigos
- Garantir que o branch de release fique coeso

### 2. Validacao real do Supabase

- Confirmar `VITE_SUPABASE_URL`
- Confirmar `VITE_SUPABASE_ANON_KEY`
- Validar providers de auth
- Validar redirects do Supabase
- Aplicar migracoes pendentes
- Confirmar `feedback_reports` funcionando
- Confirmar politicas de acesso sem erro

### 3. Smoke manual em preview/producao

- Login
- Criar mundo
- Entrar em mundo compartilhado
- Assumir clube
- Fazer draft valido
- Abrir Home, Elenco, Mundo e Carreira
- Avancar dias
- Recarregar e manter estado
- Enviar feedback report

### 4. Revisao de assets criticos

- Conferir hair assets novos
- Confirmar que nenhum avatar quebra
- Confirmar `logo.png`
- Confirmar imagens de fundo mais usadas

## Fazer nesta semana

### Produto e UX

- Revisar textos com encoding quebrado
- Padronizar labels de toggles e filtros
- Revisar estados vazios
- Revisar erros de rede e mensagens de falha
- Testar mobile de verdade

### Tecnico

- Limpar arquivos de sobra na raiz
- Revisar tamanho do bundle
- Separar backlog de `1.1`
- Validar persistencia com mais de um usuario

## Pode ir para 1.1

- Code splitting por abas
- Otimizacao forte do bundle
- Telemetria mais rica
- Polimento visual fino
- Mais filtros e telas auxiliares
- Limpeza profunda de arquivos de auditoria antigos

## Checklist operacional de release

### A. Freeze de escopo

- [ ] Confirmar que o `1.0` inclui apenas os fluxos listados neste documento
- [ ] Separar tudo que nao entra agora
- [ ] Revisar worktree e definir snapshot de release

### B. Banco e ambiente

- [ ] Aplicar migracoes do Supabase
- [ ] Validar tabela `feedback_reports`
- [ ] Validar auth por email
- [ ] Validar Google auth, se entrar no `1.0`
- [ ] Confirmar envs na Vercel
- [ ] Confirmar redirects no Supabase

### C. Smoke funcional

- [ ] Criar mundo novo
- [ ] Entrar como criador
- [ ] Assumir clube
- [ ] Completar draft
- [ ] Trocar entre `Cards/Lista` no elenco
- [ ] Trocar entre `Cards/Lista` no draft
- [ ] Trocar entre `Cards/Lista` no mundo
- [ ] Testar filtros do ranking mundial
- [ ] Abrir modal de time
- [ ] Abrir modal de jogador
- [ ] Avancar pelo menos alguns dias
- [ ] Recarregar e confirmar persistencia
- [ ] Enviar feedback report

### D. Multiplayer

- [ ] Entrar com segundo usuario
- [ ] Participante entrar no mundo existente
- [ ] Participante assumir clube NPC
- [ ] Confirmar que nao vira criador
- [ ] Confirmar que o mundo continua consistente depois de save/load

### E. Build e deploy

- [ ] Rodar `cmd /c npm run lint`
- [ ] Rodar `cmd /c npm run test`
- [ ] Rodar `cmd /c npm run build`
- [ ] Subir preview
- [ ] Rodar smoke em preview
- [ ] Corrigir bugs achados
- [ ] Publicar beta fechada

## Plano sugerido por fase

### Fase 1 - Beta fechada

Objetivo:
ter um grupo pequeno testando o jogo real sem abrir publico ainda.

Requisitos minimos:

- lint ok
- testes ok
- build ok
- Supabase validado
- smoke manual ok
- sem bug bloqueando draft, save/load ou entrar em mundo

### Fase 2 - Launch publico

Objetivo:
abrir para mais gente com risco controlado.

Requisitos adicionais:

- 1 ou 2 dias de observacao sem perda de save
- feedback report chegando normal
- sem erro recorrente em auth
- sem bug grave de UI em mobile

## Riscos conhecidos hoje

- O bundle esta grande para primeira carga
- Existe historico de encoding quebrado em parte do projeto
- O worktree esta bem cheio e precisa consolidacao antes do release
- O maior risco agora nao parece ser motor de jogo, e sim integracao real e organizacao do snapshot

## Ordem recomendada de execucao

1. Fechar escopo do `1.0`
2. Consolidar o worktree
3. Validar Supabase real
4. Rodar smoke manual completo
5. Subir preview
6. Corrigir bugs encontrados
7. Abrir beta fechada
8. Monitorar feedback e saves
9. Fazer launch publico

## Proximos passos que eu posso assumir agora

- Revisar o worktree e separar o que e `release now` vs `depois`
- Fazer auditoria de Supabase no codigo e nas migracoes
- Montar checklist de smoke manual em formato mais detalhado
- Atacar os bugs que aparecerem no preview
- Ajudar a preparar um branch de release limpo

## Triagem atual do worktree

### Entra no 1.0

Arquivos que parecem fazer parte direta do produto que ja esta sendo validado pelos testes e pelo fluxo principal:

- `src/components/Dashboard.tsx`
- `src/components/Login.tsx`
- `src/components/FeedbackReportModal.tsx`
- `src/components/ObserverClaimPanel.tsx`
- `src/components/OnboardingHint.tsx`
- `src/components/PlayerAvatar.tsx`
- `src/components/PlayerCard.tsx`
- `src/components/PlayerModal.tsx`
- `src/components/TeamLogo.tsx`
- `src/components/TeamModal.tsx`
- `src/components/WorldParticipantsPanel.tsx`
- `src/components/WorldSelector.tsx`
- `src/components/dashboard/DraftPanel.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/dashboard/SquadTab.tsx`
- `src/components/dashboard/WorldTab.tsx`
- `src/components/dashboard/CompetitionTab.tsx`
- `src/components/dashboard/DatabaseTab.tsx`
- `src/components/dashboard/CareerTab.tsx`
- `src/components/MatchReports.tsx`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useGameDay.ts`
- `src/hooks/useTraining.ts`
- `src/hooks/useTransfers.ts`
- `src/lib/feedback.ts`
- `src/lib/supabase.ts`
- `src/store/GameContext.tsx`
- `src/engine/gameLogic.ts`
- `src/engine/generator.ts`
- `src/engine/newsService.ts`
- `src/engine/MatchEngine.ts`
- `src/engine/districtCupLogic.ts`
- `src/engine/economyLogic.ts`
- `src/engine/seed_universe.ts`
- `src/engine/simulation.ts`
- `src/types.ts`
- `src/utils/teamIdentity.ts`
- `src/constants/avatarAssets.ts`
- `public/logo.png`
- `supabase/migrations/20260419000000_feedback_reports.sql`
- `src/test/assetMapping.test.ts`
- `src/test/balanceQA.test.ts`
- `src/test/dashboardClickSmoke.test.tsx`
- `src/test/homeFlowSmoke.test.tsx`
- `src/test/multiplayerSupabase.test.ts`
- `src/test/seasonFlow.test.ts`

### Pode esperar para 1.1

Arquivos e frentes que parecem mais polimento, ferramenta interna ou melhoria nao essencial para o `launch`:

- `src/components/HairCalibrationPanel.tsx`
- `scripts/balance-sim.ts`
- `supabase/launch_audit.sql`
- limpeza de arquivos antigos de auditoria na raiz
- otimizacao de bundle
- refinamento visual extra em telas nao centrais

### Arriscado ou precisa decisao

Itens que merecem decisao explicita antes de publicar:

- `src/components/SeasonReportModal.tsx`
  entra no `1.0`.
  leitura atual: e uma noticia normal do fim da temporada, com modal proprio ao clicar.
  melhoria desejada: pode abrir automaticamente para todos no fechamento da temporada, mostrando:
  - seu clube
  - campeoes das ligas
  - campeoes das copas
  - destaque de jogador
  - destaque de tecnico

- `src/components/dashboard/TrainingTab.tsx`
- `src/components/dashboard/TacticsTab.tsx`
- `src/components/ManagerModal.tsx`
- `src/components/NewGameFlow.tsx`
- `src/components/NewsFeed.tsx`
- `src/components/ToastContainer.tsx`
  provavelmente entram, mas pedem revisao final para confirmar que nao ficaram no meio do caminho.

- avatar assets e cabelos:
  informado como ja consolidado anteriormente.
  deixar apenas um sanity check visual antes do release.

### Recomendacao de consolidacao

Se a meta for acelerar sem abrir risco desnecessario:

1. Fechar como `release now` tudo que esta sustentando os testes que ja passam.
2. Tratar avatar assets e nomes de arquivos como uma mini tarefa dedicada.
3. Decidir explicitamente se `SeasonReportModal` e ajustes mais profundos de carreira/treinamento entram agora.
4. Empurrar ferramentas internas e polimento pesado para `1.1`.

## Plano de commits para o release branch

### Primeiro commit do release branch

Objetivo:
cravar o `core 1.0` que ja esta funcional, testado e alinhado com o produto.

Entram neste primeiro commit:

- `src/components/Dashboard.tsx`
- `src/components/Login.tsx`
- `src/components/ManagerModal.tsx`
- `src/components/MatchReports.tsx`
- `src/components/NewGameFlow.tsx`
- `src/components/NewsFeed.tsx`
- `src/components/PlayerAvatar.tsx`
- `src/components/PlayerCard.tsx`
- `src/components/PlayerModal.tsx`
- `src/components/TeamLogo.tsx`
- `src/components/ToastContainer.tsx`
- `src/components/WorldSelector.tsx`
- `src/components/FeedbackReportModal.tsx`
- `src/components/ObserverClaimPanel.tsx`
- `src/components/OnboardingHint.tsx`
- `src/components/SeasonReportModal.tsx`
- `src/components/TeamModal.tsx`
- `src/components/WorldParticipantsPanel.tsx`
- `src/components/dashboard/CareerTab.tsx`
- `src/components/dashboard/CompetitionTab.tsx`
- `src/components/dashboard/DatabaseTab.tsx`
- `src/components/dashboard/DraftPanel.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/dashboard/SquadTab.tsx`
- `src/components/dashboard/TacticsTab.tsx`
- `src/components/dashboard/TrainingTab.tsx`
- `src/components/dashboard/WorldTab.tsx`
- `src/constants/avatarAssets.ts`
- `src/constants/gameConstants.ts`
- `src/engine/MatchEngine.ts`
- `src/engine/districtCupLogic.ts`
- `src/engine/economyLogic.ts`
- `src/engine/gameLogic.ts`
- `src/engine/generator.ts`
- `src/engine/newsService.ts`
- `src/engine/seed_universe.ts`
- `src/engine/simulation.ts`
- `src/hooks/useDashboardData.ts`
- `src/hooks/useGameDay.ts`
- `src/hooks/useTactics.ts`
- `src/hooks/useTraining.ts`
- `src/hooks/useTransfers.ts`
- `src/lib/feedback.ts`
- `src/lib/supabase.ts`
- `src/store/GameContext.tsx`
- `src/types.ts`
- `src/utils/teamIdentity.ts`
- `public/logo.png`
- `public/assetas/avatars/hair/fem/*`
- `public/assetas/avatars/hair/masc/*`
- `public/assetas/avatars/logs/*`
- remover `public/assetas/avatars/hair/hair_1.png`
- `supabase/migrations/20260419000000_feedback_reports.sql`
- `src/test/assetMapping.test.ts`
- `src/test/balanceQA.test.ts`
- `src/test/dashboardClickSmoke.test.tsx`
- `src/test/homeFlowSmoke.test.tsx`
- `src/test/multiplayerSupabase.test.ts`
- `src/test/seasonFlow.test.ts`
- `src/test/gameLogic.test.ts`

Justificativa:

- aqui fica tudo que sustenta os fluxos centrais do produto
- esse conjunto ja passou por `lint`, `test` e `build`
- esse commit deve virar a base do preview de beta fechada

### Segundo commit do release branch

Objetivo:
entrar com documentacao e organizacao de lancamento sem misturar com o core.

Entram aqui:

- `RELEASE_PLAN.md`

Opcionalmente:

- notas internas de rollout ou changelog, se voces quiserem manter no repo

### Nao entra no release branch inicial

Deixar fora por enquanto:

- `src/components/HairCalibrationPanel.tsx`
- `scripts/balance-sim.ts`
- `supabase/launch_audit.sql`

Tambem podem ficar fora do primeiro momento:

- qualquer arquivo de auditoria antigo na raiz
- qualquer experimento que nao participe do fluxo validado por smoke/tests

### Regra pratica para montar o branch

Se um arquivo:

- participa do fluxo `login -> mundo -> clube -> draft -> temporada -> save/load`
- ou e necessario para `observer/takeover`
- ou sustenta `Season Report`, `feedback`, `multiplayer`
- ou faz os testes atuais passarem

entao ele entra no primeiro commit.
