import { useState, useMemo } from 'react'
import { ClipboardCheck, Play, CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllProducts } from '@/hooks/useProducts'
import { useRegisterMovement } from '@/hooks/useStockMovements'
import { useAuthStore } from '@/stores/authStore'
import type { Product } from '@/types'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryState = 'idle' | 'counting' | 'done'

interface InventoryResult {
  noChange: Product[]
  surplus:  { product: Product; counted: number; system: number; delta: number }[]
  shortage: { product: Product; counted: number; system: number; delta: number }[]
}

// ─── InventoryPage ────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { data: products, isLoading } = useAllProducts()
  const registerMovement = useRegisterMovement()
  const { profile } = useAuthStore()
  const isManager = profile?.role === 'manager'

  const [inventoryState, setInventoryState] = useState<InventoryState>('idle')
  const [snapshot, setSnapshot] = useState<Record<string, number>>({})
  const [counts, setCounts] = useState<Record<string, number | ''>>({})
  const [result, setResult] = useState<InventoryResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  // Only active products, sorted by category then name
  const activeProducts = useMemo(
    () =>
      [...(products ?? [])]
        .filter((p) => p.active)
        .sort((a, b) => {
          if (a.category < b.category) return -1
          if (a.category > b.category) return 1
          return a.name.localeCompare(b.name)
        }),
    [products]
  )

  function handleStart() {
    if (!activeProducts.length) {
      toast.error('Nenhum produto ativo encontrado.')
      return
    }
    const snap: Record<string, number> = {}
    const initial: Record<string, number | ''> = {}
    for (const p of activeProducts) {
      snap[p.id] = p.current_stock
      initial[p.id] = ''
    }
    setSnapshot(snap)
    setCounts(initial)
    setInventoryState('counting')
  }

  function handleCancel() {
    setCounts({})
    setSnapshot({})
    setInventoryState('idle')
    setCancelConfirm(false)
  }

  async function handleFinalize() {
    if (isProcessing) return
    setIsProcessing(true)

    const toAdjust = activeProducts.filter((p) => {
      const c = counts[p.id]
      return c !== '' && c !== undefined && Number(c) !== snapshot[p.id]
    })

    try {
      await Promise.all(
        toAdjust.map(async (p) => {
          const counted = Number(counts[p.id])
          const system = snapshot[p.id]
          const delta = counted - system
          await registerMovement.mutateAsync({
            product_id: p.id,
            action: delta > 0 ? 'in' : 'loss',
            quantity: Math.abs(delta),
            notes: `Ajuste de inventário - Contagem: ${counted}, Sistema: ${system}`,
          })
        })
      )

      // Build result
      const noChange: Product[] = []
      const surplus:  InventoryResult['surplus']  = []
      const shortage: InventoryResult['shortage'] = []

      for (const p of activeProducts) {
        const c = counts[p.id]
        if (c === '' || c === undefined) {
          noChange.push(p)
        } else {
          const counted = Number(c)
          const system = snapshot[p.id]
          const delta = counted - system
          if (delta === 0) noChange.push(p)
          else if (delta > 0) surplus.push({ product: p, counted, system, delta })
          else shortage.push({ product: p, counted, system, delta })
        }
      }

      setResult({ noChange, surplus, shortage })
      setInventoryState('done')
      toast.success(`Inventário finalizado. ${toAdjust.length} ajuste${toAdjust.length !== 1 ? 's' : ''} aplicado${toAdjust.length !== 1 ? 's' : ''}.`)
    } catch {
      toast.error('Erro ao finalizar inventário. Tente novamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Idle state ──────────────────────────────────────────────────────────────
  if (inventoryState === 'idle') {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={22} className="text-gold shrink-0" />
          <div>
            <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
              Inventário
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Contagem física e reconciliação de estoque
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border border-border p-8 flex flex-col items-center gap-5 text-center"
          style={{ background: 'hsl(240 18% 6%)' }}
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.1)' }}>
            <ClipboardCheck size={28} style={{ color: 'hsl(42 60% 55%)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Iniciar Contagem Física</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              Você irá contar todos os produtos ativos e o sistema aplicará os ajustes automaticamente ao finalizar.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground max-w-xs text-left">
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gold/10 text-gold shrink-0">1</span>
              Tire um snapshot do estoque atual
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gold/10 text-gold shrink-0">2</span>
              Digite a quantidade contada fisicamente
            </p>
            <p className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-gold/10 text-gold shrink-0">3</span>
              O sistema reconcilia as divergências
            </p>
          </div>
          {isManager ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 h-11 px-6 rounded-xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
              style={{ background: 'hsl(42 60% 55%)', color: 'hsl(240 25% 4%)' }}
            >
              <Play size={15} />
              Iniciar Inventário
            </button>
          ) : (
            <p className="text-xs text-muted-foreground border border-border rounded-lg px-4 py-2">
              Apenas gestores podem iniciar inventários.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Done state — show results ────────────────────────────────────────────────
  if (inventoryState === 'done' && result) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <h1 className="text-2xl text-foreground" style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
              Relatório de Inventário
            </h1>
          </div>
          <button
            onClick={() => { setInventoryState('idle'); setResult(null) }}
            className="h-9 px-4 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all"
          >
            Novo Inventário
          </button>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sem Divergência', count: result.noChange.length, color: 'text-muted-foreground', bg: 'hsl(240 18% 8%)' },
            { label: 'Excesso', count: result.surplus.length,  color: 'text-emerald-400', bg: 'hsl(142 65% 40% / 0.08)' },
            { label: 'Falta',   count: result.shortage.length, color: 'text-red-400',     bg: 'hsl(0 65% 40% / 0.08)'   },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className="rounded-xl border border-border p-3 text-center" style={{ background: bg }}>
              <p className={`text-2xl font-black tabular-nums ${color}`}>{count}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Surplus */}
        {result.surplus.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Excesso · {result.surplus.length} produto{result.surplus.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2">
              {result.surplus.map(({ product, counted, system, delta }) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl border border-emerald-800/20 bg-emerald-950/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    <span>{system} → {counted}</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">+{delta}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shortage */}
        {result.shortage.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} className="text-red-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Falta · {result.shortage.length} produto{result.shortage.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2">
              {result.shortage.map(({ product, counted, system, delta }) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-800/20 bg-red-950/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs text-muted-foreground">
                    <span>{system} → {counted}</span>
                  </div>
                  <span className="text-sm font-bold text-red-400 tabular-nums shrink-0">{delta}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No change */}
        {result.noChange.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Sem Divergência · {result.noChange.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.noChange.map((p) => (
                <span key={p.id} className="text-xs border border-border bg-secondary rounded-lg px-2 py-1 text-muted-foreground">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Counting state ───────────────────────────────────────────────────────────
  const hasDivergences = activeProducts.some((p) => {
    const c = counts[p.id]
    return c !== '' && c !== undefined && Number(c) !== snapshot[p.id]
  })

  return (
    <div className="space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 md:-mx-6 md:px-6 py-3 flex items-center justify-between gap-3 flex-wrap"
        style={{ background: 'hsl(240 25% 4%)' }}>
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-gold shrink-0" />
          <span className="font-bold text-foreground">Contagem em Andamento</span>
          <span className="text-xs text-muted-foreground">· {activeProducts.length} produtos</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Cancel */}
          {cancelConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Cancelar inventário?</span>
              <button
                onClick={handleCancel}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-red-400 border border-red-800/40 bg-red-950/20 hover:bg-red-950/40 transition-all"
              >
                Confirmar
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="h-8 px-3 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground transition-all"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCancelConfirm(true)}
              className="h-8 px-3 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-all"
            >
              <XCircle size={13} />
              Cancelar
            </button>
          )}

          {/* Finalize */}
          {isManager && (
            <button
              onClick={handleFinalize}
              disabled={isProcessing || !hasDivergences}
              className="h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 hover:opacity-90"
              style={{
                background: hasDivergences ? 'hsl(42 60% 55%)' : 'hsl(240 15% 14%)',
                color: hasDivergences ? 'hsl(240 25% 4%)' : 'rgba(255,255,255,0.3)',
              }}
            >
              <CheckCircle size={13} />
              {isProcessing ? 'Salvando...' : 'Finalizar'}
            </button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border border-border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Produto', 'SKU', 'Sistema', 'Contado', 'Divergência'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeProducts.map((p, i) => {
                  const c = counts[p.id]
                  const counted = c !== '' ? Number(c) : null
                  const system = snapshot[p.id]
                  const delta = counted !== null ? counted - system : null

                  return (
                    <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{system}</td>
                      <td className="px-4 py-3">
                        {isManager ? (
                          <input
                            type="number"
                            min={0}
                            tabIndex={i + 1}
                            value={counts[p.id] ?? ''}
                            onChange={(e) => setCounts(prev => ({ ...prev, [p.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                            className="w-20 text-center rounded-lg border border-border bg-secondary px-2 py-1 text-sm tabular-nums text-foreground focus:border-gold/50 focus:outline-none transition-colors"
                          />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-bold">
                        {delta === null ? (
                          <span className="text-muted-foreground/30">—</span>
                        ) : delta === 0 ? (
                          <span className="text-muted-foreground">0</span>
                        ) : (
                          <span className={delta > 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {activeProducts.map((p, i) => {
              const c = counts[p.id]
              const counted = c !== '' ? Number(c) : null
              const system = snapshot[p.id]
              const delta = counted !== null ? counted - system : null

              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{p.sku}</p>
                    </div>
                    {delta !== null && delta !== 0 && (
                      <span className={`text-sm font-black tabular-nums shrink-0 ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sistema</p>
                      <p className="text-base font-bold tabular-nums text-muted-foreground">{system}</p>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-muted-foreground/30" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contado</p>
                      {isManager ? (
                        <input
                          type="number"
                          min={0}
                          tabIndex={i + 1}
                          value={counts[p.id] ?? ''}
                          onChange={(e) => setCounts(prev => ({ ...prev, [p.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                          className="w-16 text-center rounded-lg border border-border bg-secondary px-1 py-0.5 text-sm tabular-nums text-foreground focus:border-gold/50 focus:outline-none"
                        />
                      ) : (
                        <span className="text-muted-foreground/40 text-sm">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
