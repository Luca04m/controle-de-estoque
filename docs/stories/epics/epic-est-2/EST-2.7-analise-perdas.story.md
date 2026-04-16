# Story EST-2.7 — Análise de Perdas

**Epic:** EST-2 | **Wave:** 2 | **Key:** B4 | **Status:** Ready | **Estimate:** M | **Depends:** EST-2.1

## Objetivo
Tela dedicada agregando movimentações `action='loss'` com filtros e visualização.

## Acceptance Criteria

1. **Nova rota `/perdas`:**
   - Filtros: loja, categoria, período (7d/30d/90d/custom)
   - KPIs: total unidades perdidas | valor estimado (R$) | top 3 causas (via notes tokenizado)
   - Gráfico barras: perdas por loja (Recharts)
   - Gráfico linhas: tendência 30 dias
   - Tabela detalhada (sortable): produto | loja | qtd | motivo | data | usuário
2. **Export CSV** da tabela filtrada
3. **Link no Dashboard:** KPI "Perdas 30d" → `/perdas`
4. **Hook `useLossAnalytics(filters)`**

## Dev Notes

- Valor estimado = qty × `products.sale_price` (se existir coluna; senão, omitir)
- Se EST-2.5 Lotes estiver pronto, incluir coluna "lote vencido?" como causa
- Mobile: esconder gráficos complexos, priorizar tabela

## File List
- `src/hooks/useLossAnalytics.ts` (novo)
- `src/pages/LossAnalyticsPage.tsx` (novo)
- `src/features/losses/LossFiltersBar.tsx` (novo)
- `src/features/losses/LossKpiCards.tsx` (novo)
- `src/features/losses/LossByLocationChart.tsx` (novo)
- `src/features/losses/LossTrendChart.tsx` (novo)
- `src/features/losses/LossTable.tsx` (novo)

## Change Log
- 2026-04-16: Criada por @aiox-master
