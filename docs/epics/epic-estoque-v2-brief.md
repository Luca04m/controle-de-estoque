# Brief para Epic — Mr Lion Stock v2 (Refatoração + Evolução)

**Para:** @pm (Morgan)
**De:** @aiox-master (Orion)
**Data:** 2026-04-16
**Referência análise:** `docs/analysis/audit-2026-04-16.md`

---

## Contexto em 3 linhas

Mr Lion Stock está em `main@26a9d81` com tudo funcionando mas **confuso estética e funcionalmente** (feedback direto do dono). 4 páginas monolíticas somam ~5.000 linhas. Faltam features padrão do setor (lotes/validade, ABC, min/max, inventário). Schema Supabase e stack tech estão ✅ — não trocar. Refatorar + evoluir em paralelo.

## Objetivo do Epic

> Entregar um sistema **claro, simples e suficiente** para operação Mr Lion: 1 depósito + 3 lojas físicas + 2 marketplaces, produtos perecíveis (mel/café), operadores em celular, gerentes em desktop.

## Critérios de Sucesso (definidos pelo dono)

1. Operador novo entende o fluxo em **menos de 10 minutos** sem treinamento
2. Registrar entrada/saída de estoque em **≤ 3 cliques**
3. Dashboard responde "o que está acabando?" em **1 segundo de olhada**
4. Nenhuma tela com scroll infinito de formulário
5. Mobile funciona igual ao desktop (PWA)

## Stories propostas (15)

### Fase A — Refatoração

| # | Título | Valor |
|---|---|---|
| A1 | Decompor `OrdersPage` (1985→ ≤ 300 linhas/arquivo) | Manutenibilidade |
| A2 | Decompor `StockEntryPage` em fluxos separados (Entrada, Saída, Ajuste, Perda, Transferência) | UX + manutenção |
| A3 | Decompor `ProductsPage` e extrair formulário de cadastro | Clareza |
| A4 | Simplificar `DashboardPage` com hierarquia visual (KPIs no topo) | UX gerente |
| A5 | Criar design system mínimo documentado (tokens + primitivos) | Consistência |
| A6 | Consolidar `mockData.ts` em fixtures por domínio | Manutenção |

### Fase B — Features

| # | Título | Valor |
|---|---|---|
| B1 | Lotes + validade (schema + UI + alertas "N dias para vencer") | 🔴 Crítico (mel perecível) |
| B2 | Estoque mínimo E máximo + reposição sugerida | 🔴 Alto (evita ruptura e excesso) |
| B3 | Curva ABC automática por receita e por giro | 🟡 Prioriza atenção |
| B4 | Tela dedicada de análise de perdas (por loja/categoria/período) | 🟡 Auditoria |
| B5 | Inventário cíclico (contagem + diff físico vs. sistema) | 🟡 Acurácia |
| B6 | Scanner de código de barras (webcam PWA) | 🟡 Produtividade |

### Bônus (backlog)

| # | Título |
|---|---|
| B7 | Cadastro de fornecedores + histórico de preço |
| B8 | Preço de custo + margem + lucratividade |
| B9 | Notificações push/email (vencimento, ruptura) |

## Fora de escopo (explícito)

- Emissão de NF-e (integrar provedor externo se necessário)
- YMS / gestão de frota
- Integração com ERP externo
- Sync automático marketplaces (fase futura)
- Kits com BOM de produção

## Referências consideradas

- TOTVS Suíte Logística (WMS/ABC/mapeamento expedição)
- vhsys ERP (lotes, validade, min/max, kits, alertas, multi-local)

## Ação solicitada ao @pm

1. Ler este brief + a auditoria em `docs/analysis/audit-2026-04-16.md`
2. Rodar `*create-epic EST-2 "Refatoração + Evolução Mr Lion Stock"` usando este brief como fonte
3. Definir com o usuário:
   - Priorização final (ordem das 15 stories)
   - Deadline alvo
   - Se Fase A e B vão paralelas ou sequenciais
4. Entregar `docs/stories/epics/epic-est-2/EPIC-EST-2-EXECUTION.yaml` para @sm começar `*draft` das primeiras stories

---

**Handoff:** `aiox-master → pm` | **Próximo comando:** `@pm *create-epic`

— Orion 🎯
