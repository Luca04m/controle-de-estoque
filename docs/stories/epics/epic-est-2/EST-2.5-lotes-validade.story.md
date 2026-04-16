# Story EST-2.5 — Lotes + Validade

**Epic:** EST-2 | **Wave:** 2 | **Key:** B1 | **Status:** Ready | **Estimate:** L | **Depends:** EST-2.1

## Objetivo
Rastrear lotes com data de validade. Alertar vencimento próximo (30d, 7d, vencido).

## Acceptance Criteria

1. **Schema Supabase:**
   ```sql
   CREATE TABLE product_batches (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     product_id UUID NOT NULL REFERENCES products(id),
     location_id UUID NOT NULL REFERENCES locations(id),
     batch_code TEXT NOT NULL,
     manufactured_at DATE,
     expiry_date DATE NOT NULL,
     quantity INTEGER NOT NULL CHECK (quantity >= 0),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (product_id, location_id, batch_code)
   );
   ```
2. **Migration Supabase** com RLS igual ao de `location_stock`
3. **UI: StockInPage ganha campos "Lote" + "Validade"**
4. **Dashboard: Banner de alerta** quando existir lote vencendo em ≤ 30d
5. **Nova rota `/lotes`:** lista de lotes com filtro por status (vigente/vencendo/vencido)
6. **Hook `useBatches` e `useExpiringBatches(daysAhead)`**

## Dev Notes

- Delegação: @data-engineer cria migration, @dev implementa UI
- FIFO sugerido: saída automática puxa do lote mais antigo por padrão (v2)
- Compatibilidade: produtos sem lote continuam funcionando (legacy)

## File List
- `supabase/migrations/YYYYMMDD_product_batches.sql` (novo)
- `src/hooks/useBatches.ts` (novo)
- `src/pages/BatchesPage.tsx` (novo)
- `src/features/batches/BatchCard.tsx` (novo)
- `src/features/batches/ExpiryBanner.tsx` (novo)
- `src/pages/stock-entry/StockInPage.tsx` (campos de lote)
- `src/types/index.ts` (tipo `Batch`)

## Change Log
- 2026-04-16: Criada por @aiox-master
