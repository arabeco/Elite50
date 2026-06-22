# Elite 2050 - Plano Calmo para Fechar o Gate 8

## Objetivo

Fechar o **Nivel 8: Refino** sem virar correria.

O alvo nao e inventar mais sistema agora. E transformar o que ja existe em produto mais confiavel, limpo e testavel.

## Estado atual

O app ja parece estar em **Nivel 8 em andamento**.

Ja existe:

- login e Supabase funcionando
- mundos, draft, carreira, loja e inventario
- perfil global e inventario global com itens
- toasts e confirm modal global
- premium/circuito/catalogo ja mapeados
- produtos nativos ja nomeados para Google Play/App Store
- build, lint e testes passando localmente

Ainda falta para fechar o gate:

- feedback visual consistente em todas as pontas
- smoke manual logado
- polimento de premium/paywall
- teste mobile/Capacitor real
- primeira limpeza de performance
- limpeza de textos quebrados/encoding

## Ordem recomendada

### 1. Fechar feedbacks e UX basica

Prioridade alta.

Fazer uma varredura em:

- comprar item
- equipar/remover item
- equipar chuteira
- salvar mundo
- carregar mundo
- sair do mundo
- deletar mundo
- copiar codigo
- entrar por codigo
- assumir clube
- enviar feedback
- erro de rede/Supabase

Criterio de pronto:

- toda acao importante responde com toast, confirmacao visual ou mensagem clara
- nenhum `alert`, `confirm` ou texto seco de erro fica perdido

### 2. Smoke manual logado

Prioridade alta.

Roteiro minimo:

- login
- criar mundo
- escolher manager/time
- completar draft
- abrir Home
- abrir Elenco
- abrir Mundo
- abrir Carreira
- abrir Inventario
- comprar/equipar um item quando possivel
- equipar chuteira em jogador
- sair do mundo
- voltar ao mundo
- recarregar pagina e confirmar persistencia

Criterio de pronto:

- fluxo principal roda sem travar
- estado persiste apos refresh
- modais principais abrem e fecham bem

### 3. Premium e loja com cara de produto

Prioridade media/alta.

Melhorar:

- tela de compra de ouro
- estado de premium ativo/inativo
- circuito premium
- mensagens quando a compra nativa ainda nao esta ligada
- diferenca clara entre item cosmetico, item de manager, trofeu e chuteira

Criterio de pronto:

- usuario entende o que esta comprando
- premium nao parece painel tecnico
- app deixa claro quando algo e preview/web e quando depende do nativo

### 4. Mobile e Capacitor

Prioridade media.

Checar:

- build Capacitor
- `cap sync`
- abrir em aparelho/emulador
- testar login
- testar loja/premium sem compra real
- confirmar safe areas e bottom nav

Criterio de pronto:

- app abre como produto nativo
- navegacao principal funciona
- nao tem tela cortada no mobile

### 5. Performance inicial

Prioridade media.

Problema conhecido:

- bundle JS esta grande

Primeiro ataque:

- separar abas pesadas com lazy loading
- separar modais pesados
- evitar carregar tudo no primeiro paint

Criterio de pronto:

- build continua passando
- primeira carga fica menos pesada
- Lighthouse melhora antes de tentar otimizar detalhes

### 6. Limpeza de texto/encoding

Prioridade media.

Procurar e corrigir:

- `Ã`
- `Â`
- acentos quebrados
- textos tecnicos demais aparecendo para jogador normal

Criterio de pronto:

- nenhuma tela principal tem texto quebrado
- docs principais ficam legiveis

## Gate 8 fecha quando

- feedback global esta consistente
- smoke manual logado passa
- loja/premium estao compreensiveis
- build mobile foi testado ao menos uma vez
- bundle tem primeira melhoria real
- textos principais estao limpos
- nao ha bug visivel bloqueando fluxo principal

## Melhor proximo passo

Comecar por **feedbacks e smoke manual**.

Motivo:

- e o que mais aproxima o app de beta fechada confiavel
- revela bugs reais antes de mexer em performance/mobile
- evita polir uma tela que talvez ainda tenha fluxo quebrado

## Registro de andamento

### Bloco 1 - feedbacks e UX basica

- [x] Confirmado que nao ha `alert`, `confirm` ou `prompt` bruto em `src`
- [x] Toast global nao corta mais mensagens importantes em uma linha so
- [x] Login agora dispara feedback global em sucesso, erro, Google e reset de senha
- [x] Deletar mundo nao duplica mais toast de sucesso
- [x] Assumir clube nao duplica mais toast de sucesso
- [x] Escalacao avisa quando esta travada e confirma salvar/mover/remover
- [x] Revelar relatorio pos-jogo confirma que o resultado foi aberto
- [x] Criar mundo avisa nome vazio, erro de criacao e sucesso
- [x] Entrar por codigo avisa quando o campo esta vazio
- [x] Escolha de origem da carreira confirma clube herdado ou clube fundado
- [x] Draft confirma que as propostas foram salvas para a virada do dia

### Bloco 6 - limpeza de texto/encoding

- [x] Corrigir mojibake de regra do trait `Genio`
- [x] Corrigir mojibake em aviso de Draft de clube humano
- [x] Remover lista de uniformes com nomes corrompidos e manter mapeamento ASCII existente
- [ ] Corrigir mojibakes visiveis no onboarding de carreira
- [ ] Corrigir mojibakes visiveis em transferencias/draft
- [x] Rodar busca direcionada por `Ãƒ`, `Ã‚`, `nÃ£`, `CÃ`, `GÃ` nos arquivos tocados

### Smoke local

- [x] `npm run lint`
- [x] `npm run test -- src/test/assetMapping.test.ts src/test/storeCatalog.test.ts`
- [x] `npm run build`
- [x] Abrir `http://127.0.0.1:3000/login` sem erro de console
- [x] Botao dev local criado para entrar sem credencial real em `DEV`
- [x] Smoke logado parcial: login dev, tela de mundos, criar mundo, onboarding, assumir clube e abrir dashboard real
- [x] Smoke logado: abas principais Home, Elenco, Calendario, Mundo e Carreira ativam pelo footer sem erro de console
- [x] Smoke logado: Carreira abre Loja, Inventario, Circuito, Perfil e Config sem erro de console
- [x] Smoke logado: card de jogador abre superficie com carreira/chuteira/equipar sem erro de console
- [ ] Smoke profundo de compra/equip/persistencia apos popular inventario real com itens comprados
