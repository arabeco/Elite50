# Elite 2050 - Plano de Melhoria do App

## Objetivo

Levar o app alem do `1.0` sem perder a clareza do loop principal.

A prioridade nao e adicionar sistema por adicionar.
A prioridade e:

- deixar o jogador entender o que esta acontecendo
- deixar cada decisao ter mais peso
- fazer o mundo parecer vivo e continuo
- reduzir friccao no mobile
- manter a identidade premium do jogo sem virar bagunca

Importante:

- este plano nao inclui lesao
- o foco e gestao, leitura do mundo, ritmo de temporada e UX

## Principio central

O app melhora mais quando vira um jogo que se explica sozinho.

Cada tela precisa responder uma destas perguntas:

- o que esta acontecendo agora
- o que eu devo fazer agora
- o que acontece se eu nao fizer nada
- o que mudou desde a ultima vez que entrei

## Ordem recomendada

### 1. Home como cockpit perfeito

Essa e a melhoria mais importante.

Sem isso, mesmo sistemas bons parecem confusos.

Objetivos:

- mostrar score total do clube e score ocupado de forma muito clara
- mostrar proximo compromisso com data real, fase e contexto
- mostrar o melhor proximo passo recomendado
- mostrar o que ficou pendente desde a ultima visita
- separar bem:
  - bloco principal
  - guia opcional
  - resumos secundarios

Entregas:

- card principal `Agora`
- card `Proximo jogo`
- card `Score do clube`
- card `O que mudou`
- guia ocultavel
- resumo de temporada mais legivel

Sinal de sucesso:

- um jogador novo consegue entrar e entender o que fazer em menos de 10 segundos

## 2. Padronizacao total de listas e cards

Hoje o app ja melhorou bastante nisso, mas ainda vale fechar a linguagem.

Objetivos:

- `Cards / Lista` em qualquer lugar que mostre atletas ou clubes
- lista sempre agrupada por posicao quando fizer sentido
- cards compactos mas ainda bonitos no mobile
- modais com scroll confiavel
- caber mais informacao sem parecer apertado

Entregas:

- padrao unico para grid de jogador
- padrao unico para lista de jogador
- padrao unico para card de clube
- padrao unico para modal grande
- revisar todos os estados vazios

Sinal de sucesso:

- o usuario nunca sente que cada tela usa uma linguagem diferente

## 3. Mundo mais vivo sem depender de lesao

O mundo pode parecer muito mais vivo mesmo sem lesao.

Melhores gatilhos:

- tecnico pressionado
- tecnico em alta
- surpresa da rodada
- favorito tropeçando
- destaque de jogador
- proposta recebida
- proposta recusada
- clube procurando tecnico
- clube abrindo vaga para a proxima temporada
- classificacao para copa
- risco de queda
- recorde de gols ou invencibilidade

Entregas:

- feed mais frequente e mais contextual
- noticias clicaveis com impacto claro
- reports entre rodadas
- melhor leitura de fim de temporada
- melhor abertura de nova temporada

Sinal de sucesso:

- o jogador sente que houve movimento no mundo mesmo sem abrir todas as abas

## 4. Contratos, sem clube e mercado mais inteligiveis

Esse e um dos pontos com mais potencial de profundidade.

Objetivos:

- ficar sem clube ser jogavel e compreensivel
- entrar em clube no timing certo
- receber propostas e responder com prazo
- propor contrato e saber que a proposta realmente foi enviada
- deixar claro quando a entrada vale para a temporada atual ou para a proxima

Regras recomendadas:

- nunca entrar instantaneamente
- resposta sempre no minimo no dia seguinte
- se a temporada ja avancou demais, entrada vale para a proxima
- se estiver sem clube, o app mostra oportunidades de forma clara
- se o tecnico nao mexer no time, o mundo continua mesmo assim

Entregas:

- inbox de propostas
- status da proposta
- prazo da proposta
- tela de oportunidades para sem clube
- explicacao de janela de entrada

Sinal de sucesso:

- ficar sem clube deixa de parecer castigo sem saida

## 5. Mid-season safety net

O draft inicial nao pode condenar a run inteira.

Sem isso, o app pode parecer punitivo demais.

Objetivos:

- criar uma camada de reposicao razoavel no meio da temporada
- deixar o mercado livre util
- permitir ajuste de rota para tecnico que draftou mal

Entregas:

- free agents decentes aparecendo ao longo da temporada
- oportunidades de contrato de reposicao
- jogadores medianos bons para compor elenco
- mais clareza do custo em score e encaixe tatico

Sinal de sucesso:

- um draft ruim atrapalha, mas nao destrui a campanha

## 6. Mais peso para tatica, treino e gestao ativa

O jogo melhora muito quando o usuario sente que mexer importa.

Sem vender vantagem.

Objetivos:

- tatica influenciar mais o tipo de partida
- treino influenciar mais forma e rendimento
- moral, fase e encaixe terem leitura melhor
- match reports refletirem melhor essas diferencas

Entregas:

- mais feedback do por que o time foi bem ou mal
- comparacao entre sua proposta de jogo e a do rival
- recomendacoes do oraculo sem decidir por voce
- estatisticas mais coerentes com o futebol do jogo

Sinal de sucesso:

- o usuario percebe causa e efeito nas decisoes

## 7. Settings de verdade

Configuracao simples melhora muito a sensacao de produto pronto.

Minimo recomendado:

- som ligado/desligado
- ajuda inicial ligada/oculta
- densidade da interface
- reduzir animacoes
- confirmar acoes sensiveis

Depois:

- preferencias de visualizacao padrao
- cards ou lista por aba
- ocultar paines auxiliares

Sinal de sucesso:

- o usuario sente que consegue moldar o app ao jeito dele

## 8. Loja e inventario impecaveis

Ja existe base boa aqui.
O proximo salto e o fluxo ficar gostoso.

Objetivos:

- item bonito na loja
- preview grande ao clicar
- inventario facil de entender
- equipar sem friccao
- feedback claro do que esta equipado e onde

Entregas:

- modal bonito de item
- preview grande de uniforme, logo e chuteira
- status `equipado`, `no inventario`, `premium`, `comprar`
- retorno automatico da chuteira ao inventario quando o jogador sair do clube

Sinal de sucesso:

- loja deixa de parecer tela tecnica e vira tela de desejo

## 9. Hierarquia visual mais forte

O app tem bastante conteudo. A hierarquia precisa dizer o que e principal e o que e secundario.

Objetivos:

- reduzir ruido visual
- dar mais foco ao time do usuario
- usar mais o icone do clube em lugares chave
- deixar ranking e mundo mais elegantes

Entregas:

- header mais centrado no clube
- ranking de clubes mais forte
- badges visuais melhores
- menos cara de painel de debug

Sinal de sucesso:

- a tela bate o olho e a leitura vem facil

## 10. Backend fiel ao mundo

Esse e o ganho estrutural mais importante para o futuro.

Objetivos:

- deixar jogadores, times, partidas e standings realmente por mundo
- reduzir dependencia de hardcode local
- preparar varios mundos consistentes

Entregas:

- persistencia normalizada por mundo
- leitura da UI vindo da base nova
- menos dado duplicado no front
- menos risco de inconsistencias entre saves

Sinal de sucesso:

- criar um novo mundo gera um universo proprio e confiavel

## Trilha sugerida por release

### 1.0.1 - Clareza e limpeza

Entraria:

- Home mais clara
- guia ocultavel
- header mais forte
- mover ferramentas de GM para lugar certo
- ajustes de mobile em cards e modais
- settings minimos

### 1.1 - Mundo vivo e contratos

Entraria:

- feed e news melhores
- reports intermediarios melhores
- propostas de clube
- sem clube jogavel
- janelas e prazos claros
- mid-season safety net

### 1.2 - Profundidade de gestao

Entraria:

- mais impacto de tatica e treino
- leitura melhor de performance
- relatorios mais explicativos
- mercado mais inteligente
- refinamento forte do ranking e mundo

### 1.3 - Estrutura de longo prazo

Entraria:

- backend realmente fiel ao mundo
- menos hardcode
- consolidacao de persistencia
- base para multiplos mundos fortes

## O que eu faria primeiro na pratica

Se eu fosse tocar isso agora, nesta ordem:

1. fechar a `Home` como cockpit perfeito
2. fechar a padronizacao `Cards / Lista` e mobile
3. fechar `sem clube + propostas + janela de entrada`
4. fortalecer `news + reports + fim de temporada`
5. aumentar o peso percebido de `tatica + treino`
6. polir `loja + inventario + settings`
7. consolidar o backend por mundo

## Regra de ouro

Sempre que existir duvida entre:

- adicionar sistema novo
- ou deixar o loop atual mais claro

preferir deixar o loop atual mais claro.

Isso tende a melhorar:

- retencao
- compreensao
- sensacao premium
- vontade de continuar a temporada
