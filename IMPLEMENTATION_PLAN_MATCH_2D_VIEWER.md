# Plano - MVP Match 2D Viewer

Data: 2026-07-10

## Objetivo

Criar um MVP de visualizacao 2D estilo Championship Manager, mas com identidade Elite 2050:

- campo futurista/anime
- bolinhas dos jogadores
- bola animada
- placar
- tempo de jogo
- cores dos times
- simbolos dos lances
- apenas lances principais

## Decisao tecnica

Nao trocar o motor real de partidas agora.

O primeiro passo e criar uma camada separada:

```txt
MatchResult.events atuais -> Match2D cinematic highlights -> Viewer 2D
```

Motivo:

- nao quebra calendario, Copa Elite, noticias ou standings
- usa partidas reais do jogo
- permite validar a imersao antes de mexer no motor estatistico
- se ficar bom, depois o motor passa a gerar eventos ricos nativamente

## Fase 1 - MVP visual

Criar:

```txt
src/utils/match2D.ts
src/components/Match2DViewer.tsx
```

O utilitario transforma eventos como:

```txt
GOAL
CHANCE
WOODWORK
BLOCKED
COUNTER
FOUL
CARD
VAR
MISTAKE
```

em sequencias visuais:

```txt
carry
pass
dribble
shot
save
goal
blocked
card
```

## Fase 2 - Integracao inicial

Adicionar uma aba no relatorio pos-jogo:

```txt
Lances 2D
```

O usuario ve:

- placar final
- minuto do lance
- tipo do lance
- botoes play/pause/proximo/anterior
- campo com jogadores e bola
- legenda curta do lance

## Fase 3 - Melhorar fonte de dados

Depois do MVP visual, enriquecer o motor de partidas para gerar eventos nativos com:

```ts
sequence: [
  { action: "recover", playerId: "..." },
  { action: "pass", fromPlayerId: "...", toPlayerId: "..." },
  { action: "shot", playerId: "...", target: "far_post" },
  { action: "goal" }
]
```

## Fase 4 - Novo motor real de lances

Quando o viewer estiver bom:

```txt
MatchEngine calcula setores/probabilidades
Match2DEngine resolve a sequencia do lance
resultado do lance alimenta placar e relatorio
```

## Regras de UX

- Nao mostrar 90 minutos corridos.
- Mostrar apenas lances principais.
- Evitar texto longo.
- Usar simbolos claros.
- Manter placar e tempo sempre visiveis.
- Usar cores reais dos times.
- Se nao houver evento rico, gerar coreografia crivel baseada no tipo do evento.

## Riscos

- Eventos atuais sao pobres para 2D.
- A primeira versao pode parecer coreografada demais.
- A solucao definitiva exige o motor emitir coordenadas e sequencias nativas.

## Criterio de pronto do MVP

- Relatorio pos-jogo abre a aba `Lances 2D`.
- Pelo menos gols/chances/cartoes aparecem animados.
- Bolinhas e bola se movem sem quebrar layout mobile.
- Placar e tempo aparecem claros.
- Build passa.
