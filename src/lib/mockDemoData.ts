// Mock data para EST-2 (demo) — lotes, reposição, perdas.
// NÃO é persistido. Apenas aparência de funcionar.

import type { ExpiringBatch, BatchStatus } from '@/types'

// ─── Lotes expirando (demo) ─────────────────────────────────────────────────

const today = new Date()
const daysFromNow = (d: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() + d)
  return date.toISOString().slice(0, 10)
}

const statusFromDays = (d: number): BatchStatus =>
  d < 0 ? 'expired' : d <= 7 ? 'critical' : d <= 30 ? 'warning' : 'ok'

export const MOCK_BATCHES: ExpiringBatch[] = [
  {
    id: 'b-001',
    product_id: 'p-honey-1',
    location_id: 'l-002',
    batch_code: 'MH-2026-03A',
    manufactured_at: '2026-01-10',
    expiry_date: daysFromNow(-3),
    quantity: 12,
    created_by: null,
    notes: 'Lote da primeira safra de março',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    product_name: 'Mel Silvestre 500g',
    sku: 'HNY-500-SILV',
    location_name: 'Angelo / Degusto',
    status: 'expired',
    days_until_expiry: -3,
  },
  {
    id: 'b-002',
    product_id: 'p-honey-2',
    location_id: 'l-003',
    batch_code: 'MH-2026-04B',
    manufactured_at: '2026-02-05',
    expiry_date: daysFromNow(5),
    quantity: 8,
    created_by: null,
    notes: null,
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-02-05T10:00:00Z',
    product_name: 'Mel Eucalipto 250g',
    sku: 'HNY-250-EUC',
    location_name: 'Porquinho',
    status: 'critical',
    days_until_expiry: 5,
  },
  {
    id: 'b-003',
    product_id: 'p-cappuccino-1',
    location_id: 'l-001',
    batch_code: 'CP-2026-02A',
    manufactured_at: '2026-01-20',
    expiry_date: daysFromNow(22),
    quantity: 34,
    created_by: null,
    notes: 'Estoque principal',
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-01-20T10:00:00Z',
    product_name: 'Cappuccino Clássico',
    sku: 'CAP-CLS-300',
    location_name: 'Depósito Central',
    status: 'warning',
    days_until_expiry: 22,
  },
  {
    id: 'b-004',
    product_id: 'p-blended-1',
    location_id: 'l-004',
    batch_code: 'BL-2026-03A',
    manufactured_at: '2026-03-12',
    expiry_date: daysFromNow(140),
    quantity: 56,
    created_by: null,
    notes: null,
    created_at: '2026-03-12T10:00:00Z',
    updated_at: '2026-03-12T10:00:00Z',
    product_name: 'Blended Morango',
    sku: 'BL-STRAW-350',
    location_name: 'Rio Comprido',
    status: 'ok',
    days_until_expiry: 140,
  },
  {
    id: 'b-005',
    product_id: 'p-honey-3',
    location_id: 'l-002',
    batch_code: 'MH-2026-04C',
    manufactured_at: '2026-03-01',
    expiry_date: daysFromNow(14),
    quantity: 17,
    created_by: null,
    notes: 'Lote premium',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
    product_name: 'Mel Laranjeira 500g',
    sku: 'HNY-500-LAR',
    location_name: 'Angelo / Degusto',
    status: 'warning',
    days_until_expiry: 14,
  },
]

// Recalcular status com base em dias (mantém consistência em runtime)
MOCK_BATCHES.forEach(b => {
  b.status = statusFromDays(b.days_until_expiry)
})

// ─── Perdas registradas (mock enrichment) ──────────────────────────────────

export interface LossRecord {
  id: string
  product_name: string
  sku: string
  location_name: string
  quantity: number
  reason: string
  value_estimated: number
  created_at: string
  user_name: string
}

export const MOCK_LOSSES: LossRecord[] = [
  { id: 'l-001', product_name: 'Mel Silvestre 500g',  sku: 'HNY-500-SILV', location_name: 'Angelo / Degusto', quantity: 3, reason: 'Quebra no transporte',  value_estimated: 87,  created_at: daysFromNow(-2) + 'T09:20:00Z', user_name: 'Operador Angelo' },
  { id: 'l-002', product_name: 'Cappuccino Clássico', sku: 'CAP-CLS-300',  location_name: 'Porquinho',        quantity: 2, reason: 'Vencimento',           value_estimated: 34,  created_at: daysFromNow(-5) + 'T14:10:00Z', user_name: 'João L.' },
  { id: 'l-003', product_name: 'Blended Morango',     sku: 'BL-STRAW-350', location_name: 'Rio Comprido',     quantity: 1, reason: 'Embalagem danificada', value_estimated: 22,  created_at: daysFromNow(-8) + 'T11:05:00Z', user_name: 'Operadora RC' },
  { id: 'l-004', product_name: 'Mel Eucalipto 250g',  sku: 'HNY-250-EUC',  location_name: 'Angelo / Degusto', quantity: 4, reason: 'Vencimento',           value_estimated: 92,  created_at: daysFromNow(-10) + 'T10:00:00Z', user_name: 'Operador Angelo' },
  { id: 'l-005', product_name: 'Cappuccino Avelã',    sku: 'CAP-AVE-300',  location_name: 'Mercado Livre',    quantity: 1, reason: 'Furto',                value_estimated: 19,  created_at: daysFromNow(-12) + 'T16:30:00Z', user_name: 'Sistema ML' },
  { id: 'l-006', product_name: 'Mel Silvestre 500g',  sku: 'HNY-500-SILV', location_name: 'Porquinho',        quantity: 2, reason: 'Quebra no transporte', value_estimated: 58,  created_at: daysFromNow(-15) + 'T08:45:00Z', user_name: 'João L.' },
  { id: 'l-007', product_name: 'Blended Açaí',        sku: 'BL-ACAI-350',  location_name: 'NuvemShop',        quantity: 3, reason: 'Erro de inventário',   value_estimated: 67,  created_at: daysFromNow(-18) + 'T13:20:00Z', user_name: 'Sistema NS' },
  { id: 'l-008', product_name: 'Mel Laranjeira 500g', sku: 'HNY-500-LAR',  location_name: 'Rio Comprido',     quantity: 2, reason: 'Vencimento',           value_estimated: 64,  created_at: daysFromNow(-22) + 'T09:15:00Z', user_name: 'Operadora RC' },
]

// ─── Loss aggregates helper ─────────────────────────────────────────────────

export interface LossAggregates {
  totalUnits: number
  totalValue: number
  byLocation: { location: string; units: number; value: number }[]
  topReasons: { reason: string; count: number }[]
  byDay: { date: string; units: number }[]
}

export function aggregateLosses(
  losses: LossRecord[],
  windowDays: number = 30,
): LossAggregates {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const filtered = losses.filter(l => new Date(l.created_at) >= cutoff)

  const totalUnits = filtered.reduce((s, l) => s + l.quantity, 0)
  const totalValue = filtered.reduce((s, l) => s + l.value_estimated, 0)

  const locMap = new Map<string, { units: number; value: number }>()
  filtered.forEach(l => {
    const curr = locMap.get(l.location_name) ?? { units: 0, value: 0 }
    locMap.set(l.location_name, {
      units: curr.units + l.quantity,
      value: curr.value + l.value_estimated,
    })
  })
  const byLocation = [...locMap.entries()]
    .map(([location, v]) => ({ location, ...v }))
    .sort((a, b) => b.units - a.units)

  const reasonMap = new Map<string, number>()
  filtered.forEach(l => reasonMap.set(l.reason, (reasonMap.get(l.reason) ?? 0) + 1))
  const topReasons = [...reasonMap.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const dayMap = new Map<string, number>()
  filtered.forEach(l => {
    const d = l.created_at.slice(0, 10)
    dayMap.set(d, (dayMap.get(d) ?? 0) + l.quantity)
  })
  const byDay = [...dayMap.entries()]
    .map(([date, units]) => ({ date, units }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { totalUnits, totalValue, byLocation, topReasons, byDay }
}

// ─── Replenishment suggestions (demo) ───────────────────────────────────────

export interface ReplenishmentItem {
  productId: string
  productName: string
  sku: string
  locationName: string
  currentStock: number
  minStock: number
  maxStock: number | null
  suggestedQuantity: number
  priority: 'high' | 'medium' | 'low'
  lastMovementAt?: string
}
