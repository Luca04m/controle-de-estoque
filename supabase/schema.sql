-- Mr. Lion Stock — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('operator', 'manager')),
  location_id UUID,
  full_name   TEXT,
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  sku           TEXT NOT NULL UNIQUE,
  category      TEXT NOT NULL CHECK (category IN ('whisky', 'rtd', 'kit', 'acessorio')),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- APPEND-ONLY: no UPDATE or DELETE on this table
CREATE TABLE IF NOT EXISTS stock_movements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  action     TEXT NOT NULL CHECK (action IN ('in', 'out', 'adjustment', 'loss')),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  order_id   UUID,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  items      JSONB NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered')),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  reference  TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  threshold  INTEGER NOT NULL DEFAULT 5,
  active     BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (product_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_created_at ON delivery_orders(created_at DESC);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Update product stock atomically
CREATE OR REPLACE FUNCTION update_stock(p_product_id UUID, p_delta INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET current_stock = GREATEST(0, current_stock + p_delta),
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- Auto-update updated_at on products
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (user_id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- profiles: users see own profile; manager sees all
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (user_id = auth.uid() OR get_user_role() = 'manager');

CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (get_user_role() = 'manager');

-- products: everyone reads; only manager writes
CREATE POLICY products_select ON products FOR SELECT USING (true);

CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (get_user_role() = 'manager');

CREATE POLICY products_update ON products FOR UPDATE
  USING (get_user_role() = 'manager');

-- stock_movements: everyone reads; operator and manager can insert; NO update/delete
CREATE POLICY movements_select ON stock_movements FOR SELECT USING (true);

CREATE POLICY movements_insert ON stock_movements FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- delivery_orders: everyone reads; authenticated inserts; manager can update status
CREATE POLICY orders_select ON delivery_orders FOR SELECT USING (true);

CREATE POLICY orders_insert ON delivery_orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY orders_update ON delivery_orders FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- alerts: manager manages; all can read
CREATE POLICY alerts_select ON alerts FOR SELECT USING (true);
CREATE POLICY alerts_write ON alerts FOR ALL
  USING (get_user_role() = 'manager');

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable Realtime for these tables in Supabase Dashboard:
-- stock_movements, products, delivery_orders

-- ============================================================
-- SEED DATA (optional — remove in production)
-- ============================================================

-- INSERT INTO products (name, sku, category, current_stock, min_stock) VALUES
--   ('Whisky Mr. Lion Gold 750ml', 'ML-GOLD-750', 'whisky', 24, 10),
--   ('Whisky Mr. Lion Premium 1L', 'ML-PREM-1L', 'whisky', 12, 5),
--   ('Mr. Lion RTD Citrus 350ml', 'ML-RTD-CIT-350', 'rtd', 48, 20),
--   ('Mr. Lion RTD Ginger 350ml', 'ML-RTD-GNG-350', 'rtd', 36, 20),
--   ('Kit Presenteável Gold + 2 Copos', 'ML-KIT-GOLD-2C', 'kit', 8, 3),
--   ('Copo Mr. Lion Premium', 'ML-ACC-COPO', 'acessorio', 50, 10),
--   ('Ice Bucket Mr. Lion', 'ML-ACC-BUCKET', 'acessorio', 15, 5);
