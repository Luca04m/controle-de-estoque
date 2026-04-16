-- ═══════════════════════════════════════════════════════════════════════════
-- EST-2.5 — Lotes + validade
-- Tabela: product_batches (rastreamento de lotes com data de validade)
-- Date: 2026-04-16
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS product_batches (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id      UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  batch_code       TEXT NOT NULL,
  manufactured_at  DATE,
  expiry_date      DATE NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_by       UUID REFERENCES auth.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, location_id, batch_code)
);

CREATE INDEX IF NOT EXISTS idx_product_batches_product  ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_location ON product_batches(location_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry   ON product_batches(expiry_date);

CREATE OR REPLACE TRIGGER product_batches_updated_at
  BEFORE UPDATE ON product_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS mirror of location_stock
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_batches_manager ON product_batches FOR ALL
  USING (get_user_role() = 'manager');

CREATE POLICY product_batches_operator_select ON product_batches FOR SELECT
  USING (location_id = get_user_location());

CREATE POLICY product_batches_operator_insert ON product_batches FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND location_id = get_user_location()
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- View auxiliar: lotes expirando (≤ 30 dias ou vencidos)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_expiring_batches AS
SELECT
  pb.id,
  pb.product_id,
  pb.location_id,
  pb.batch_code,
  pb.expiry_date,
  pb.quantity,
  p.name AS product_name,
  p.sku,
  l.name AS location_name,
  CASE
    WHEN pb.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
    WHEN pb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
    ELSE 'ok'
  END AS status,
  (pb.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM product_batches pb
JOIN products p  ON p.id = pb.product_id
JOIN locations l ON l.id = pb.location_id
WHERE pb.quantity > 0;

COMMENT ON VIEW v_expiring_batches IS
  'Lotes com status baseado em validade: expired | critical (≤7d) | warning (≤30d) | ok';
