-- Sync all local boot cosmetics into the remote catalog.
-- Numbering rule:
-- 01-14 COMMON, 21-27 UNCOMMON, 31-36 RARE, 41-42 EPIC, 43-44 LEGENDARY.

with boot_catalog (
  id,
  name,
  description,
  rarity,
  currency,
  price,
  collection_label,
  effect_label,
  effect_description,
  boot_visual_id,
  progression_gain_pct,
  progression_loss_mitigation_pct
) as (
  values
    ('boot_01', 'Velocity Cyan', 'Base neon leve para abrir a colecao do elenco.', 'COMMON', 'GOLD', 12, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Sem bonus competitivo.', 1, null::int, null::int),
    ('boot_02', 'Orbit Violet', 'Visual escuro com acento violeta para jogadores de lado.', 'COMMON', 'GOLD', 12, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Ideal para variar estilo.', 2, null::int, null::int),
    ('boot_03', 'Static Aqua', 'Modelo frio e tecnico para titulares de posse.', 'COMMON', 'GOLD', 13, 'Linha Tecnica', 'Visual Base', 'Cosmetica pura. Mantem o jogo limpo.', 3, null::int, null::int),
    ('boot_04', 'Blade Silver', 'Acabamento prateado com detalhe verde de controle.', 'COMMON', 'GOLD', 13, 'Linha Tecnica', 'Visual Base', 'Cosmetica pura. Boa para meias e armadores.', 4, null::int, null::int),
    ('boot_05', 'Sky Pulse', 'Leve e brilhante, com leitura imediata de velocidade.', 'COMMON', 'GOLD', 14, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Sem impacto em score.', 5, null::int, null::int),
    ('boot_06', 'Solar Gold', 'Visual dourado esportivo para atletas chamativos.', 'COMMON', 'GOLD', 14, 'Linha Tecnica', 'Visual Base', 'Cosmetica pura. Valor de estilo apenas.', 6, null::int, null::int),
    ('boot_07', 'Frost Edge', 'Base branca e fria para elenco equilibrado.', 'COMMON', 'GOLD', 14, 'Linha Estabilidade', 'Visual Base', 'Cosmetica pura. Boa para colecao inicial.', 7, null::int, null::int),
    ('boot_08', 'Mint Flow', 'Tom verde-agua com assinatura de aceleracao.', 'COMMON', 'GOLD', 15, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Sem efeito competitivo.', 8, null::int, null::int),
    ('boot_09', 'Inferno Red', 'Peca vibrante para quem quer atacante aparecendo.', 'COMMON', 'GOLD', 15, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Ideal para vitrine.', 9, null::int, null::int),
    ('boot_10', 'Night Sprint', 'Preto e violeta com cara de corrida curta e agressiva.', 'COMMON', 'GOLD', 15, 'Linha Velocidade', 'Visual Base', 'Cosmetica pura. Sem bonus escondido.', 10, null::int, null::int),
    ('boot_11', 'Copper Touch', 'Bronze polido para jogadores de refinamento.', 'COMMON', 'GOLD', 16, 'Linha Tecnica', 'Visual Base', 'Cosmetica pura. Valor de estilo.', 11, null::int, null::int),
    ('boot_12', 'Graph Surge', 'Visual escuro com sola acida para elenco firme.', 'COMMON', 'GOLD', 16, 'Linha Estabilidade', 'Visual Base', 'Cosmetica pura. Boa para defesa e base.', 12, null::int, null::int),
    ('boot_13', 'Cloud White', 'Modelo claro e limpo para equipe premium.', 'COMMON', 'GOLD', 16, 'Linha Tecnica', 'Visual Base', 'Cosmetica pura. Sem alterar atributos.', 13, null::int, null::int),
    ('boot_14', 'Deep Current', 'Aqua escuro com leitura de firmeza e presenca.', 'COMMON', 'GOLD', 17, 'Linha Estabilidade', 'Visual Base', 'Cosmetica pura. Fecha a base comum da linha.', 14, null::int, null::int),
    ('boot_21', 'Rune Flash', 'Primeira faixa acima da base, mais marcante e agressiva.', 'UNCOMMON', 'GOLD', 18, 'Linha Velocidade', 'Estilo de Colecao', 'Ainda sem bonus. Serve para deixar o elenco mais premium.', 21, null::int, null::int),
    ('boot_23', 'Arc Sigil', 'Modelo simbolico para jogadores de controle e leitura.', 'UNCOMMON', 'GOLD', 19, 'Linha Tecnica', 'Estilo de Colecao', 'Cosmetica intermediaria. Sem impacto no balance.', 23, null::int, null::int),
    ('boot_24', 'Void Core', 'Centro escuro com visual de energia concentrada.', 'UNCOMMON', 'GOLD', 19, 'Linha Tecnica', 'Estilo de Colecao', 'Colecao visual acima das comuns.', 24, null::int, null::int),
    ('boot_25', 'Lotus Veil', 'Visual lilas suave para atletas de ritmo constante.', 'UNCOMMON', 'GOLD', 20, 'Linha Estabilidade', 'Estilo de Colecao', 'Sem bonus. Foco em identidade visual.', 25, null::int, null::int),
    ('boot_26', 'Blaze Crest', 'Visual de chama viva para pecas explosivas do elenco.', 'UNCOMMON', 'GOLD', 20, 'Linha Velocidade', 'Estilo de Colecao', 'Cosmetica intermediaria. Boa para destaque.', 26, null::int, null::int),
    ('boot_27', 'Verdant Shell', 'Camada verde densa com presenca de jogador confiavel.', 'UNCOMMON', 'GOLD', 21, 'Linha Estabilidade', 'Estilo de Colecao', 'Sem bonus. Fecha a faixa incomum.', 27, null::int, null::int),
    ('boot_31', 'Nebula Drive', 'Faixa rara com impulso leve para dias muito bons.', 'RARE', 'GOLD', 23, 'Linha Velocidade', 'Assinatura Rara', 'Leve empurrao na evolucao pos-jogo de atleta em alta.', 31, 10, null::int),
    ('boot_32', 'Prism Cryst', 'Peca rara de vitrine para jogadores tecnicos.', 'RARE', 'GOLD', 24, 'Linha Tecnica', 'Assinatura Rara', 'Equilibra ganho e estabilidade em dose pequena.', 32, 8, 10),
    ('boot_33', 'Chrono Mesh', 'Trama rara com leitura premium e refinada.', 'RARE', 'GOLD', 24, 'Linha Tecnica', 'Assinatura Rara', 'Leve bonus para evolucao positiva quando o atleta entrega nota alta.', 33, 12, null::int),
    ('boot_34', 'Crown Gleam', 'Visual claro com aura de seguranca e regularidade.', 'RARE', 'GOLD', 25, 'Linha Estabilidade', 'Assinatura Rara', 'Amortece perdas pequenas sem mexer em score bruto.', 34, null::int, 18),
    ('boot_35', 'Tide Breaker', 'Splash azul para atletas de rompimento e estourada.', 'RARE', 'GOLD', 25, 'Linha Velocidade', 'Assinatura Rara', 'Reforca um pouco os bons dias do atleta.', 35, 15, null::int),
    ('boot_36', 'Obsidian Reef', 'Faixa rara escura para titulares de sustentacao.', 'RARE', 'GOLD', 26, 'Linha Estabilidade', 'Assinatura Rara', 'Segura quedas ruins e deixa a temporada mais estavel.', 36, null::int, 22),
    ('boot_41', 'Halo Dominion', 'Faixa epica preparada para atletas realmente especiais.', 'EPIC', 'FRAGMENT', 16, 'Linha Tecnica', 'Assinatura Epica', 'Aumenta levemente ganhos e reduz perdas na evolucao pos-jogo.', 41, 18, 20),
    ('boot_42', 'Ice Seraph', 'Epica clara e agressiva para jogador de temporada.', 'EPIC', 'FRAGMENT', 17, 'Linha Velocidade', 'Assinatura Epica', 'Prioriza crescimento sem tocar em rating bruto.', 42, 22, 16),
    ('boot_43', 'Winged Crown', 'Faixa lendaria para simbolos de clube e elite original.', 'LEGENDARY', 'FRAGMENT', 20, 'Linha Estabilidade', 'Assinatura Lendaria', 'Entrega o melhor pacote de estabilidade da colecao sem virar pay-to-win.', 43, 16, 30),
    ('boot_44', 'Solar Relic', 'Topo absoluto da colecao atual de chuteiras.', 'LEGENDARY', 'FRAGMENT', 22, 'Linha Tecnica', 'Assinatura Lendaria', 'Pacote lendario com crescimento melhor e queda mais suave.', 44, 20, 28)
),
prepared as (
  select
    id,
    'BOOT' as category,
    name,
    description,
    rarity,
    currency,
    price,
    '/assetas/avatars/boots/' || id || '.png' as image_path,
    '/assetas/avatars/boots/' || id || '.png' as asset_path,
    false as premium_only,
    null::text as circuit_id,
    jsonb_strip_nulls(jsonb_build_object(
      'collectionLabel', collection_label,
      'effectLabel', effect_label,
      'effectDescription', effect_description,
      'bootVisualId', boot_visual_id,
      'bootBonus', case
        when progression_gain_pct is null and progression_loss_mitigation_pct is null then null
        else jsonb_strip_nulls(jsonb_build_object(
          'progressionGainPct', progression_gain_pct,
          'progressionLossMitigationPct', progression_loss_mitigation_pct
        ))
      end
    )) as payload,
    true as is_active
  from boot_catalog
)
insert into public.catalog_items (
  id,
  category,
  name,
  description,
  rarity,
  currency,
  price,
  image_path,
  asset_path,
  premium_only,
  circuit_id,
  payload,
  is_active
)
select
  id,
  category,
  name,
  description,
  rarity,
  currency,
  price,
  image_path,
  asset_path,
  premium_only,
  circuit_id,
  payload,
  is_active
from prepared
on conflict (id) do update
set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  currency = excluded.currency,
  price = excluded.price,
  image_path = excluded.image_path,
  asset_path = excluded.asset_path,
  premium_only = excluded.premium_only,
  circuit_id = excluded.circuit_id,
  payload = excluded.payload,
  is_active = excluded.is_active;
