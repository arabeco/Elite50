# Paywall / Compra Real - Pendencias

## 1. Supabase remoto

- Edge Functions atualizadas ja aparecem deployadas no painel:

```bash
npx supabase functions deploy verify-google-play-purchase --project-ref xebhujvszurydytlrhra
npx supabase functions deploy delete-account --project-ref xebhujvszurydytlrhra
```

Status confirmado pelo CLI: `verify-google-play-purchase` e `delete-account` existem no projeto `ELITE50`, ativas.

- Setar secrets:

```bash
npx supabase secrets set GOOGLE_PLAY_PACKAGE_NAME="com.becoslab.elite2050" --project-ref xebhujvszurydytlrhra
npx supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="JSON_DA_SERVICE_ACCOUNT" --project-ref xebhujvszurydytlrhra
```

- Status informado pelo painel:
  - `GOOGLE_PLAY_PACKAGE_NAME` setado
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` regravado com o JSON da service account compartilhada
  - `GOOGLE_PLAY_ALLOWED_ORIGINS` setado com `https://elite-50.vercel.app`

- Conferir que nenhum secret `GOOGLE_PLAY_*`, `SUPABASE_SERVICE_ROLE_KEY` ou private key foi colocado na Vercel.

## 2. Google Cloud / Play Console

- Google Play Android Developer API ativa.
- Service Account usada no JSON autorizada no Play Console.
- Service Account liberada para os apps com permissoes de pedidos/compras.

## 3. Play Console

- Criar app com package:

```text
com.becoslab.elite2050
```

- AAB ja enviado em Internal testing.
- Criar os produtos exatamente:

```text
elite2050_gold_100
elite2050_gold_300
elite2050_gold_700
passe_circuito_neon_01
```

- Marcar app como free com compras internas.
- Produtos criados no Play Console com esses IDs.
- License tester/admin disponivel.
- Permissao da service account para pedidos/compras configurada.

## 4. Teste real

- Instalar pelo link de Internal testing.
- Fazer login Google real.
- Comprar `elite2050_gold_100`.
- Conferir no Supabase se a compra entrou em `mobile_purchases`.
- Conferir se o saldo subiu em `profiles_meta`.
- Comprar/testar `passe_circuito_neon_01`.
- Conferir se `premium_unlocked` ativou em `user_circuit_progress`.

## 5. Polimento depois do primeiro teste

- Botao/estado de compra pendente mais bonito.
- Botao de restaurar compras.
- Mensagem clara quando produto nao existe no Play ainda.
- Revisar precos/textos finais dos pacotes.
