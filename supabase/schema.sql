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
  category      TEXT NOT NULL CHECK (category IN ('honey', 'cappuccino', 'blended', 'acessorio')),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock     INTEGER NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locations (pontos de venda / parceiros)
CREATE TABLE IF NOT EXISTS locations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('deposito', 'loja_fisica', 'marketplace', 'ecommerce')),
  address       TEXT,
  city          TEXT,
  state         TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  contact_name  TEXT,
  contact_phone TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock per location (source of truth)
CREATE TABLE IF NOT EXISTS location_stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, location_id)
);

-- Add location_id FK to profiles
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_location
  FOREIGN KEY (location_id) REFERENCES locations(id);

-- APPEND-ONLY: no UPDATE or DELETE on this table
CREATE TABLE IF NOT EXISTS stock_movements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id),
  action      TEXT NOT NULL CHECK (action IN ('in', 'out', 'adjustment', 'loss', 'transfer')),
  quantity    INTEGER NOT NULL,
  order_id    UUID,
  location_id UUID NOT NULL REFERENCES locations(id),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  items       JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  reference   TEXT,
  address     TEXT,
  notes       TEXT,
  total_value NUMERIC,
  delivered_by TEXT,
  delivered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX idx_stock_movements_location_id ON stock_movements(location_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_created_at ON delivery_orders(created_at DESC);
CREATE INDEX idx_delivery_orders_location_id ON delivery_orders(location_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_location_stock_product ON location_stock(product_id);
CREATE INDEX idx_location_stock_location ON location_stock(location_id);
CREATE INDEX idx_locations_active ON locations(active);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
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

CREATE OR REPLACE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER location_stock_updated_at
  BEFORE UPDATE ON location_stock
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Update stock at a specific location + sync products.current_stock
CREATE OR REPLACE FUNCTION update_stock(
  p_product_id UUID,
  p_delta INTEGER,
  p_location_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_location UUID;
  v_current_qty INTEGER;
BEGIN
  -- Default to first deposito if no location specified
  v_location := COALESCE(p_location_id, (
    SELECT id FROM locations WHERE type = 'deposito' ORDER BY created_at LIMIT 1
  ));

  -- Upsert location_stock
  INSERT INTO location_stock (product_id, location_id, quantity)
  VALUES (p_product_id, v_location, GREATEST(0, p_delta))
  ON CONFLICT (product_id, location_id) DO UPDATE
  SET quantity = GREATEST(0, location_stock.quantity + p_delta),
      updated_at = NOW();

  -- Sync products.current_stock as computed sum
  UPDATE products
  SET current_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM location_stock
    WHERE product_id = p_product_id
  ),
  updated_at = NOW()
  WHERE id = p_product_id;
END;
$$;

-- Atomic transfer between locations
CREATE OR REPLACE FUNCTION transfer_stock(
  p_from_location UUID,
  p_to_location UUID,
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_current_qty INTEGER;
BEGIN
  -- Lock row to prevent race conditions
  SELECT quantity INTO v_current_qty
  FROM location_stock
  WHERE product_id = p_product_id AND location_id = p_from_location
  FOR UPDATE;

  IF v_current_qty IS NULL OR v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Estoque insuficiente na origem (disponível: %, solicitado: %)',
      COALESCE(v_current_qty, 0), p_quantity;
  END IF;

  -- Debit origin
  UPDATE location_stock
  SET quantity = quantity - p_quantity, updated_at = NOW()
  WHERE product_id = p_product_id AND location_id = p_from_location;

  -- Credit destination (upsert)
  INSERT INTO location_stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location, p_quantity)
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET quantity = location_stock.quantity + p_quantity, updated_at = NOW();

  -- Movement out (origin)
  INSERT INTO stock_movements (product_id, action, quantity, location_id, user_id, notes)
  VALUES (p_product_id, 'transfer', -p_quantity, p_from_location, p_user_id,
    COALESCE(p_notes, 'Transferência para ' || (SELECT name FROM locations WHERE id = p_to_location)));

  -- Movement in (destination)
  INSERT INTO stock_movements (product_id, action, quantity, location_id, user_id, notes)
  VALUES (p_product_id, 'transfer', p_quantity, p_to_location, p_user_id,
    COALESCE(p_notes, 'Transferência de ' || (SELECT name FROM locations WHERE id = p_from_location)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_stock ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_user_location()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT location_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
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

-- locations: everyone reads active; manager manages all
CREATE POLICY locations_select ON locations FOR SELECT USING (active = true);

CREATE POLICY locations_manage ON locations FOR ALL
  USING (get_user_role() = 'manager');

-- location_stock: manager sees all; operator sees own location
CREATE POLICY location_stock_manager ON location_stock FOR SELECT
  USING (get_user_role() = 'manager');

CREATE POLICY location_stock_operator ON location_stock FOR SELECT
  USING (location_id = get_user_location());

-- stock_movements: manager sees all; operator sees own location
CREATE POLICY movements_select ON stock_movements FOR SELECT
  USING (
    get_user_role() = 'manager'
    OR location_id = get_user_location()
  );

CREATE POLICY movements_insert ON stock_movements FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- delivery_orders: manager sees all; operator sees own location
CREATE POLICY orders_select ON delivery_orders FOR SELECT
  USING (
    get_user_role() = 'manager'
    OR location_id = get_user_location()
  );

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
-- stock_movements, products, delivery_orders, location_stock

-- ============================================================
-- SEED DATA — Locations
-- ============================================================

INSERT INTO locations (id, name, type, city, state, contact_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Depósito Central', 'deposito', 'Belo Horizonte', 'MG', 'João Lamas'),
  ('00000000-0000-0000-0000-000000000002', 'Angelo / Degusto', 'loja_fisica', 'Rio de Janeiro', 'RJ', 'Angelo'),
  ('00000000-0000-0000-0000-000000000003', 'Porquinho', 'loja_fisica', 'Belo Horizonte', 'MG', NULL),
  ('00000000-0000-0000-0000-000000000004', 'Rio Comprido', 'loja_fisica', 'Rio de Janeiro', 'RJ', NULL),
  ('00000000-0000-0000-0000-000000000005', 'Mercado Livre', 'marketplace', NULL, NULL, NULL),
  ('00000000-0000-0000-0000-000000000006', 'NuvemShop', 'ecommerce', NULL, NULL, NULL);

-- Migrate existing stock to Depósito Central
-- INSERT INTO location_stock (product_id, location_id, quantity)
-- SELECT id, '00000000-0000-0000-0000-000000000001', current_stock
-- FROM products WHERE current_stock > 0;
