import { MapPin, Search, ArrowUpDown, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Location } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DateFilter = 'today' | 'week' | 'month' | 'all'
export type StatusFilter = 'all' | 'confirmed' | 'delivered' | 'cancelled'
export type SortBy = 'newest' | 'oldest' | 'highest' | 'lowest'

// ─── PillButton ───────────────────────────────────────────────────────────────

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3.5 rounded-full text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? 'hsl(42 60% 55%)' : 'hsl(240 22% 9%)',
        color: active ? 'hsl(240 25% 4%)' : 'hsl(var(--muted-foreground))',
        border: active ? '1px solid transparent' : '1px solid hsl(240 15% 13%)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OrderListFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  dateFilter: DateFilter
  onDateFilterChange: (v: DateFilter) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (v: StatusFilter) => void
  locationFilter: string
  onLocationFilterChange: (v: string) => void
  sortBy: SortBy
  onSortByChange: (v: SortBy) => void
  locations: Location[] | undefined
  cancelledCount: number
  visibleOrders: { id: string }[]
  onExport: () => void
  selectionMode: boolean
  onToggleSelectionMode: () => void
}

// ─── OrderListFilters ─────────────────────────────────────────────────────────

export function OrderListFilters({
  search,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
  locationFilter,
  onLocationFilterChange,
  sortBy,
  onSortByChange,
  locations,
  cancelledCount,
  visibleOrders,
  onExport,
  selectionMode,
  onToggleSelectionMode,
}: OrderListFiltersProps) {
  const dateChips: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'Tudo' },
    { key: 'today', label: 'Hoje' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Este Mês' },
  ]

  const statusChips: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'confirmed', label: 'Confirmados' },
    { key: 'delivered', label: 'Entregues' },
    { key: 'cancelled', label: `Cancelados${cancelledCount > 0 ? ` · ${cancelledCount}` : ''}` },
  ]

  return (
    <div className="space-y-3">
      {/* Header action bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSelectionMode}
          className="h-9 px-3 rounded-lg border text-xs font-medium transition-all"
          style={{
            borderColor: selectionMode ? 'hsl(42 60% 55% / 0.5)' : 'hsl(240 15% 13%)',
            backgroundColor: selectionMode ? 'hsl(42 60% 55% / 0.08)' : 'hsl(240 22% 7%)',
            color: selectionMode ? 'hsl(42 60% 55%)' : 'hsl(var(--muted-foreground))',
          }}
        >
          {selectionMode ? 'Cancelar' : 'Selecionar'}
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={visibleOrders.length === 0}
          className="h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-40"
          style={{
            borderColor: 'hsl(240 15% 13%)',
            backgroundColor: 'hsl(240 22% 7%)',
            color: 'hsl(var(--muted-foreground))',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Exportar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" />
        <Input
          placeholder="Buscar por referência, endereço ou produto..."
          className="pl-9 h-10 text-sm"
          style={{
            backgroundColor: 'hsl(240 22% 7%)',
            borderColor: 'hsl(240 15% 11%)',
          }}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        {/* Period */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-semibold shrink-0 w-14">Período</span>
          <div className="flex gap-1">
            {dateChips.map((chip) => (
              <PillButton key={chip.key} active={dateFilter === chip.key} onClick={() => onDateFilterChange(chip.key)}>
                {chip.label}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-semibold shrink-0 w-14">Status</span>
          <div className="flex gap-1">
            {statusChips.map((chip) => (
              <PillButton key={chip.key} active={statusFilter === chip.key} onClick={() => onStatusFilterChange(chip.key)}>
                {chip.label}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Location */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/25 uppercase tracking-[0.15em] font-semibold shrink-0 w-14 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Loja
          </span>
          <div className="flex flex-wrap gap-1">
            <PillButton active={locationFilter === 'all'} onClick={() => onLocationFilterChange('all')}>
              Todas
            </PillButton>
            {(locations ?? []).filter(loc => loc.type !== 'deposito').map(loc => (
              <PillButton
                key={loc.id}
                active={locationFilter === loc.id}
                onClick={() => onLocationFilterChange(loc.id)}
              >
                {loc.name.replace('Degusto Club ', 'Degusto ')}
              </PillButton>
            ))}
          </div>
        </div>

        <div className="hidden sm:block w-px h-5 bg-white/10" />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="w-3 h-3 text-white/30 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="h-7 px-2 rounded-md text-xs font-medium bg-transparent border text-white/60 focus:outline-none cursor-pointer"
            style={{ borderColor: 'hsl(240 15% 13%)' }}
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="highest">Maior valor</option>
            <option value="lowest">Menor valor</option>
          </select>
        </div>
      </div>
    </div>
  )
}
