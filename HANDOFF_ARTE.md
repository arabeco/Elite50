# Handoff de arte e assets — Elite 2050

Documento para quem for pegar a parte visual (imagens, geração, ícones, fundos).
Escrito em 2026-09-12 a partir do repositório. Tudo aqui foi medido, não estimado.

## Antes de começar: veja o que já existe

```bash
npm run dev
```

Abra `http://localhost:3000/catalogo.html`. É o catálogo completo, gerado a partir dos
arquivos reais: todo cabelo com o offset individual aplicado, toda chuteira com raridade e
preço, todo escudo, todo uniforme, troféus, ícones de fusão. Tem também um laboratório que
empilha corpo + uniforme + cabelo + chuteira ao vivo, que é o jeito mais rápido de ver se
uma peça nova encaixa.

O catálogo é gerado, não escrito à mão. Se você adicionar assets, ele precisa ser
regenerado (o gerador lê `src/constants/` e `public/assetas/avatars/`).

---

## O contrato de canvas

O avatar é uma pilha de PNGs transparentes desenhada por
[PlayerAvatar.tsx](src/components/PlayerAvatar.tsx). A ordem e as regras:

| Camada | z-index | Canvas | Posicionamento |
|---|---|---|---|
| Corpo | 10 | 375×666 | `inset-0`, `object-contain` |
| Uniforme | 20 | 375×666 | `inset-0`, `object-contain` |
| Cabelo | 30 | 375×666 | `object-contain` + offset individual por peça |
| Chuteira | 100 | livre hoje | `bottom:5%`, `left:45%`, `width:59%`, `translateX(-50%)` |

**Corpo, uniforme e cabelo compartilham o mesmo canvas 375×666 e o mesmo enquadramento.**
É isso que faz o cabelo cair na cabeça sem cálculo. Qualquer peça nova dessas três
categorias tem que nascer nesse canvas, com a figura na mesma posição.

O offset de cabelo existe em [avatarAssets.ts](src/constants/avatarAssets.ts) como
correção fina, em porcentagem. Hoje 14 das 15 peças femininas têm ajuste individual e
apenas uma masculina (a M09). Se uma peça nova precisar de offset, é ali.

### Dimensões atuais por categoria

| Pasta | Peças | Canvas dominante | Peso médio | Peso total |
|---|---|---|---|---|
| `bodies` | 6 | 375×666 (todas) | 105 KB | 630 KB |
| `hair/masc` | 17 | 375×666 (todas) | 18 KB | 308 KB |
| `hair/fem` | 15 | 375×666 (todas) | 20 KB | 307 KB |
| `uniforms` | 44 | 375×666 (43 de 44) | 88 KB | 3,9 MB |
| `logos` | 49 | 500×500 (38 de 49) | 137 KB | 6,7 MB |
| `boots` | 30 | nenhum, varia | 72 KB | 2,2 MB |
| `trophies` | 7 | nenhum, varia | 102 KB | 715 KB |
| `pass` | 3 | nenhum, varia | 356 KB | 1,1 MB |

Total: **16 MB de PNG dentro do APK.**

---

## Tarefas, em ordem de retorno

### T1 — Dois itens da loja não têm arquivo 🔴

[storeCatalog.ts](src/constants/storeCatalog.ts) vende dois escudos épicos por fragmento
que apontam para arquivos inexistentes:

```text
logo_pulse_hex   -> /assetas/avatars/logos/store-logo-pulse-hex.png    (não existe)
logo_solar_wire  -> /assetas/avatars/logos/store-logo-solar-wire.png   (não existe)
```

São os dois itens mais caros da vitrine de logos. Os três irmãos que existem
(`store-logo-quantum-vault`, `store-logo-holo-tiger`, `store-logo-blackout-crown`) servem
de referência de estilo. Cada item já tem paleta definida no próprio catálogo:

- `logo_pulse_hex`: primary `#14532d`, secondary `#a3e635`, accent `#f8fafc`, padrão `stripes_vertical`
- `logo_solar_wire`: primary `#7c2d12`, secondary `#fb923c`, accent `#fde68a`, padrão `stripes_horizontal`

**Decisão pendente do dono do projeto:** produzir a arte ou remover os dois itens. Enquanto
não resolver, quem comprar leva um quadrado quebrado.

Depois de resolver, vale estender [assetMapping.test.ts](src/test/assetMapping.test.ts)
para varrer `STORE_ITEMS` também. Hoje ele cobre os 32 times e os 4 distritos, e por isso
esse buraco passou verde.

### T2 — 16 MB de PNG no APK 🔴

O peso não vem de resolução alta, vem de PNG sem otimização. Exemplos:

```text
team-09-logo.png   202 KB   para renderizar a ~40 px
founder-logo-06.png 70 KB   para renderizar a ~30 px
pass-circuit-neon-banner.png  542 KB
trophy-elite-cup.png          246 KB
```

O que fazer, sem mexer em nada de código:

1. Rodar tudo por `pngquant` ou `oxipng`. Em arte de paleta reduzida como essa, corte de
   60 a 80% é comum e sem perda visível.
2. Reduzir os escudos de 500×500 para 256×256. Eles nunca aparecem acima de ~120 px na UI.
3. Avaliar WebP. O Capacitor Android e todos os navegadores alvo suportam. Só precisa
   trocar a extensão nos geradores de caminho (ver "Onde os caminhos são montados").

Meta razoável: sair de 16 MB para 3 a 4 MB.

### T3 — As chuteiras não têm canvas comum 🟡

As 30 peças variam de 234×162 a 364×233. Por isso o posicionamento em
`PlayerAvatar` é um chute fixo (`width: 59%`, `bottom: 5%`): é o valor que funciona na
média e erra nas pontas. As seis peças grandes (`boot_24`, `25`, `32`, `33`, `34`, `36`,
`43`, `44`) aparecem visivelmente maiores no pé.

Normalizar todas para um canvas único, com o par de chuteiras na mesma posição e escala
dentro dele, resolve de uma vez e permite trocar o `59%` por um valor exato. Sugestão de
canvas: 360×240, já que é o maior atual.

### T4 — Escudos de fundador fora do padrão 🟡

Os 32 escudos de time são 500×500. Os 10 de fundador variam de 167×197 a 210×232, e
`team-32-logo.png` é 306×312. Renderizam no mesmo lugar, com o mesmo tamanho de caixa, e
por isso os de fundador saem mais pesados e mais moles. Normalizar para 500×500 (ou para o
256×256 da T2) com a figura centralizada e a mesma margem.

`team-27-uniform.png` também está fora: é 500×500 num conjunto de 375×666. Suspeita de
arquivo trocado, vale conferir se é mesmo um uniforme.

### T5 — Fundos de tela 🟡

Já corrigido o principal: os cinco arquivos estavam espalhados e três nem entravam no
build. Agora os cinco estão em `public/` e saem no `dist/`. Falta o acabamento:

```text
home.jpg      768×1360   399 KB
elenco.jpg    768×1360   257 KB
mundo.jpg     720×1280   409 KB
calendar.jpg  572×1024   113 KB
carreira.jpg  572×1024   122 KB
```

Três proporções diferentes para cinco telas que fazem a mesma coisa. Padronizar numa
resolução só (sugestão: 828×1792, que cobre a maioria dos aparelhos Android sem esticar) e
comprimir. `mundo.jpg` com 409 KB é o pior caso.

O mapa de qual fundo vai em qual aba está em [Dashboard.tsx](src/components/Dashboard.tsx),
na constante `bgImages`.

### T6 — Dois itens de perfil sem arte 🟡

`accessory_founder_whistle` (Apito de Fundador) e `accessory_scout_lens` (Lente de Scout)
usam `/logo.png` como imagem, ou seja, o logo do app como placeholder. São itens de perfil
vendidos por ouro e fragmento, que aparecem no card público do manager.

### T7 — Assets órfãos, decidir o destino 🟢

No disco e fora de qualquer catálogo:

```text
public/assetas/avatars/uniforms/store-kit-special-six.png
public/assetas/avatars/uniforms/unused-uniform-20-alt.png
public/assetas/avatars/uniforms/unused-uniform-34.png
public/sw.js                          (service worker, só desregistrado, nunca registrado)
public/hair-review.html               (ferramenta antiga, substituída pelo catalogo.html)
```

`store-kit-special-six` tem cara de skin pronta que nunca foi cadastrada. Se prestar, é um
item de loja de graça: basta uma entrada em `cosmeticItems` no `storeCatalog.ts`.

### T8 — Troféus sem padrão 🟢

Os sete variam de 127×156 a 500×500. Os quatro de liga distrital são coerentes entre si
(~155×225), mas `trophy-district-cup` é 500×500 e `trophy-elite-cup` é 329×565. Na vitrine
de conquistas eles aparecem lado a lado, então a diferença de escala fica visível.

---

## Onde os caminhos são montados

Nenhum asset é referenciado por string solta. Os caminhos são gerados por convenção de
nome, e é isso que torna o padrão de nomenclatura obrigatório.

| Categoria | Arquivo que monta o caminho | Convenção |
|---|---|---|
| Escudo e uniforme de time | [teamIdentity.ts](src/utils/teamIdentity.ts) | `team-NN-logo.png` / `team-NN-uniform.png`, NN de `01` a `32` |
| Escudo de fundador | [teamIdentity.ts](src/utils/teamIdentity.ts) | `founder-logo-NN.png`, NN de `01` a `10` |
| Distrito | [teamIdentity.ts](src/utils/teamIdentity.ts) | `district-{norte,sul,leste,oeste}-{logo,uniform}.png` |
| Corpo | [PlayerAvatar.tsx](src/components/PlayerAvatar.tsx) | `body_{m,f}_{1,2,3}.png` |
| Cabelo | [avatarAssets.ts](src/constants/avatarAssets.ts) | nome livre, mas tem que estar listado no array do gênero |
| Chuteira | [store.ts](src/utils/store.ts) | `boot_NN.png`, NN vindo de `bootVisualId` no catálogo |
| Troféu | [trophyAssets.ts](src/utils/trophyAssets.ts) | `trophy-*.png`, mapeado nome a nome |

**Não renomeie nada dessas categorias sem mexer no gerador correspondente.** O teste
[assetMapping.test.ts](src/test/assetMapping.test.ts) trava as duas primeiras linhas da
tabela: ele falha se algum dos 32 times perder logo ou uniforme, ou se o par logo/uniforme
sair de sincronia.

Cabelo é a exceção: o array em `avatarAssets.ts` é a fonte da verdade, e o índice na lista
é o `hairId` gravado em cada jogador. **Reordenar o array troca o cabelo de todo mundo que
já existe em save.** Só acrescente no fim.

---

## Uma coisa de código que trava a arte

[generator.ts](src/engine/generator.ts), na função `generateName`:

```ts
bootId: randomInt(1, 2)
```

Todo jogador do mundo nasce com `boot_01` ou `boot_02`. As outras 28 chuteiras, 2,2 MB de
arte, só existem para quem comprar na loja. Se a ideia for que a coleção apareça em campo,
é uma linha. Se a ideia for que chuteira seja exclusivamente item de loja, então o peso
dessas 28 peças no APK precisa ser justificado por outra via (ver T2).

Decisão do dono do projeto, não da arte.

---

## Como regenerar o catálogo

```bash
npm run catalog
```

O gerador é [scripts/build-catalog.ts](scripts/build-catalog.ts). Ele importa as constantes
reais (`storeCatalog`, `avatarAssets`, `districtTheme`, `traitDescriptions`,
`managerTraits`, `billingCatalog`, `trophyAssets`), varre `public/assetas/avatars/`, e
reescreve `public/catalogo.html`.

Toda vez que você adicionar, remover ou renomear um asset, rode de novo. A página é
descartável: nunca edite `public/catalogo.html` na mão, edite o gerador.
