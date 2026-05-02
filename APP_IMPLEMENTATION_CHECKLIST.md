# Elite 2050 - Checklist Tecnico de Implementacao

## Objetivo

Transformar o plano de melhoria do app em uma trilha executavel de desenvolvimento.

Este documento responde:

- o que fazer primeiro
- em quais arquivos mexer
- qual criterio de pronto usar
- o que testar em cada etapa

Importante:

- sem lesao
- foco em UX, loop principal, sem clube, propostas, mundo vivo e profundidade de gestao

## Ordem recomendada de execucao

### Bloco A

- fechar `Home` como cockpit
- fechar mobile e padronizacao `Cards / Lista`
- fechar `Config`

### Bloco B

- fechar `sem clube`
- fechar `propostas`
- fechar `janela de entrada`
- fechar `mercado de reposicao`

### Bloco C

- fortalecer `news`
- fortalecer `reports`
- fortalecer `fim de temporada`

### Bloco D

- aumentar peso percebido de `tatica + treino`
- melhorar leitura de rendimento

### Bloco E

- polir `loja + inventario + equipar`
- consolidar backend por mundo

---

## Release 1.0.1 - Clareza e limpeza do loop

### 1. Home como cockpit principal

Arquivos principais:

- `src/components/dashboard/HomeTab.tsx`
- `src/components/Dashboard.tsx`
- `src/hooks/useDashboardData.ts`
- `src/utils/matchUtils.ts`

Implementar:

- [ ] bloco `Agora` com estado atual do clube
- [ ] bloco `Proximo compromisso` com leitura muito clara
- [ ] bloco `O que mudou desde sua ultima entrada`
- [ ] score do clube com ocupado, reservado e livre
- [ ] separar permanentemente:
  - CTA principal
  - guia opcional
  - checklist opcional
- [ ] se nao houver acao urgente, mostrar recomendacao de melhoria, nao vazio

Criterio de pronto:

- o jogador entra e entende o proximo passo sem abrir outras abas

Teste manual:

- [ ] mundo em pre-season
- [ ] mundo em temporada
- [ ] pos-jogo pendente
- [ ] offseason
- [ ] sem clube

### 2. Padronizacao total de visualizacao

Arquivos principais:

- `src/components/dashboard/SquadTab.tsx`
- `src/components/dashboard/DraftPanel.tsx`
- `src/components/dashboard/WorldTab.tsx`
- `src/components/TeamModal.tsx`
- `src/components/PlayerCard.tsx`
- `src/components/PlayerModal.tsx`

Implementar:

- [ ] `Cards / Lista` em todos os lugares que faltarem
- [ ] lista por posicao onde fizer sentido
- [ ] grid compacta consistente no mobile
- [ ] modais com scroll confiavel
- [ ] remover versoes micro que sacrificam leitura

Criterio de pronto:

- nenhuma tela de atleta ou clube parece usar um componente “de outra era”

Teste manual:

- [ ] elenco
- [ ] draft mercado
- [ ] draft elenco
- [ ] ranking mundial
- [ ] mercado mundial
- [ ] modal de time

### 3. Settings de verdade

Arquivos principais:

- `src/components/dashboard/CareerTab.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/Dashboard.tsx`

Implementar:

- [ ] som ligado/desligado
- [ ] ajuda inicial ligada/oculta
- [ ] reduzir animacoes
- [ ] confirmar acoes sensiveis
- [ ] persistir preferencias em `localStorage`

Criterio de pronto:

- configuracoes basicas influenciam o uso real do app

Teste manual:

- [ ] desligar som e recarregar
- [ ] ocultar ajuda e recarregar
- [ ] reduzir animacao e navegar

### 4. Limpeza de GM/dev

Arquivos principais:

- `src/components/Dashboard.tsx`
- `src/components/dashboard/CareerTab.tsx`
- `src/components/dashboard/WorldTab.tsx`

Implementar:

- [ ] manter ferramentas de GM so onde fizer sentido
- [ ] elementos de dev so para criador ou ambiente de teste
- [ ] evitar poluicao no fluxo principal

Criterio de pronto:

- um jogador normal nunca acha que entrou numa tela de debug

---

## Release 1.1 - Sem clube, propostas e entrada no mundo

### 5. Fluxo completo de sem clube

Estado atual ja existente:

- tipo `ClubOffer` em `src/types.ts`
- `clubOffers` em `WorldState`
- `resolveClubOfferMarket` em `src/engine/gameLogic.ts`
- `submitClubApplication` e `respondToClubOffer` em `src/store/GameContext.tsx`

Arquivos principais:

- `src/types.ts`
- `src/store/GameContext.tsx`
- `src/engine/gameLogic.ts`
- `src/components/ObserverClaimPanel.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/dashboard/WorldTab.tsx`

Implementar:

- [ ] trocar o fluxo bruto de `claimTeam` por proposta quando o usuario estiver sem clube
- [ ] tela clara de oportunidades para sem clube
- [ ] inbox de propostas recebidas
- [ ] proposta enviada com status visivel
- [ ] prazo de resposta visivel
- [ ] explicar quando a entrada vale para hoje ou para a proxima temporada

Criterio de pronto:

- ficar sem clube continua jogavel e inteligivel

Teste manual:

- [ ] pedir vaga para um clube
- [ ] receber convite
- [ ] aceitar
- [ ] recusar
- [ ] expirar
- [ ] tentar entrar fora da janela

### 6. Janela de entrada e regras de timing

Arquivos principais:

- `src/engine/gameLogic.ts`
- `src/constants/gameConstants.ts`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/ObserverClaimPanel.tsx`

Implementar:

- [ ] texto claro da janela de entrada
- [ ] regra de entrada no dia seguinte
- [ ] regra de entrada para proxima temporada quando avancou demais
- [ ] explicacao visual na Home e no fluxo de proposta

Criterio de pronto:

- o usuario sempre entende por que entrou agora, amanha ou na proxima season

### 7. Mercado de reposicao no meio da temporada

Estado atual ja sugerido:

- `ensureRecoveryFreeAgentPool` em `src/engine/gameLogic.ts`

Arquivos principais:

- `src/engine/gameLogic.ts`
- `src/engine/generator.ts`
- `src/hooks/useTransfers.ts`
- `src/components/dashboard/WorldTab.tsx`
- `src/components/dashboard/HomeTab.tsx`

Implementar:

- [ ] free agents decentes aparecendo durante a temporada
- [ ] filtro claro de livres
- [ ] card ou bloco `reposicao disponivel`
- [ ] equilibrio para nao quebrar o teto de score

Criterio de pronto:

- draft ruim atrapalha, mas nao mata a campanha

Teste manual:

- [ ] iniciar season com elenco ruim
- [ ] avancar alguns dias
- [ ] ver reposicao surgir
- [ ] contratar sem quebrar cap

---

## Release 1.2 - Mundo vivo e reports melhores

### 8. News mais vivas

Arquivos principais:

- `src/engine/newsService.ts`
- `src/engine/gameLogic.ts`
- `src/components/dashboard/HomeTab.tsx`
- `src/components/dashboard/WorldTab.tsx`

Implementar:

- [ ] noticia de tecnico em alta
- [ ] noticia de tecnico pressionado
- [ ] surpresa da rodada
- [ ] destaque individual
- [ ] proposta recebida
- [ ] vaga em clube
- [ ] corrida por titulo
- [ ] risco de queda

Criterio de pronto:

- o mundo parece se mover mesmo sem o usuario abrir tudo

Teste manual:

- [ ] jogar varios dias
- [ ] confirmar variedade das noticias
- [ ] abrir noticia e entender impacto

### 9. Reports de temporada e de rodadas

Arquivos principais:

- `src/components/SeasonReportModal.tsx`
- `src/components/MatchReports.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/engine/newsService.ts`
- `src/engine/MatchEngine.ts`

Implementar:

- [ ] season report mais forte
- [ ] destaques do clube do usuario
- [ ] campeoes das ligas
- [ ] campeao da copa
- [ ] tecnico destaque
- [ ] jogador destaque
- [ ] reports intermediarios com leitura melhor de contexto

Criterio de pronto:

- fim de temporada parece evento importante, nao so resumo tecnico

Teste manual:

- [ ] fechar uma temporada
- [ ] abrir report automatico
- [ ] validar destaque de clube, jogador e tecnico

### 10. Leitura de tempo e continuidade

Arquivos principais:

- `src/components/Dashboard.tsx`
- `src/components/dashboard/HomeTab.tsx`
- `src/engine/gameLogic.ts`

Implementar:

- [ ] reforcar relacao entre dia real e dia da season
- [ ] deixar claro quando a nova temporada comeca
- [ ] notificar melhor viradas de fase

Criterio de pronto:

- o jogador entende a vida do mundo ao longo dos dias reais

---

## Release 1.3 - Mais peso para gestao ativa

### 11. Mais peso para tatica

Arquivos principais:

- `src/engine/MatchEngine.ts`
- `src/engine/gameLogic.ts`
- `src/hooks/useTactics.ts`
- `src/components/dashboard/TacticsTab.tsx`
- `src/components/MatchReports.tsx`

Implementar:

- [ ] deixar estilo de jogo mais perceptivel no resultado
- [ ] deixar mentalidade mais perceptivel
- [ ] melhorar leitura de confronto tatico
- [ ] explicar no report o que funcionou ou falhou

Criterio de pronto:

- o usuario sente que mudar tatica mexe no tipo de jogo

Teste manual:

- [ ] jogar com tatica agressiva
- [ ] jogar com tatica reativa
- [ ] comparar reports

### 12. Mais peso para treino e fase

Arquivos principais:

- `src/hooks/useTraining.ts`
- `src/engine/gameLogic.ts`
- `src/types.ts`
- `src/components/dashboard/TrainingTab.tsx`
- `src/components/dashboard/HomeTab.tsx`

Implementar:

- [ ] treino alterar mais a leitura de forma
- [ ] fase do jogador mais visivel
- [ ] feedback de quem esta subindo ou caindo
- [ ] recomendacoes claras de treino

Criterio de pronto:

- o usuario percebe resultado ao treinar, nao so numero abstrato

Teste manual:

- [ ] treinar por alguns dias
- [ ] comparar jogadores em alta e em baixa

---

## Release 1.4 - Loja, inventario e equipar

### 13. Fluxo bonito de item

Arquivos principais:

- `src/components/dashboard/CareerTab.tsx`
- `src/constants/storeCatalog.ts`
- `src/utils/store.ts`
- `src/lib/metaStore.ts`

Implementar:

- [ ] modal grande de item
- [ ] preview de imagem melhor
- [ ] status claro de compra e equipar
- [ ] feedback melhor de premium e circuito

Criterio de pronto:

- clicar em item da vontade de comprar e equipar

### 14. Equipar chuteira no jogador

Arquivos principais:

- `src/components/PlayerCard.tsx`
- `src/components/PlayerModal.tsx`
- `src/utils/store.ts`
- `src/types.ts`

Implementar:

- [ ] quadradinho da chuteira no card pequeno
- [ ] painel de chuteira no modal grande
- [ ] lista simples para equipar ou remover
- [ ] retorno automatico ao inventario quando sair do clube

Criterio de pronto:

- equipar item em jogador fica simples e gostoso de usar

Teste manual:

- [ ] equipar chuteira
- [ ] trocar chuteira
- [ ] remover chuteira
- [ ] jogador sair do clube e chuteira voltar

---

## Release 1.5 - Backend fiel ao mundo

### 15. Normalizacao de mundo

Base existente:

- `src/lib/worldRepository.ts`
- `src/lib/supabase.ts`
- migration `supabase/migrations/20260421003000_world_normalization.sql`
- plano em `BACKEND_WORLD_NORMALIZATION_AGENT_PLAN.md`

Arquivos principais:

- `src/lib/worldRepository.ts`
- `src/lib/supabase.ts`
- `src/store/GameContext.tsx`
- `src/engine/generator.ts`
- `src/engine/gameLogic.ts`

Implementar:

- [ ] UI lendo das tabelas normalizadas
- [ ] menos dependencia de snapshots gigantes
- [ ] jogadores e times realmente por mundo
- [ ] standings, matches e news consistentes por mundo

Criterio de pronto:

- criar dois mundos diferentes gera dados realmente independentes

Teste manual:

- [ ] criar mundo A
- [ ] criar mundo B
- [ ] confirmar elencos, tabelas e news diferentes
- [ ] recarregar e persistir certo

---

## Arquivos de teste recomendados

Automatizados:

- `src/test/dashboardClickSmoke.test.tsx`
- `src/test/seasonFlow.test.ts`
- `src/test/gameLogic.test.ts`
- `src/test/matchEngine.test.ts`
- `src/test/calendar.test.ts`

Criar ou expandir:

- [ ] teste de proposta de clube
- [ ] teste de expiracao de proposta
- [ ] teste de entrada para proxima temporada
- [ ] teste de reposicao de free agents
- [ ] teste de retorno de chuteira ao inventario
- [ ] teste de configuracoes persistidas

---

## O que eu implementaria primeiro, de verdade

Se for continuar codando agora, esta e a melhor trilha:

1. `ObserverClaimPanel.tsx`
2. `GameContext.tsx`
3. `gameLogic.ts`
4. `HomeTab.tsx`
5. `WorldTab.tsx`

Motivo:

- isso fecha `sem clube + proposta + janela + oportunidade`
- e essa e a maior melhoria de profundidade com impacto real no jogo hoje

## Definicao de pronto do app melhorado

O app sobe de nivel quando:

- o jogador entende o que fazer sem pensar demais
- ficar sem clube continua divertido
- o mundo parece vivo dia apos dia
- taticas e treinos parecem importar
- a interface mobile para de brigar com o usuario
- a loja parece produto, nao painel tecnico
