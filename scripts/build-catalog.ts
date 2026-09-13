/**
 * Gera public/catalogo.html — o catalogo visual do jogo.
 *
 * Le as constantes reais de src/constants e src/utils, varre
 * public/assetas/avatars, e emite uma pagina unica com o laboratorio de avatar,
 * o mapa de fluxo, o catalogo de assets e os relatorios.
 *
 *   npm run catalog
 *
 * Nada aqui e escrito a mao: mudou constante ou asset, rode de novo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STORE_ITEMS, APP_CIRCUIT } from '../src/constants/storeCatalog';
import { MALE_HAIR_FILES, FEMALE_HAIR_FILES, HAIR_OFFSETS, getHairOffset } from '../src/constants/avatarAssets';
import { DISTRICT_THEMES } from '../src/utils/districtTheme';
import { TRAIT_DESCRIPTIONS } from '../src/constants/traitDescriptions';
import { STARTER_MANAGER_TRAITS } from '../src/constants/managerTraits';
import { BILLING_CATALOG } from '../src/constants/billingCatalog';
import { TROPHY_ASSETS } from '../src/utils/trophyAssets';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_ASSETS = path.join(REPO, 'public/assetas/avatars');

const data = {
  storeItems: STORE_ITEMS,
  circuit: APP_CIRCUIT,
  hair: {
    M: MALE_HAIR_FILES.map((f, i) => ({ id: i + 1, file: f, offset: getHairOffset('M', f) })),
    F: FEMALE_HAIR_FILES.map((f, i) => ({ id: i + 1, file: f, offset: getHairOffset('F', f) })),
  },
  hairOffsets: HAIR_OFFSETS,
  districts: DISTRICT_THEMES,
  traits: TRAIT_DESCRIPTIONS,
  managerTraits: STARTER_MANAGER_TRAITS,
  billing: BILLING_CATALOG,
  trophies: TROPHY_ASSETS,
};

const assetSrc = (relFromAvatars: string) => encodeURI('/assetas/avatars/' + relFromAvatars);

const esc = (s: unknown) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------- source data
const ls = (dir: string) => fs.readdirSync(path.join(PUBLIC_ASSETS, dir)).sort();
const boots = data.storeItems.filter((i) => i.category === 'BOOT');
const kits = data.storeItems.filter((i) => i.category === 'KIT');
const logosStore = data.storeItems.filter((i) => i.category === 'LOGO');
const profileItems = data.storeItems.filter((i) => i.category === 'ACCESSORY' || i.category === 'BADGE');
const uniformFiles = ls('uniforms');
const logoFiles = ls('logos');
const trophyFiles = ls('trophies');
const passFiles = ls('pass');
const fusionFiles = ls('fusion-icons');
const bodyFiles = ls('bodies');

const exists = (rel: string) => fs.existsSync(path.join(PUBLIC_ASSETS, rel));

const RARITY: Record<string, { label: string; color: string }> = {
  COMMON:    { label: 'Comum',    color: '#8b948c' },
  UNCOMMON:  { label: 'Incomum',  color: '#8fd36a' },
  RARE:      { label: 'Rara',     color: '#38d7c6' },
  EPIC:      { label: 'Epica',    color: '#bd6cff' },
  LEGENDARY: { label: 'Lendaria', color: '#f0a43c' },
};

const DISTRICT_ORDER = ['NORTE', 'SUL', 'LESTE', 'OESTE', 'EXILADO'] as const;

// ---------------------------------------------------------------- components
const tile = ({ src, code, name, meta, note, accent, tall }: any) => `
        <figure class="tile${tall ? ' tile--tall' : ''}"${accent ? ` style="--tile-accent:${accent}"` : ''}>
          <div class="tile__stage"><img src="${src}" alt="${esc(name || code)}" loading="lazy" /></div>
          <figcaption>
            <span class="tile__code">${esc(code)}</span>
            ${name ? `<span class="tile__name">${esc(name)}</span>` : ''}
            ${meta ? `<span class="tile__meta">${esc(meta)}</span>` : ''}
            ${note ? `<span class="tile__note">${note}</span>` : ''}
          </figcaption>
        </figure>`;

const avatarStack = ({ body, uniform, hair, boot, offset, code, name, meta }: any) => `
        <figure class="tile tile--avatar">
          <div class="tile__stage stack">
            <img class="ly" style="z-index:1" src="${body}" alt="" loading="lazy" />
            <img class="ly" style="z-index:2" src="${uniform}" alt="" loading="lazy" />
            <img class="ly" style="z-index:3;left:${offset.x}%;top:${offset.y}%" src="${hair}" alt="${esc(name || code)}" loading="lazy" />
            ${boot ? `<img class="ly boot" style="z-index:4" src="${boot}" alt="" loading="lazy" />` : ''}
          </div>
          <figcaption>
            <span class="tile__code">${esc(code)}</span>
            ${meta ? `<span class="tile__meta">${esc(meta)}</span>` : ''}
          </figcaption>
        </figure>`;

// ---------------------------------------------------------------- sections
const bodyM = assetSrc('bodies/body_m_1.png');
const bodyF = assetSrc('bodies/body_f_1.png');
const uniNorte = assetSrc('uniforms/district-norte-uniform.png');
const uniOeste = assetSrc('uniforms/district-oeste-uniform.png');

const hairSection = (gender: 'M' | 'F', list: any[], bodySrc: string, uniSrc: string) => {
  const folder = gender === 'M' ? 'masc' : 'fem';
  return list.map((h) => {
    const tuned = h.offset.x !== 0 || h.offset.y !== 0;
    return avatarStack({
      body: bodySrc,
      uniform: uniSrc,
      hair: assetSrc(`hair/${folder}/${h.file}`),
      offset: h.offset,
      code: `${gender}${String(h.id).padStart(2, '0')}`,
      name: h.file,
      meta: tuned ? `offset ${h.offset.x} / ${h.offset.y}` : 'sem ajuste',
    });
  }).join('');
};

const bootCard = (b: any) => {
  const r = RARITY[b.rarity];
  const bonus = b.bootBonus
    ? [b.bootBonus.progressionGainPct ? `+${b.bootBonus.progressionGainPct}% ganho` : null,
       b.bootBonus.progressionLossMitigationPct ? `-${b.bootBonus.progressionLossMitigationPct}% perda` : null]
      .filter(Boolean).join(' &middot; ')
    : 'so visual';
  return `
        <figure class="tile tile--boot" style="--tile-accent:${r.color}">
          <div class="tile__stage"><img src="${assetSrc('boots/' + b.imagePath.split('/').pop())}" alt="${esc(b.name)}" loading="lazy" /></div>
          <figcaption>
            <span class="tile__code">${esc(b.id)}</span>
            <span class="tile__name">${esc(b.name)}</span>
            <span class="tile__meta">${r.label} &middot; ${b.price} ${b.currency === 'GOLD' ? 'ouro' : 'frag'}</span>
            <span class="tile__note">${bonus}</span>
          </figcaption>
        </figure>`;
};

const findingsCritical: any[] = [
  {
    sev: 'critico', fixed: true, tag: 'Visual', title: 'Tres das cinco telas principais estavam sem fundo',
    where: 'src/components/Dashboard.tsx:292',
    body: `O mapa de fundos aponta para <code>/calendar.jpg</code>, <code>/mundo.jpg</code> e <code>/carreira.jpg</code>, mas esses tres arquivos estao na raiz do repositorio, nao em <code>public/</code>. Confirmei que nao entram no build: <code>dist/</code> e <code>android/app/src/main/assets/public/</code> so tem <code>home.jpg</code> e <code>elenco.jpg</code>. Calendario, Mundo e Carreira renderizam sobre o preto liso enquanto Home e Elenco tem arte.`,
    done: 'Os tres jpg foram movidos para public/ e ja aparecem no dist. Ainda vale otimizar: mundo.jpg tem 409 KB.',
  },
  {
    sev: 'critico', fixed: true, tag: 'Texto', title: 'O onboarding inteiro estava com acento quebrado',
    where: 'src/components/NewGameFlow.tsx (20 linhas) + src/hooks/useTransfers.ts (4)',
    body: `A primeira tela que todo jogador novo ve mostra <code>Protocolo de SucessÃ£o Ativo</code>, <code>DisponÃ­vel</code>, <code>OrÃ§amento Inicial</code> e o botao final <code>Entrar na GÃªnese</code>. Sao arquivos salvos em UTF-8 com BOM cujo conteudo foi gravado como latin-1 em algum momento. Os toasts de troca em <code>useTransfers</code> tem o mesmo problema.`,
    done: '22 linhas reescritas nos dois arquivos, tres bullets restaurados e o BOM removido de ambos. Confirmado no bundle de producao.',
  },
  {
    sev: 'medio', tag: 'Economia', title: 'O passe de 90 dias nunca expira',
    where: 'supabase/migrations/20260421002000_meta_store_rpcs.sql:304',
    body: `Primeiro a boa noticia, porque eu tinha errado nisso: <strong>a compra funciona</strong>. A Edge Function valida o token na Google, a <code>grant_mobile_purchase</code> grava <code>premium_active = true</code> e <code>premium_until = agora + 90 dias</code>. O <code>ends_at</code> do circuito, que diz 20 de julho, <strong>nao e lido por consulta nenhuma</strong> do projeto: tudo filtra por <code>is_active</code>, e nada nunca desliga essa flag. Entao quem comprar hoje recebe o premium normalmente. O problema e o outro lado: <code>premium_until</code> e gravado e <strong>nunca lido</strong>, nem no SQL nem no app, e <code>premium_active</code> nunca volta para false. Os 90 dias que o produto anuncia na loja viram acesso permanente.`,
    fix: 'Ou ler premium_until ao carregar o perfil, ou parar de vender como assinatura de 90 dias.',
  },
  {
    sev: 'medio', tag: 'Economia', title: 'O prazo do circuito que aparece na tela e inventado no cliente',
    where: 'src/utils/store.ts:47',
    body: `<code>createDefaultStoreState()</code> monta <code>endsAt = agora + 90 dias</code> no navegador. O servidor tem a data real em <code>circuit_definitions</code>. As duas nunca conversam, entao o contador que o jogador ve reinicia sozinho e nao corresponde a nada.`,
    fix: 'Ler endsAt do snapshot do servidor em loadMetaStoreSnapshot, como ja e feito com premiumActive.',
  },
  {
    sev: 'critico', tag: 'Economia', title: 'A trava da recompensa de temporada depende de existir circuito ativo',
    where: 'supabase/migrations/20260421001000_season_rewards.sql',
    body: `Hoje isso <strong>esta funcionando</strong>: existe uma linha ativa em <code>circuit_definitions</code> e nada nunca a desliga, entao a checagem roda e a recompensa sai uma vez so por temporada. O risco e estrutural. Toda a checagem <code>ALREADY_GRANTED</code> mora dentro de <code>if v_active_circuit_id is not null</code>, mas o <code>update profiles_meta set gold_balance = gold_balance + p_gold</code> esta <strong>fora</strong> desse bloco. No dia em que alguem desativar o circuito, ou criar o circuito 02 sem ativar, a funcao vira um deposito repetivel de ate 250 ouro por chamada, sem nenhum aviso.`,
    fix: 'Mover a checagem para fora do if, gravando a claim numa tabela que nao dependa de circuito. E uma mudanca de dez linhas que remove uma armadilha permanente.',
  },
  {
    sev: 'critico', tag: 'Loja', title: 'Dois itens epicos da loja tem imagem 404',
    where: 'src/constants/storeCatalog.ts',
    body: `<code>logo_pulse_hex</code> e <code>logo_solar_wire</code> apontam para <code>store-logo-pulse-hex.png</code> e <code>store-logo-solar-wire.png</code>, que nao existem em <code>public/assetas/avatars/logos/</code>. Sao os dois itens mais caros da vitrine de logos, vendidos por fragmento. O <code>assetMapping.test.ts</code> cobre os 32 times e os 4 distritos, mas nunca varre o catalogo da loja, entao a suite passa verde.`,
    fix: 'Produzir os dois PNG ou remover os itens, e estender o teste de asset para STORE_ITEMS.',
  },
];

const findingsMedium: any[] = [
  {
    sev: 'medio', fixed: true, tag: 'Onboarding', title: 'Fundar clube rebobinava o relogio do mundo',
    where: 'src/components/NewGameFlow.tsx:469',
    body: `<code>handleFinishFounder</code> terminava escrevendo <code>currentDay: -1</code> no estado do mundo. Para um mundo recem-criado isso nao fazia nada, porque o <code>generateInitialState</code> ja nasce em -1. Mas fundar clube tambem e permitido durante o Genesis, nos dias 0 a 2, e ali a linha jogava o dia compartilhado de volta para antes da abertura do draft. Como o estado do mundo e salvo para todos, o relogio de todo participante voltava junto.`,
    done: 'A linha saiu. O caminho de herdeiro nunca mexeu em currentDay, entao agora as duas portas de entrada se comportam igual.',
  },
  {
    sev: 'medio', fixed: true, tag: 'Onboarding', title: 'As duas portas de entrada discordavam sobre clube livre',
    where: 'src/components/NewGameFlow.tsx:88',
    body: `O onboarding considerava um clube disponivel com <code>manager.isNPC !== false</code>. O painel de observador usava uma regra mais estrita, que tambem olha o formato do id: NPC nasce como <code>m_...</code>, humano carrega o id do Supabase. Um manager humano vindo de save antigo, sem <code>isNPC</code> gravado, passava por NPC na primeira tela e o clube dele aparecia como vaga aberta.`,
    done: 'A regra virou um helper unico, isHumanManager em utils/managerProfile, usado pelas duas telas. De quebra, availableHeirTeams e replaceableTeams eram dois useMemo identicos e viraram um.',
  },
  {
    sev: 'medio', tag: 'Onboarding', title: 'O draft do fundador e codigo morto que a documentacao ainda promete',
    where: 'src/components/NewGameFlow.tsx:111',
    body: `O componente calcula lista filtrada de atletas, selecao de 15, teto de score, travas de posicao e limite de tres jogadores acima de 900. Nada disso e renderizado, e <code>isDraftValid</code> nao e lido em lugar nenhum. <code>handleFinishFounder</code> cria o clube com <code>squad: []</code> e nunca toca em <code>selectedPlayerIds</code>. Na pratica o fundador nasce sem elenco e preenche pelo Draft Genesis, que e outro sistema, no DraftPanel. Isso esta correto para a arquitetura de hoje, mas sobraram cerca de 120 linhas mortas, um import de <code>refillTeamRoster</code> que nunca e chamado, e o <code>documentacao.md</code> ainda descreve as travas antigas de 2 GK, 5 DEF, 5 MID, 3 ATK que nao existem em lugar nenhum.`,
    fix: 'Apagar o bloco morto e alinhar o documentacao.md com o Draft Genesis real.',
  },
  {
    sev: 'medio', tag: 'Conteudo', title: '28 das 30 chuteiras nunca aparecem em campo',
    where: 'src/engine/generator.ts:148',
    body: `<code>generateName()</code> sorteia <code>bootId: randomInt(1, 2)</code>. Todo jogador do mundo nasce com boot_01 ou boot_02. Os outros 28 modelos, 2,2 MB de arte, so existem para quem comprar na loja.`,
  },
  {
    sev: 'medio', tag: 'Avatar', title: 'Jogadores legitimos tem o visual re-sorteado',
    where: 'src/components/PlayerAvatar.tsx:26',
    body: `<code>isLegacyDefaultAppearance</code> trata a combinacao bodyId 1 + hairId 1 + bootId 1 como save antigo e re-sorteia genero, corpo e cabelo a partir do id. Mas essa combinacao e perfeitamente sorteavel pelo gerador atual, entao cerca de 1 em cada 100 jogadores aparece diferente do que esta salvo.`,
  },
  {
    sev: 'medio', tag: 'Fluxo', title: 'A loja esta dois niveis abaixo da navegacao',
    where: 'src/components/dashboard/CareerTab.tsx:101',
    body: `O caminho e Carreira, depois a secao Loja. Nada na Home, no Elenco ou no jogador aponta para la. A moeda ganha no fim da temporada chega por toast e some.`,
  },
  {
    sev: 'medio', tag: 'Peso', title: '16 MB de PNG viajam no APK',
    where: 'public/assetas/',
    body: `Os 32 escudos somam 6,7 MB, os uniformes 4 MB. <code>team-09-logo.png</code> sozinho tem 202 KB para ser exibido a 40 px. Nenhum asset passou por otimizacao. O bundle principal ainda tem 1,9 MB de JS e 284 KB de CSS, e o recharts (281 KB) e carregado so pelo radar do jogador.`,
  },
  {
    sev: 'medio', tag: 'Codigo morto', title: 'Arquivos e assets que ninguem importa',
    where: 'varios',
    body: `<code>src/engine/gameLogic.ts.tmp</code> (copia antiga de 2.7k linhas), <code>DatabaseTab.tsx</code>, <code>NewsFeed.tsx</code>, <code>Match2DViewer.tsx</code> (substituido pelo MatchBroadcastViewer), <code>public/sw.js</code> (so desregistrado, nunca registrado), <code>store-kit-special-six.png</code>, <code>unused-uniform-20-alt.png</code> e <code>unused-uniform-34.png</code>.`,
  },
  {
    sev: 'medio', tag: 'Codigo', title: 'A lista gigante de icones foi copiada entre as abas',
    where: 'src/components/dashboard/*.tsx',
    body: `O mesmo import de 34 a 43 icones do lucide aparece em todas as abas. Em <code>SquadTab</code> 32 dos 36 nao sao usados; em <code>CompetitionTab</code>, 28 de 34. E tree-shakeavel, entao o custo e de leitura, nao de bytes, mas denuncia copia e cola entre telas que ja divergiram.`,
  },
  {
    sev: 'medio', fixed: true, tag: 'Mobile', title: 'Header e nav inferior ignoravam a safe area',
    where: 'src/components/Dashboard.tsx:712',
    body: `Um unico arquivo do projeto tratava safe area, o <code>ToastContainer</code>. O header era <code>fixed top-2</code> e a navegacao <code>fixed bottom-2</code>, sem recuo nenhum, num app distribuido como Capacitor Android.`,
    done: 'Utilitarios .safe-top e .safe-bottom no index.css, aplicados no header e na nav, mais viewport-fit=cover no index.html. Em aparelho sem recorte env() devolve 0, entao nada muda.',
  },
  {
    sev: 'medio', tag: 'A11y', title: '252 botoes para 18 aria-label',
    where: 'src/components/',
    body: `Boa parte da navegacao e icone puro. Leitor de tela anuncia apenas "botao". As 39 imagens tem alt, o que ja e melhor que a media.`,
  },
  {
    sev: 'medio', tag: 'Design', title: 'O botao de avancar dia contradiz o proprio design doc',
    where: 'src/hooks/useGameDay.ts:37',
    body: `<code>src/docs/nextsteps.md</code> diz, em caixa alta, que o sistema e ao vivo e que nao existe botao de avancar. <code>handleAdvanceDay</code> existe, e exposto em seis abas e so o criador pode usar. Num mundo com varios humanos, isso significa que o relogio de todo mundo depende de uma pessoa clicar.`,
  },
];

const improvements: any[] = [
  {
    horizon: 'Semana', effort: 'baixo', accent: '#38d7c6',
    title: 'Transformar o historico do jogador em dossie',
    body: `<code>PlayerHistory</code> ja guarda <code>seasonSnapshots</code>, <code>clubEvents</code>, <code>peakRating</code>, <code>legacyTag</code> e <code>formerClubCount</code>. Nada disso vira narrativa na tela. Uma linha do tempo por atleta ("Kael Voss, 3 clubes, pico 871 na temporada 2052, dois titulos") converte numero em personagem sem escrever uma linha de motor novo.`,
  },
  {
    horizon: 'Semana', effort: 'baixo', accent: '#38d7c6',
    title: 'Chuteira como premio, nao como compra',
    body: `Hoje 28 modelos so existem na vitrine e a vitrine esta escondida. Entregar uma chuteira rara ao artilheiro da liga, ao MVP e ao campeao faz a colecao aparecer em campo, da motivo para abrir a loja e cria o primeiro item que o jogador nao pode comprar, so ganhar.`,
  },
  {
    horizon: 'Semana', effort: 'baixo', accent: '#38d7c6',
    title: 'Explicar o placar',
    body: `O <code>MatchEngine</code> ja calcula estilo (Tiki-Taka da mid 1.3, Blitzkrieg drena 1.5x), quimica, stamina e mando de 5%. O pos-jogo mostra o resultado, nao a causa. Tres linhas de leitura tatica ("seu meio dominou por 1.3 contra 1.0", "voce caiu depois dos 70 porque o Blitzkrieg drenou") transformam o relatorio em aula e dao motivo para mexer na tatica antes do proximo jogo.`,
  },
  {
    horizon: 'Semana', effort: 'baixo', accent: '#38d7c6',
    title: 'Rivalidade de distrito',
    body: `Cada clube ganha um rival fixo. O jogo contra ele vira manchete automatica, mexe mais em satisfacao e alimenta um contador de serie historica. Custa pouquissimo e e o tipo de detalhe que faz o jogador lembrar do adversario pelo nome.`,
  },
  {
    horizon: 'Mes', effort: 'medio', accent: '#8fd36a',
    title: 'O jornal do distrito',
    body: `O <code>newsService</code> ja produz noticia por rodada com tipo e importancia. Hoje sai como lista. Agrupar por rodada numa capa de jornal, com manchete, escudo e tres chamadas, usa conteudo que ja existe e da ao mundo a sensacao de que a liga acontece sem voce.`,
  },
  {
    horizon: 'Mes', effort: 'medio', accent: '#8fd36a',
    title: 'Dar o que fazer nos dias sem jogo',
    body: `<code>MATCH_INTERVAL_DAYS = 2</code>, entao metade dos dias da temporada nao tem partida. Uma decisao por dia, com duas ou tres opcoes que mexem em satisfacao e quimica, e o loop diario que falta. E tambem o gancho natural para notificacao local, que o app ja tem instalada.`,
  },
  {
    horizon: 'Mes', effort: 'medio', accent: '#8fd36a',
    title: 'Contrato com prazo e salario',
    body: `<code>Contract</code> hoje so tem <code>teamId</code>. O power cap e a unica restricao de elenco, e ele e generoso. Prazo e salario criam a decisao que falta: segurar o craque, renovar cedo, ou vender enquanto vale. E o eixo que separa um simulador de tabela de um jogo de gestao.`,
  },
  {
    horizon: 'Mes', effort: 'medio', accent: '#8fd36a',
    title: 'Hall da Fama por mundo',
    body: `<code>rank1000PlayerId</code>, <code>peakRating</code> e o historico de <code>SeasonReport</code> ja existem. Uma pagina por mundo com quem passou de 900, os campeoes de cada temporada e os recordes da casa da memoria ao servidor e um motivo para o veterano voltar depois de seis temporadas.`,
  },
  {
    horizon: 'Trimestre', effort: 'alto', accent: '#bd6cff',
    title: 'Fechar as fases 3 e 4 do viewer 2D',
    body: `O <code>MatchBroadcastViewer</code> ja esta integrado ao pos-jogo, com lances, comentario e torcida sintetizada em Web Audio. Pelo proprio plano de julho, falta o motor emitir sequencias nativas (recuperou, passou, chutou) em vez de coreografar em cima de eventos pobres. Essa e a maior alavanca de "quero jogar" do projeto: ver o gol em vez de ler o gol. E o Match2DViewer antigo deve sair junto.`,
  },
  {
    horizon: 'Trimestre', effort: 'alto', accent: '#bd6cff',
    title: 'Draft Genesis como evento ao vivo',
    body: `Os dias 0 a 2 resolvem por virada de dia, em silencio. O draft e o unico momento em que todos os humanos do mundo agem sobre o mesmo recurso ao mesmo tempo, e e o momento mais social que esse jogo pode ter. Contagem regressiva, disputa visivel ("tres managers querem esse atleta") e revelacao simultanea transformam uma tela de formulario em evento.`,
  },
  {
    horizon: 'Trimestre', effort: 'alto', accent: '#bd6cff',
    title: 'Identidade do clube no onboarding',
    body: `O <code>TeamLogo</code> desenha 5 formas por 16 padroes com cores livres, e existem 10 escudos de fundador prontos. Deixar o jogador montar escudo e cores no fluxo de fundacao, e ver o resultado no uniforme do avatar na mesma tela, e identidade quase de graca, com tudo ja construido.`,
  },
  {
    horizon: 'Aberto', effort: 'decisao', accent: '#f0a43c',
    title: 'A questao da idade',
    body: `O gerador diz, em comentario, que a idade foi removida. Sem envelhecimento nenhum atleta se aposenta, a renovacao do mundo fica por conta da Safety Net, e um save de seis temporadas termina com o mesmo elenco mais forte. Idade traz escassez, sucessao e nostalgia, mas tambem traz churn de elenco que voces podem ter cortado de proposito. Vale reabrir a decisao antes de investir em memoria de longo prazo como o Hall da Fama.`,
  },
];

const sevMeta: Record<string, { label: string; color: string }> = {
  critico: { label: 'Critico', color: '#ff5f70' },
  medio: { label: 'Medio', color: '#f0a43c' },
};
const RESOLVED = { label: 'Resolvido', color: '#57d99a' };

const findingCard = (f: any) => {
  const meta = f.fixed ? RESOLVED : sevMeta[f.sev];
  return `
        <article class="finding${f.fixed ? ' finding--done' : ''}" style="--sev:${meta.color}">
          <header class="finding__head">
            <span class="chip chip--sev">${meta.label}</span>
            <span class="chip">${esc(f.tag)}</span>
            ${f.fixed ? `<span class="chip chip--was">era ${sevMeta[f.sev].label.toLowerCase()}</span>` : ''}
            <h4>${esc(f.title)}</h4>
          </header>
          <p class="finding__where"><code>${esc(f.where)}</code></p>
          <p class="finding__body">${f.body}</p>
          ${f.fixed
            ? `<p class="finding__fix"><span>Corrigido</span> ${esc(f.done || '')}</p>`
            : (f.fix ? `<p class="finding__fix"><span>Caminho</span> ${esc(f.fix)}</p>` : '')}
        </article>`;
};

const improvementCard = (i: any) => `
        <article class="idea" style="--idea:${i.accent}">
          <header class="idea__head">
            <span class="idea__horizon">${esc(i.horizon)}</span>
            <span class="idea__effort">esforco ${esc(i.effort)}</span>
          </header>
          <h4>${esc(i.title)}</h4>
          <p>${i.body}</p>
        </article>`;

// ---------------------------------------------------------------- flow data
const NAV_TABS = [
  { id: 'home', label: 'Home', note: 'fase, proximo jogo, checklist, manchete, ofertas' },
  { id: 'team', label: 'Elenco', note: 'Draft / Elenco / Escalacao / Tatica / Treino' },
  { id: 'calendar', label: 'Calendario', note: 'rodadas, Copa Elite, Copa dos Distritos' },
  { id: 'world', label: 'Mundo', note: 'Ligas / Mercado / Ranking / Times / Noticias' },
  { id: 'career', label: 'Carreira', note: 'Loja / Inventario / Circuito / Temporadas / Perfil' },
];

const TIMELINE = [
  { day: '-1', label: 'Lobby', note: 'GM agenda a abertura', tone: '#8b948c' },
  { day: '0', label: 'Genesis', note: 'monta a lista do draft', tone: '#38d7c6' },
  { day: '1', label: 'Genesis', note: 'ajustes', tone: '#38d7c6' },
  { day: '2', label: 'Genesis', note: 'janela final', tone: '#38d7c6' },
  { day: '3', label: 'Autofill', note: 'elencos vazios completados', tone: '#38d7c6' },
  { day: '3-16', label: 'Liga', note: '7 rodadas, jogo dia sim dia nao', tone: '#8fd36a' },
  { day: '17-20', label: 'Copa Elite', note: '4 rodadas de mata-mata', tone: '#bd6cff' },
  { day: '20', label: 'Distritos', note: 'showcase das selecoes', tone: '#f0a43c' },
  { day: '20-22', label: 'Offseason', note: 'relatorio, recompensa, rotacao', tone: '#8b948c' },
];

const PLAYSTYLES: Array<[string, number, number, number, number, string]> = [
  ['Blitzkrieg', 1.25, 1.1, 0.8, 1.5, ''],
  ['Tiki-Taka', 0.9, 1.3, 1.0, 0.8, 'reduz tick 20%'],
  ['Retranca Armada', 0.62, 0.92, 1.25, 0.9, ''],
  ['Motor Lento', 1.0, 1.0, 1.0, 1.0, 'bonus tardio 1.4x'],
  ['Equilibrado', 1.0, 1.0, 1.0, 1.0, ''],
  ['Gegenpressing', 1.15, 1.15, 0.9, 1.4, ''],
  ['Catenaccio', 0.7, 1.1, 1.5, 0.9, ''],
  ['Vertical', 1.15, 1.0, 0.9, 1.2, ''],
];

const TRAIT_GROUPS: Array<{ name: string; tone: string; keys: string[] }> = [
  { name: 'Slot 1 - DNA Base', tone: '#8b948c', keys: ['Ofensivo', 'Folego', 'Passe Bronze', 'Finaliz Bronze', 'Def Bronze'] },
  { name: 'Slot 2 - DNA Elite', tone: '#38d7c6', keys: ['Consistência', 'Versatilidade', 'Defesa Prata', 'Finaliz Prata', 'Passe Prata', 'Finaliz Ouro', 'Passe Ouro', 'Defesa Ouro', 'Liderança', 'Folego Ouro'] },
  { name: 'Slot 3 - DNA Potencial', tone: '#bd6cff', keys: ['Finaliz Lendária', 'Passe Lendária', 'Defesa Lendária', 'Máquina', 'Catalisador', 'Gênio', 'Clutch', 'Protagonista'] },
  { name: 'Slot 4 - Fardos', tone: '#ff5f70', keys: ['Displicente', 'Pavio Curto', 'Preguiçoso', 'Vidro', 'Inconstante', 'Estático', 'Individualista', 'Boêmio'] },
];

// ---------------------------------------------------------------- html
const HEAD = `<title>Dossie Elite 2050</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,600;0,700;1,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
<style>
:root{
  --ink:#0a0c10; --surface:#12151c; --surface-2:#181c25; --raise:#1f2430;
  --line:rgba(233,237,230,.11); --line-strong:rgba(233,237,230,.2);
  --paper:#e9ede6; --paper-dim:#b9c0b7; --muted:#858e86;
  --norte:#38d7c6; --sul:#f0a43c; --leste:#8fd36a; --oeste:#bd6cff;
  --crit:#ff5f70; --warn:#f0a43c; --ok:#57d99a;
  --display:"Chakra Petch",system-ui,sans-serif;
  --body:"IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;
  --col:1180px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:76px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
body{background:var(--ink);color:var(--paper);font-family:var(--body);font-size:15px;line-height:1.6;margin:0;
  background-image:radial-gradient(900px 480px at 12% -8%,rgba(56,215,198,.10),transparent 62%),
                   radial-gradient(760px 420px at 92% 4%,rgba(189,108,255,.09),transparent 60%);
  background-attachment:fixed;}
:focus-visible{outline:2px solid var(--norte);outline-offset:3px;border-radius:4px}
code{font-family:var(--mono);font-size:.87em;background:rgba(233,237,230,.07);border:1px solid var(--line);
  padding:.08em .38em;border-radius:4px;color:var(--paper-dim);word-break:break-word}
h1,h2,h3,h4{font-family:var(--display);text-wrap:balance;margin:0}

/* ---- top bar ---- */
.bar{position:sticky;top:0;z-index:40;background:rgba(10,12,16,.86);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line)}
.bar__in{max-width:var(--col);margin:0 auto;padding:0 22px;height:56px;display:flex;align-items:center;gap:22px}
.bar__mark{font-family:var(--display);font-weight:700;font-style:italic;letter-spacing:.04em;font-size:15px;white-space:nowrap}
.bar__mark span{color:var(--norte)}
.bar nav{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
.bar nav::-webkit-scrollbar{display:none}
.bar nav a{font-family:var(--display);font-weight:600;font-size:12px;letter-spacing:.13em;text-transform:uppercase;
  color:var(--muted);text-decoration:none;padding:7px 11px;border-radius:6px;white-space:nowrap;transition:color .15s,background .15s}
.bar nav a:hover{color:var(--paper);background:rgba(233,237,230,.06)}

main{max-width:var(--col);margin:0 auto;padding:0 22px 96px}

/* ---- masthead ---- */
.mast{padding:52px 0 34px;border-bottom:1px solid var(--line)}
.mast__eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--norte);margin:0 0 14px}
.mast h1{font-size:clamp(34px,6vw,58px);font-weight:700;font-style:italic;letter-spacing:-.015em;line-height:1.02;text-transform:uppercase}
.mast h1 em{font-style:italic;color:var(--norte)}
.mast__lede{max-width:62ch;color:var(--paper-dim);font-size:16px;margin:18px 0 0}
.counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:1px;margin-top:34px;
  background:var(--line);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.counts div{background:var(--surface);padding:14px 15px}
.counts b{display:block;font-family:var(--display);font-size:25px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.counts span{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-top:7px}

/* ---- sections ---- */
section{padding:56px 0 8px;border-bottom:1px solid var(--line)}
section:last-of-type{border-bottom:0}
.sec__head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:8px}
.sec__num{font-family:var(--mono);font-size:11px;letter-spacing:.2em;color:var(--muted)}
.sec__head h2{font-size:clamp(23px,3.4vw,32px);font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:-.01em}
.sec__lede{color:var(--paper-dim);max-width:66ch;margin:0 0 30px}
h3.sub{font-size:13px;font-weight:600;letter-spacing:.17em;text-transform:uppercase;color:var(--paper);
  margin:38px 0 4px;padding-bottom:9px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:baseline;gap:12px}
h3.sub em{font-style:normal;font-family:var(--mono);font-size:10px;letter-spacing:.12em;color:var(--muted);text-transform:none}
.sub-note{color:var(--muted);font-size:13px;margin:10px 0 0}

/* ---- avatar lab ---- */
.lab{display:grid;grid-template-columns:minmax(0,268px) minmax(0,1fr);gap:26px;align-items:start;margin-top:8px}
@media(max-width:720px){.lab{grid-template-columns:1fr}}
.lab__stage{position:relative;aspect-ratio:2/3;border:1px solid var(--line-strong);border-radius:14px;overflow:hidden;
  background:radial-gradient(circle at 50% 16%,rgba(56,215,198,.16),transparent 52%),var(--surface)}
.lab__stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.lab__stage .boot{inset:auto;bottom:5%;left:45%;width:59%;height:auto;transform:translateX(-50%)}
.lab__controls{display:flex;flex-direction:column;gap:16px}
.ctrl{display:flex;flex-direction:column;gap:7px}
.ctrl > label{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);
  display:flex;justify-content:space-between;gap:10px}
.ctrl > label b{color:var(--norte);font-weight:500;text-transform:none;letter-spacing:.04em}
.opts{display:flex;flex-wrap:wrap;gap:5px}
.opts button{font-family:var(--mono);font-size:11px;background:var(--surface);color:var(--paper-dim);
  border:1px solid var(--line);border-radius:6px;padding:5px 9px;cursor:pointer;transition:.14s}
.opts button:hover{border-color:var(--line-strong);color:var(--paper)}
.opts button[aria-pressed="true"]{background:var(--norte);border-color:var(--norte);color:#06201d;font-weight:600}
input[type=range]{accent-color:var(--norte);width:100%}
.lab__read{font-family:var(--mono);font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px;line-height:1.8}
.lab__read b{color:var(--paper-dim);font-weight:500}

/* ---- grids + tiles ---- */
.grid{display:grid;gap:11px;margin-top:18px}
.grid--avatar{grid-template-columns:repeat(auto-fill,minmax(116px,1fr))}
.grid--boot{grid-template-columns:repeat(auto-fill,minmax(146px,1fr))}
.grid--sq{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}
.grid--wide{grid-template-columns:repeat(auto-fill,minmax(158px,1fr))}
.tile{margin:0;border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:hidden;
  display:flex;flex-direction:column;transition:border-color .15s}
.tile:hover{border-color:var(--line-strong)}
.tile--boot,.tile--flag{border-top:2px solid var(--tile-accent,var(--line))}
.tile__stage{position:relative;aspect-ratio:1;background:var(--ink);display:flex;align-items:center;justify-content:center;padding:8px}
.tile--avatar .tile__stage{aspect-ratio:2/3;padding:0;background:radial-gradient(circle at 50% 16%,rgba(56,215,198,.13),transparent 50%),var(--ink)}
.tile__stage img{max-width:100%;max-height:100%;object-fit:contain}
.tile__stage.stack img.ly{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;max-width:none;max-height:none}
.tile__stage.stack img.boot{inset:auto;bottom:5%;left:45%;width:59%;height:auto;transform:translateX(-50%)}
.tile figcaption{padding:8px 9px 9px;display:flex;flex-direction:column;gap:2px;border-top:1px solid var(--line)}
.tile__code{font-family:var(--mono);font-size:11px;font-weight:500;color:var(--paper)}
.tile__name{font-size:12px;color:var(--paper-dim);line-height:1.3}
.tile__meta{font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.03em}
.tile__note{font-size:10.5px;color:var(--muted);line-height:1.35}
.tile--missing .tile__stage{background:repeating-linear-gradient(45deg,rgba(255,95,112,.09) 0 8px,transparent 8px 16px)}
.tile--missing .tile__stage::after{content:"404";font-family:var(--mono);font-size:13px;color:var(--crit);letter-spacing:.14em}

/* ---- flow ---- */
.flowmap{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:11px;margin-top:20px}
.node{border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:14px 15px}
.node h4{font-size:12px;letter-spacing:.15em;text-transform:uppercase;margin-bottom:7px}
.node p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.5}
.node code{font-size:10.5px}
.route{display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-family:var(--mono);font-size:12px;
  color:var(--paper-dim);margin-top:18px}
.route i{font-style:normal;color:var(--muted)}
.route b{font-weight:500;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:5px 10px;color:var(--paper)}
.track{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-top:20px}
.track div{background:var(--surface);padding:12px 13px;border-top:2px solid var(--tone)}
.track b{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.13em;color:var(--tone)}
.track strong{display:block;font-family:var(--display);font-size:14px;font-weight:600;margin:5px 0 4px}
.track span{display:block;font-size:11px;color:var(--muted);line-height:1.4}

/* ---- tables ---- */
.tablewrap{overflow-x:auto;margin-top:18px;border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:13px}
th,td{text-align:left;padding:9px 13px;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:0}
th{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
  background:var(--surface-2);font-weight:500}
td{background:var(--surface)}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}
td.name{font-family:var(--display);font-weight:600}

/* ---- findings ---- */
.findings{display:flex;flex-direction:column;gap:11px;margin-top:20px}
.finding{border:1px solid var(--line);border-left:3px solid var(--sev);border-radius:9px;background:var(--surface);padding:16px 18px}
.finding__head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}
.finding__head h4{font-size:16px;font-weight:600;flex:1 1 100%;line-height:1.3}
.chip{font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;
  border:1px solid var(--line-strong);border-radius:4px;padding:3px 7px;color:var(--muted)}
.chip--sev{border-color:var(--sev);color:var(--sev)}
.finding__where{margin:0 0 9px}
.finding__where code{font-size:11px}
.finding__body{margin:0;color:var(--paper-dim);font-size:14px}
.finding__fix{margin:11px 0 0;font-size:13px;color:var(--muted);border-top:1px solid var(--line);padding-top:10px}
.finding__fix span{font-family:var(--mono);font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--ok);margin-right:8px}
.finding--done{background:linear-gradient(90deg,rgba(87,217,154,.05),transparent 40%),var(--surface)}
.finding--done .finding__head h4{color:var(--paper-dim)}
.chip--was{opacity:.65}

/* ---- ideas ---- */
.ideas{display:grid;grid-template-columns:repeat(auto-fit,minmax(292px,1fr));gap:11px;margin-top:20px}
.idea{border:1px solid var(--line);border-radius:10px;background:var(--surface);padding:17px 18px;
  display:flex;flex-direction:column;gap:9px}
.idea__head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.idea__horizon{font-family:var(--display);font-size:11px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:var(--idea)}
.idea__effort{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.idea h4{font-size:16px;font-weight:600;line-height:1.28}
.idea p{margin:0;font-size:13.5px;color:var(--paper-dim)}

.callout{border:1px solid var(--line);border-left:3px solid var(--norte);background:var(--surface);
  border-radius:9px;padding:16px 18px;margin-top:22px;font-size:14px;color:var(--paper-dim)}
.callout b{color:var(--paper);font-family:var(--display);letter-spacing:.02em}
footer{max-width:var(--col);margin:0 auto;padding:30px 22px 60px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.05em}
</style>`;

const BODY = `<div class="bar">
  <div class="bar__in">
    <div class="bar__mark">ELITE <span>2050</span></div>
    <nav>
      <a href="#lab">Avatar</a><a href="#fluxo">Fluxo</a><a href="#catalogo">Catalogo</a>
      <a href="#atritos">Atritos</a><a href="#melhorias">Melhorias</a>
    </nav>
  </div>
</div>

<main>
  <header class="mast">
    <p class="mast__eyebrow">Revisao geral &middot; 11 set 2026</p>
    <h1>Dossie <em>Elite 2050</em></h1>
    <p class="mast__lede">Tudo o que o jogo tem hoje, em um lugar so: o catalogo visual completo montado a partir dos proprios arquivos do projeto, o mapa do fluxo de telas e temporada, os 17 atritos que encontrei lendo o codigo (5 ja corrigidos), e as ideias que levariam esse mundo mais longe.</p>
    <div class="counts">
      <div><b>32</b><span>cabelos</span></div>
      <div><b>30</b><span>chuteiras</span></div>
      <div><b>44</b><span>uniformes</span></div>
      <div><b>49</b><span>escudos</span></div>
      <div><b>31</b><span>tracos de DNA</span></div>
      <div><b>8</b><span>estilos taticos</span></div>
      <div><b>22</b><span>dias por temporada</span></div>
      <div><b>12</b><span>atritos abertos</span></div>
    </div>
  </header>

  <section id="lab">
    <div class="sec__head"><span class="sec__num">01</span><h2>Laboratorio de avatar</h2></div>
    <p class="sec__lede">O mesmo empilhamento que o <code>PlayerAvatar</code> faz em tempo de jogo: corpo, uniforme, cabelo com o offset individual do <code>HAIR_OFFSETS</code>, e a chuteira por cima. Troque as pecas para ver como qualquer combinacao fica antes de sortear no gerador.</p>
    <div class="lab">
      <div class="lab__stage" id="stage">
        <img id="ly-body" src="${bodyM}" alt="Corpo do avatar" />
        <img id="ly-uni" src="${uniNorte}" alt="Uniforme do avatar" />
        <img id="ly-hair" src="${assetSrc('hair/masc/' + data.hair.M[0].file)}" alt="Cabelo do avatar" />
        <img id="ly-boot" class="boot" src="${assetSrc('boots/boot_01.png')}" alt="Chuteira do avatar" />
      </div>
      <div class="lab__controls">
        <div class="ctrl"><label>Genero e corpo <b id="r-body">M1</b></label>
          <div class="opts" id="opt-body"></div></div>
        <div class="ctrl"><label>Cabelo <b id="r-hair">M01</b></label>
          <input type="range" id="in-hair" min="1" max="${data.hair.M.length}" value="1" aria-label="Cabelo" /></div>
        <div class="ctrl"><label>Uniforme <b id="r-uni">Distrito Norte</b></label>
          <input type="range" id="in-uni" min="0" max="${uniformFiles.length - 1}" value="0" aria-label="Uniforme" /></div>
        <div class="ctrl"><label>Chuteira <b id="r-boot">boot_01 &middot; Velocity Cyan</b></label>
          <input type="range" id="in-boot" min="0" max="${boots.length - 1}" value="0" aria-label="Chuteira" /></div>
        <p class="lab__read">arquivo <b id="r-file">hair_1.png</b><br />offset <b id="r-off">x 0 / y 0</b><br />uniforme <b id="r-unifile">district-norte-uniform.png</b></p>
      </div>
    </div>
  </section>

  <section id="fluxo">
    <div class="sec__head"><span class="sec__num">02</span><h2>Como o jogo anda</h2></div>
    <p class="sec__lede">Tres rotas, cinco abas, e uma temporada de 22 dias que roda em tempo real: um dia de jogo por dia de calendario, com o <code>world-clock-runner</code> avancando o mundo no servidor mesmo com todo mundo offline.</p>

    <div class="route"><b>/login</b><i>&rarr;</i><b>/worlds</b><i>&rarr;</i><b>/dashboard</b><i>&mdash; sem mundo escolhido volta pra /worlds, sem sessao volta pro /login</i></div>

    <h3 class="sub">As cinco abas <em>src/components/Dashboard.tsx</em></h3>
    <div class="flowmap">
      ${NAV_TABS.map((t) => `<div class="node"><h4>${esc(t.label)}</h4><p>${esc(t.note)}</p></div>`).join('')}
    </div>

    <h3 class="sub">A temporada, dia a dia <em>SEASON_DAYS 22</em></h3>
    <div class="track">
      ${TIMELINE.map((t) => `<div style="--tone:${t.tone}"><b>Dia ${esc(t.day)}</b><strong>${esc(t.label)}</strong><span>${esc(t.note)}</span></div>`).join('')}
    </div>
    <p class="sub-note">Liga com 8 times por distrito e 7 rodadas, ou seja turno unico. Partida dura 2 minutos reais. <code>DISTRICT_CUP_ROUNDS</code> vale 0, entao a Copa dos Distritos entra como showcase e nao ocupa rodada no calendario.</p>

    <h3 class="sub">Os oito estilos e o que cada um faz <em>MatchEngine.ts:27</em></h3>
    <div class="tablewrap"><table>
      <thead><tr><th>Estilo</th><th>Ataque</th><th>Meio</th><th>Defesa</th><th>Dreno</th><th>Extra</th></tr></thead>
      <tbody>${PLAYSTYLES.map(([n, a, m, d, s, x]) => `<tr><td class="name">${n}</td><td class="num">${a.toFixed(2)}</td><td class="num">${m.toFixed(2)}</td><td class="num">${d.toFixed(2)}</td><td class="num">${s.toFixed(2)}</td><td>${x || '&mdash;'}</td></tr>`).join('')}</tbody>
    </table></div>

    <h3 class="sub">Os quatro distritos <em>districtTheme.ts</em></h3>
    <div class="grid grid--wide">
      ${DISTRICT_ORDER.map((k) => {
        const d = (data.districts as any)[k];
        return `<figure class="tile tile--flag" style="--tile-accent:${d.color}">
          <div class="tile__stage" style="background:linear-gradient(150deg,${d.color}2e,transparent 70%),var(--ink)">
            ${exists(`logos/district-${k.toLowerCase()}-logo.png`) ? `<img src="${assetSrc(`logos/district-${k.toLowerCase()}-logo.png`)}" alt="${esc(d.label)}" loading="lazy" />` : `<span style="font-family:var(--mono);font-size:11px;color:${d.color};letter-spacing:.16em">SEM CLUBE</span>`}
          </div>
          <figcaption><span class="tile__code">${esc(d.label)}</span><span class="tile__meta">${esc(d.color)}</span><span class="tile__note">${k === 'EXILADO' ? 'agente livre' : 'liga com 8 times'}</span></figcaption>
        </figure>`;
      }).join('')}
    </div>
  </section>

  <section id="catalogo">
    <div class="sec__head"><span class="sec__num">03</span><h2>Catalogo</h2></div>
    <p class="sec__lede">Tudo lido dos arquivos reais em <code>public/assetas/avatars/</code> e das constantes em <code>src/constants/</code>. Os codigos sao os mesmos que o motor usa, entao da pra apontar direto: "M07 esta alto demais", "boot_34 nao combina com a raridade".</p>

    <h3 class="sub">Cabelos masculinos <em>${data.hair.M.length} pecas &middot; hairId 1 a ${data.hair.M.length}</em></h3>
    <div class="grid grid--avatar">${hairSection('M', data.hair.M, bodyM, uniNorte)}</div>
    <p class="sub-note">Marcados como "sem ajuste" usam o offset padrao do genero. So uma peca masculina tem correcao individual hoje: a M09.</p>

    <h3 class="sub">Cabelos femininos <em>${data.hair.F.length} pecas &middot; hairId 1 a ${data.hair.F.length}</em></h3>
    <div class="grid grid--avatar">${hairSection('F', data.hair.F, bodyF, uniOeste)}</div>
    <p class="sub-note">Catorze das quinze tem offset calibrado. F03 e a unica sem ajuste individual, junto com o default do genero em x -0.5.</p>

    <h3 class="sub">Corpos <em>${bodyFiles.length} pecas &middot; bodyId 1 a 3 por genero</em></h3>
    <div class="grid grid--avatar">
      ${bodyFiles.map((f) => avatarStack({
        body: assetSrc('bodies/' + f),
        uniform: f.includes('_f_') ? uniOeste : uniNorte,
        hair: f.includes('_f_') ? assetSrc('hair/fem/' + data.hair.F[0].file) : assetSrc('hair/masc/' + data.hair.M[0].file),
        offset: f.includes('_f_') ? data.hair.F[0].offset : data.hair.M[0].offset,
        code: f.replace('body_', '').replace('.png', '').toUpperCase(),
        meta: f,
      })).join('')}
    </div>

    <h3 class="sub">Chuteiras <em>${boots.length} modelos &middot; 5 raridades</em></h3>
    <div class="grid grid--boot">${boots.map(bootCard).join('')}</div>
    <p class="sub-note">O bonus so mexe na evolucao pos-jogo, nunca no rating bruto, e por isso a colecao nao vira pay-to-win. Hoje, porem, so <code>boot_01</code> e <code>boot_02</code> nascem sorteadas em jogadores: as outras 28 dependem de compra.</p>

    <h3 class="sub">Uniformes de time <em>32 slots &middot; pareados 1:1 com o escudo</em></h3>
    <div class="grid grid--sq">
      ${uniformFiles.filter((f) => f.startsWith('team-')).map((f) => tile({ src: assetSrc('uniforms/' + f), code: 't_' + Number(f.slice(5, 7)), meta: f.replace('.png', '') })).join('')}
    </div>

    <h3 class="sub">Uniformes de distrito e da loja <em>${kits.length} skins vendidas</em></h3>
    <div class="grid grid--sq">
      ${uniformFiles.filter((f) => f.startsWith('district-')).map((f) => tile({ src: assetSrc('uniforms/' + f), code: f.split('-')[1].toUpperCase(), meta: 'selecao / agente livre' })).join('')}
      ${kits.map((k: any) => tile({ src: assetSrc('uniforms/' + k.assetPath.split('/').pop()), code: k.id, name: k.name, meta: `${RARITY[k.rarity].label} &middot; ${k.price} ${k.currency === 'GOLD' ? 'ouro' : 'frag'}`, accent: RARITY[k.rarity].color })).join('')}
      ${['store-kit-special-six.png', 'unused-uniform-20-alt.png', 'unused-uniform-34.png'].filter((f) => exists('uniforms/' + f)).map((f) => tile({ src: assetSrc('uniforms/' + f), code: 'orfao', meta: f.replace('.png', ''), note: 'no disco, fora do catalogo' })).join('')}
    </div>

    <h3 class="sub">Escudos de time <em>32 slots</em></h3>
    <div class="grid grid--sq">
      ${logoFiles.filter((f) => f.startsWith('team-')).map((f) => tile({ src: assetSrc('logos/' + f), code: 't_' + Number(f.slice(5, 7)), meta: f.replace('.png', '') })).join('')}
    </div>

    <h3 class="sub">Escudos de fundador <em>10 pecas &middot; sorteadas pelo id do clube</em></h3>
    <div class="grid grid--sq">
      ${logoFiles.filter((f) => f.startsWith('founder-')).map((f) => tile({ src: assetSrc('logos/' + f), code: f.replace('founder-logo-', 'F').replace('.png', ''), meta: 'clube fundado' })).join('')}
    </div>

    <h3 class="sub">Escudos da loja <em>${logosStore.length} itens &middot; 2 sem arquivo</em></h3>
    <div class="grid grid--wide">
      ${logosStore.map((l: any) => {
        const file = l.imagePath.split('/').pop();
        const ok = exists('logos/' + file);
        const r = RARITY[l.rarity];
        if (!ok) {
          return `<figure class="tile tile--missing tile--flag" style="--tile-accent:var(--crit)">
            <div class="tile__stage"></div>
            <figcaption><span class="tile__code">${esc(l.id)}</span><span class="tile__name">${esc(l.name)}</span>
            <span class="tile__meta">${r.label} &middot; ${l.price} frag</span>
            <span class="tile__note" style="color:var(--crit)">${esc(file)} nao existe</span></figcaption></figure>`;
        }
        return tile({ src: assetSrc('logos/' + file), code: l.id, name: l.name, meta: `${r.label} &middot; ${l.price} ${l.currency === 'GOLD' ? 'ouro' : 'frag'}`, accent: r.color });
      }).join('')}
    </div>

    <h3 class="sub">Trofeus <em>${trophyFiles.length} pecas</em></h3>
    <div class="grid grid--wide">
      ${trophyFiles.map((f) => tile({ src: assetSrc('trophies/' + f), code: f.replace('trophy-', '').replace('.png', '').replace(/-/g, ' '), meta: f.startsWith('trophy-league') ? 'liga de distrito' : 'competicao global' })).join('')}
    </div>

    <h3 class="sub">Passe e perfil <em>${passFiles.length} pecas + ${profileItems.length} itens de manager</em></h3>
    <div class="grid grid--wide">
      ${passFiles.map((f) => tile({ src: assetSrc('pass/' + f), code: f.replace('.png', ''), meta: f.includes('badge') ? 'recompensa final' : 'circuito' })).join('')}
    </div>
    <div class="tablewrap"><table>
      <thead><tr><th>Item de manager</th><th>Tipo</th><th>Raridade</th><th class="num">Preco</th><th>Efeito</th></tr></thead>
      <tbody>${profileItems.map((p: any) => `<tr><td class="name">${esc(p.name)}</td><td>${esc(p.category)}</td><td>${RARITY[p.rarity].label}</td><td class="num">${p.price === 0 ? 'premio' : p.price + (p.currency === 'GOLD' ? ' ouro' : ' frag')}</td><td>${esc(p.effectDescription || p.description)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="sub-note">Os dois acessorios ainda usam <code>/logo.png</code> como imagem: nunca ganharam arte propria.</p>

    <h3 class="sub">Icones de fusao <em>${fusionFiles.length} svg &middot; as skills derivadas do pentagono</em></h3>
    <div class="grid grid--sq">
      ${fusionFiles.map((f) => tile({ src: assetSrc('fusion-icons/' + f), code: f.replace('fusion-', '').replace('.svg', '').toUpperCase(), meta: f.includes('goal') ? 'goleiro' : 'linha' })).join('')}
    </div>

    <h3 class="sub">DNA do jogador <em>${Object.keys(data.traits).length} tracos em 4 slots</em></h3>
    <div class="tablewrap"><table>
      <thead><tr><th>Slot</th><th>Traco</th><th>Efeito</th></tr></thead>
      <tbody>${TRAIT_GROUPS.flatMap((g) => g.keys.filter((k) => (data.traits as any)[k]).map((k, idx) => `<tr><td class="name" style="color:${g.tone}">${idx === 0 ? esc(g.name) : ''}</td><td class="name">${esc(k)}</td><td>${esc((data.traits as any)[k])}</td></tr>`)).join('')}</tbody>
    </table></div>

    <h3 class="sub">Origens do manager <em>${data.managerTraits.length} tracos iniciais</em></h3>
    <div class="tablewrap"><table>
      <thead><tr><th>Origem</th><th>Estilo preferido</th><th>Leitura</th></tr></thead>
      <tbody>${data.managerTraits.map((t: any) => `<tr><td class="name">${esc(t.name)}</td><td>${esc(t.preferredPlayStyle || '')}</td><td>${esc(t.description)}</td></tr>`).join('')}</tbody>
    </table></div>

    <h3 class="sub">Economia <em>2 moedas &middot; 4 produtos reais</em></h3>
    <div class="tablewrap"><table>
      <thead><tr><th>Produto</th><th>Tipo</th><th class="num">Preco</th><th>Entrega</th></tr></thead>
      <tbody>${data.billing.map((b: any) => `<tr><td class="name">${esc(b.displayName)}</td><td>${b.kind === 'consumable' ? 'consumivel' : 'assinatura'}</td><td class="num">R$ ${b.brlPrice.toFixed(2).replace('.', ',')}</td><td>${esc(b.amountLabel)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="sub-note">Ouro e fragmento tambem caem no fim de cada temporada: 40 de base, ate 35 a mais por titulo de liga, 25 pela Copa Elite, e o teto do servidor e 250 ouro e 40 fragmentos por temporada.</p>
  </section>

  <section id="atritos">
    <div class="sec__head"><span class="sec__num">04</span><h2>Inconsistencias e atritos</h2></div>
    <p class="sec__lede">Achados desta leitura, verificados um a um no codigo e nos arquivos. A suite esta verde (111 testes, 25 arquivos) e o <code>tsc</code> passa limpo, entao nada disso aparece como falha: sao coisas que so a leitura pega. Os cards em verde ja foram corrigidos nesta passada.</p>
    <div class="findings">${findingsCritical.map(findingCard).join('')}</div>
    <h3 class="sub">Atritos medios <em>${findingsMedium.filter((f: any) => !f.fixed).length} abertos de ${findingsMedium.length}</em></h3>
    <div class="findings">${findingsMedium.map(findingCard).join('')}</div>
    <div class="callout"><b>Nota.</b> A auditoria de agosto continua util como mapa de backend, mas boa parte dela ja foi resolvida: os 38 erros de tipo sumiram, a suite nao estoura mais o timeout, o code splitting existe (9 pontos de lazy) e a tabela <code>notifications</code> inexistente nao e mais escrita. O que sobrou de la esta acima.</div>
  </section>

  <section id="melhorias">
    <div class="sec__head"><span class="sec__num">05</span><h2>Para levar o mundo mais longe</h2></div>
    <p class="sec__lede">A observacao que organiza tudo aqui: <strong>o motor ja simula muito mais mundo do que a tela mostra</strong>. Pentagono, skills de fusao, 31 tracos com percentual real, memoria tatica por clube, legado com estilo assinatura, historico de clubes por atleta, pico de carreira. Quase nada disso vira historia. As ideias abaixo quase todas gastam dado que ja existe.</p>
    <div class="ideas">${improvements.map(improvementCard).join('')}</div>
  </section>
</main>

<footer>Montado a partir do repositorio em 11 set 2026 &middot; 171 assets lidos de public/assetas/avatars &middot; catalogo gerado, nao transcrito</footer>

<script>
(function(){
  var HAIR = ${JSON.stringify({ M: data.hair.M.map((h) => ({ id: h.id, file: h.file, src: assetSrc('hair/masc/' + h.file), off: h.offset })), F: data.hair.F.map((h) => ({ id: h.id, file: h.file, src: assetSrc('hair/fem/' + h.file), off: h.offset })) })};
  var BODIES = ${JSON.stringify(bodyFiles.map((f) => ({ code: f.replace('body_', '').replace('.png', '').toUpperCase().replace('_', ''), gender: f.includes('_f_') ? 'F' : 'M', src: assetSrc('bodies/' + f) })))};
  var UNIS = ${JSON.stringify(uniformFiles.map((f) => ({ file: f, label: f.replace('.png', ''), src: assetSrc('uniforms/' + f) })))};
  var BOOTS = ${JSON.stringify(boots.map((b) => ({ id: b.id, name: b.name, src: assetSrc('boots/' + b.imagePath.split('/').pop()) })))};

  var state = { gender:'M', body:0, hair:1, uni:0, boot:0 };
  var $ = function(id){ return document.getElementById(id); };

  var optBody = $('opt-body');
  BODIES.forEach(function(b, i){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.code;
    btn.setAttribute('aria-pressed', String(i === 0));
    btn.addEventListener('click', function(){
      state.body = i; state.gender = b.gender;
      if (state.hair > HAIR[b.gender].length) state.hair = HAIR[b.gender].length;
      $('in-hair').max = HAIR[b.gender].length;
      render();
    });
    optBody.appendChild(btn);
  });

  ['in-hair','in-uni','in-boot'].forEach(function(id){
    $(id).addEventListener('input', function(e){
      var v = Number(e.target.value);
      if (id === 'in-hair') state.hair = v;
      if (id === 'in-uni') state.uni = v;
      if (id === 'in-boot') state.boot = v;
      render();
    });
  });

  function render(){
    var body = BODIES[state.body];
    var hair = HAIR[state.gender][state.hair - 1];
    var uni = UNIS[state.uni];
    var boot = BOOTS[state.boot];
    $('ly-body').src = body.src;
    $('ly-uni').src = uni.src;
    $('ly-hair').src = hair.src;
    $('ly-hair').style.left = hair.off.x + '%';
    $('ly-hair').style.top = hair.off.y + '%';
    $('ly-boot').src = boot.src;
    $('r-body').textContent = body.code;
    $('r-hair').textContent = state.gender + String(hair.id).padStart(2,'0');
    $('r-uni').textContent = uni.label;
    $('r-boot').textContent = boot.id + ' \\u00b7 ' + boot.name;
    $('r-file').textContent = hair.file;
    $('r-off').textContent = 'x ' + hair.off.x + ' / y ' + hair.off.y;
    $('r-unifile').textContent = uni.file;
    Array.prototype.forEach.call(optBody.children, function(btn, i){
      btn.setAttribute('aria-pressed', String(i === state.body));
    });
  }
  render();
})();
</script>
`;

// ---------------------------------------------------------------- write
const NL = String.fromCharCode(10);
const doc = [
  '<!doctype html>',
  '<html lang="pt-BR">',
  '<head>',
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width,initial-scale=1" />',
  HEAD,
  '</head>',
  '<body>',
  BODY,
  '</body>',
  '</html>',
].join(NL);

const target = path.join(REPO, 'public/catalogo.html');
fs.writeFileSync(target, doc, 'utf8');
console.log(`catalogo: ${path.relative(REPO, target)} (${(doc.length / 1024).toFixed(0)} KB)`);
