# Story EST-2.3 — Decompor StockEntryPage

**Epic:** EST-2 | **Wave:** 1 | **Key:** A2 | **Status:** Ready | **Estimate:** L

## Objetivo
Quebrar `StockEntryPage.tsx` (1875 linhas) em fluxos dedicados, 1 ação = 1 tela enxuta.

## Acceptance Criteria

1. **Rota `/entrada` vira hub com 5 cards de ação:**
   - Entrada de estoque
   - Saída
   - Ajuste
   - Perda
   - Transferência entre locais
2. **5 sub-rotas dedicadas** (`/entrada/in`, `/entrada/out`, `/entrada/adjust`, `/entrada/loss`, `/entrada/transfer`)
3. **Cada tela:** formulário focado, ≤ 300 linhas, 3-4 campos visíveis
4. **Shared components em `src/features/stock-entry/`:**
   - `ProductPicker.tsx`
   - `LocationPicker.tsx`
   - `QuantityInput.tsx`
   - `NotesField.tsx`
   - `SubmitStockAction.ts` (service chamando hooks)
5. **Paridade funcional 100%** com versão atual (nenhuma regressão)

## Dev Notes

- Preservar hooks existentes (`useStockMovements`, `useTransferStock`)
- Reutilizar primitivos shadcn (Dialog, Select, Input)
- Mobile-first — operador usa celular

## File List
- `src/pages/StockEntryPage.tsx` (reduzir a hub ≤ 150 linhas)
- `src/pages/stock-entry/StockInPage.tsx` (novo)
- `src/pages/stock-entry/StockOutPage.tsx` (novo)
- `src/pages/stock-entry/StockAdjustPage.tsx` (novo)
- `src/pages/stock-entry/StockLossPage.tsx` (novo)
- `src/pages/stock-entry/StockTransferPage.tsx` (novo)
- `src/features/stock-entry/ProductPicker.tsx` (novo)
- `src/features/stock-entry/LocationPicker.tsx` (novo)
- `src/features/stock-entry/QuantityInput.tsx` (novo)
- `src/features/stock-entry/NotesField.tsx` (novo)
- `src/App.tsx` (novas rotas)

## Change Log
- 2026-04-16: Criada por @aiox-master
