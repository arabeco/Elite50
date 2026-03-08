# Arquitetura Elite 2050

Este documento descreve as principais peças do jogo Elite 2050 e a estrutura definida para suportar múltiplos usuários em tempo real durante uma temporada. 

## Flowchain & Supabase Realtime

A renderização e o sincronismo baseiam-se numa subscrição direta do canal `games` no PostgreSQL via Supabase, minimizando polling e permitindo experiência fluida de Multiplayer. 

```mermaid
sequenceDiagram
    participant Player1 (Creator)
    participant GameContext (P1)
    participant MatchEngine
    participant Supabase PostgreSQL
    participant GameContext (P2)
    participant Player2 (Guest)

    Player1 (Creator)->>GameContext (P1): Clica em "Avançar Dia"
    GameContext (P1)->>MatchEngine: compute new GameState (evaluate transfers, simulated matches, etc.)
    MatchEngine-->>GameContext (P1): Returns Updated GameState
    GameContext (P1)->>Supabase PostgreSQL: RPC advance_day_safe(new_state, optimistic concurrency lock)
    Supabase PostgreSQL-->>GameContext (P2): Emit 'postgres_changes' (UPDATE na table 'games')
    GameContext (P2)->>GameContext (P2): if (!isCreator) loadGameState()
    GameContext (P2)->>Player2 (Guest): App re-renders showing next day/matches directly!
```

## Componentes Chave do React

```mermaid
graph TD
    A[App - Main Root] --> B[GameContext.Provider]
    B --> C[Dashboard]
    B --> D[League Tab]
    B --> E[Transfer Tab]
    B --> F[Cup Tabs]
    B --> G[Match Report]
    C --> H[useGameDay Hook]
    H --> I[gameLogic - advanceGameDay]
    I --> J[MatchEngine - simulateMatch]
    H -.-> |Save to DB & Publish Event| B
```

## Ciclo de vida da Temporada (Estados do Mundo)

O estado global do mundo transita pelos seguintes fluxos:

- **STARTUP:** Tela de início de servidor vazio / Carregando.
- **DRAFT:** Criação de personagens e do time inicial de cada jogador.
- **LOBBY:** Modo de pré-temporada! Formação tática, observação de elencos, mercado, transferências.
- **ACTIVE:** Temporada regular acontecendo (Liga, Copas). Matches de campeonato agendados são processados pelo Creator num clique global.
- **FINISHED:** Tabela da temporada consolidada. Ao clicar para processar novo torneio, o estado reverte para LOBBY, incrementa o ano calendário, recriando novos times baseando-se no que foi deixado.

## Referência das Constantes (gameConstants.ts)

- `SEASON_DAYS`: Duração da temporada de Liga
- `MAX_TEAM_POWER_TIER_1`: 900 (Limite máximo de power cap total per squad player somado)
- `SAFETY_NET_MIN_PLAYERS`: 15 jogadores
- `MATCH_DURATION_MINUTES`: 90 (simulação de partidas por tempo)
- `SAFETY_NET_FREE_AGENT_RATING`: Avaliação base garantida para Free Agents inseridos no net

---

_Documentação gerada como parte da estabilidade Multiplayer & Testes na Temporada Multiplayer_
