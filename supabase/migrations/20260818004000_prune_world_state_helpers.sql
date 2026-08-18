-- Ferramentas de limpeza retroativa do world_state.
--
-- A poda no motor (src/engine/pruneMatchEvents.ts) so age daqui pra frente. Os mundos
-- que ja rodaram uma temporada carregam o play-by-play acumulado: medido no mundo
-- Nois em 2026-08-18, `result.events` somava 1.248 kB de 1.365 kB de world.leagues —
-- 91% das partidas e 76% do world_state inteiro, que trafega em toda leitura.
--
-- Estas funcoes sao IMMUTABLE e nao escrevem nada por conta propria. Servem tanto
-- para simular (select) quanto para aplicar (update), e podem ser reexecutadas:
-- podar duas vezes nao muda nada na segunda.
--
-- REGRA: so esvazia events de partida ja jogada E ja revelada. Relatorio cego
-- pendente (revealed = false) e preservado, porque a timeline e exatamente o
-- conteudo que o jogador ainda vai abrir.

create or replace function public.prune_match_events_array(p_matches jsonb)
returns jsonb
language sql
immutable
as $fn$
  select coalesce(
    jsonb_agg(
      case
        when (m->>'played')::boolean is true
         and coalesce((m->>'revealed')::boolean, true) is true
         and m->'result'->'events' is not null
        then jsonb_set(m, '{result,events}', '[]'::jsonb)
        else m
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb)) with ordinality as t(m, ord);
$fn$;

create or replace function public.prune_world_match_events(p_world jsonb)
returns jsonb
language plpgsql
immutable
as $fn$
declare
  v_world   jsonb := coalesce(p_world, '{}'::jsonb);
  v_leagues jsonb;
  v_key     text;
begin
  -- Ligas: cada chave de world.leagues tem seu proprio array de matches.
  if jsonb_typeof(v_world->'leagues') = 'object' then
    select coalesce(
      jsonb_object_agg(
        k,
        case when jsonb_typeof(v->'matches') = 'array'
             then jsonb_set(v, '{matches}', public.prune_match_events_array(v->'matches'))
             else v
        end
      ),
      '{}'::jsonb
    )
      into v_leagues
    from jsonb_each(v_world->'leagues') as t(k, v);

    v_world := jsonb_set(v_world, '{leagues}', v_leagues);
  end if;

  -- Copa Elite: o bracket usou nomes diferentes ao longo do tempo.
  foreach v_key in array array['round1', 'oitavas', 'quarters', 'quartas', 'semis'] loop
    if jsonb_typeof(v_world->'eliteCup'->'bracket'->v_key) = 'array' then
      v_world := jsonb_set(
        v_world,
        array['eliteCup', 'bracket', v_key],
        public.prune_match_events_array(v_world->'eliteCup'->'bracket'->v_key)
      );
    end if;
  end loop;

  if jsonb_typeof(v_world->'eliteCup'->'bracket'->'final') = 'object' then
    v_world := jsonb_set(
      v_world,
      '{eliteCup,bracket,final}',
      public.prune_match_events_array(jsonb_build_array(v_world->'eliteCup'->'bracket'->'final'))->0
    );
  end if;

  -- Copa dos Distritos.
  if jsonb_typeof(v_world->'districtCup'->'matches') = 'array' then
    v_world := jsonb_set(
      v_world,
      '{districtCup,matches}',
      public.prune_match_events_array(v_world->'districtCup'->'matches')
    );
  end if;

  if jsonb_typeof(v_world->'districtCup'->'final') = 'object' then
    v_world := jsonb_set(
      v_world,
      '{districtCup,final}',
      public.prune_match_events_array(jsonb_build_array(v_world->'districtCup'->'final'))->0
    );
  end if;

  return v_world;
end;
$fn$;

comment on function public.prune_world_match_events(jsonb) is
  'Devolve o world_state sem o play-by-play de partidas jogadas e reveladas. Nao escreve nada; use em select para simular ou em update para aplicar.';

revoke all on function public.prune_match_events_array(jsonb) from public;
revoke all on function public.prune_match_events_array(jsonb) from anon;
revoke all on function public.prune_match_events_array(jsonb) from authenticated;
revoke all on function public.prune_world_match_events(jsonb) from public;
revoke all on function public.prune_world_match_events(jsonb) from anon;
revoke all on function public.prune_world_match_events(jsonb) from authenticated;
