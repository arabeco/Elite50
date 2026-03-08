# ELITE 2050: System Manual (Backstage Mechanics)

Este documento detalha o funcionamento interno do motor de jogo, calibragens econômicas e a anatomia do rating dos jogadores.

---

## 1. ANATOMIA DO RATING

O Rating de um jogador é dinâmico e influenciado por múltiplos estados em tempo real durante a simulação.

### A. Rating de Jogo (Performance Real)
A fórmula base para o cálculo de influência setorial (Ataque, Meio, Defesa) é:
`Performance = Rating Nominal * (Fator_Treino) * (Fator_Satisfacao) * (Fator_Stamina) * (Fator_Tatico)`

#### i. TREINAMENTO (Sinergia de Entendimento)
- **Bônus**: O entendimento tático do time (`understanding`) atua como um multiplicador de Química (`Chemistry`).
- **Fórmula**: `Chemistry = (Base_Chemistry) * (0.5 + (Understanding / 200))`
- **Dissipação**: O entendimento é específico por estilo (ex: Tiki-Taka vs Vertical). Mudar de estilo reseta o bônus principal, exigindo novo treinamento (1-3% de ganho por dia).

#### ii. SATISFAÇÃO (Penalidades)
A felicidade do jogador afeta diretamente sua entrega em campo:
- **Satisfação >= 80%**: Bônus de moral (1.1x no Rating).
- **Satisfação < 50%**: Penalidade de "Depressão" (0.8x no Rating).
- **Satisfação Crítica (< 20%)**: Jogador pode forçar saída ou ter performance reduzida a 60% do potencial.

#### iii. FADIGA / STAMINA
A Stamina decai durante os 90 minutos baseada na intensidade do estilo (ex: *Blitzkrieg* drena 1.5x mais):
- **Impacto**: `Rating_Real = Rating_Base * (Current_Stamina / 100)`.
- **Recuperação**: Jogadores recuperam 15-20% de stamina por dia de descanso.

#### iv. TRAITS (CARACTERÍSTICAS)
- **Slot 1 (Técnico)**: +5% na eficiência de evolução.
- **Slot 2 (Personalidade)**:
    - *Positivos (Líder, Combativo, Inspirador)*: +10% de evolução.
    - *Negativos (Preguiçoso, Pavio Curto)*: -10% de evolução.
- **Slot 3 (Especial)**: +20% de bônus na evolução permanente.

---

## 2. O CÁLCULO DA PARTIDA (Setor vs Setor)

O motor processa "Ticks" de probabilidade comparando o poder ofensivo contra o defensivo.

### A. Fórmula de Comparação
`Poder_Ataque = Média_Setor * Química * Fase * Stamina * Bônus_Tático`
`Poder_Defesa = Média_Setor_Oponente * Química * Fase * Stamina * Bônus_Tático`

### B. Mando de Campo (Home Advantage)
- O time da casa recebe um bônus fixo de **5%** em todos os atributos setoriais.
- `Home_Stats = Base_Stats * 1.05`

### C. Fator Sorte vs Rating (Zebra Factor)
- **Chaos Factor**: Cada ação tem um `chaosMax` (geralmente 10-20%).
- `Power_Final = Power_Calculado * (1 + (Random(0, chaosMax) / 100))`
- Existe um "Safety Net" de +200 pontos fixos no `pickWeightedRandom` para garantir que mesmo jogadores piores tenham chances mínimas de sucesso em lances isolados.

---

## 3. EVOLUÇÃO PÓS-JOGO

A performance permanente é ajustada após cada apito final.

### A. Conversão de Nota (Match Grade) em Rating Permanente
A nota (0.0 a 10.0) gera um `Delta` de rating:
- **Nota >= 9.0**: +4 a +6 pontos.
- **Nota >= 7.8**: +2 a +3 pontos.
- **Nota < 5.0**: -1 a -2 pontos (Regressão).

### B. Subida de Patamar (Evolução de Tier)
- **Anime Style**: A evolução é mais rápida entre 400 e 700.
- **Paredão do Elite (800+)**: O ganho de rating diminui em 50% após atingir 800 para simular a dificuldade de se manter no topo.
- **Membro do Hall da Fama (900+)**: Requer foco total em evolução e notas consistentemente acima de 8.5.

---

## 4. VISÃO DO MANAGER (O POWER CAP)

O **Power Cap** é o limite de "tamanho" de um elenco.

- **Influência**: O Power Cap não ganha jogos sozinho, mas dita a qualidade dos reservas.
- **Economia de Lucro**: Se um jogador evolui 10 pontos em campo, o Power Cap do time **sobe 10 pontos**. Isso permite que o time mantenha o jogador sem ser forçado a vendê-lo, recompensando o "Treinador Desenvolvedor".
- **Reconstrução**: Times com muito `Free Space` (Cap - Rating Atual) ganham bônus de 20% na velocidade de Scouting.

---
> **Aviso de Sistema**: Este manual reflete as fórmulas ativas no `MatchEngine.ts` e `simulation.ts`. Alterações nestes valores podem causar instabilidade na economia de Rating.
