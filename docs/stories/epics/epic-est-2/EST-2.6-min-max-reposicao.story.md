# Story EST-2.6 — Estoque Min/Max + Reposição Sugerida

**Epic:** EST-2 | **Wave:** 2 | **Key:** B2 | **Status:** Ready | **Estimate:** M | **Depends:** EST-2.1

## Objetivo
Adicionar `max_stock` e tela de reposição sugerida baseada em giro + mínimo.

## Acceptance Criteria

1. **Schema:** adicionar coluna `max_stock INTEGER` em `products` (default null = sem limite)
2. **ProductsPage:** editar min e max no formulário de cadastro
3. **Nova rota `/reposicao`:**
   - Lista de produtos com `current_stock ≤ min_stock`
   - Cálculo sugerido: `suggested = max_stock - current_stock` (ou 2x mínimo se max for null)
   - Agrupamento por loja
   - Botão "Gerar ordem de compra" (exporta CSV por ora)
4. **Dashboard:** KPI "Reposição necessária" → link para `/reposicao`
5. **Hook `useReplenishmentSuggestions()`**

## Dev Notes

- Cálculo de giro (opcional v2): média de saídas dos últimos 30 dias
- Manter compatibilidade: produtos sem max_stock continuam funcionando

## File List
- `supabase/migrations/YYYYMMDD_add_max_stock.sql` (novo)
- `src/hooks/useReplenishmentSuggestions.ts` (novo)
- `src/pages/ReplenishmentPage.tsx` (novo)
- `src/features/replenishment/ReplenishmentCard.tsx` (novo)
- `src/pages/ProductsPage.tsx` (campo max_stock no form)
- `src/types/index.ts` (Product.max_stock)

## Change Log
- 2026-04-16: Criada por @aiox-master
