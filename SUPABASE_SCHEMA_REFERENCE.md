# Supabase schema reference

Snapshot noted from the live project on 2026-07-08.

Important: this app does not have `public.world_games`. Do not write SQL against
that table.

Current app state source:

- `public.games` is the legacy/live save table used by the client.
- World state is stored in `games.world_state` (`jsonb`).
- Team and player snapshots are stored in `games.teams_data` and
  `games.players_data` (`jsonb`).
- Participant rows are separate `games` rows sharing the same text `world_id`.
- `public.world_matches` exists, but its `world_id` is `uuid`; do not assume it
  joins to `games.world_id` without checking `public.worlds`.

Known public tables related to worlds/game state:

| schema | table |
| --- | --- |
| public | games |
| public | global_game_state |
| public | players |
| public | world_managers |
| public | world_matches |
| public | world_news |
| public | world_participants |
| public | world_players |
| public | world_snapshots |
| public | world_standings |
| public | world_teams |
| public | world_tick_locks |
| public | world_user_state |
| public | worlds |

Confirmed useful columns from the live schema snapshot:

`public.games`

| column | type |
| --- | --- |
| id | uuid |
| user_id | uuid |
| world_state | jsonb |
| teams_data | jsonb |
| players_data | jsonb |
| updated_at | timestamp with time zone |
| world_id | text |
| managers_data | jsonb |
| user_team_id | text |
| user_manager_id | text |
| notifications | jsonb |
| last_headline | jsonb |
| training_data | jsonb |
| created_at | timestamp with time zone |
| is_public | boolean |
| is_creator | boolean |

`public.world_matches`

| column | type |
| --- | --- |
| world_id | uuid |
| match_id | text |
| season | integer |
| competition | text |
| league_id | text |
| round | integer |
| home_team_id | text |
| away_team_id | text |
| scheduled_at | timestamp with time zone |
| match_time | text |
| status | text |
| played | boolean |
| revealed | boolean |
| home_score | integer |
| away_score | integer |
| result | jsonb |
| events | jsonb |
| created_at | timestamp with time zone |
| updated_at | timestamp with time zone |

Before sending operational SQL, check column names with:

```sql
select
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'games',
    'global_game_state',
    'players',
    'world_managers',
    'world_matches',
    'world_news',
    'world_participants',
    'world_players',
    'world_snapshots',
    'world_standings',
    'world_teams',
    'world_tick_locks',
    'world_user_state',
    'worlds'
  )
order by table_name, ordinal_position;
```
