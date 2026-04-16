import type { Location } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoreCardData {
  location: Location
  totalUnits: number
  productCount: number
  criticalCount: number
  healthPercent: number
}

export interface CategoryBreakdown {
  category: string
  total: number
  variants: { name: string; qty: number }[]
}

export interface StoreOverviewData {
  location: Location
  categories: CategoryBreakdown[]
  totalUnits: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const GOLD = 'hsl(var(--gold))'

export const ACTION_MAP: Record<string, { label: string; color: string; symbol: string }> = {
  in:         { label: 'Entrada',  color: 'text-emerald-400', symbol: '+' },
  out:        { label: 'Saída',    color: 'text-red-400',     symbol: '−' },
  adjustment: { label: 'Ajuste',   color: 'text-amber-400',   symbol: '~' },
  loss:       { label: 'Perda',    color: 'text-orange-400',  symbol: '−' },
}

export const CATEGORY_BAR: Record<string, { label: string; color: string; bg: string }> = {
  honey:      { label: 'Honey',      color: '#D4A843', bg: 'hsl(42 60% 55% / 0.15)' },
  cappuccino: { label: 'Cappuccino', color: '#8B6542', bg: 'hsl(25 35% 40% / 0.15)' },
  blended:    { label: 'Blended',    color: '#C4A882', bg: 'hsl(30 30% 55% / 0.15)' },
}

export const ORDER_STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendente',   color: 'text-amber-400' },
  confirmed: { label: 'Confirmado', color: 'text-gold' },
  delivered: { label: 'Entregue',   color: 'text-emerald-400' },
  cancelled: { label: 'Cancelado',  color: 'text-red-400' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)

export const shortLocationName = (name: string) =>
  name.replace('Degusto Club ', 'Degusto ').replace(' Delivery', '')
