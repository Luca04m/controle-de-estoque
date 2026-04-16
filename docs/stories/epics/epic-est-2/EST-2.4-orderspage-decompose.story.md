# Story EST-2.4 — Decompor OrdersPage

**Epic:** EST-2 | **Wave:** 1 | **Key:** A1 | **Status:** Ready | **Estimate:** L

## Objetivo
Quebrar `OrdersPage.tsx` (1985 linhas — o maior da base) em lista + detalhe + ações isoladas.

## Acceptance Criteria

1. **Rota `/pedidos` mostra apenas lista + filtros** (≤ 300 linhas)
2. **Sub-rota `/pedidos/:id` abre detalhe + ações** (≤ 300 linhas)
3. **Componentes extraídos para `src/features/orders/`:**
   - `OrderListFilters.tsx` (status, loja, período)
   - `OrderCard.tsx` (item da lista)
   - `OrderDetailHeader.tsx`
   - `OrderItemsTable.tsx`
   - `OrderActionButtons.tsx` (confirmar/cancelar/marcar entregue)
   - `ConfirmDeliveryDialog.tsx`
4. **Paridade funcional 100%**
5. **Reutilizar `CancelOrderDialog.tsx` existente**

## Dev Notes

- Usar `useDeliveryOrders` hook existente
- React Query para caching (já presente)
- Mobile: lista em swipeable cards

## File List
- `src/pages/OrdersPage.tsx` (refatorar — só lista)
- `src/pages/orders/OrderDetailPage.tsx` (novo)
- `src/features/orders/OrderListFilters.tsx` (novo)
- `src/features/orders/OrderCard.tsx` (novo)
- `src/features/orders/OrderDetailHeader.tsx` (novo)
- `src/features/orders/OrderItemsTable.tsx` (novo)
- `src/features/orders/OrderActionButtons.tsx` (novo)
- `src/features/orders/ConfirmDeliveryDialog.tsx` (novo)
- `src/App.tsx` (nova rota)

## Change Log
- 2026-04-16: Criada por @aiox-master
