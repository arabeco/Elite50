# Status de Maturidade - Elite 2050

> Blueprint de 10 gates para lancamento Android/Google Play.
> Estado atualizado em 2026-05-31 a partir do repo local, Supabase remoto e Play Console.

---

## 0. Variaveis do app

```text
APP_NOME              = Elite 2050
PACKAGE_NAME          = com.becoslab.elite2050
SUPABASE_PROJECT_REF  = xebhujvszurydytlrhra
SUPABASE_URL          = https://xebhujvszurydytlrhra.supabase.co
VERCEL_URL            = https://elite-50.vercel.app
LOGIN_COM_GOOGLE?     = sim
PRODUTOS:
  - productId = elite2050_gold_100       | basePlanId = N/A | tipo = consumable
  - productId = elite2050_gold_300       | basePlanId = N/A | tipo = consumable
  - productId = elite2050_gold_700       | basePlanId = N/A | tipo = consumable
  - productId = passe_circuito_neon_01   | basePlanId = N/A | tipo = entitlement
SITE_MAE_URL          = https://arabeco.github.io/
PRIVACIDADE_URL       = https://arabeco.github.io/privacidade-elite50.html
TERMOS_URL            = https://arabeco.github.io/termos-elite50.html
EXCLUSAO_CONTA_URL    = https://arabeco.github.io/elite50/exclusao.html
PLAY_STORE_NOME       = Elite 50
```

### Legenda de status

`[ ]` pendente - `[~]` em andamento - `[x]` feito - `[N/A]` nao se aplica

### Compartilhado vs Por-App

- **1x/compartilhado**: Service Account do Google Cloud + JSON, conta de desenvolvedor Play, merchant profile e site-mae de politicas.
- **Por app**: Play Console app, produtos, secrets Supabase, deploy da function, SQL, keystore, OAuth de login.

---

## Gate 1 - Ideia & Escopo Travado

- [x] Manifesto / "superpoder" do app escrito
- [x] Fluxo logico de telas e decisoes desenhado
- [x] Stack confirmada: Vite + Supabase + Vercel + Capacitor
- [x] Variaveis principais preenchidas: package, IDs de produto e tipo de monetizacao
- [x] **GATE:** escopo travado sem furos grandes, IDs de produto decididos antes do Play Console

## Gate 2 - Infraestrutura

- [x] Repo criado e git ligado ao GitHub: `origin https://github.com/misterzhermit/ELITE2050.git`
- [x] Design system / Tailwind configurado
- [x] Supabase ativo em codigo: tabelas base, RLS, Auth e migrations
- [x] Deploy Vercel com URL final informada: `https://elite-50.vercel.app`
- [x] **GATE:** ambiente local, repo e URL publica em harmonia

## Gate 3 - Design

- [x] Paleta + tipografia implementadas no codigo
- [x] Componentes base: cards, botoes, glass, modais e toasts
- [x] Navegacao/menus padronizados
- [x] **GATE:** estetica de produto premium consolidada

## Gate 4 - Fluxo

- [x] Telas principais navegaveis
- [x] Onboarding, mundo, carreira, elenco, draft, loja, circuito e perfil implementados
- [x] **GATE:** caminho do usuario mapeado e percorrivel

## Gate 5 - Engine & Regras

- [x] Tipos TS estruturados
- [~] `tsc --noEmit` limpo: build Vite passa, mas ainda falta usar este comando como trava oficial
- [x] Regras core / algoritmos implementados
- [x] Smoke tests / simulacoes focadas rodando
- [x] **GATE:** cerebro do app estavel o suficiente para beta; falta transformar typecheck puro em rotina

## Gate 6 - Persistencia

- [x] Estado global integrado
- [x] Persistencia local + hydration
- [x] App nao depende de reset no F5 para fluxo normal
- [x] **GATE:** memoria local funcionando

## Gate 7 - Conexao

- [x] Login real implementado, incluindo Google OAuth no client
- [x] Sync estado local/Supabase implementado
- [x] RLS protegendo tabelas de perfil, inventario, mundos e compras
- [~] Backup/perfil multi-dispositivo validado por teste humano: smoke parcial registrado, falta smoke profundo final
- [x] **GATE:** app conectado e pronto para homologacao com usuarios na nuvem

## Gate 8 - Refino & Billing (codigo)

**Billing - fluxo:** paywall nativo -> Edge Function Supabase -> Google Play API -> RPC -> libera beneficio.

- [x] Sistema global de toasts / feedback de erro e sucesso
- [~] Performance Lighthouse 90+ no web: build passa, mas bundle ainda e grande e falta medicao oficial
- [~] Build Capacitor gerado e enviado para teste interno; falta abrir em aparelho fisico pelo link da Play
- [x] Catalogo como fonte principal dos IDs no client e espelhado na Edge Function para autoridade server-side
- [x] Paywall chama compra nativa Android
- [x] Client nao libera premium/moeda direto em compra real
- [x] Edge Function `verify-google-play-purchase` escrita e validando Google Play API v3
- [x] RPC idempotente escrita com lock, token unico e revoke do client
- [x] SQL das tabelas/entitlements escrito
- [x] Zero API route Vercel de billing
- [x] Zero secret de billing no `.env.example` raiz/Vercel; secrets ficam na Supabase
- [x] **GATE:** billing pronto em codigo; falta teste real de compra no Play

---

## A partir daqui e lancamento

Play Console fica para o Gate 10. Antes disso, o Gate 9 prepara nuvem, politicas, assinatura e assets.

---

## Gate 9 - Conformidade & Nuvem (pre-loja, sem Play Console)

### Site-mae / Conformidade legal

- [x] Politica de Privacidade publicada com URL publica
- [x] Termos de Uso publicados
- [x] Pagina/fluxo de Exclusao de conta com URL publica
- [x] Links de Privacidade/Termos discretos na tela de login
- [x] Botao real de exclusao de conta no app via Edge Function `delete-account`

### Google Cloud (1x para todos os apps)

- [x] Projeto Cloud criado/confirmado
- [x] Google Play Android Developer API habilitada
- [x] Service Account criada + chave JSON gerada
- [x] OAuth Client para Google Login confirmado no fluxo do app

### Supabase (por app)

- [x] SQL de tabelas/RPC escrito no repo
- [x] SQL rodado no remoto: checks principais conferidos
- [x] Edge Function `verify-google-play-purchase` deployada no remoto
- [x] Edge Function `delete-account` deployada no remoto
- [x] Secret `GOOGLE_PLAY_PACKAGE_NAME` setado
- [x] Secret `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` regravado a partir do JSON da service account
- [x] `GOOGLE_PLAY_ALLOWED_ORIGINS` com `https://elite-50.vercel.app`
- [x] Provider Google habilitado no Supabase Auth / login funcionando

### Build / Assinatura

- [x] Keystore release criada, senha humana definida e backup local feito
- [x] AAB de release assinada gerada localmente e enviada ao teste interno

### Assets de loja prontos (offline)

- [~] Icone, feature graphic, screenshots, descricao curta/longa: manual existe; falta pacote final de loja

- [~] **GATE:** pre-loja quase fechado; faltam assets finais de loja e conferencias humanas de formulario

## Gate 10 - Play Console & Produto Vivo

### Conta & vinculo (1x para todos)

- [x] Conta de desenvolvedor Play ativa
- [ ] Payments / Merchant profile configurado
- [x] API access vinculando a Service Account com permissoes de pedidos/compras nos apps selecionados

### App (por app)

- [x] Criar app no Play Console com `com.becoslab.elite2050` e nome publico `Elite 50`
- [~] Store listing + Privacy Policy URL: app criado e URLs existem; assets/textos finais ainda pendentes
- [ ] Data Safety + Content rating + Target audience + Ads declaration
- [x] Criar produtos com IDs exatos da secao 0
- [x] Subir AAB em Internal testing
- [ ] Subir/avancar para Closed testing quando o fluxo interno estiver validado
- [x] License testers/adms disponiveis para teste

### Validacao real

- [ ] Comprar como license tester e liberar beneficio
- [ ] Conferir banco: `mobile_purchases`, `profiles_meta`, `user_circuit_progress`
- [ ] Reabrir app e confirmar persistencia
- [ ] Restaurar/reconciliar compra sem cobrar de novo

### Trava de producao & vida

- [ ] 20 testers por 14 dias no Closed testing
- [ ] Promover para Producao
- [ ] ASO com keywords e screenshots profissionais
- [ ] Monitoramento de metricas + inicio de trafego
- [ ] **GATE:** receita ativa, escala ligada, produto vivo

---

## Resumo rapido

```text
Gates 1-7  = fechados
Gate 8     = codigo/paywall fechado; falta Lighthouse e smoke profundo em aparelho pelo Play
Gate 9     = quase fechado; Supabase, secrets, service account, assinatura, AAB e legal URLs ok; faltam assets finais
Gate 10    = em andamento; app/produtos/internal test/API access prontos, falta compra real, closed testing e producao
```

## Proximo passo mais importante

1. Instalar pelo link do teste interno com conta tester/admin.
2. Comprar `elite2050_gold_100` e conferir Supabase.
3. Se falhar, olhar logs da Edge Function e confirmar permissao do app no Play Console.
4. Completar Data Safety/Content Rating/Target Audience/Ads.
5. Avancar para Closed testing quando a compra real passar.
