// Componentes visuais compartilhados da plataforma (dark + gold premium).
import type { ReactNode } from 'react'
import {
  Droplet, FlaskConical, Wheat, Wine, Tags, Gem, Link2, Box, Package,
} from 'lucide-react'
import type { Item, StatusEstoque, CategoriaItem } from './types'
import { statusEstoque, STATUS_LABEL } from './engine'

// ── cor por status (tokens do design system) ──
export const STATUS_VAR: Record<StatusEstoque, string> = {
  ok: 'var(--ok)', baixo: 'var(--warn)', critico: 'var(--crit)',
}

export function StatusPill({ status, dense }: { status: StatusEstoque; dense?: boolean }) {
  const c = STATUS_VAR[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wider ${dense ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ color: `hsl(${c})`, background: `hsl(${c} / 0.13)`, border: `1px solid hsl(${c} / 0.28)` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${c})` }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

// ── ícone por categoria ──
const ICON_MAP: Record<CategoriaItem, typeof Droplet> = {
  liquido: Droplet, po: Wheat, aditivo: FlaskConical,
  garrafa: Wine, rotulo: Tags, pingente: Gem, fechamento: Link2, caixa: Box,
  honey: Package, cappuccino: Package, blended: Package,
}
export function CategoriaIcon({ categoria, size = 16 }: { categoria: CategoriaItem; size?: number }) {
  const Ico = ICON_MAP[categoria] ?? Package
  return <Ico size={size} strokeWidth={1.6} />
}

// ── barra de estoque (saldo vs 2× mínimo) ──
export function StockBar({ item, height = 5 }: { item: Item; height?: number }) {
  const status = statusEstoque(item)
  const pct = Math.max(3, Math.min(100, (item.estoque / (item.min * 2 || 1)) * 100))
  const c = STATUS_VAR[status]
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'hsl(var(--gold) / 0.07)' }}>
      <div className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(${c} / 0.55), hsl(${c}))` }} />
    </div>
  )
}

// ── sparkline SVG (saldo acumulado ao longo do tempo) ──
export function Sparkline({ values, width = 96, height = 28, color = 'var(--gold-bright)' }: {
  values: number[]; width?: number; height?: number; color?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${d} L${width},${height} L0,${height} Z`
  const id = `spk-${Math.round(values[0] * 100)}-${values.length}`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${color} / 0.28)`} />
          <stop offset="100%" stopColor={`hsl(${color} / 0)`} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={`hsl(${color})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── card base ──
export function Card({ children, className = '', glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={`gradient-card rounded-2xl border border-[hsl(var(--gold)/0.10)] ${glow ? 'gold-glow' : ''} ${className}`}>
      {children}
    </div>
  )
}

// ── cabeçalho de seção ──
export function SectionHeader({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end gap-3 mb-4 flex-wrap">
      <h2 className="font-display text-2xl text-foreground leading-none">{title}</h2>
      {hint && <span className="text-xs text-text-muted mb-0.5">{hint}</span>}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}
