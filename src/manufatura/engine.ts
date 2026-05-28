// ════════════════════════════════════════════════════════════════════
// Engine de disponibilidade — o coração do sistema.
// "Quantas garrafas dá pra produzir e qual o gargalo" (modelo Katana):
//   fabricaveis(produto) = MIN sobre componentes( floor(saldo / qtd_no_BOM) )
//   gargalo = o componente que produz o menor número.
// + calculated stock, ROP, cobertura em dias (DOH), valor de estoque.
// ════════════════════════════════════════════════════════════════════

import type { Item, Receita, OrdemProducao, StatusEstoque, DisponibilidadeProduto } from './types'

/** Status de um item pelo saldo vs mínimo (3 níveis). */
export function statusEstoque(item: Pick<Item, 'estoque' | 'min'>): StatusEstoque {
  if (item.estoque <= 0) return 'critico'
  if (item.estoque < item.min * 0.5) return 'critico'
  if (item.estoque < item.min) return 'baixo'
  return 'ok'
}

export const STATUS_LABEL: Record<StatusEstoque, string> = {
  ok: 'Em dia', baixo: 'Repor', critico: 'Crítico',
}

/** Quantidade comprometida de um item por ordens abertas (planejada/em_producao). */
export function comprometido(itemId: string, ordens: OrdemProducao[], receitas: Receita[]): number {
  let total = 0
  for (const o of ordens) {
    if (o.status !== 'planejada' && o.status !== 'em_producao') continue
    const rec = receitas.find(r => r.id === o.receitaId)
    const comp = rec?.componentes.find(c => c.itemId === itemId)
    if (comp) total += comp.quantidade * o.qtdPlanejada
  }
  return total
}

/**
 * Saldo projetado (estilo Katana): em estoque − comprometido − segurança.
 * Negativo = precisa comprar/produzir. (esperado de POs omitido no mock.)
 */
export function calculatedStock(
  item: Item, ordens: OrdemProducao[] = [], receitas: Receita[] = [],
): number {
  return item.estoque - comprometido(item.id, ordens, receitas) - item.min
}

/** Ponto de pedido: uso médio diário × lead time + estoque de segurança (min). */
export function reorderPoint(item: Item): number {
  return Math.round((item.usoMedioDiario ?? 0) * (item.leadTimeDias ?? 0) + item.min)
}

/** Cobertura em dias (Days of Inventory on Hand). */
export function coberturaDias(item: Item): number | null {
  if (!item.usoMedioDiario || item.usoMedioDiario <= 0) return null
  return Math.floor(item.estoque / item.usoMedioDiario)
}

export const valorEstoque = (item: Item) => item.estoque * item.custoMedio

/**
 * Disponibilidade de um produto: fabricáveis + gargalo.
 * @param livre se fornecido, usa saldo livre (estoque − comprometido) por item.
 */
export function disponibilidade(
  receita: Receita,
  itens: Item[],
  saldoOverride?: Record<string, number>,
): DisponibilidadeProduto {
  const byId = new Map(itens.map(i => [i.id, i]))
  let min = Infinity
  let gargaloItemId: string | null = null
  const porComponente: DisponibilidadeProduto['porComponente'] = []

  for (const c of receita.componentes) {
    if (c.quantidade <= 0) continue
    const it = byId.get(c.itemId)
    const saldo = saldoOverride?.[c.itemId] ?? it?.estoque ?? 0
    const sustenta = Math.floor(saldo / c.quantidade)
    porComponente.push({ itemId: c.itemId, sustenta, necessarioPorUn: c.quantidade })
    if (sustenta < min) { min = sustenta; gargaloItemId = c.itemId }
  }

  const fabricaveis = min === Infinity ? 0 : Math.max(0, min)
  return {
    produtoId: receita.produtoId,
    fabricaveis,
    gargaloItemId,
    gargaloFabricaveis: fabricaveis,
    incompleta: !!receita.incompleta,
    porComponente: porComponente.sort((a, b) => a.sustenta - b.sustenta),
  }
}

/** Resumo agregado para KPIs do dashboard. */
export interface ResumoEstoque {
  valorTotal: number
  unidadesPA: number
  emDia: number
  repor: number
  critico: number
  itensTotais: number
}

export function resumoEstoque(itens: Item[]): ResumoEstoque {
  let valorTotal = 0, unidadesPA = 0, emDia = 0, repor = 0, critico = 0
  for (const it of itens) {
    if (!it.ativo) continue
    valorTotal += valorEstoque(it)
    if (it.tipo === 'produto_acabado') unidadesPA += it.estoque
    const s = statusEstoque(it)
    if (s === 'ok') emDia++; else if (s === 'baixo') repor++; else critico++
  }
  return { valorTotal, unidadesPA, emDia, repor, critico, itensTotais: itens.filter(i => i.ativo).length }
}

/** Itens abaixo do mínimo, ordenados por severidade (sugestão de compra = repor até 2× min). */
export function listaCompras(itens: Item[]) {
  return itens
    .filter(i => i.ativo && statusEstoque(i) !== 'ok')
    .map(i => ({
      item: i,
      status: statusEstoque(i),
      comprar: Math.max(0, +(i.min * 2 - i.estoque).toFixed(2)),
    }))
    .sort((a, b) =>
      (a.status === 'critico' ? 0 : 1) - (b.status === 'critico' ? 0 : 1) ||
      (b.item.min - b.item.estoque) - (a.item.min - a.item.estoque))
}

export const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtNum = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString('pt-BR') : (+n.toFixed(2)).toLocaleString('pt-BR')
