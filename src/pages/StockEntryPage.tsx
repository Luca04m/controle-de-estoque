import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProducts } from '@/hooks/useProducts'
import { useRegisterMovement } from '@/hooks/useStockMovements'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types'

const entrySchema = z.object({
  product_id: z.string().min(1, 'Selecione um produto'),
  quantity: z.number().min(1, 'Quantidade mínima: 1').max(9999),
  notes: z.string().min(1, 'Informe a origem (ex: Entrega fornecedor, Transferência depósito)'),
})

type EntryForm = z.infer<typeof entrySchema>
type Step = 'form' | 'confirm'

export function StockEntryPage() {
  const { data: products, isLoading } = useProducts()
  const registerMovement = useRegisterMovement()
  const [step, setStep] = useState<Step>('form')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<EntryForm | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EntryForm>({
    resolver: zodResolver(entrySchema),
    defaultValues: { quantity: 1, notes: '' },
  })

  const quantity = watch('quantity') ?? 1

  function onFormSubmit(data: EntryForm) {
    const product = products?.find((p) => p.id === data.product_id) ?? null
    setSelectedProduct(product)
    setFormData(data)
    setStep('confirm')
  }

  async function onConfirm() {
    if (!formData) return
    await registerMovement.mutateAsync({ ...formData, action: 'in' })
    reset()
    setSelectedProduct(null)
    setFormData(null)
    setStep('form')
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 max-w-md mx-auto">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <Skeleton className="h-32 w-full bg-secondary rounded-xl" />
        <Skeleton className="h-32 w-full bg-secondary rounded-xl" />
      </div>
    )
  }

  if (step === 'confirm' && selectedProduct && formData) {
    return (
      <div className="max-w-md mx-auto space-y-6 p-4">
        <div>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Confirmar Entrada
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Verifique os dados antes de confirmar</p>
        </div>

        <div className="bg-card border border-gold/30 rounded-xl p-6 space-y-5 gold-glow">
          <div>
            <p className="text-xs tracking-wider uppercase text-muted-foreground mb-1">Produto</p>
            <p className="text-xl font-semibold text-foreground">{selectedProduct.name}</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{selectedProduct.sku}</p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-wider uppercase text-muted-foreground mb-1">Quantidade</p>
              <p className="text-5xl font-black text-gold leading-none">{formData.quantity}</p>
              <p className="text-xs text-muted-foreground mt-1">unidades</p>
            </div>
            <div className="text-right">
              <p className="text-xs tracking-wider uppercase text-muted-foreground mb-1">Estoque</p>
              <p className="text-lg font-semibold text-foreground">{selectedProduct.current_stock} un</p>
              <p className="text-xs text-emerald-400 font-semibold">
                → {selectedProduct.current_stock + formData.quantity} un
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs tracking-wider uppercase text-muted-foreground mb-1">Origem</p>
            <p className="text-sm font-medium text-foreground">{formData.notes}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setStep('form')}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={registerMovement.isPending}
            className="h-14 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {registerMovement.isPending ? 'Salvando...' : '✓ Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6 p-4">
      <div>
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Entrada de Estoque
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Registrar recebimento de mercadoria</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Product select */}
        <div className="space-y-2">
          <Label className="text-xs tracking-wider uppercase text-muted-foreground">Produto</Label>
          <Select onValueChange={(v: string | null) => { if (v) setValue('product_id', v) }}>
            <SelectTrigger className="h-14 text-base bg-card border-border">
              <SelectValue placeholder="Selecione o produto..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({p.current_stock} em estoque)</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-xs text-destructive">{errors.product_id.message}</p>
          )}
        </div>

        {/* Quantity stepper */}
        <div className="space-y-2">
          <Label className="text-xs tracking-wider uppercase text-muted-foreground">Quantidade</Label>
          <div className="flex gap-3 items-center">
            <button
              type="button"
              onClick={() => setValue('quantity', Math.max(1, quantity - 1))}
              className="h-14 w-14 rounded-xl border border-border bg-card text-2xl font-bold text-foreground hover:bg-secondary hover:border-gold/40 transition-all active:scale-95"
            >
              −
            </button>
            <Input
              type="number"
              min={1}
              max={9999}
              className="h-14 text-center text-2xl font-black flex-1 bg-card border-border text-gold"
              {...register('quantity', { valueAsNumber: true })}
            />
            <button
              type="button"
              onClick={() => setValue('quantity', quantity + 1)}
              className="h-14 w-14 rounded-xl border border-border bg-card text-2xl font-bold text-foreground hover:bg-secondary hover:border-gold/40 transition-all active:scale-95"
            >
              +
            </button>
          </div>
          {errors.quantity && (
            <p className="text-xs text-destructive">{errors.quantity.message}</p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs tracking-wider uppercase text-muted-foreground">Origem</Label>
          <Input
            placeholder="Ex: Entrega fornecedor, Transferência depósito"
            className="h-12 bg-card border-border"
            {...register('notes')}
          />
          {errors.notes && (
            <p className="text-xs text-destructive">{errors.notes.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full h-14 rounded-xl bg-gold text-[oklch(0.07_0_0)] font-bold text-sm tracking-wider uppercase hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Revisar Entrada →
        </button>
      </form>

      {/* Critical stock alert */}
      {products && products.some((p) => p.current_stock <= p.min_stock) && (
        <div className="border-t border-border pt-4">
          <p className="text-xs font-semibold text-red-400 mb-2 tracking-wider uppercase">
            ⚠ Estoque Crítico
          </p>
          <div className="flex flex-wrap gap-2">
            {products.filter((p) => p.current_stock <= p.min_stock).map((p) => (
              <span
                key={p.id}
                className="text-xs bg-red-950/40 text-red-300 border border-red-800/30 rounded-md px-2 py-1"
              >
                {p.name}: {p.current_stock} un
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
