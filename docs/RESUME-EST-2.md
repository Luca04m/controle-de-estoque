# Resume EST-2 — Onde parei em 2026-04-16

## Estado atual

- **Branch local:** `feat/est-2-refactor`
- **Commits prontos (NÃO pushed):** 7 commits sobre `26a9d81`
- **Build:** ✅ passing
- **Dev server:** parado (rodar `npm run dev` para retomar)
- **Mock auth:** ativado via `.env.local` (placeholder URLs → `IS_MOCK = true`)

## Login demo
- `joao` / `1234` (manager, vê tudo)
- `angelo` / `1234` (operator, loja Degusto)

## Commits na branch (base → HEAD)
```
e6d32bc feat(EST-2.1): design system tokens + docs
bfdfdf5 feat(EST-2.2): simplificar DashboardPage com hierarquia visual
99c29c7 feat(EST-2.5,2.6,2.8): migrations + types para lotes, min/max, barcode
2d5affa feat(EST-2.5,2.6,2.7,2.8): demo pages — lotes, reposição, perdas, scanner
67d2fdb feat(EST-2.4): decompor OrdersPage em lista + detalhe + actions
0593d44 feat(EST-2.3): decompor StockEntryPage em fluxos dedicados
9080963 fix(EST-2.3): adicionar componentes shared esquecidos pelo executor
```

## 8 stories MVP — todas entregues

| Story | Key | Arquivos principais |
|---|---|---|
| EST-2.1 | Design system | `src/index.css`, `docs/design-system.md` |
| EST-2.2 | Dashboard refact | `src/pages/DashboardPage.tsx` (650→209), `src/components/dashboard/*` |
| EST-2.3 | StockEntry refact | `src/pages/StockEntryPage.tsx` (1875→359), `src/pages/stock-entry/*`, `src/features/stock-entry/*` |
| EST-2.4 | Orders refact | `src/pages/OrdersPage.tsx` (1985→583), `src/pages/orders/OrderDetailPage.tsx`, `src/features/orders/*` |
| EST-2.5 | Lotes/validade | `src/pages/BatchesPage.tsx`, `src/hooks/useBatches.ts`, `supabase/migrations/20260416_est2_product_batches.sql` |
| EST-2.6 | Reposição | `src/pages/ReplenishmentPage.tsx`, `src/hooks/useReplenishmentSuggestions.ts` |
| EST-2.7 | Análise perdas | `src/pages/LossAnalyticsPage.tsx`, `src/hooks/useLossAnalytics.ts` |
| EST-2.8 | Scanner | `src/features/barcode/BarcodeScanner.tsx` (stub) |

## Backlog (próxima wave)

- EST-2.9 A3 — Decompor ProductsPage (845 linhas)
- EST-2.10 A6 — Consolidar `mockData.ts` (1053 linhas)
- EST-2.11 B3 — Curva ABC
- EST-2.12 B5 — Inventário cíclico
- EST-2.13 B7 — Fornecedores
- EST-2.14 B8 — Custo + margem + lucratividade
- EST-2.15 B9 — Notificações push/email

Plano completo em: `docs/stories/epics/epic-est-2/EPIC-EST-2-EXECUTION.yaml`

## Como retomar

```bash
cd /Volumes/KINGSTON/vault/apps/controle-de-estoque
git branch --show-current    # deve estar em feat/est-2-refactor
npm run dev                  # inicia em http://localhost:5173
```

## Como publicar quando pronto

```
@devops *push                # push a branch + abrir PR para main
```

OU manualmente:
```bash
git push -u origin feat/est-2-refactor
gh pr create --title "feat: EST-2 refactor + features (MVP)" --body "..."
```

## Observações importantes

- Lotes/perdas/reposição/scanner usam **mock data** (`src/lib/mockDemoData.ts`)
- Migrations reais prontas em `supabase/migrations/20260416_*.sql` para quando Supabase real estiver ligado
- 2 warnings de lint pré-existentes (não introduzidos nesta branch): ProductsPage:192 + StockEntryPage:1252
- `.env.local` existe (gitignored) com placeholders para mock mode. Sem ele, login não funciona.
