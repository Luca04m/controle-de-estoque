# Story EST-2.1 — Design System mínimo

**Epic:** EST-2 | **Wave:** 1 | **Key:** A5 | **Status:** Ready | **Estimate:** S

## Objetivo
Estabelecer fundação visual consistente: tokens CSS documentados e primitivos shadcn padronizados. Outras stories consomem daqui.

## Contexto
Hoje cores como `hsl(42, 60%, 55%)` (gold) aparecem hardcoded em arquivos individuais (ex: `DashboardPage.tsx:20 const GOLD = 'hsl(42, 60%, 55%)'`). Componentes UI shadcn customizados (badge/button/tabs) sem guia único.

## Acceptance Criteria

1. **Tokens centralizados em `src/styles/tokens.css`** (ou extensão do Tailwind config):
   - `--color-gold` (atual hsl(42,60%,55%))
   - `--color-success`, `--color-warning`, `--color-danger`, `--color-info`
   - Stop usar HSL literal em `.tsx`
2. **Documento `docs/design-system.md`** com:
   - Tokens e quando usar cada um
   - Lista de primitivos disponíveis (Button, Badge, Card, Dialog, Select, Tabs, Table, Skeleton, Toast)
   - Exemplos "do/don't"
3. **Refactor de 3 arquivos-âncora** para usar os tokens (Dashboard, AppLayout, ProductsPage cabeçalho)
4. **Lint + build passing** (`npm run lint && npm run build`)

## Dev Notes

- Tailwind 4: usar `@theme` block em `src/index.css`
- Não criar novos primitivos — só documentar o que já existe e padronizar
- Manter classes Tailwind inline nos componentes (não extrair para CSS-in-JS)

## File List
- `src/styles/tokens.css` (novo) OU `src/index.css` (extender @theme)
- `docs/design-system.md` (novo)
- `src/pages/DashboardPage.tsx` (remover constante GOLD, usar token)
- `src/components/layout/AppLayout.tsx` (padronizar tokens de cor de conexão)
- `src/pages/ProductsPage.tsx` (cabeçalho apenas, sem tocar no resto)

## Change Log
- 2026-04-16: Criada por @aiox-master
