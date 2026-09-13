# Match 2D - Referencias CM 03/04

Data: 2026-07-10

## Pasta local

```txt
C:\Users\Afonso\Downloads\elite-2050\CMtraining
```

Esta pasta e referencia local de video. Nao deve entrar no Git, AAB ou build web.

## Videos salvos

- `Liverpool 10-0 Lazio ( 2 Leg) - CM 03_04 - MyGame 17 (480p, h264, youtube).mp4`
- `CM03_04    Madrid 10-0 Espanyol ( 3-0 ,7-0 ) Highlight - MyGame 17 (360p, h264, youtube).mp4`
- `What was the gameplay like Como era jogar Championship Manager 03-04  - CM 03_04 - Prof. Esporte Games (360p, h264, youtube).mp4`
- `Galatasaray 2  0 Inter Best Tactic in CM 03_04 - CM0304 Legend (480p, h264, youtube).mp4`
- `Championship Manager 03_04 - Counter Attack is Very rare #cm0304 #football - Cm0304 (360p, h264, youtube).mp4`

## O que observar

- movimento sem bola
- linha defensiva subindo/descendo
- basculacao do time sem posse
- amplitude quando o time abre o campo
- compactacao quando defende
- velocidade media da bola
- duracao dos highlights
- como o viewer mostra contra-ataque
- como o viewer mostra pressao e dominio territorial
- quanto os jogadores nao envolvidos tambem se mexem

## Proxima implementacao

Evoluir o MVP atual de `Match2DViewer` com uma camada:

```txt
TeamShape2D
```

Entrada:

```txt
formacao
tatica
linha
largura
intensidade
posse
zona da bola
lado atacando
```

Saida:

```txt
posicao de todos os jogadores a cada frame do lance
```

Objetivo:

```txt
o campo parecer vivo, nao apenas o jogador do evento se movendo
```
