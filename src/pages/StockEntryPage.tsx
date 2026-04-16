import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  SlidersHorizontal,
  AlertOctagon,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Download,
  Filter,
  ArrowLeftRight,
  ChevronRight,
} from 'lucide-react'
import { useAllMovements } from '@/hooks/useStockMovements'
import { useLocations } from '@/hooks/useLocations'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import type { StockMovement, MovementAction } from '@/types'
import { getProductImage } from '@/lib/productImages'

const GOLD = 'hsl(42 60% 55%)'
const DARK_BG = 'hsl(240 20% 7%)'
const CARD_BORDER = 'hsl(240 15% 14%)'
const CARD_BG_INNER = 'hsl(240 15% 11%)'
const SERIF_FONT = '"DM Serif Display", Georgia, serif'
const PAGE_SIZE = 20

const MOVEMENT_TYPES = [
  { action: 'in' as MovementAction,         label: 'Entrada',       description: 'Recebimento de mercadoria', icon: ArrowDownLeft,   color: '#22c55e', bgColor: 'hsl(142 50% 45% / 0.1)', borderColor: 'hsl(142 50% 45% / 0.25)', path: '/entrada/in' },
  { action: 'out' as MovementAction,        label: 'Saida',         description: 'Venda ou retirada',         icon: ArrowUpRight,    color: '#ef4444', bgColor: 'hsl(0 60% 50% / 0.1)',   borderColor: 'hsl(0 60% 50% / 0.25)',  path: '/entrada/out' },
  { action: 'adjustment' as MovementAction, label: 'Ajuste',        description: 'Correcao de inventario',    icon: SlidersHorizontal,color: '#f59e0b', bgColor: 'hsl(38 60% 50% / 0.1)',  borderColor: 'hsl(38 60% 50% / 0.25)', path: '/entrada/adjust' },
  { action: 'loss' as MovementAction,       label: 'Perda',         description: 'Quebra ou avaria',          icon: AlertOctagon,    color: '#b91c1c', bgColor: 'hsl(0 60% 30% / 0.12)',  borderColor: 'hsl(0 60% 30% / 0.3)',   path: '/entrada/loss' },
  { action: 'transfer' as MovementAction,   label: 'Transferencia', description: 'Entre lojas',               icon: ArrowLeftRight,  color: '#3b82f6', bgColor: 'hsl(217 60% 50% / 0.1)', borderColor: 'hsl(217 60% 50% / 0.25)',path: '/entrada/transfer' },
]

function getActionMeta(action: MovementAction) {
  const m = MOVEMENT_TYPES.find((t) => t.action === action)
  return m ?? MOVEMENT_TYPES[0]
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDatePtBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

interface MovementGroup { key: string; order_id: string | null; movements: StockMovement[]; action: MovementAction; totalQty: number; created_at: string; location_id: string | null; user: string; notes: string }

function groupMovements(movements: StockMovement[]): MovementGroup[] {
  const groups = new Map<string, StockMovement[]>()
  for (const mv of movements) {
    const k = mv.order_id ?? `standalone-${mv.id}`
    const arr = groups.get(k) ?? []
    arr.push(mv)
    groups.set(k, arr)
  }
  const result: MovementGroup[] = []
  for (const [key, mvs] of groups) {
    const first = mvs[0]
    result.push({ key, order_id: first.order_id, movements: mvs, action: first.action, totalQty: mvs.reduce((s, m) => s + Math.abs(m.quantity), 0), created_at: first.created_at, location_id: first.location_id, user: first.profile?.full_name ?? '—', notes: first.notes ?? '' })
  }
  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

type TabId = 'actions' | 'history'
type SortField = 'date' | 'type' | 'qty' | 'location'
type SortDir = 'asc' | 'desc'

export function StockEntryPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('actions')

  return (
    <div className="p-4 sm:p-6 space-y-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${GOLD.replace(')', ' / 0.12)')}` }}>
          <PackagePlus size={18} style={{ color: GOLD }} />
        </div>
        <div>
          <h1 className="text-xl text-foreground leading-tight" style={{ fontFamily: SERIF_FONT }}>Movimentacoes de Estoque</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Registro e historico de movimentacoes</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
        {(['actions', 'history'] as TabId[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all"
            style={activeTab === tab ? { background: `linear-gradient(135deg, ${GOLD}, hsl(42 50% 45%))`, color: 'hsl(240 25% 4%)', boxShadow: `0 2px 12px ${GOLD.replace(')', ' / 0.25)')}` } : { background: 'transparent', color: 'hsl(240 10% 50%)' }}>
            {tab === 'actions' ? 'Nova Movimentacao' : 'Historico'}
          </button>
        ))}
      </div>

      {activeTab === 'actions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MOVEMENT_TYPES.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.action} onClick={() => navigate(t.path)} className="relative rounded-xl p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}` }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${t.color}1A` }}>
                  <Icon size={20} style={{ color: t.color }} />
                </div>
                <p className="text-sm font-bold text-foreground">{t.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-relaxed">{t.description}</p>
                <ChevronRight size={14} className="absolute top-4 right-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
              </button>
            )
          })}
        </div>
      )}

      {activeTab === 'history' && <HistoryTab />}
    </div>
  )
}

function HistoryTab() {
  const { data: locations } = useLocations()
  const [filterLocation, setFilterLocation] = useState('__all__')
  const [filterAction, setFilterAction] = useState('__all__')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const queryFilters = useMemo(() => ({
    action: filterAction !== '__all__' ? (filterAction as MovementAction) : undefined,
    from: filterFrom ? new Date(filterFrom).toISOString() : undefined,
    to: filterTo ? new Date(filterTo + 'T23:59:59').toISOString() : undefined,
    limit: 200, offset: 0,
  }), [filterAction, filterFrom, filterTo])

  const { data: movementsResult, isLoading } = useAllMovements(queryFilters)

  const filteredMovements = useMemo(() => {
    const allMovements = movementsResult?.data ?? []
    let result = allMovements
    if (filterLocation !== '__all__') result = result.filter((m) => m.location_id === filterLocation)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) => (m.notes ?? '').toLowerCase().includes(q) || (m.product?.name ?? '').toLowerCase().includes(q) || (m.product?.sku ?? '').toLowerCase().includes(q))
    }
    return result
  }, [movementsResult, filterLocation, searchQuery])

  const groups = useMemo(() => {
    const grouped = groupMovements(filteredMovements)
    grouped.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortField === 'type') cmp = a.action.localeCompare(b.action)
      else if (sortField === 'qty') cmp = a.totalQty - b.totalQty
      else { const aL = locations?.find((l) => l.id === a.location_id)?.name ?? ''; const bL = locations?.find((l) => l.id === b.location_id)?.name ?? ''; cmp = aL.localeCompare(bL) }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return grouped
  }, [filteredMovements, sortField, sortDir, locations])

  const totalGroups = groups.length
  const pagedGroups = groups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(totalGroups / PAGE_SIZE)
  const hasFilters = filterLocation !== '__all__' || filterAction !== '__all__' || filterFrom !== '' || filterTo !== '' || searchQuery !== ''

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })
  }

  function clearFilters() { setFilterLocation('__all__'); setFilterAction('__all__'); setFilterFrom(''); setFilterTo(''); setSearchQuery(''); setPage(0) }

  function exportCSV() {
    const rows = [['Data', 'Tipo', 'Produto', 'SKU', 'Quantidade', 'Local', 'Usuario', 'Observacoes']]
    for (const g of groups) {
      for (const mv of g.movements) {
        const meta = getActionMeta(mv.action)
        const loc = locations?.find((l) => l.id === mv.location_id)
        rows.push([formatDatePtBR(mv.created_at), meta.label, mv.product?.name ?? mv.product_id, mv.product?.sku ?? '', String(Math.abs(mv.quantity)), loc?.name ?? '', mv.profile?.full_name ?? '', (mv.notes ?? '').replace(/"/g, '""')])
      }
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-muted-foreground/30" />
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ color: GOLD }} /> : <ChevronDown size={12} style={{ color: GOLD }} />
  }

  return (
    <div className="animate-slide-up">
      <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: DARK_BG, borderColor: CARD_BORDER }}>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={13} style={{ color: GOLD }} />
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">Filtros</p>
            {hasFilters && <button onClick={clearFilters} className="ml-auto text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1"><X size={10} />Limpar filtros</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Loja</label>
              <Select value={filterLocation} onValueChange={(v) => { if (v) { setFilterLocation(v); setPage(0) } }}>
                <SelectTrigger className="h-10 rounded-lg text-xs" style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER }}><span className="truncate text-foreground/80">{filterLocation === '__all__' ? 'Todas as lojas' : locations?.find((l) => l.id === filterLocation)?.name ?? 'Todas as lojas'}</span></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Todas as lojas</SelectItem>{locations?.map((loc) => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Tipo</label>
              <Select value={filterAction} onValueChange={(v) => { if (v) { setFilterAction(v); setPage(0) } }}>
                <SelectTrigger className="h-10 rounded-lg text-xs" style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER }}><span className="truncate text-foreground/80">{{ '__all__': 'Todos os tipos', in: 'Entrada', out: 'Saida', adjustment: 'Ajuste', loss: 'Perda', transfer: 'Transferencia' }[filterAction] ?? 'Todos os tipos'}</span></SelectTrigger>
                <SelectContent><SelectItem value="__all__">Todos os tipos</SelectItem><SelectItem value="in">Entrada</SelectItem><SelectItem value="out">Saida</SelectItem><SelectItem value="adjustment">Ajuste</SelectItem><SelectItem value="loss">Perda</SelectItem><SelectItem value="transfer">Transferencia</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">De</label>
              <Input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0) }} className="h-10 rounded-lg text-xs" style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER, colorScheme: 'dark' }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/70 font-medium">Ate</label>
              <Input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0) }} className="h-10 rounded-lg text-xs" style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER, colorScheme: 'dark' }} />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <Input type="text" placeholder="Buscar por produto, notas..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(0) }} className="h-10 rounded-lg text-xs pl-9" style={{ background: CARD_BG_INNER, borderColor: CARD_BORDER }} />
            </div>
            <button onClick={exportCSV} className="h-10 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all hover:bg-[hsl(42_60%_55%_/_0.1)] shrink-0" style={{ border: `1px solid ${GOLD.replace(')', ' / 0.3)')}`, color: GOLD }}>
              <Download size={14} />Exportar CSV
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: DARK_BG, borderColor: CARD_BORDER }}>
        <div className="hidden sm:grid grid-cols-[140px_100px_1fr_140px_80px_100px_44px] gap-2 px-5 py-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-muted-foreground/60" style={{ borderBottom: `1px solid ${CARD_BORDER}` }}>
          <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">Data {sortIcon('date')}</button>
          <button onClick={() => toggleSort('type')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">Tipo {sortIcon('type')}</button>
          <div>Produto(s)</div>
          <button onClick={() => toggleSort('location')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">Local {sortIcon('location')}</button>
          <button onClick={() => toggleSort('qty')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">Qtd {sortIcon('qty')}</button>
          <div>Usuario</div><div />
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground/50"><Clock size={16} className="animate-spin" /><span className="text-sm">Carregando...</span></div>
          </div>
        ) : pagedGroups.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <Package size={28} className="text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nenhuma movimentacao encontrada</p>
            {hasFilters && <p className="text-xs text-muted-foreground/40 mt-1">Tente ajustar os filtros</p>}
          </div>
        ) : pagedGroups.map((group, idx) => {
          const meta = getActionMeta(group.action)
          const loc = locations?.find((l) => l.id === group.location_id)
          const isExpanded = expandedKeys.has(group.key)
          const hasMultiple = group.movements.length > 1
          const productSummary = hasMultiple ? `${group.movements.length} produtos` : group.movements[0]?.product?.name ?? group.movements[0]?.product_id ?? '—'

          return (
            <div key={group.key}>
              <button onClick={() => toggleExpand(group.key)} className="w-full text-left transition-colors hover:bg-[hsl(240_15%_9%)]" style={{ borderTop: idx > 0 ? `1px solid ${CARD_BORDER}` : undefined }}>
                <div className="hidden sm:grid grid-cols-[140px_100px_1fr_140px_80px_100px_44px] gap-2 items-center px-5 py-3.5">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDateShort(group.created_at)}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold w-fit" style={{ background: meta.bgColor, color: meta.color, borderColor: meta.borderColor }}>{meta.label}</Badge>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{productSummary}</span>
                    {hasMultiple && <Badge variant="outline" className="text-[9px] shrink-0 px-1.5" style={{ background: `${GOLD.replace(')', ' / 0.08)')}`, color: GOLD, borderColor: `${GOLD.replace(')', ' / 0.2)')}` }}>{group.movements.length}</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{loc?.name ?? '—'}</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{group.totalQty}</span>
                  <span className="text-xs text-muted-foreground truncate">{group.user}</span>
                  <div className="flex items-center justify-center"><ChevronDown size={14} className={`text-muted-foreground/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
                </div>
                <div className="sm:hidden px-4 py-3.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{productSummary}</span>
                      <Badge variant="outline" className="text-[9px] font-semibold shrink-0" style={{ background: meta.bgColor, color: meta.color, borderColor: meta.borderColor }}>{meta.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">{formatDateShort(group.created_at)}</span>
                      <span className="text-[10px] text-muted-foreground/40">{loc?.name ?? ''}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0"><p className="text-sm font-bold tabular-nums text-foreground">{group.totalQty}</p><p className="text-[10px] text-muted-foreground/40">un.</p></div>
                  <ChevronDown size={14} className={`text-muted-foreground/40 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isExpanded && (
                <div className="animate-slide-up" style={{ background: 'hsl(240 18% 8%)', borderTop: `1px solid ${CARD_BORDER}` }}>
                  {group.movements.map((mv, mi) => {
                    const mvImg = mv.product?.sku ? getProductImage(mv.product.sku) : undefined
                    return (
                      <div key={mv.id} className="flex items-center gap-3 px-5 sm:px-8 py-3" style={{ borderTop: mi > 0 ? `1px solid hsl(240 15% 10%)` : undefined }}>
                        {mvImg ? <img src={mvImg} alt={mv.product?.name ?? ''} className="w-8 h-8 rounded-md object-contain shrink-0" style={{ background: 'hsl(240 15% 12%)' }} /> : <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'hsl(240 15% 12%)' }}><Package size={12} className="text-muted-foreground/40" /></div>}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground/90 truncate">{mv.product?.name ?? mv.product_id}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-mono">{mv.product?.sku ?? ''}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{Math.abs(mv.quantity)} un.</span>
                      </div>
                    )
                  })}
                  {group.notes && (
                    <div className="px-5 sm:px-8 py-3" style={{ borderTop: `1px solid hsl(240 15% 10%)` }}>
                      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium mb-1">Observacoes</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{group.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {totalGroups > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: `1px solid ${CARD_BORDER}` }}>
            <span className="text-xs text-muted-foreground/60 tabular-nums">Mostrando {totalGroups === 0 ? 0 : page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalGroups)} de {totalGroups}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-25" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}`, color: 'hsl(0 0% 70%)' }}>Anterior</button>
              <span className="text-xs text-muted-foreground/50 tabular-nums px-2">{page + 1}/{totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-25" style={{ background: CARD_BG_INNER, border: `1px solid ${CARD_BORDER}`, color: 'hsl(0 0% 70%)' }}>Proximo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
