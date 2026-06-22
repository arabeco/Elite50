# Paywall Android - Auditoria Padrao GOL

## Fluxo local conferido

- Android chama plugin nativo Capacitor `Elite2050Billing`.
- Plugin retorna `purchaseToken`, `productId`, `packageName`, `orderId`, estado da compra e produtos retornados pela Google Play.
- Client chama somente a Supabase Edge Function `verify-google-play-purchase`.
- Edge Function valida usuario, `packageName`, `productId`, `purchaseToken` e compra na Google Play Developer API.
- Beneficio e liberado por RPC Supabase com `service_role`.
- Nao ha API route da Vercel para billing.
- Vercel fica somente com env publica do app.

## Ajustes feitos nesta auditoria

- Plugin Android aproximado do padrao GOL: encerra conexao no destroy, confere resultado do `launchBillingFlow`, pega a compra do produto certo e retorna `packageName` do recibo quando existir.
- Paywall trata compra pendente antes de tentar validar no servidor.
- Mensagem de erro do checkout Android deixou de dizer que o bridge falta quando a falha e da Google Play.
- Secrets `GOOGLE_PLAY_*` foram removidos do `.env.example` raiz.
- Exemplo de secrets da Edge Function movido para `supabase/google-play-secrets.example.env`.
- Pendencias atualizadas para reforcar que billing secret nao vai para Vercel.

## Ainda depende de console externo

- Deployar a Supabase Edge Function `verify-google-play-purchase`.
- Setar `GOOGLE_PLAY_PACKAGE_NAME` e `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` como Supabase secrets.
- Ativar Google Play Android Developer API no Google Cloud.
- Criar e autorizar a service account no Play Console.
- Criar no Play Console os produtos:
  - `elite2050_gold_100`
  - `elite2050_gold_300`
  - `elite2050_gold_700`
  - `passe_circuito_neon_01`
- Subir AAB em Internal testing e testar compra real.

## Observacao

O Elite hoje usa produtos one-time/INAPP: moedas consumiveis e passe como entitlement de 90 dias. Portanto nao precisa `basePlanId` enquanto `passe_circuito_neon_01` continuar sendo produto gerenciado, nao assinatura.
