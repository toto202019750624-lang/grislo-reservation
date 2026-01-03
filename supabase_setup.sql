-- グリスロ予約システム Supabase テーブル作成SQL
-- Supabase SQL Editor で実行してください

-- ================================
-- 1. 運行日程テーブル
-- ================================
CREATE TABLE IF NOT EXISTS schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    time_slots TEXT[] NOT NULL DEFAULT ARRAY['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
    available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 2. 予約テーブル
-- ================================
CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 3. 乗車場所テーブル
-- ================================
CREATE TABLE IF NOT EXISTS pickup_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- 4. 設定テーブル
-- ================================
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================
-- RLS (Row Level Security) 設定
-- ================================

-- RLS を有効化
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- 全員が読み取り可能
CREATE POLICY "Enable read access for all users" ON schedule FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON reservations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON pickup_locations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON config FOR SELECT USING (true);

-- 全員が挿入・更新・削除可能（本番環境では認証を追加することを推奨）
CREATE POLICY "Enable insert for all users" ON schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON schedule FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON schedule FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON reservations FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON reservations FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON pickup_locations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON pickup_locations FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON pickup_locations FOR DELETE USING (true);

CREATE POLICY "Enable insert for all users" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON config FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON config FOR DELETE USING (true);

-- ================================
-- 初期データ投入（乗車場所のサンプル）
-- ================================
INSERT INTO pickup_locations (id, name, address, sort_order) VALUES
    ('loc_001', '町役場前', '', 1),
    ('loc_002', '駅前ロータリー', '', 2),
    ('loc_003', 'コミュニティセンター前', '', 3),
    ('loc_004', '病院正面玄関', '', 4)
ON CONFLICT (id) DO NOTHING;
