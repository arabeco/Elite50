# Manual Play Console - Elite 2050 e proximos apps

Este manual serve para publicar o Elite 2050 e reaproveitar o mesmo processo nos outros apps.

Para o passo a passo tecnico de paywall, Billing, Edge Function, SQL e Google Auth, use tambem:

```text
PAYWALL_IMPLEMENTATION_PLAYBOOK.md
```

## 1. Dados base do app

Preencha antes de abrir o Play Console.

| Campo | Elite 2050 | Outro app |
| --- | --- | --- |
| Nome publico | Elite 2050 |  |
| Package name | `com.becoslab.elite2050` |  |
| Tipo | Jogo |  |
| Categoria | Esportes / Simulacao / Estrategia |  |
| Preco do app | Gratis, com compras internas |  |
| Email de suporte |  |  |
| Site |  |  |
| Politica de privacidade URL |  |  |
| Conta Supabase | ELITE50 |  |
| Supabase project ref | `xebhujvszurydytlrhra` |  |

## 2. Textos da Store Listing

O Google exige metadados claros, sem promessas enganosas, rankings, emojis forçados, preco no titulo ou claims tipo "melhor jogo".

### Titulo

Limite: ate 30 caracteres.

Sugestao:

```text
Elite 2050
```

### Descricao curta

Objetivo: explicar o jogo em uma frase simples.

Sugestoes:

```text
Monte seu clube e dispute temporadas em um futebol futurista.
```

```text
Gerencie elenco, taticas e carreira em um mundo de futebol 2050.
```

### Descricao completa

Modelo:

```text
Elite 2050 e um jogo de gestao de futebol futurista.

Construa seu elenco, organize taticas, acompanhe temporadas, evolua jogadores e dispute circuitos em um universo esportivo de 2050.

Recursos principais:
- Gestao de elenco e escalação
- Temporadas, partidas e progresso de carreira
- Mercado, itens visuais e recompensas
- Circuitos com trilha gratuita e passe premium
- Perfil de tecnico e identidade do clube

O jogo pode oferecer compras internas opcionais, como pacotes de ouro e passes de circuito. Nenhuma compra e obrigatoria para jogar.
```

### Frases para produtos internos

Use nomes curtos e descricoes honestas.

| Product ID | Nome visivel | Tipo | Descricao sugerida |
| --- | --- | --- | --- |
| `elite2050_gold_100` | 100 Ouro | One-time consumable | Receba 100 ouro para usar na loja do Elite 2050. |
| `elite2050_gold_300` | 300 Ouro | One-time consumable | Receba 300 ouro para itens e progresso visual. |
| `elite2050_gold_700` | 700 Ouro | One-time consumable | Receba 700 ouro para ampliar sua colecao. |
| `passe_circuito_neon_01` | Passe Circuito Neon | One-time entitlement | Desbloqueia a trilha premium do Circuito Neon 01. |

Observacao: o passe esta implementado como produto unico, nao como assinatura.

## 3. Assets que voce pode preparar antes

### Icone do app

Obrigatorio para a store.

- Formato: PNG 32-bit com alpha.
- Tamanho: `512 x 512`.
- Peso maximo: `1024 KB`.
- Evitar texto pequeno, preco, "gratis", rankings, badges falsos ou elementos de notificacao.

Arquivo sugerido:

```text
store-assets/elite2050/icon-512.png
```

### Feature graphic

Obrigatorio/recomendado para destaque da store.

- Formato: JPEG ou PNG 24-bit, sem alpha.
- Tamanho: `1024 x 500`.
- Deve mostrar a promessa visual do jogo.
- Evitar excesso de texto fino, porque fica ilegivel em telas pequenas.

Arquivo sugerido:

```text
store-assets/elite2050/feature-graphic-1024x500.png
```

Ideia para Elite 2050:

```text
Estadio futurista, painel tatico, atleta neon e marca Elite 2050 discreta.
```

### Screenshots

Minimo: 2 screenshots.

Recomendado para jogo:

- 4 a 8 screenshots de celular.
- 2 a 4 screenshots de tablet, se o app estiver bom em tablet.
- Mostrar telas reais, nao mockup enganoso.
- Usar PNG ou JPEG sem alpha.
- Dimensao minima: `320 px`.
- Dimensao maxima: `3840 px`.
- O lado maior nao pode ser mais que 2x o lado menor.

Checklist de prints do Elite:

| Print | Tela | Objetivo |
| --- | --- | --- |
| 01 | Home/Dashboard | Mostrar visao geral do clube |
| 02 | Elenco/Escalação | Mostrar gestao de jogadores |
| 03 | Carreira/Loja | Mostrar ouro, itens e passe |
| 04 | Mundo/Circuito | Mostrar progressao e temporada |
| 05 | Partida/Relatorio | Mostrar resultado e narrativa esportiva |

Pasta sugerida:

```text
store-assets/elite2050/screenshots/phone/
store-assets/elite2050/screenshots/tablet/
```

## 4. Criar app no Play Console

1. Abrir Play Console.
2. Home > Create app.
3. Preencher:
   - App name: `Elite 2050`
   - Default language: Portugues ou Ingles, conforme estrategia.
   - App or game: Game.
   - Free or paid: Free.
   - Developer contact email.
4. Aceitar declaracoes exigidas.
5. Confirmar package name no primeiro upload:

```text
com.becoslab.elite2050
```

## 5. Upload do AAB

Arquivo atual:

```text
C:\Users\Afonso\Downloads\elite-2050\android\app\build\outputs\bundle\release\app-release.aab
```

Comece por:

```text
Testing > Internal testing
```

Nao va direto para producao. Primeiro precisa validar login, compra, saldo e passe.

## 6. Produtos no Play Console

Caminho:

```text
Monetize with Play > Products > In-app products / One-time products
```

Crie exatamente estes IDs:

```text
elite2050_gold_100
elite2050_gold_300
elite2050_gold_700
passe_circuito_neon_01
```

Produtos de ouro:

- Tipo: one-time product / INAPP.
- Comportamento no app: consumable.
- A Edge Function consome depois de validar.

Passe:

- Tipo: one-time product / INAPP.
- Comportamento no app: entitlement.
- A Edge Function reconhece/acknowledge.
- Nao e subscription por enquanto.

## 7. Google Cloud e Google Play Developer API

Precisa para o Supabase validar compras no servidor.

1. Entrar no Google Cloud com a conta do Play Console.
2. Criar ou escolher um Cloud Project.
3. Ativar:

```text
Google Play Android Developer API
```

4. Criar uma service account.
5. Gerar chave JSON.
6. No Play Console, dar permissao para essa service account acessar o app.
7. Copiar o JSON para configurar no Supabase.

Secret ja configurado:

```text
GOOGLE_PLAY_PACKAGE_NAME=com.becoslab.elite2050
```

Secret que ainda falta:

```text
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
```

## 8. Supabase status do Elite 2050

Projeto:

```text
xebhujvszurydytlrhra
```

Edge Function deployada:

```text
verify-google-play-purchase
```

SQL de pagamento ja conferido:

- `mobile_purchases`: OK
- `profiles_meta`: OK
- `grant_mobile_purchase`: OK
- indice unico de purchase token: OK
- circuito ativo: `circuito-neon-01`

Ainda falta configurar o JSON da service account.

## 9. License testers e compra real

Antes de testar compra:

1. Play Console > Settings > License testing.
2. Adicionar Gmail dos testers.
3. Publicar app em Internal testing.
4. Garantir que o tester entrou no link da lista.
5. Instalar o app pelo link da Play Store de teste.
6. Comprar:

```text
elite2050_gold_100
```

7. Conferir no Supabase:

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

```text
passe_circuito_neon_01
```

Conferir:

```sql
select user_id, premium_active, premium_source, premium_until
from public.profiles_meta
order by updated_at desc
limit 10;

select user_id, circuit_id, premium_unlocked
from public.user_circuit_progress
order by updated_at desc
limit 10;
```

## 10. Privacidade, Data Safety e conta

Checklist que costuma travar publicacao:

- URL publica de politica de privacidade.
- Politica menciona o app ou a entidade desenvolvedora.
- Politica explica dados coletados, uso, compartilhamento, seguranca e retencao.
- Play Console > App content > Data safety preenchido.
- Se o app permite criar conta, precisa caminho para exclusao da conta/dados.
- Declarar compras internas na store.
- Declarar publicidade, se houver.
- Declarar publico-alvo/idade.
- Declarar categoria de conteudo.

Para Elite 2050, assumir no minimo:

- Conta/login via Supabase.
- Login com Google via Supabase OAuth. O botao `Entrar com Google` serve para entrar em conta existente ou criar a conta automaticamente quando o usuario ainda nao existe.
- Email ou identificador de usuario.
- Dados de progresso/jogo.
- Compras internas.
- Dados podem trafegar criptografados entre app, Supabase e Google Play.

## 11. Checklist por app

Copie esta tabela para cada um dos 5 apps.

| Item | Status | Observacao |
| --- | --- | --- |
| Package name definido | Pendente |  |
| App criado no Play Console | Pendente |  |
| AAB gerado | Pendente |  |
| AAB enviado para internal testing | Pendente |  |
| Icone 512 preparado | Pendente |  |
| Feature graphic 1024x500 preparado | Pendente |  |
| 4 screenshots phone preparados | Pendente |  |
| 2 screenshots tablet preparados | Pendente |  |
| Titulo curto revisado | Pendente |  |
| Descricao curta revisada | Pendente |  |
| Descricao completa revisada | Pendente |  |
| Politica de privacidade publicada | Pendente |  |
| Data Safety preenchido | Pendente |  |
| Produtos criados | Pendente |  |
| Service account criada | Pendente |  |
| Google Play Developer API ativa | Pendente |  |
| Service account com acesso no Play Console | Pendente |  |
| Secrets Supabase configurados | Pendente |  |
| License testers configurados | Pendente |  |
| Compra teste gold validada | Pendente |  |
| Compra teste passe validada | Pendente |  |

## 12. Ordem recomendada para fazer 5 apps sem se perder

1. Criar uma pasta `store-assets/NOME_DO_APP`.
2. Separar icone, feature graphic e screenshots.
3. Escrever titulo, descricao curta e descricao completa.
4. Criar app no Play Console.
5. Subir AAB em internal testing.
6. Criar produtos.
7. Configurar service account/API.
8. Configurar secrets do backend.
9. Testar compra real com license tester.
10. So depois preparar producao.

## Fontes oficiais usadas

- Google Play: Create and set up your app
- Google Play: Add preview assets to showcase your app
- Google Play: Create in-app products / one-time products
- Google Play: User Data and privacy policy requirements
- Google Play: Data safety section
- Google Play: Test in-app billing with application licensing
- Google Play Developer API: getting started with service accounts
