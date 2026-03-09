import { useState } from 'react'
import { PackagePlus, Search, ChevronRight, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement } from '@/hooks/useStockMovements'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ORIGIN_CHIPS = [
  { label: 'Lamas Destilaria', emoji: '🏭' },
  { label: 'Reposição Interna', emoji: '🔄' },
  { label: 'Fornecedor Externo', emoji: '🚚' },
  { label: 'Ajuste Inventário', emoji: '📋' },
  { label: 'Outro', emoji: '✏️' },
] as const

type OriginLabel = (typeof ORIGIN_CHIPS)[number]['label']

const QUICK_QTY = [1, 5, 10, 24, 48] as const

const CATEGORY_COLORS: Record<string, string> = {
  honey:      'text-amber-400 bg-amber-400/10 border-amber-400/20',
  cappuccino: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  blended:    'text-purple-400 bg-purple-400/10 border-purple-400/20',
  acessorio:  'text-slate-400 bg-slate-400/10 border-slate-400/20',
}

const CATEGORY_LABEL: Record<string, string> = {
  honey: 'Honey', cappuccino: 'Cappuccino', blended: 'Blended', acessorio: 'Acessório',
}

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBar({ current, min }: { current: number; min: number }) {
  const pct = min > 0 ? Math.min(100, Math.round((current / (min * 3)) * 100)) : 100
  const isCritical = current <= min
  return (
    <div className="w-full h-1.5 rounded-full bg-secondary mt-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${isCritical ? 'bg-red-500' : 'bg-emerald-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const isCritical = product.current_stock <= product.min_stock
  const catColor = CATEGORY_COLORS[product.category] ?? CATEGORY_COLORS.acessorio

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] hover:border-gold/40 hover:bg-gold/5 ${
        isCritical ? 'border-red-800/40 bg-red-950/20' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
            {isCritical && (
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/50 border border-red-800/30 px-1.5 py-0.5 rounded">
                Crítico
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${catColor}`}>
              {CATEGORY_LABEL[product.category]}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">{product.sku}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-black leading-none ${isCritical ? 'text-red-400' : 'text-foreground'}`}>
            {product.current_stock}
          </p>
          <p className="text-[10px] text-muted-foreground">un</p>
        </div>
      </div>
      <StockBar current={product.current_stock} min={product.min_stock} />
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Step = 'select' | 'quantity' | 'confirm'

export function StockEntryPage() {
  const { data: products, isLoading } = useProducts()
  const registerMovement = useRegisterMovement()

  const [step, setStep] = useState<Step>('select')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [origin, setOrigin] = useState<OriginLabel | null>(null)
  const [customOrigin, setCustomOrigin] = useState('')
  const [invoice, setInvoice] = useState('')

  const activeOrigin = origin === 'Outro' ? customOrigin : (origin ?? '')

  const criticalProducts = products?.filter(p => p.current_stock <= p.min_stock) ?? []

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  function handleSelectProduct(p: Product) {
    setSelectedProduct(p)
    setQuantity(1)
    setStep('quantity')
  }

  function handleConfirmQty() {
    if (!activeOrigin.trim()) return
    setStep('confirm')
  }

  async function handleSubmit() {
    if (!selectedProduct) return
    await registerMovement.mutateAsync({
      product_id: selectedProduct.id,
      action: 'in',
      quantity,
      notes: `${activeOrigin}${invoice ? ` — ${invoice}` : ''}`,
    })
    // Reset
    setStep('select')
    setSelectedProduct(null)
    setQuantity(1)
    setOrigin(null)
    setCustomOrigin('')
    setInvoice('')
    setSearch('')
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-3">
        <Skeleton className="h-10 w-full bg-secondary rounded-xl" />
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full bg-secondary rounded-xl" />)}
      </div>
    )
  }

  // ── Step: Confirm ────────────────────────────────────────────────────────

  if (step === 'confirm' && selectedProduct) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('quantity')} className="p-2 rounded-lg hover:bg-secondary transition-all">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Confirmar Entrada</h1>
            <p className="text-xs text-muted-foreground">Verifique antes de confirmar</p>
          </div>
        </div>

        {/* Summary card */}
        <div className="bg-card border border-gold/30 rounded-2xl p-5 space-y-4">
          {/* Product */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Produto</p>
              <p className="text-base font-bold text-foreground">{selectedProduct.name}</p>
              <p className="text-xs font-mono text-muted-foreground">{selectedProduct.sku}</p>
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${CATEGORY_COLORS[selectedProduct.category]}`}>
              {CATEGORY_LABEL[selectedProduct.category]}
            </span>
          </div>

          <div className="border-t border-border" />

          {/* Qty + projection */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Quantidade adicionada</p>
              <p className="text-4xl font-black text-gold leading-none">+{quantity}</p>
              <p className="text-xs text-muted-foreground mt-1">unidades</p>
            </div>
            <div className="text-right bg-secondary rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Estoque atual</p>
              <p className="text-sm font-semibold text-muted-foreground">{selectedProduct.current_stock} un</p>
              <div className="text-[10px] text-muted-foreground my-1">↓</div>
              <p className="text-xs text-muted-foreground">Após entrada</p>
              <p className="text-lg font-black text-emerald-400">{selectedProduct.current_stock + quantity} un</p>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Origin + Invoice */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Origem</span>
              <span className="font-medium text-foreground text-right">{activeOrigin}</span>
            </div>
            {invoice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">NF / Lote</span>
                <span className="font-mono text-foreground">{invoice}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor referência</span>
              <span className="text-gold font-semibold">{fmt.format(selectedProduct.price_cost * quantity)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('quantity')}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary transition-all disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            onClick={handleSubmit}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl font-bold text-sm tracking-wide transition-all disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
            style={{ background: 'hsl(42 60% 55%)', color: 'oklch(0.07 0 0)' }}
          >
            <CheckCircle2 size={18} />
            {registerMovement.isPending ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: Quantity + Origin ──────────────────────────────────────────────

  if (step === 'quantity' && selectedProduct) {
    const canProceed = activeOrigin.trim().length > 0

    return (
      <div className="max-w-lg mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="p-2 rounded-lg hover:bg-secondary transition-all">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">{selectedProduct.name}</h1>
            <p className="text-xs font-mono text-muted-foreground">{selectedProduct.sku} · {selectedProduct.current_stock} em estoque</p>
          </div>
        </div>

        {/* Quantity */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantidade a adicionar</Label>

          {/* Stepper */}
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="h-14 w-14 rounded-xl border border-border bg-secondary text-2xl font-bold text-foreground hover:border-gold/40 transition-all active:scale-95"
            >−</button>
            <div className="flex-1 h-14 bg-secondary rounded-xl flex items-center justify-center">
              <span className="text-3xl font-black text-gold">{quantity}</span>
            </div>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="h-14 w-14 rounded-xl border border-border bg-secondary text-2xl font-bold text-foreground hover:border-gold/40 transition-all active:scale-95"
            >+</button>
          </div>

          {/* Quick qty buttons */}
          <div className="flex gap-2">
            {QUICK_QTY.map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setQuantity(n)}
                className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-all ${
                  quantity === n
                    ? 'border-gold text-gold bg-gold/10'
                    : 'border-border text-muted-foreground bg-card hover:border-gold/30 hover:text-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Stock projection */}
          <div className="flex items-center justify-between text-sm bg-secondary rounded-xl px-4 py-3">
            <span className="text-muted-foreground">Estoque após entrada</span>
            <span className="font-black text-emerald-400 text-base">{selectedProduct.current_stock + quantity} un</span>
          </div>
        </div>

        {/* Origin chips */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Origem</Label>
          <div className="grid grid-cols-2 gap-2">
            {ORIGIN_CHIPS.map(({ label, emoji }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setOrigin(label); if (label !== 'Outro') setCustomOrigin('') }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all active:scale-95 text-left ${
                  origin === label
                    ? 'border-gold text-gold bg-gold/10'
                    : 'border-border text-muted-foreground bg-secondary hover:border-gold/30 hover:text-foreground'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          {origin === 'Outro' && (
            <Input
              autoFocus
              placeholder="Descreva a origem..."
              className="h-11 bg-secondary border-border"
              value={customOrigin}
              onChange={e => setCustomOrigin(e.target.value)}
            />
          )}
        </div>

        {/* NF / Lote */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Nota Fiscal / Lote
            <span className="ml-1 normal-case text-muted-foreground/60 font-normal">(opcional)</span>
          </Label>
          <Input
            placeholder="NF-2024-001 ou Lote ABC-123"
            className="h-11 bg-secondary border-border font-mono"
            value={invoice}
            onChange={e => setInvoice(e.target.value)}
          />
        </div>

        <button
          onClick={handleConfirmQty}
          disabled={!canProceed}
          className="w-full h-14 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: canProceed ? 'hsl(42 60% 55%)' : undefined, color: canProceed ? 'oklch(0.07 0 0)' : undefined, border: canProceed ? 'none' : '1px solid hsl(var(--border))' }}
        >
          <ChevronRight size={18} />
          Revisar Entrada
        </button>
      </div>
    )
  }

  // ── Step: Select Product ─────────────────────────────────────────────────

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.15)' }}>
          <PackagePlus size={18} style={{ color: 'hsl(42 60% 55%)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Entrada de Estoque</h1>
          <p className="text-xs text-muted-foreground">Selecione o produto recebido</p>
        </div>
      </div>

      {/* Critical alert */}
      {criticalProducts.length > 0 && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-xl p-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
              {criticalProducts.length} produto{criticalProducts.length > 1 ? 's' : ''} em estoque crítico
            </p>
            <div className="flex flex-wrap gap-1.5">
              {criticalProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className="text-[11px] bg-red-900/40 text-red-300 border border-red-700/30 rounded px-2 py-0.5 hover:bg-red-800/40 transition-all"
                >
                  {p.name}: {p.current_stock} un →
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produto ou SKU..."
          className="h-11 pl-9 bg-card border-border"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Product grid */}
      <div className="space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum produto encontrado
          </div>
        ) : (
          filteredProducts.map(p => (
            <ProductCard key={p.id} product={p} onSelect={handleSelectProduct} />
          ))
        )}
      </div>
    </div>
  )
}
