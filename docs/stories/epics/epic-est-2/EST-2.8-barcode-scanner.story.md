# Story EST-2.8 — Scanner de Código de Barras (PWA)

**Epic:** EST-2 | **Wave:** 2 | **Key:** B6 | **Status:** Ready | **Estimate:** M | **Depends:** EST-2.3

## Objetivo
Permitir entrada/saída de estoque via scan de código de barras usando câmera do dispositivo (PWA).

## Acceptance Criteria

1. **Nova dependência:** `@zxing/browser` ou `quagga2` (avaliar bundle size)
2. **Componente `BarcodeScanner.tsx`:**
   - Pede permissão de câmera
   - Stream visual ao vivo com bounding box
   - Detecta código → retorna string + vibra dispositivo
   - Botão "Fechar" explícito
3. **Schema:** coluna `barcode TEXT` em `products` (nullable, UNIQUE quando not null)
4. **ProductsPage:** campo "Código de barras" no cadastro (+botão "Escanear")
5. **StockInPage / StockOutPage:** botão flutuante "Escanear produto" → detecta → preenche ProductPicker automaticamente
6. **Fallback:** se câmera não disponível → input manual visível
7. **Testes em dispositivo real:** iOS Safari + Android Chrome

## Dev Notes

- PWA já configurado (vite-plugin-pwa) — só adicionar `"camera"` em permissions do manifest
- Lazy-load do scanner (evita peso no bundle inicial)
- Acessibilidade: anúncio via aria-live quando código detectado

## File List
- `src/features/barcode/BarcodeScanner.tsx` (novo)
- `src/features/barcode/useBarcodeScanner.ts` (novo)
- `supabase/migrations/YYYYMMDD_add_barcode.sql` (novo)
- `src/pages/stock-entry/StockInPage.tsx` (botão scan)
- `src/pages/stock-entry/StockOutPage.tsx` (botão scan)
- `src/pages/ProductsPage.tsx` (campo barcode)
- `src/types/index.ts` (Product.barcode)
- `vite.config.ts` (manifest permissions)

## Change Log
- 2026-04-16: Criada por @aiox-master
