import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { StockMovement, DeliveryOrder, ProductCategory } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Order number formatting ───────────────────────────────────────────────────

export function formatOrderNumber(id: string): string {
  return `#MRL-${id.slice(-4).toUpperCase()}`
}

// ─── WhatsApp message ─────────────────────────────────────────────────────────

export function generateWhatsAppMessage(order: DeliveryOrder): string {
  const items = (order.items ?? []) as { product_name: string; quantity: number; unit_price: number }[]
  const lines = items.map(i => `• ${i.product_name} × ${i.quantity} = R$ ${(i.quantity * i.unit_price).toFixed(2).replace('.', ',')}`)
  const total = order.total_value
    ? `R$ ${order.total_value.toFixed(2).replace('.', ',')}`
    : ''
  const msg = [
    `*Pedido Mr. Lion ${formatOrderNumber(order.id)}*`,
    '',
    ...lines,
    '',
    total ? `*Total: ${total}*` : '',
    order.address ? `📍 ${order.address}` : '',
    order.notes ? `📝 ${order.notes}` : '',
  ].filter(Boolean).join('\n')
  return encodeURIComponent(msg)
}

// ─── Movement summary ─────────────────────────────────────────────────────────

export interface TypeStat {
  count: number
  quantity: number
}

export interface MovementSummary {
  in: TypeStat
  out: TypeStat
  adjustment: TypeStat
  loss: TypeStat
  byCategory: Record<string, number>
  total: number
}

export function calculateMovementSummary(movements: StockMovement[]): MovementSummary {
  const summary: MovementSummary = {
    in:         { count: 0, quantity: 0 },
    out:        { count: 0, quantity: 0 },
    adjustment: { count: 0, quantity: 0 },
    loss:       { count: 0, quantity: 0 },
    byCategory: {},
    total: movements.length,
  }

  for (const m of movements) {
    const qty = Math.abs(m.quantity)
    summary[m.action].count++
    summary[m.action].quantity += qty

    const cat = (m.product as { category?: ProductCategory } | undefined)?.category
    if (cat) {
      summary.byCategory[cat] = (summary.byCategory[cat] ?? 0) + 1
    }
  }

  return summary
}

// ─── Variation helper ─────────────────────────────────────────────────────────

export function calculateVariation(
  current: number,
  previous: number
): { value: number; label: string } | undefined {
  if (previous === 0 && current === 0) return undefined
  if (previous === 0) return { value: 100, label: '+100% vs ontem' }
  const pct = Math.round(((current - previous) / previous) * 100)
  const sign = pct >= 0 ? '+' : ''
  return { value: pct, label: `${sign}${pct}% vs ontem` }
}
