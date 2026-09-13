# Match 2D - Estudo De Frames CM 03/04

Data: 2026-07-10

## Material analisado

Pasta:

```txt
C:\Users\Afonso\Downloads\elite-2050\CMtraining
```

Contact sheets temporarias:

```txt
C:\Users\Afonso\Downloads\elite-2050\.tmp-cm-frame-study
```

Trechos analisados:

- `Liverpool_early_dense`
- `Liverpool_box_dense`
- `Madrid_early_dense`
- `Counter_all_dense`

## Diagnostico honesto

O nosso MVP atual ainda parece falso porque tenta transformar eventos pobres em movimento:

```txt
GOAL aos 57, player X -> inventa uma coreografia
```

O CM parece mais real porque o lance visual nasce de uma estrutura de futebol:

```txt
shape do time -> posse -> apoio -> pressao -> passe/conducao -> finalizacao -> texto/placar
```

## O que o CM faz bem visualmente

### 1. Shape antes de acao

Antes de qualquer chute, os dois times ja estao em formato crivel.

- defesa compacta perto da area
- ataque com 4 a 7 jogadores ao redor da zona da bola
- jogadores sem bola ocupam espacos coerentes
- ninguem aparece sozinho atravessando o campo

Regra para o nosso motor:

```txt
todo frame deve nascer de TeamShape2D, nao da posicao do protagonista
```

### 2. Movimento pequeno, nao cinematografico demais

Nos frames do CM, as bolinhas se movem pouco entre amostras.

O lance parece real porque:

- o bloco inteiro arrasta alguns metros
- a bola muda zona
- os jogadores ajustam linha e cobertura

Regra:

```txt
limitar deslocamento por frame
evitar teleport de jogador
priorizar micro-ajustes coletivos
```

### 3. A bola fica tempo suficiente no mesmo setor

O CM nao fica piscando `passe -> chute -> gol` rapido.

Em muitos trechos:

- a jogada fica 3 a 6 segundos rondando a area
- o time circula ao redor do bloco defensivo
- o chute vem depois de pressao acumulada

Regra:

```txt
highlight precisa de 8 a 14 frames
cada frame deve durar o suficiente para o olho entender
```

### 4. Ataque em bloco

Nas goleadas, o ataque nao e um jogador sozinho.

Padrao observado:

- 2 ou 3 jogadores perto da bola
- 2 jogadores dando largura/profundidade
- 1 ou 2 jogadores esperando rebote/segunda bola
- defesa fechada com muita gente na area

Regra:

```txt
todo ataque perigoso deve mover 5-7 atacantes e 6-8 defensores
```

### 5. Defesa bascula e protege area

No CM, a defesa costuma parecer um bloco.

Padrao:

- zagueiros ficam entre bola e gol
- laterais fecham corredor
- meio-campo afunda perto da entrada da area
- goleiro quase nao sai da pequena area

Regra:

```txt
time sem bola segue a bola lateralmente, mas mantem prioridade no gol
```

### 6. Gol depende de pausa e confirmacao

No CM, nem sempre da para ver a bola entrando perfeitamente, mas o conjunto vende:

- bola/lance perto da area
- score muda
- ticker/texto confirma gol
- jogadores ficam agrupados no setor ofensivo
- a sequencia respira por alguns frames

Regra para Elite 2050:

```txt
em gol, bola precisa cruzar a linha + placar muda + pausa curta + celebracao visual
```

### 7. Contra-ataque e raro e mais limpo

O video de contra-ataque mostra que esse tipo de lance nao deve virar padrao.

Regra:

```txt
COUNTER deve ter poucos passes, campo aberto e defesa correndo para tras
mas deve ser usado pouco
```

## Nova arquitetura recomendada

Parar de remendar o tradutor atual.

Criar:

```txt
Match2DPlayEngine
```

Entrada:

```txt
homeTeam
awayTeam
players
taticas
tipo do lance desejado
forca relativa dos setores
```

Saida:

```ts
{
  minute: 57,
  outcome: "GOAL",
  frames: [
    {
      phase: "build_up",
      ball: { x: 42, y: 56 },
      carrierId: "p1",
      homeDots: [...],
      awayDots: [...],
      caption: "circulacao"
    }
  ]
}
```

## Fases de lance

Um lance real deve passar por fases:

```txt
SETUP
BUILD_UP
PROBE
ACCELERATION
FINAL_THIRD
SHOT
OUTCOME
AFTERMATH
```

Nem todo lance usa todas.

Exemplo de gol:

```txt
SETUP -> BUILD_UP -> PROBE -> ACCELERATION -> FINAL_THIRD -> SHOT -> GOAL -> CELEBRATION
```

Exemplo de defesa:

```txt
SETUP -> PROBE -> SHOT -> SAVE -> RESET
```

Exemplo de bloqueio:

```txt
SETUP -> ACCELERATION -> SHOT -> BLOCK -> CLEAR
```

## Regras para nao parecer falso

- jogador nao pode saltar de um lado ao outro do campo
- bola nao deve ir direto da intermediaria para o gol sem fase de chute
- se a bola recua, o bloco tambem deve respirar para tras
- se a bola vai para lado, defesa bascula para o lado
- se a linha e alta, defesa joga mais longe da area
- se largura e alta, pontas ficam mais abertos
- se intensidade e alta, time sem bola encurta mais rapido
- se mentalidade e cautelosa, ataque poe menos gente na area
- goleiro so mexe muito em chute/defesa

## Ajustes imediatos para o preview

O MVP atual deve ser tratado como laboratorio visual, nao como solucao final.

Proximos passos praticos:

1. Criar `src/engine/match2DPlayEngine.ts`.
2. Gerar uma partida fake com 6 a 8 lances, cada lance com frames nativos.
3. Fazer o viewer ler `frames` diretamente, sem inventar coordenadas a partir de eventos pobres.
4. Manter placar, tempo, posse e texto curto.
5. So depois integrar com `MatchEngine`.

## Conclusao

O CM nao parece bom por ter animacao complexa.

Ele parece bom porque:

```txt
o shape e crivel
o movimento e pequeno
a bola respeita fases
o texto confirma o que o olho quase viu
o placar respira no momento certo
```

Esse deve ser o alvo do Elite 2050.
