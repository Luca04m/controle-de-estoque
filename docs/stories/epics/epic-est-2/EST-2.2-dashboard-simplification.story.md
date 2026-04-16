# Story EST-2.2 — Simplificar DashboardPage

**Epic:** EST-2 | **Wave:** 1 | **Key:** A4 | **Status:** Ready | **Estimate:** M | **Depends:** EST-2.1

## Objetivo
Reduzir `DashboardPage.tsx` de 650 linhas para ≤ 250 linhas com hierarquia visual clara: KPIs no topo, detalhe hierárquico abaixo. Responder "o que está acabando?" em 1 segundo de olhada.

## Acceptance Criteria

1. **DashboardPage.tsx ≤ 250 linhas** (apenas orquestração)
2. **Subcomponentes extraídos para `src/components/dashboard/`:**
   - `KpiStrip.tsx` — barra superior com 4 KPIs (Total unidades | Produtos críticos | Pedidos pendentes | Variação 7d)
   - `StoreCard.tsx` — já existe inline, mover para arquivo próprio
   - `RealtimeIndicator.tsx` — mover para `components/`
   - `CriticalProductsList.tsx` — lista filtrada de produtos críticos
3. **Hierarquia visual:**
   - Linha 1 (acima da dobra): KpiStrip
   - Linha 2: StoreCards grid (responsivo 1/2/3 colunas)
   - Linha 3: CriticalProductsList + MovementTrendChart lado a lado (desktop) / empilhado (mobile)
4. **Performance:** FCP (First Contentful Paint) ≤ 1s no mock mode
5. **Testes manuais OK:** desktop + mobile simulado

## Dev Notes

- Usar tokens criados em EST-2.1
- `useMemo` para cálculos pesados (já presente — preservar)
- Manter realtime funcionando

## File List
- `src/pages/DashboardPage.tsx` (refatorar)
- `src/components/dashboard/KpiStrip.tsx` (novo)
- `src/components/dashboard/StoreCard.tsx` (novo)
- `src/components/dashboard/RealtimeIndicator.tsx` (novo)
- `src/components/dashboard/CriticalProductsList.tsx` (novo)

## Change Log
- 2026-04-16: Criada por @aiox-master
