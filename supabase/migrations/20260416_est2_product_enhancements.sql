-- ═══════════════════════════════════════════════════════════════════════════
-- EST-2: Product enhancements (max_stock, barcode)
-- Stories: EST-2.6 (min/max), EST-2.8 (barcode scanner)
-- Date: 2026-04-16
-- ═══════════════════════════════════════════════════════════════════════════

-- EST-2.6 — Estoque máximo
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS max_stock INTEGER CHECK (max_stock IS NULL OR max_stock >= 0);

COMMENT ON COLUMN products.max_stock IS
  'Estoque máximo sugerido. NULL = sem limite. Usado para calcular reposição sugerida.';

-- EST-2.8 — Código de barras (GTIN/EAN)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON products (barcode)
  WHERE barcode IS NOT NULL;

COMMENT ON COLUMN products.barcode IS
  'Código de barras (GTIN-13, GTIN-8, EAN, UPC). UNIQUE quando not null.';
