# Playbook - Paywall, Google Play Billing e Supabase

Este playbook resume como chegar ao estado atual do Elite 2050 e serve como roteiro para repetir o mesmo caminho em outros apps.

## Resultado esperado

Ao final deste processo, o app deve ter:

- build Android via Capacitor;
- compra nativa via Google Play Billing;
- validacao server-side no Supabase Edge Function;
- saldo/passe liberado somente depois da validacao do Google;
- SQL de inventario/premium/compra aplicado;
- Google Auth via Supabase;
- Play Console pronto para internal testing.

## 1. Definir IDs oficiais

Trave estes nomes antes de codar.

### App Android

Elite 2050:

```text
com.becoslab.elite2050
```

### Produtos Google Play

Elite 2050:

```text
elite2050_gold_100
elite2050_gold_300
elite2050_gold_700
passe_circuito_neon_01
```

Regra:

- ouro = one-time product / consumable;
- passe = one-time product / entitlement;
- assinatura so entra se voce quiser recorrencia gerenciada pelo Google.

## 2. Configurar Capacitor

Arquivo:

```text
capacitor.config.ts
```

Elite 2050:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.becoslab.elite2050',
  appName: 'Elite 2050',
  webDir: 'dist',
};

export default config;
```

Comandos:

```bash
npm run build
npx cap add android
npx cap sync android
```

## 3. Criar bridge nativa de Billing

No Android, criar plugin nativo que:

- abre compra Google Play Billing;
- recebe resultado da compra;
- devolve para o app:
  - `purchaseToken`;
  - `orderId`;
  - `packageName`;
  - `productId`.

Elite 2050:

```text
android/app/src/main/java/com/becoslab/elite2050/Elite2050BillingPlugin.java
android/app/src/main/java/com/becoslab/elite2050/MainActivity.java
```

No client web/Capacitor:

```text
src/lib/billing.ts
```

Responsabilidade:

- detectar Android/Capacitor;
- chamar plugin nativo;
- retornar resultado normalizado para a tela da loja.

## 4. Criar catalogo de billing no app

Arquivo:

```text
src/constants/billingCatalog.ts
```

O catalogo precisa mapear:

- codigo interno;
- `googlePlayProductId`;
- tipo: `consumable` ou `entitlement`;
- quantidade de ouro ou beneficio.

Exemplo:

```ts
elite2050_gold_100 -> 100 ouro
passe_circuito_neon_01 -> premium/entitlement
```

## 5. Ligar a loja ao fluxo nativo

Arquivo principal no Elite:

```text
src/components/dashboard/CareerTab.tsx
```

Fluxo correto:

1. usuario clica no pacote;
2. app chama Billing nativo;
3. Google retorna `purchaseToken`;
4. app chama Edge Function;
5. Edge Function valida no Google;
6. Supabase libera saldo/passe;
7. app recarrega snapshot do perfil/inventario.

Regra de ouro:

> Nunca liberar saldo so porque o client disse que comprou. Sempre validar token no servidor.

## 6. Criar camada Supabase do app

Arquivo:

```text
src/lib/metaStore.ts
```

Responsabilidades:

- carregar perfil global;
- carregar inventario;
- comprar item interno com saldo;
- chamar `verify-google-play-purchase`;
- refletir `gold_balance`, `premium_active`, `premium_until`.

## 7. Criar SQL de premium, inventario e compras

Tabelas necessarias:

```text
profiles_meta
circuit_definitions
user_circuit_progress
catalog_items
user_inventory
mobile_purchases
```

RPCs necessarias:

```text
ensure_user_meta
purchase_catalog_item_with_balance
grant_catalog_item
grant_mobile_purchase
```

Elite 2050 usa:

```text
supabase/migrations/20260421000000_premium_meta.sql
supabase/migrations/20260421002000_meta_store_rpcs.sql
supabase/migrations/20260517000000_sync_boot_catalog.sql
```

Checks importantes:

- `grant_mobile_purchase` precisa ter parametro `p_platform`;
- `mobile_purchases_purchase_token_key` precisa existir;
- `user_inventory_user_id_item_id_key` precisa existir;
- deve existir circuito ativo;
- catalogo nao pode estar vazio.

## 8. Criar Edge Function de verificacao

Arquivo:

```text
supabase/functions/verify-google-play-purchase/index.ts
```

Responsabilidade:

1. exigir usuario autenticado;
2. receber `productCode`, `productId`, `purchaseToken`, `packageName`;
3. gerar access token usando service account Google;
4. chamar Google Play Developer API;
5. confirmar `purchaseState === 0`;
6. chamar `grant_mobile_purchase`;
7. consumir produto de ouro;
8. reconhecer/acknowledge passe;
9. retornar resultado.

Deploy:

```bash
npx supabase functions deploy verify-google-play-purchase --project-ref SEU_PROJECT_REF
```

Elite 2050:

```bash
npx supabase functions deploy verify-google-play-purchase --project-ref xebhujvszurydytlrhra
```

Status atingido no Elite 2050:

```text
verify-google-play-purchase: ACTIVE
```

## 9. Configurar secrets no Supabase

Obrigatorio:

```text
GOOGLE_PLAY_PACKAGE_NAME
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

Elite 2050 ja configurado:

```text
GOOGLE_PLAY_PACKAGE_NAME=com.becoslab.elite2050
```

Ainda falta no Elite 2050:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

Comando:

```bash
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME="com.becoslab.elite2050" --project-ref xebhujvszurydytlrhra
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="..." --project-ref xebhujvszurydytlrhra
```

## 10. Configurar Google Auth via Supabase

No app, o botao chama:

```ts
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/worlds`
  }
})
```

Texto recomendado do botao:

```text
Entrar com Google
```

Esse botao serve para:

- entrar em conta existente;
- criar conta automaticamente se o usuario ainda nao existir.

No Google Cloud:

- criar OAuth Client do tipo `Web application`;
- adicionar redirect URI:

```text
https://SEU_PROJECT_REF.supabase.co/auth/v1/callback
```

Elite 2050:

```text
https://xebhujvszurydytlrhra.supabase.co/auth/v1/callback
```

No Supabase:

- Authentication > Sign In / Providers > Google;
- habilitar provider;
- colar Client ID e Client Secret do Google Cloud.

Status Elite 2050:

```text
Google provider: enabled
Client ID/Secret: configurados
Redirect no Supabase: configurado
Redirect no Google Cloud: configurado pelo usuario
```

## 11. Criar app no Play Console

No Play Console:

1. Create app.
2. App name: `Elite 2050`.
3. Package: `com.becoslab.elite2050`.
4. Tipo: Game.
5. Free app com compras internas.
6. Subir AAB em Internal testing.

AAB atual:

```text
C:\Users\Afonso\Downloads\elite-2050\android\app\build\outputs\bundle\release\app-release.aab
```

## 12. Criar produtos no Play Console

Caminho:

```text
Monetize with Play > Products > In-app products / One-time products
```

Criar exatamente:

```text
elite2050_gold_100
elite2050_gold_300
elite2050_gold_700
passe_circuito_neon_01
```

Descricoes sugeridas:

```text
100 Ouro - Receba 100 ouro para usar na loja do Elite 2050.
300 Ouro - Receba 300 ouro para itens e progresso visual.
700 Ouro - Receba 700 ouro para ampliar sua colecao.
Passe Circuito Neon - Desbloqueia a trilha premium do Circuito Neon 01.
```

## 13. Criar service account para validar compras

No Google Cloud:

1. ativar `Google Play Android Developer API`;
2. criar service account;
3. gerar chave JSON.

No Play Console:

1. dar acesso para essa service account;
2. permitir acesso ao app;
3. garantir permissao para ler/gerenciar pedidos/compras.

No Supabase:

```bash
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="JSON_DA_SERVICE_ACCOUNT" --project-ref xebhujvszurydytlrhra
```

## 14. Validar SQL antes do teste real

Rodar auditoria no SQL Editor.

Resultado ideal:

```text
profiles_meta: OK
circuit_definitions: OK
user_circuit_progress: OK
catalog_items: OK
user_inventory: OK
mobile_purchases: OK
grant_mobile_purchase: OK com p_platform
mobile_purchases_purchase_token_key: OK
user_inventory_user_id_item_id_key: OK
active_circuit: OK
catalog_items_count > 0
```

Status Elite 2050:

```text
Tudo OK
active_circuit: circuito-neon-01
catalog_items_count: 48
mobile_purchases_count: 0
```

## 15. Testar com license tester

No Play Console:

1. configurar license testers;
2. publicar Internal testing;
3. instalar pelo link da Play Store;
4. comprar `elite2050_gold_100`;
5. conferir Supabase.

SQL de verificacao:

```sql
select *
from public.mobile_purchases
order by created_at desc
limit 10;

select user_id, gold_balance, premium_active, premium_until
from public.profiles_meta
order by updated_at desc
limit 10;
```

Teste do passe:

```sql
select user_id, circuit_id, premium_unlocked
from public.user_circuit_progress
order by updated_at desc
limit 10;
```

## 16. O que ja esta feito no Elite 2050

Codigo/app:

- Capacitor configurado.
- Android criado.
- Billing bridge nativa criada com status, consulta de produto, cache de ProductDetails e fila de reconexao.
- Client chama plugin Capacitor.
- Loja exige login antes de compra real.
- Loja chama Edge Function antes de liberar saldo.
- Preview web nao credita mais perfil online.
- Google Auth botao `Entrar com Google` configurado no app.
- Manual Play Console criado.

Supabase:

- Edge Function `verify-google-play-purchase` existe e foi endurecida no codigo local.
- Edge Function valida catalogo server-side, `productId`, package name e usuario autenticado.
- Edge Function usa access token Google com cache e trata consume/acknowledge como finalize nao-fatal.
- SQL de premium/inventario/compra existe.
- Migration local `20260529000000_harden_mobile_billing.sql` fecha RPC para `service_role`, remove insert/update direto em `mobile_purchases` e torna `purchase_token` idempotente sem recreditar beneficio.
- `GOOGLE_PLAY_PACKAGE_NAME` configurado.
- Google provider habilitado com Client ID/Secret.

Build:

- `npm run build` passou.
- testes de login/catalogo/assets passaram em rodadas separadas.
- `npx cap sync android` passou.
- `gradlew assembleDebug` passou.
- `gradlew bundleRelease` passou.

Artefatos:

```text
android/app/build/outputs/apk/debug/app-debug.apk
android/app/build/outputs/bundle/release/app-release.aab
```

## 17. O que ainda falta no Elite 2050

Play Console:

- criar app `com.becoslab.elite2050`;
- subir AAB em Internal testing;
- criar os 4 produtos;
- configurar license testers;
- testar compra real.

Google Cloud / Google Play:

- ativar Google Play Android Developer API;
- criar service account;
- dar permissao no Play Console;
- gerar JSON.

Supabase:

- configurar `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
- aplicar/deployar a migration `20260529000000_harden_mobile_billing.sql` no projeto remoto.
- deployar novamente `verify-google-play-purchase`.
- configurar `GOOGLE_PLAY_ALLOWED_ORIGINS` com o dominio real do app quando houver.

Release:

- limpar `npm run lint`, que ainda falha por dividas de tipagem espalhadas;
- testar login Google real;
- testar compra real em Internal testing;
- rotacionar tokens/segredos que tenham sido colados em chat ou terminal compartilhado.

## 17.1. Sua parte agora

Google Cloud:

- ativar Google Play Android Developer API;
- criar service account;
- gerar JSON da service account;
- tratar o JSON como senha.

Play Console:

- criar app `Elite 2050` com package `com.becoslab.elite2050`;
- subir AAB em Internal testing;
- criar os produtos exatamente:
  - `elite2050_gold_100`
  - `elite2050_gold_300`
  - `elite2050_gold_700`
  - `passe_circuito_neon_01`
- linkar a service account em API access;
- dar permissao de pedidos/assinaturas/compras para a service account;
- adicionar license testers;
- instalar pelo link da Play e fazer a primeira compra real.

Depois que voce tiver o JSON da service account:

```bash
npx supabase db push --project-ref xebhujvszurydytlrhra
npx supabase functions deploy verify-google-play-purchase --project-ref xebhujvszurydytlrhra
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME="com.becoslab.elite2050" --project-ref xebhujvszurydytlrhra
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="JSON_DA_SERVICE_ACCOUNT" --project-ref xebhujvszurydytlrhra
```

## 18. Checklist replicavel para outro app

Copie e preencha:

```text
APP_NAME=
PACKAGE_NAME=
SUPABASE_PROJECT_REF=
SUPABASE_URL=
GOOGLE_PLAY_PACKAGE_NAME=
PRODUCT_1=
PRODUCT_2=
PRODUCT_3=
PASS_PRODUCT=
```

Depois siga:

1. travar package/produtos;
2. configurar Capacitor;
3. criar Android;
4. criar Billing plugin;
5. criar catalogo billing;
6. ligar loja -> billing -> Edge Function;
7. aplicar SQL premium/mobile;
8. deploy Edge Function;
9. configurar Supabase secrets;
10. configurar Google Auth;
11. criar app no Play Console;
12. subir AAB internal testing;
13. criar produtos;
14. criar service account;
15. testar compra real.

## 19. Onde este playbook entra nos gates

Gate 8:

- Capacitor;
- paywall no app;
- Billing bridge;
- SQL/RPC;
- Edge Function;
- testes/build.

Gate 9:

- Play Console;
- produtos;
- assets;
- Data Safety;
- internal testing;
- license testers;
- Google Auth configurado.

Gate 10:

- compra real em producao;
- ASO final;
- metricas;
- monitoramento;
- operacao de receita.
