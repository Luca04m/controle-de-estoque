import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search, Plus, Package, Edit2, ToggleLeft, ToggleRight,
  AlertTriangle,
  Truck, ChevronRight,
} from 'lucide-react'
import { useAllProducts, useCreateProduct, useUpdateProduct, useToggleProduct } from '@/hooks/useProducts'
import { ProductHistoryDrawer } from '@/components/ProductHistoryDrawer'
import { useAuthStore } from '@/stores/authStore'
import { getProductImage } from '@/lib/productImages'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product, ProductCategory } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

// ─── Category Config ─────────────────────────────────────────────────────────

type CategoryKey = 'honey' | 'cappuccino' | 'blended' | 'acessorio'

const CATEGORY_CONFIG: Record<CategoryKey, {
  label: string
  color: string
  bg: string
  dot: string
}> = {
  honey:      { label: 'Honey',      color: '#D4A843', bg: 'hsl(42 60% 55% / 0.12)',   dot: '#fbbf24' },
  cappuccino: { label: 'Cappuccino', color: '#fb923c', bg: 'hsl(25 90% 55% / 0.12)',   dot: '#fb923c' },
  blended:    { label: 'Blended',    color: '#a78bfa', bg: 'hsl(270 60% 55% / 0.12)',  dot: '#a78bfa' },
  acessorio:  { label: 'Acessório',  color: '#94a3b8', bg: 'hsl(220 15% 55% / 0.12)', dot: '#94a3b8' },
}

const ALL_CATEGORIES = Object.entries(CATEGORY_CONFIG) as [CategoryKey, typeof CATEGORY_CONFIG[CategoryKey]][]

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const productSchema = z.object({
  name:          z.string().min(2, 'Nome obrigatório'),
  sku:           z.string().min(1, 'SKU obrigatório').toUpperCase(),
  category:      z.enum(['honey', 'cappuccino', 'blended', 'acessorio']),
  min_stock:     z.number().min(0),
  current_stock: z.number().min(0),
  price_cost:    z.number().min(0, 'Custo inválido'),
  price_sale:    z.number().min(0, 'Preço inválido'),
  supplier:      z.string().min(1, 'Fornecedor obrigatório'),
  location:      z.string().min(1, 'Localização obrigatória'),
})

type ProductForm = z.infer<typeof productSchema>

// ─── CategoryBadge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category as CategoryKey]
  if (!config) {
    return (
      <span className="text-xs border border-border rounded-md px-2 py-0.5 text-muted-foreground">
        {category}
      </span>
    )
  }
  return (
    <span
      style={{ color: config.color, backgroundColor: config.bg, borderColor: `${config.color}40` }}
      className="text-[10px] font-bold uppercase tracking-wider border rounded-md px-1.5 py-0.5 flex items-center gap-1 w-fit"
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
      {config.label}
    </span>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ isCritical, active }: { isCritical: boolean; active: boolean }) {
  if (isCritical) {
    return (
      <span className="flex items-center gap-1.5 text-xs bg-red-950/40 text-red-400 border border-red-800/30 rounded-md px-2 py-0.5 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
        Critico
      </span>
    )
  }
  if (active) {
    return (
      <span className="flex items-center gap-1.5 text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 rounded-md px-2 py-0.5 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        OK
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 text-xs bg-secondary text-muted-foreground border border-border rounded-md px-2 py-0.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0" />
      Inativo
    </span>
  )
}



// ─── ProductFormDialog ───────────────────────────────────────────────────────

function ProductFormDialog({
  product,
  open,
  onClose,
}: {
  product?: Product
  open: boolean
  onClose: () => void
}) {
  const create = useCreateProduct()
  const update = useUpdateProduct()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name:          product.name,
          sku:           product.sku,
          category:      product.category,
          min_stock:     product.min_stock,
          current_stock: product.current_stock,
          price_cost:    product.price_cost,
          price_sale:    product.price_sale,
          supplier:      product.supplier,
          location:      product.location,
        }
      : {
          name: '', sku: '', category: 'honey',
          min_stock: 5, current_stock: 0,
          price_cost: 0, price_sale: 0,
          supplier: '', location: '',
        },
  })

  const categoryValue = watch('category')

  async function onSubmit(data: ProductForm) {
    if (product) {
      await update.mutateAsync({ id: product.id, ...data })
    } else {
      await create.mutateAsync({ ...data, active: true })
    }
    onClose()
  }

  const dialogCategoryConfig = CATEGORY_CONFIG[categoryValue as CategoryKey]

  return (
    <Dialog open={open} onOpenChange={(_, open) => { if (!open) onClose() }}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ background: dialogCategoryConfig?.dot ?? 'hsl(42 60% 55%)' }}
            />
            <span style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}>
              {product ? 'Editar Produto' : 'Novo Produto'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase text-muted-foreground">Nome</Label>
            <Input
              placeholder="Ex: Whisky Mr. Lion Gold"
              className="bg-secondary border-border"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* SKU + Categoria */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">SKU</Label>
              <Input
                placeholder="ML-GOLD-750"
                className="bg-secondary border-border font-mono"
                {...register('sku')}
              />
              {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">Categoria</Label>
              <Select
                value={categoryValue}
                onValueChange={(v) => { if (v) setValue('category', v as ProductCategory) }}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ALL_CATEGORIES.map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.dot }} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estoque atual + minimo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">Estoque Atual</Label>
              <Input
                type="number"
                min={0}
                className="bg-secondary border-border"
                {...register('current_stock', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">Estoque Minimo</Label>
              <Input
                type="number"
                min={0}
                className="bg-secondary border-border"
                {...register('min_stock', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Preco custo + venda */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">Custo (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                className="bg-secondary border-border"
                {...register('price_cost', { valueAsNumber: true })}
              />
              {errors.price_cost && <p className="text-xs text-destructive">{errors.price_cost.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wider uppercase text-muted-foreground">Preco Venda (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0,00"
                className="bg-secondary border-border"
                {...register('price_sale', { valueAsNumber: true })}
              />
              {errors.price_sale && <p className="text-xs text-destructive">{errors.price_sale.message}</p>}
            </div>
          </div>

          {/* Fornecedor */}
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase text-muted-foreground">Fornecedor</Label>
            <Input
              placeholder="Ex: Lamas Destilaria"
              className="bg-secondary border-border"
              {...register('supplier')}
            />
            {errors.supplier && <p className="text-xs text-destructive">{errors.supplier.message}</p>}
          </div>

          {/* Localizacao */}
          <div className="space-y-1.5">
            <Label className="text-xs tracking-wider uppercase text-muted-foreground">Localizacao</Label>
            <Input
              placeholder="Ex: Galpao A - Prateleira 1"
              className="bg-secondary border-border"
              {...register('location')}
            />
            {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
          </div>

          <button
            type="submit"
            disabled={create.isPending || update.isPending}
            className="w-full h-11 rounded-lg gradient-gold text-[oklch(0.07_0_0)] font-semibold text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50"
          >
            {(create.isPending || update.isPending) ? 'Salvando...' : 'Salvar Produto'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── CatalogCard ─────────────────────────────────────────────────────────────

function CatalogCard({
  product,
  isManager,
  onEdit,
  onToggle,
  onDrillDown,
}: {
  product: Product
  isManager: boolean
  onEdit: (p: Product) => void
  onToggle: (id: string, active: boolean) => void
  onDrillDown: (p: Product) => void
}) {
  const isCritical = product.current_stock <= product.min_stock
  const img = getProductImage(product.sku)
  const catCfg = CATEGORY_CONFIG[product.category as CategoryKey]
  const stockPct = product.min_stock > 0
    ? Math.min(100, (product.current_stock / (product.min_stock * 3)) * 100)
    : 100

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden transition-all duration-300 ${
        !product.active ? 'opacity-40' : ''
      }`}
      style={{
        background: 'hsl(232 25% 8%)',
        borderColor: isCritical ? 'hsl(0 70% 30% / 0.5)' : 'hsl(232 20% 16%)',
      }}
      onMouseEnter={(e) => {
        if (product.active) {
          e.currentTarget.style.borderColor = 'hsl(42 60% 55% / 0.4)'
          e.currentTarget.style.boxShadow = '0 0 24px hsl(42 60% 55% / 0.08), 0 8px 32px hsl(0 0% 0% / 0.3)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isCritical ? 'hsl(0 70% 30% / 0.5)' : 'hsl(232 20% 16%)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* ── Image Area ── */}
      <button
        onClick={() => onDrillDown(product)}
        className="relative w-full aspect-[4/3] flex items-center justify-center overflow-hidden cursor-pointer"
        style={{ background: 'hsl(240 18% 5%)' }}
      >
        {img ? (
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <span
            className="text-5xl font-black transition-transform duration-500 group-hover:scale-110"
            style={{ color: catCfg?.dot, opacity: 0.6 }}
          >
            {product.name.charAt(0).toUpperCase()}
          </span>
        )}

        {/* Gradient overlay at bottom of image */}
        <div
          className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
          style={{ background: 'linear-gradient(to top, hsl(232 25% 8%), transparent)' }}
        />

        {/* Critical badge */}
        {isCritical && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-red-600/90 text-white px-2 py-1 rounded-lg backdrop-blur-sm">
            <AlertTriangle size={10} />
            Critico
          </div>
        )}

        {/* Stock count overlay */}
        <div
          className="absolute bottom-3 right-3 text-sm font-black tabular-nums px-2 py-0.5 rounded-md backdrop-blur-sm"
          style={{
            color: isCritical ? '#f87171' : 'hsl(42 60% 55%)',
            background: 'hsl(232 25% 8% / 0.7)',
          }}
        >
          {product.current_stock} un
        </div>
      </button>

      {/* ── Card Body ── */}
      <div className="p-4 space-y-3">
        {/* Name + drill-down arrow */}
        <button
          onClick={() => onDrillDown(product)}
          className="text-left group/name flex items-start gap-1.5 w-full"
        >
          <span
            className="font-semibold text-[15px] text-foreground leading-snug line-clamp-2 flex-1 transition-colors duration-200 group-hover/name:text-[hsl(42_60%_55%)]"
            style={{ fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
          >
            {product.name}
          </span>
          <ChevronRight
            size={14}
            className="text-muted-foreground mt-1 shrink-0 transition-all duration-200 group-hover/name:text-[hsl(42_60%_55%)] group-hover/name:translate-x-0.5"
          />
        </button>

        {/* Badges row */}
        <div className="flex items-center flex-wrap gap-1.5">
          <CategoryBadge category={product.category} />
          <span className="font-mono text-[10px] text-muted-foreground border border-border/60 rounded px-1.5 py-0.5">
            {product.sku}
          </span>
          <StatusBadge isCritical={isCritical} active={product.active} />
        </div>

        {/* Stock bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span className="uppercase tracking-wider font-medium">Estoque</span>
            <span className={isCritical ? 'text-red-400 font-bold' : 'text-foreground/70'}>
              {product.current_stock} / min {product.min_stock}
            </span>
          </div>
          <div className="h-2 w-full bg-secondary/60 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${stockPct}%`,
                background: isCritical
                  ? 'linear-gradient(90deg, hsl(0 70% 45%), hsl(0 70% 55%))'
                  : 'linear-gradient(90deg, hsl(42 60% 40%), hsl(42 60% 55%))',
              }}
            />
          </div>
        </div>

        {/* Price + supplier */}
        <div className="flex items-center justify-between pt-1">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(product.price_sale)}
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate max-w-[120px]">
            <Truck size={10} className="shrink-0" />
            {product.supplier}
          </span>
        </div>

        {/* Manager actions — elegant hover reveal on desktop */}
        {isManager && (
          <div
            className="flex gap-2 pt-2 border-t transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100"
            style={{ borderColor: 'hsl(232 20% 16%)' }}
          >
            <button
              onClick={() => onEdit(product)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium text-muted-foreground hover:text-[hsl(42_60%_55%)] border border-transparent hover:border-[hsl(42_60%_55%_/_0.25)] hover:bg-[hsl(42_60%_55%_/_0.08)] transition-all duration-200"
            >
              <Edit2 size={12} />
              Editar
            </button>
            <button
              onClick={() => onToggle(product.id, !product.active)}
              className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium border border-transparent transition-all duration-200 ${
                product.active
                  ? 'text-muted-foreground hover:text-red-400 hover:bg-red-400/8 hover:border-red-400/20'
                  : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/8 hover:border-emerald-400/20'
              }`}
            >
              {product.active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              {product.active ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ProductsPage ─────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { data: products, isLoading } = useAllProducts()
  const toggle = useToggleProduct()
  const { profile } = useAuthStore()
  const isManager = profile?.role === 'manager'
  const location = useLocation()

  // Initialize criticalOnly from navigation state (Dashboard alert button)
  const initialCriticalOnly = useMemo(() => {
    const fromNav = !!(location.state as { criticalOnly?: boolean } | null)?.criticalOnly
    if (fromNav) window.history.replaceState({}, '')
    return fromNav
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [search, setSearch]             = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | 'all'>('all')
  const [criticalOnly, setCriticalOnly] = useState(initialCriticalOnly)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
  const [drillProduct, setDrillProduct] = useState<Product | null>(null)
  const [drillOpen, setDrillOpen]       = useState(false)

  function openNew()              { setEditingProduct(undefined); setDialogOpen(true) }
  function openEdit(p: Product)   { setEditingProduct(p);         setDialogOpen(true) }
  function closeDialog()          { setDialogOpen(false);         setEditingProduct(undefined) }
  function openDrillDown(p: Product) { setDrillProduct(p); setDrillOpen(true) }
  function closeDrillDown()       { setDrillOpen(false); setTimeout(() => setDrillProduct(null), 300) }

  function handleToggle(id: string, active: boolean) {
    toggle.mutate({ id, active })
  }

  const filtered = products?.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    const matchCategory = categoryFilter === 'all' || p.category === categoryFilter
    const matchCritical = !criticalOnly || p.current_stock <= p.min_stock
    return matchSearch && matchCategory && matchCritical
  }) ?? []

  const activeCount = products?.filter((p) => p.active).length ?? 0

  return (
    <div className="space-y-5 p-4 md:p-6">

      {/* ── Header ── */}
      <div className="animate-slide-up flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Package size={22} className="text-gold shrink-0" />
          <div>
            <h1
              className="text-2xl text-foreground"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Catalogo
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeCount} produto{activeCount !== 1 ? 's' : ''} ativo{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isManager && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 h-9 px-4 rounded-lg gradient-gold text-[oklch(0.07_0_0)] font-semibold text-sm hover:opacity-90 transition-all"
          >
            <Plus size={15} />
            Novo Produto
          </button>
        )}
      </div>

      {/* ── Search + Category Filters ── */}
      <div className="animate-slide-up space-y-3">
        <div className="relative max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
        </div>

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`text-xs px-3 py-1 rounded-full border transition-all font-medium ${
              categoryFilter === 'all'
                ? 'bg-card border-gold text-gold'
                : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {ALL_CATEGORIES.map(([key, cfg]) => {
            const isActive = categoryFilter === key
            return (
              <button
                key={key}
                onClick={() => setCategoryFilter(isActive ? 'all' : key)}
                style={isActive ? { color: cfg.color, borderColor: `${cfg.color}60`, backgroundColor: cfg.bg } : {}}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all font-medium ${
                  isActive
                    ? ''
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label}
              </button>
            )
          })}
          {/* Critical-only filter chip */}
          <button
            onClick={() => setCriticalOnly(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all font-medium ${
              criticalOnly
                ? 'text-red-400 border-red-700/50 bg-red-950/30'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${criticalOnly ? 'bg-red-400 animate-pulse' : 'bg-muted-foreground'}`} />
            Criticos
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full bg-secondary rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-slide-up flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Package size={40} className="opacity-20" />
          <span className="text-sm">Nenhum produto encontrado</span>
        </div>
      ) : (
        /* ── Product Card Grid ── */
        <div className="animate-slide-up grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {filtered.map((product) => (
            <CatalogCard
              key={product.id}
              product={product}
              isManager={isManager}
              onEdit={openEdit}
              onToggle={handleToggle}
              onDrillDown={openDrillDown}
            />
          ))}
        </div>
      )}

      {!isManager && (
        <div className="text-xs text-muted-foreground border border-border rounded-lg px-4 py-3">
          Visualizacao somente leitura. Contate o gestor para alteracoes no catalogo.
        </div>
      )}

      {isManager && (
        <ProductFormDialog
          product={editingProduct}
          open={dialogOpen}
          onClose={closeDialog}
        />
      )}

      {/* Full history drawer (replaces dialog) */}
      <ProductHistoryDrawer
        product={drillOpen ? drillProduct : null}
        onClose={closeDrillDown}
      />
    </div>
  )
}
