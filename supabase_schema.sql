-- ==========================================
-- SCHEMA CONSOLIDADO ELITE 2050 (SMART UPDATE)
-- Data: 2026-02-24
-- ==========================================

-- 1. EXTENSÕES E CONFIGURAÇÕES INICIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE TIMES (TEAMS) - Precisa existir antes para foreign keys
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(32) DEFAULT 'NORTE',
    league VARCHAR(32) DEFAULT 'Cyan',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adicionar colunas faltantes em TEAMS se a tabela já existia
ALTER TABLE teams ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS district VARCHAR(32) DEFAULT 'NORTE';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league VARCHAR(32) DEFAULT 'Cyan';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS city VARCHAR(255) DEFAULT 'Neo-City';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#ffffff';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#000000';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_settings JSONB DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS finances JSONB DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS tactics JSONB DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS squad_ids UUID[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS lineup JSONB DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS chemistry INT DEFAULT 50;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS power_cap INT DEFAULT 10000;

-- 3. TABELA DE JOGADORES (PLAYERS)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    district VARCHAR(32) NOT NULL,
    appearance JSONB NOT NULL DEFAULT '{}',
    position VARCHAR(32) NOT NULL,
    role VARCHAR(8) NOT NULL,
    pentagon JSONB NOT NULL DEFAULT '{}',
    fusion JSONB NOT NULL DEFAULT '{}',
    current_rating INT NOT NULL DEFAULT 500,
    potential INT NOT NULL DEFAULT 600,
    current_phase NUMERIC(4,2) NOT NULL DEFAULT 6.0,
    phase_history JSONB NOT NULL DEFAULT '[]',
    badges JSONB NOT NULL DEFAULT '{"slot1": null, "slot2": null, "slot3": null}',
    contract JSONB NOT NULL DEFAULT '{"teamId": null}',
    history JSONB NOT NULL DEFAULT '{"goals": 0, "assists": 0, "averageRating": 0, "gamesPlayed": 0, "lastMatchRatings": [], "benchGamesCount": 0, "seasonRatingDelta": 0}',
    satisfaction INT NOT NULL DEFAULT 70,
    training_progress INT NOT NULL DEFAULT 0,
    fatigue INT NOT NULL DEFAULT 0,
    achievements JSONB NOT NULL DEFAULT '[]',
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices e Alterações Seguras
ALTER TABLE players ADD COLUMN IF NOT EXISTS nickname VARCHAR(255);
ALTER TABLE players ADD COLUMN IF NOT EXISTS appearance JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS role VARCHAR(8);
ALTER TABLE players ADD COLUMN IF NOT EXISTS pentagon JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS fusion JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS current_rating INT DEFAULT 500;
ALTER TABLE players ADD COLUMN IF NOT EXISTS potential INT DEFAULT 600;
ALTER TABLE players ADD COLUMN IF NOT EXISTS current_phase NUMERIC(4,2) DEFAULT 6.0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS phase_history JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS contract JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '{}';
ALTER TABLE players ADD COLUMN IF NOT EXISTS satisfaction INT DEFAULT 70;
ALTER TABLE players ADD COLUMN IF NOT EXISTS training_progress INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS fatigue INT DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players (team_id);
CREATE INDEX IF NOT EXISTS idx_players_current_rating ON players (current_rating);
CREATE INDEX IF NOT EXISTS idx_players_position ON players (position);

-- 4. TABELA DE TREINADORES (MANAGERS)
CREATE TABLE IF NOT EXISTS managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    district VARCHAR(32) NOT NULL,
    reputation INT DEFAULT 10,
    attributes JSONB NOT NULL DEFAULT '{"evolution": 50, "negotiation": 50, "scout": 50}',
    career JSONB NOT NULL DEFAULT '{"titlesWon": 0, "totalLeagueTitles": 0, "totalCupTitles": 0, "hallOfFameEntries": 0, "consecutiveTitles": 0, "currentTeamId": null, "historyTeamIds": []}',
    achievements JSONB NOT NULL DEFAULT '[]',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Alterações Seguras em MANAGERS
ALTER TABLE managers ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]';
-- Garante que o JSONB de career tenha os novos campos (opcional, mas bom para clareza)
-- ALTER TABLE managers ALTER COLUMN career SET DEFAULT '{"titlesWon": 0, "totalLeagueTitles": 0, "totalCupTitles": 0, "hallOfFameEntries": 0, "consecutiveTitles": 0, "currentTeamId": null, "historyTeamIds": []}';

-- 5. TABELA DE TRANSFERÊNCIAS (TRANSFERS)
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id),
    from_team_id UUID REFERENCES teams(id),
    to_team_id UUID REFERENCES teams(id),
    value NUMERIC(15,2) NOT NULL,
    salary NUMERIC(15,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    user_id UUID NOT NULL REFERENCES auth.users(id),
    world_id TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE NOTIFICAÇÕES (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    world_id TEXT NOT NULL DEFAULT 'default',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE JOGOS (GAMES) - PERSISTÊNCIA DE SAVE
CREATE TABLE IF NOT EXISTS games (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    world_id TEXT NOT NULL DEFAULT 'default',
    PRIMARY KEY (user_id, world_id)
);

-- Adicionar colunas faltantes em GAMES (Safe Update)
ALTER TABLE games ADD COLUMN IF NOT EXISTS world_state JSONB NOT NULL DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS teams_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS players_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS managers_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_team_id TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_manager_id TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS notifications JSONB NOT NULL DEFAULT '[]';
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_headline JSONB DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS training_data JSONB DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 8. TABELA DE LIGAS (LEAGUES)
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(32) NOT NULL,
    tv_quota VARCHAR(32) DEFAULT 'Média',
    difficulty VARCHAR(32) DEFAULT 'Normal',
    standings JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DE TEMPORADAS (SEASONS)
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir apenas uma temporada ativa
CREATE UNIQUE INDEX IF NOT EXISTS one_active_season ON seasons (is_active) WHERE is_active = true;

-- 10. TABELA DE ESTADO GLOBAL (GLOBAL_GAME_STATE)
CREATE TABLE IF NOT EXISTS global_game_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id TEXT NOT NULL DEFAULT 'default',
    current_season_id UUID REFERENCES seasons(id),
    current_game_date DATE NOT NULL DEFAULT '2050-01-01',
    is_market_open BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir uma linha de estado global por mundo
CREATE UNIQUE INDEX IF NOT EXISTS one_row_per_world ON global_game_state (world_id);

-- 11. TABELA DE PARTIDAS (MATCHES)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id TEXT NOT NULL DEFAULT 'default',
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    round INT NOT NULL,
    played BOOLEAN DEFAULT false,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    match_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. POLÍTICAS DE SEGURANÇA (RLS) - Adicionadas com DROP preventivo
DO $$
BEGIN
    -- RLS Players
    ALTER TABLE players ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de jogadores" ON players;
    CREATE POLICY "Leitura pública de jogadores" ON players FOR SELECT USING (true);

    -- RLS Teams
    ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de times" ON teams;
    CREATE POLICY "Leitura pública de times" ON teams FOR SELECT USING (true);

    -- RLS Managers
    ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de managers" ON managers;
    CREATE POLICY "Leitura pública de managers" ON managers FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Usuários gerenciam seu próprio manager" ON managers;
    CREATE POLICY "Usuários gerenciam seu próprio manager" ON managers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- RLS Transfers
    ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Usuários gerenciam suas próprias transferências" ON transfers;
    CREATE POLICY "Usuários gerenciam suas próprias transferências" ON transfers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- RLS Notifications
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Usuários veem suas próprias notificações" ON notifications;
    CREATE POLICY "Usuários veem suas próprias notificações" ON notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    -- RLS Games
    ALTER TABLE games ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios jogos" ON games;
    CREATE POLICY "Usuários podem gerenciar seus próprios jogos" ON games FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    DROP POLICY IF EXISTS "Qualquer usuário pode ler mundos públicos" ON games;
    CREATE POLICY "Qualquer usuário pode ler mundos públicos" ON games FOR SELECT USING (true);

    -- RLS Seasons, Leagues, Global State e Matches
    ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de temporadas" ON seasons;
    CREATE POLICY "Leitura pública de temporadas" ON seasons FOR SELECT USING (true);

    ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de ligas" ON leagues;
    CREATE POLICY "Leitura pública de ligas" ON leagues FOR SELECT USING (true);

    ALTER TABLE global_game_state ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública do estado global" ON global_game_state;
    CREATE POLICY "Leitura pública do estado global" ON global_game_state FOR SELECT USING (true);

    ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Leitura pública de partidas" ON matches;
    CREATE POLICY "Leitura pública de partidas" ON matches FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Usuários podem gerenciar partidas de seus mundos" ON matches;
    -- Consideramos que quem criou o registro do mundo (ou quem está participando) pode atualizar partidas
    CREATE POLICY "Usuários podem gerenciar partidas de seus mundos" ON matches FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 13. DADOS INICIAIS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM seasons WHERE is_active = true) THEN
        INSERT INTO seasons (name, start_date, end_date, is_active) 
        VALUES ('Temporada 1 - Gênesis', '2050-01-01', '2050-12-31', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM global_game_state) THEN
        INSERT INTO global_game_state (current_season_id, current_game_date, is_market_open) 
        VALUES ((SELECT id FROM seasons WHERE is_active = true LIMIT 1), '2050-01-01', true);
    END IF;
END $$;
