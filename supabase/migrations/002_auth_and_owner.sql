-- Owner registration (PR5)
-- owner_properties / appraisal_requests を Supabase Auth のユーザーへ紐付け、
-- 本人以外がオーナー資産データへ到達できないよう RLS を有効化する。
-- 001_initial.sql は再実行しない前提で、追加分のみを冪等に定義する。

-- Supabase 上では auth.users への外部キーで孤児レコードを防ぐ。
-- ローカル Postgres（auth スキーマ無し）では skip し、application 側の検証に委ねる。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'owner_properties_user_id_fkey'
    ) THEN
      ALTER TABLE owner_properties
        ADD CONSTRAINT owner_properties_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'appraisal_requests_user_id_fkey'
    ) THEN
      ALTER TABLE appraisal_requests
        ADD CONSTRAINT appraisal_requests_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- 同一ユーザーが同じ部屋を二重登録しないようにする（棟・部屋番号は任意項目のため coalesce で正規化）
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_properties_user_unit
  ON owner_properties (
    user_id,
    mansion_id,
    coalesce(building_id, ''),
    coalesce(room_number, '')
  );

-- 更新時刻の自動更新
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_owner_properties_updated_at ON owner_properties;
CREATE TRIGGER trg_owner_properties_updated_at
  BEFORE UPDATE ON owner_properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_appraisal_requests_updated_at ON appraisal_requests;
CREATE TRIGGER trg_appraisal_requests_updated_at
  BEFORE UPDATE ON appraisal_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row Level Security: オーナー資産データは本人のみ読み書きできる。
-- service role / postgres role は RLS をバイパスするため、サーバー側の集計処理には影響しない。
ALTER TABLE owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_properties_select_own ON owner_properties;
CREATE POLICY owner_properties_select_own ON owner_properties
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_properties_insert_own ON owner_properties;
CREATE POLICY owner_properties_insert_own ON owner_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_properties_update_own ON owner_properties;
CREATE POLICY owner_properties_update_own ON owner_properties
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS owner_properties_delete_own ON owner_properties;
CREATE POLICY owner_properties_delete_own ON owner_properties
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS appraisal_requests_select_own ON appraisal_requests;
CREATE POLICY appraisal_requests_select_own ON appraisal_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS appraisal_requests_insert_own ON appraisal_requests;
CREATE POLICY appraisal_requests_insert_own ON appraisal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
